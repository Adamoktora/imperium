// === Portfolio ===
export interface TokenBalance {
  token: string;
  symbol: string;
  chain: string;
  balance: string;
  usdValue: number;
  address?: string;
}

export interface Allocation {
  token: string;
  symbol: string;
  chain: string;
  pct: number;
  usdValue: number;
}

export interface PnLSummary {
  totalValue: number;
  totalPnL: number;
  pnlPct: number;
  positions: { token: string; pnl: number; pnlPct: number }[];
}

export interface Activity {
  type: string;
  token: string;
  amount: string;
  chain: string;
  timestamp: string;
  txHash?: string;
}

// === Risk ===
export interface RiskReport {
  token: string;
  chain: string;
  address: string;
  riskScore: number;
  flags: string[];
  recommendation: "hold" | "sell" | "watch";
}

// === Rebalance ===
export interface TargetAllocation {
  token: string;
  pct: number;
}

export interface DriftReport {
  token: string;
  chain: string;
  currentPct: number;
  targetPct: number;
  driftPct: number;
}

export interface RebalanceAction {
  type: "swap";
  from: { token: string; chain: string; amount: string };
  to: { token: string; chain: string };
  reason: string;
  estimatedUsd: number;
}

export interface ExecutionResult {
  action: RebalanceAction;
  success: boolean;
  txHash?: string;
  error?: string;
}

// === Policy ===
export interface SpendingPolicy {
  dailyLimit: number;
  perTransactionLimit: number;
  approvedTokens: string[];
  blockedTokens: string[];
  maxSlippage: number;
  requirePreview: boolean;
  attestation?: string;
}

export interface PolicyResult {
  approved: boolean;
  reason?: string;
}

export interface SpendingRecord {
  date: string;
  totalUsd: number;
}

// === Config ===
export interface ImperiumConfig {
  walletName: string;
  evmAddress: string;
  targetAllocation: TargetAllocation[];
  policy: SpendingPolicy;
  spendingHistory: SpendingRecord[];
}

// === Discovery ===
export interface TrendingToken {
  token: string;
  symbol: string;
  chain: string;
  price: number;
  change24h: number;
  volume24h: number;
}

export interface SmartWallet {
  address: string;
  chain: string;
  pnl: number;
  winRate: number;
}

// === MCP ===
export interface McpClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  isDemo(): boolean;
}
