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
    const result = (await this.client.callTool("token_check", { token: address, chain })) as any;

    // Parse nested MoonPay format: holderConcentration.top10Percent, liquidity.total
    const holderConc = typeof result.holderConcentration === "object"
      ? (result.holderConcentration?.top10Percent ?? 0)
      : (result.holderConcentration ?? 0);

    const liquidityUsd = typeof result.liquidity === "object"
      ? (result.liquidity?.total ?? 0)
      : (result.liquidityUsd ?? result.liquidity ?? 0);

    const hasWarnings = (result.communityNotes?.length > 0) ||
      (result.risks?.length > 0) ||
      (result.communityWarnings === true) ||
      (result.warnings?.length > 0);

    const riskInput: RiskInput = {
      holderConcentration: Number(holderConc) || 0,
      liquidityUsd: Number(liquidityUsd) || 0,
      communityWarnings: hasWarnings,
    };

    const scored = calculateRiskScore(riskInput);

    // Extract token name from nested or flat format
    const tokenName = typeof result.token === "object"
      ? (result.token.symbol ?? result.token.name ?? address)
      : (result.token ?? result.symbol ?? address);

    return {
      token: tokenName,
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
