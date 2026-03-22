import type {
  McpClient, Allocation, TargetAllocation,
  DriftReport, RebalanceAction, ExecutionResult,
} from "../types.js";
import { PolicyEngine } from "../wallet/policy.js";

const DRIFT_THRESHOLD = 3;

export function calculateDrift(current: Allocation[], targets: TargetAllocation[]): DriftReport[] {
  const drifts: DriftReport[] = targets.map((t) => {
    const cur = current.find((c) => c.symbol === t.token || c.token === t.token);
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
    const inTarget = targets.find((t) => t.token === cur.symbol || t.token === cur.token);
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

    actions.push({
      type: "swap",
      from: { token: over.token, chain: over.chain, amount: sellUsd.toFixed(2) },
      to: { token: target.token, chain: target.chain },
      reason: `${over.token} overweight by ${over.driftPct.toFixed(1)}%, selling $${sellUsd.toFixed(0)} to ${target.token}`,
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
        const result = (await this.client.callTool("token_swap", {
          fromToken: action.from.token,
          toToken: action.to.token,
          amount: action.from.amount,
          chain: action.from.chain,
        })) as any;

        this.policyEngine.recordSpending(action.estimatedUsd);
        results.push({ action, success: true, txHash: result.txHash ?? "demo-tx" });
      } catch (err: any) {
        results.push({ action, success: false, error: err.message });
      }
    }

    return results;
  }
}
