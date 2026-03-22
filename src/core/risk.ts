import type { McpClient, RiskReport, TokenBalance } from "../types.js";

interface RiskInput {
  holderConcentration: number;
  liquidityUsd: number;
  communityWarnings: boolean;
}

interface RiskScoreResult {
  riskScore: number;
  flags: string[];
  recommendation: "hold" | "sell" | "watch";
}

export function calculateRiskScore(input: RiskInput): RiskScoreResult {
  let score = 0;
  const flags: string[] = [];

  if (input.holderConcentration > 50) {
    score += 40;
    flags.push("concentrated_holders");
  } else if (input.holderConcentration > 30) {
    score += 20;
    flags.push("moderately_concentrated");
  }

  if (input.liquidityUsd < 10_000) {
    score += 30;
    flags.push("low_liquidity");
  } else if (input.liquidityUsd < 100_000) {
    score += 15;
    flags.push("moderate_liquidity");
  }

  if (input.communityWarnings) {
    score += 20;
    flags.push("community_warnings");
  }

  const recommendation = score >= 70 ? "sell" : score >= 40 ? "watch" : "hold";
  return { riskScore: Math.min(score, 100), flags, recommendation };
}

export class RiskService {
  constructor(private client: McpClient) {}

  async checkToken(address: string, chain: string): Promise<RiskReport> {
    const result = (await this.client.callTool("token_check", { address, chain })) as any;

    const riskInput: RiskInput = {
      holderConcentration: result.holderConcentration ?? result.top10HolderPct ?? 0,
      liquidityUsd: result.liquidityUsd ?? result.liquidity ?? 0,
      communityWarnings: result.communityWarnings ?? result.warnings?.length > 0 ?? false,
    };

    const scored = calculateRiskScore(riskInput);

    return {
      token: result.token ?? result.symbol ?? address,
      chain,
      address,
      ...scored,
    };
  }

  async scanPortfolio(holdings: TokenBalance[]): Promise<RiskReport[]> {
    const reports: RiskReport[] = [];
    for (const h of holdings) {
      if (h.address) {
        const report = await this.checkToken(h.address, h.chain);
        report.token = h.symbol || h.token;
        reports.push(report);
      }
    }
    return reports;
  }
}
