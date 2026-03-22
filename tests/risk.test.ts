import { describe, it, expect } from "vitest";
import { calculateRiskScore, RiskService } from "../src/core/risk.js";
import { createMcpClient } from "../src/mcp/client.js";

describe("Risk Scoring", () => {
  it("scores safe token low", () => {
    const score = calculateRiskScore({ holderConcentration: 10, liquidityUsd: 10_000_000, communityWarnings: false });
    expect(score.riskScore).toBeLessThan(40);
    expect(score.recommendation).toBe("hold");
  });

  it("flags concentrated holders", () => {
    const score = calculateRiskScore({ holderConcentration: 60, liquidityUsd: 10_000_000, communityWarnings: false });
    expect(score.riskScore).toBeGreaterThanOrEqual(40);
    expect(score.flags).toContain("concentrated_holders");
  });

  it("flags low liquidity", () => {
    const score = calculateRiskScore({ holderConcentration: 10, liquidityUsd: 5000, communityWarnings: false });
    expect(score.riskScore).toBeGreaterThanOrEqual(30);
    expect(score.flags).toContain("low_liquidity");
  });

  it("recommends sell for very risky tokens", () => {
    const score = calculateRiskScore({ holderConcentration: 70, liquidityUsd: 1000, communityWarnings: true });
    expect(score.riskScore).toBeGreaterThanOrEqual(70);
    expect(score.recommendation).toBe("sell");
  });
});

describe("RiskService", () => {
  it("checks token via MCP", async () => {
    const client = createMcpClient(true);
    await client.connect();
    const service = new RiskService(client);
    const report = await service.checkToken("0xeeee", "base");
    expect(report).toHaveProperty("riskScore");
    expect(report).toHaveProperty("recommendation");
  });
});
