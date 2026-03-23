import type { McpClient, TokenBalance, Allocation, PnLSummary, Activity } from "../types.js";

export class PortfolioService {
  constructor(private client: McpClient) {}

  async getHoldings(chain?: string): Promise<TokenBalance[]> {
    const args: Record<string, unknown> = {};
    if (chain) args.chain = chain;
    const result = await this.client.callTool("token_balance_list", args) as any;
    // MoonPay returns { items: [...] } or array directly
    const items = Array.isArray(result) ? result : (result?.items ?? []);
    return items.map((item: any) => ({
      token: item.token ?? item.address ?? "",
      symbol: item.symbol ?? "",
      chain: item.chain ?? chain ?? "base",
      balance: String(item.balance ?? "0"),
      usdValue: Number(item.usdValue ?? 0),
      address: item.address ?? item.token,
      name: item.name,
    }));
  }

  async getAllocation(): Promise<Allocation[]> {
    const holdings = await this.getHoldings();
    const totalUsd = holdings.reduce((sum, h) => sum + h.usdValue, 0);
    if (totalUsd === 0) return [];

    return holdings.map((h) => ({
      token: h.token,
      symbol: h.symbol,
      chain: h.chain,
      pct: (h.usdValue / totalUsd) * 100,
      usdValue: h.usdValue,
    }));
  }

  async getPnL(): Promise<PnLSummary> {
    const raw = await this.client.callTool("wallet_pnl_retrieve", {}) as any;
    return {
      totalValue: Number(raw.totalValueUsd ?? raw.totalValue ?? 0),
      totalPnL: Number(raw.realizedProfitUsd ?? raw.totalPnL ?? 0),
      pnlPct: Number(raw.realizedProfitPercentage ?? raw.pnlPct ?? 0),
      positions: (raw.positions ?? []).map((p: any) => ({
        token: p.token,
        chain: p.chain,
        pnl: Number(p.pnl),
        pnlPct: Number(p.pnlPct),
      })),
    };
  }

  async getActivity(chain: string): Promise<Activity[]> {
    const result = await this.client.callTool("wallet_activity_list", { chain });
    return result as Activity[];
  }

  async buyWithFiat(token: string, amount: string): Promise<{ checkoutUrl: string }> {
    const result = await this.client.callTool("buy", { token, amount });
    return result as { checkoutUrl: string };
  }

  async createDeposit(chain: string, token: string): Promise<unknown> {
    return this.client.callTool("deposit_create", { chain, token });
  }
}
