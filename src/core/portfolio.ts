import type { McpClient, TokenBalance, Allocation, PnLSummary, Activity } from "../types.js";

const DEFAULT_WALLET = "imperium";
const DEFAULT_CHAIN = "base";

export class PortfolioService {
  constructor(private client: McpClient, private wallet: string = DEFAULT_WALLET) {}

  async getHoldings(chain?: string): Promise<TokenBalance[]> {
    const result = await this.client.callTool("token_balance_list", {
      wallet: this.wallet,
      chain: chain ?? DEFAULT_CHAIN,
    }) as any;
    // MoonPay returns { items: [...] } or array directly
    const items = Array.isArray(result) ? result : (result?.items ?? []);
    return items.map((item: any) => ({
      token: item.token ?? item.address ?? "",
      symbol: item.symbol ?? "",
      chain: item.chain ?? chain ?? DEFAULT_CHAIN,
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

  async getPnL(chain?: string): Promise<PnLSummary> {
    const raw = await this.client.callTool("wallet_pnl_retrieve", {
      wallet: this.wallet,
      chain: chain ?? DEFAULT_CHAIN,
    }) as any;
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
    const result = await this.client.callTool("wallet_activity_list", {
      wallet: this.wallet,
      chain,
      limit: 20,
      cursor: null,
    }) as any;
    const items = Array.isArray(result) ? result : (result?.items ?? []);
    return items as Activity[];
  }

  async buyWithFiat(token: string, amount: number): Promise<{ checkoutUrl: string }> {
    const result = await this.client.callTool("buy", {
      token,
      amount,
      wallet: this.wallet,
      email: null,
    });
    return result as { checkoutUrl: string };
  }

  async createDeposit(chain: string, token: string): Promise<unknown> {
    return this.client.callTool("deposit_create", {
      name: "imperium-deposit",
      wallet: this.wallet,
      chain,
      token,
    });
  }
}
