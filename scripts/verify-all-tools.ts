import { createMcpClient } from "../src/mcp/client.js";

async function main() {
  const client = createMcpClient(false);
  await client.connect();

  const tests: [string, Record<string, unknown>][] = [
    ["token_balance_list", { wallet: "imperium-v2", chain: "base" }],
    ["token_trending_list", { chain: "base", limit: 3, page: 1 }],
    ["token_check", { token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", chain: "base" }],
    ["wallet_discover", { chain: "base", ranking: "pnl", limit: 2 }],
    ["token_search", { query: "usdc", chain: "base", limit: 2 }],
    ["token_retrieve", { token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", chain: "base" }],
    ["token_holder_list", { token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", chain: "base", limit: 3 }],
    ["wallet_pnl_retrieve", { wallet: "imperium-v2", chain: "base" }],
    ["wallet_activity_list", { wallet: "imperium-v2", chain: "base", limit: 5, cursor: null }],
    ["buy", { token: "ETH", amount: 50, wallet: "imperium-v2", email: null }],
    ["deposit_create", { name: "imperium-test", wallet: "imperium-v2", chain: "base", token: "USDC" }],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, args] of tests) {
    try {
      const result = await client.callTool(name, args);
      const preview = JSON.stringify(result).slice(0, 100);
      console.log(`  [PASS] ${name} -> ${preview}...`);
      passed++;
    } catch (err: any) {
      console.log(`  [FAIL] ${name} -> ${err.message?.slice(0, 100)}`);
      failed++;
    }
  }

  // These need funds, mark as skip
  console.log(`  [SKIP] token_swap -> requires funded wallet`);
  console.log(`  [SKIP] token_bridge -> requires funded wallet`);

  console.log(`\nResult: ${passed} passed, ${failed} failed, 2 skipped (need funds)`);
  console.log(`Verified: ${passed}/13 tools (${passed + 2}/13 with skips)`);

  await client.disconnect();
}

main().catch(console.error);
