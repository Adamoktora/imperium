import type {
  McpClient, Allocation, TargetAllocation,
  DriftReport, RebalanceAction, ExecutionResult,
} from "../types.js";
import { PolicyEngine } from "../wallet/policy.js";

const DRIFT_THRESHOLD = 3;

/** Normalize token names for matching: WETH→ETH, wETH→ETH, etc. */
function normalizeToken(name: string): string {
  const upper = name.toUpperCase();
  if (upper === "WETH" || upper === "WRAPPED ETH") return "ETH";
  if (upper === "WBTC" || upper === "WRAPPED BTC") return "BTC";
  if (upper === "WMATIC" || upper === "WRAPPED MATIC") return "MATIC";
  return upper;
}

export function calculateDrift(current: Allocation[], targets: TargetAllocation[]): DriftReport[] {
  const drifts: DriftReport[] = targets.map((t) => {
    const tNorm = normalizeToken(t.token);
    const cur = current.find((c) => normalizeToken(c.symbol) === tNorm || normalizeToken(c.token) === tNorm);
    const currentPct = cur?.pct ?? 0;
    return {
      token: t.token,
      chain: cur?.chain ?? "base",
      currentPct,
      targetPct: t.pct,
      driftPct: currentPct - t.pct,
    };
  });

  // Tokens in portfolio but NOT in target → 100% overweight (should be sold)
  for (const cur of current) {
    const curNorm = normalizeToken(cur.symbol);
    const inTarget = targets.find((t) => normalizeToken(t.token) === curNorm);
    if (!inTarget) {
      drifts.push({
        token: cur.symbol,
        chain: cur.chain,
        currentPct: cur.pct,
        targetPct: 0,
        driftPct: cur.pct,
      });
    }
  }

  return drifts;
}

export function generateActions(drift: DriftReport[], current: Allocation[]): RebalanceAction[] {
  const overweight = drift.filter((d) => d.driftPct > DRIFT_THRESHOLD).sort((a, b) => b.driftPct - a.driftPct);
  const underweight = drift.filter((d) => d.driftPct < -DRIFT_THRESHOLD).sort((a, b) => a.driftPct - b.driftPct);
  const totalUsd = current.reduce((sum, c) => sum + c.usdValue, 0);
  const actions: RebalanceAction[] = [];

  let uwIdx = 0;
  for (const over of overweight) {
    if (uwIdx >= underweight.length) break;
    const target = underweight[uwIdx];
    const sellUsd = (over.driftPct / 100) * totalUsd;
    const isCrossChain = over.chain !== target.chain;

    actions.push({
      type: isCrossChain ? "bridge" : "swap",
      from: { token: over.token, chain: over.chain, amount: sellUsd.toFixed(2) },
      to: { token: target.token, chain: target.chain },
      reason: `${over.token} overweight by ${over.driftPct.toFixed(1)}%, ${isCrossChain ? "bridging" : "swapping"} $${sellUsd.toFixed(0)} to ${target.token}${isCrossChain ? ` on ${target.chain}` : ""}`,
      estimatedUsd: sellUsd,
    });
    uwIdx++;
  }

  return actions;
}

export class RebalanceService {
  constructor(
    private client: McpClient,
    private policyEngine: PolicyEngine,
  ) {}

  async preview(current: Allocation[], targets: TargetAllocation[]): Promise<RebalanceAction[]> {
    const drift = calculateDrift(current, targets);
    return generateActions(drift, current);
  }

  async execute(actions: RebalanceAction[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const action of actions) {
      const policyCheck = this.policyEngine.checkTransaction({
        type: action.type,
        token: action.from.token,
        amountUsd: action.estimatedUsd,
      });

      if (!policyCheck.approved) {
        results.push({ action, success: false, error: policyCheck.reason });
        continue;
      }

      try {
        const toolName = action.type === "bridge" ? "token_bridge" : "token_swap";
        const args = action.type === "bridge"
          ? { token: action.from.token, amount: action.from.amount, fromChain: action.from.chain, toChain: action.to.chain }
          : { fromToken: action.from.token, toToken: action.to.token, amount: action.from.amount, chain: action.from.chain };
        const result = (await this.client.callTool(toolName, args)) as any;

        this.policyEngine.recordSpending(action.estimatedUsd);
        results.push({ action, success: true, txHash: result.txHash ?? "demo-tx" });
      } catch (err: any) {
        results.push({ action, success: false, error: err.message });
      }
    }

    return results;
  }
}
