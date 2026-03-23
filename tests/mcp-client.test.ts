import { describe, it, expect } from "vitest";
import { createMcpClient } from "../src/mcp/client.js";

describe("MCP Client (demo mode)", () => {
  it("creates client in demo mode", () => {
    const client = createMcpClient(true);
    expect(client.isDemo()).toBe(true);
  });

  it("returns fixture data for token_balance_list", async () => {
    const client = createMcpClient(true);
    await client.connect();
    const result = await client.callTool("token_balance_list", { chain: "base" }) as any;
    expect(result).toBeDefined();
    // MoonPay returns { items: [...] }
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("returns fixture data for token_check", async () => {
    const client = createMcpClient(true);
    await client.connect();
    const result = await client.callTool("token_check", { address: "0x123", chain: "base" });
    expect(result).toBeDefined();
  });

  it("returns fixture data for token_swap", async () => {
    const client = createMcpClient(true);
    await client.connect();
    const result = (await client.callTool("token_swap", {})) as any;
    expect(result.txHash).toBeDefined();
  });

  it("disconnects cleanly", async () => {
    const client = createMcpClient(true);
    await client.connect();
    await client.disconnect();
  });
});
