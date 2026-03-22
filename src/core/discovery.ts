import type { McpClient, TrendingToken, SmartWallet } from "../types.js";

export class DiscoveryService {
  constructor(private client: McpClient) {}

  async getTrending(chain: string): Promise<TrendingToken[]> {
    const result = await this.client.callTool("token_trending_list", { chain });
    return result as TrendingToken[];
  }

  async getSmartMoney(chain: string): Promise<SmartWallet[]> {
    const result = await this.client.callTool("wallet_discover", { chain });
    return result as SmartWallet[];
  }

  async search(query: string): Promise<unknown[]> {
    const result = await this.client.callTool("token_search", { query });
    return result as unknown[];
  }
}
