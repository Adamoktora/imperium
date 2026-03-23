import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({ command: "npx", args: ["@moonpay/cli", "mcp"] });
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(transport);

  const tools = await client.listTools();

  // Find tools we use
  const toolNames = [
    "token_trending_list", "token_balance_list", "token_check",
    "token_swap", "token_bridge", "token_search", "token_retrieve",
    "token_holder_list", "wallet_discover", "wallet_pnl_retrieve",
    "wallet_activity_list", "buy", "deposit_create"
  ];

  for (const name of toolNames) {
    const tool = tools.tools.find(t => t.name === name);
    if (tool) {
      console.log(`\n=== ${tool.name} ===`);
      console.log(`Description: ${tool.description?.slice(0, 100)}`);
      const schema = tool.inputSchema as any;
      if (schema?.properties) {
        const required = schema.required || [];
        for (const [key, val] of Object.entries(schema.properties)) {
          const req = required.includes(key) ? " (REQUIRED)" : "";
          console.log(`  ${key}: ${(val as any).type}${req}`);
        }
      }
    } else {
      console.log(`\n=== ${name} === NOT FOUND`);
    }
  }

  await client.close();
}

main().catch(console.error);
