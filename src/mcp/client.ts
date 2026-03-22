import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { McpClient } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");

function loadFixture(toolName: string): unknown {
  const path = join(FIXTURES_DIR, `${toolName}.json`);
  if (!existsSync(path)) {
    throw new Error(`No fixture for tool: ${toolName}. Expected at ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

class DemoMcpClient implements McpClient {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  isDemo(): boolean { return true; }

  async callTool(name: string, _args: Record<string, unknown>): Promise<unknown> {
    return loadFixture(name);
  }
}

class RealMcpClient implements McpClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect(): Promise<void> {
    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["@moonpay/cli", "mcp"],
    });
    this.client = new Client({ name: "imperium", version: "1.0.0" });
    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
  }

  isDemo(): boolean { return false; }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client) throw new Error("Not connected. Call connect() first.");
    const result = await this.client.callTool({ name, arguments: args });
    const content = result.content;
    if (Array.isArray(content) && content.length > 0 && content[0].type === "text") {
      try {
        return JSON.parse(content[0].text as string);
      } catch {
        return content[0].text;
      }
    }
    return content;
  }
}

export function createMcpClient(demo: boolean): McpClient {
  return demo ? new DemoMcpClient() : new RealMcpClient();
}
