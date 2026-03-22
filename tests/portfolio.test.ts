import { describe, it, expect } from "vitest";
import { PortfolioService } from "../src/core/portfolio.js";
import { createMcpClient } from "../src/mcp/client.js";

describe("PortfolioService", () => {
  const client = createMcpClient(true);

  it("gets holdings from MCP", async () => {
    await client.connect();
    const service = new PortfolioService(client);
    const holdings = await service.getHoldings();
    expect(holdings.length).toBeGreaterThan(0);
    expect(holdings[0]).toHaveProperty("symbol");
    expect(holdings[0]).toHaveProperty("usdValue");
  });

  it("calculates allocation percentages that sum to 100", async () => {
    await client.connect();
    const service = new PortfolioService(client);
    const allocation = await service.getAllocation();
    const totalPct = allocation.reduce((sum, a) => sum + a.pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it("gets PnL summary", async () => {
    await client.connect();
    const service = new PortfolioService(client);
    const pnl = await service.getPnL();
    expect(pnl).toHaveProperty("totalValue");
    expect(pnl).toHaveProperty("totalPnL");
  });

  it("gets activity", async () => {
    await client.connect();
    const service = new PortfolioService(client);
    const activity = await service.getActivity("base");
    expect(activity.length).toBeGreaterThan(0);
    expect(activity[0]).toHaveProperty("type");
  });
});
