import type { McpClient, TrendingToken, SmartWallet } from "../types.js";

export class DiscoveryService {
  constructor(private client: McpClient) {}

  async getTrending(chain: string): Promise<TrendingToken[]> {
    const result = await this.client.callTool("token_trending_list", {
      chain,
      limit: 10,
      page: 1,
    }) as any;
    // MoonPay returns array or { items: [...] }
    const items = Array.isArray(result) ? result : (result?.items ?? []);
    return items.map((t: any) => ({
      address: t.address ?? "",
      name: t.name ?? t.token ?? "",
      symbol: t.symbol ?? "",
      chain: t.chain ?? chain,
      price: Number(t.marketData?.price ?? t.price ?? 0),
      change24h: Number(t.marketData?.priceChangePercent?.["24h"] ?? t.change24h ?? 0),
      volume24h: Number(t.marketData?.volume?.["24h"] ?? t.volume24h ?? 0),
      liquidity: Number(t.marketData?.liquidity ?? 0),
      marketCap: Number(t.marketData?.marketCap ?? 0),
    }));
  }

  async getSmartMoney(chain: string): Promise<SmartWallet[]> {
    const result = await this.client.callTool("wallet_discover", {
      chain,
      ranking: "pnl",
      limit: 5,
    }) as any;
    // MoonPay returns { wallets: [...] } or array
    const wallets = Array.isArray(result) ? result : (result?.wallets ?? []);
    return wallets.map((w: any) => ({
      address: w.address ?? "",
      pnl: Number(w.realizedProfitUsd30d ?? w.realizedProfitUsd1y ?? w.pnl ?? 0),
      pnlPct: Number(w.realizedProfitPercentage30d ?? w.realizedProfitPercentage1y ?? 0),
      winRate: Number(w.winRate30d ?? w.winRate1y ?? w.winRate ?? 0),
      swaps: Number(w.swaps30d ?? w.swaps1y ?? 0),
      volume: String(w.volumeUsd30d ?? w.volumeUsd1y ?? "0"),
      labels: w.labels ?? [],
      scammerScore: Number(w.scammerScore ?? 0),
    }));
  }

  async search(query: string, chain: string = "base"): Promise<unknown[]> {
    const result = await this.client.callTool("token_search", {
      query,
      chain,
      limit: 5,
    }) as any;
    const items = Array.isArray(result) ? result : (result?.items ?? []);
    return items;
  }
}
