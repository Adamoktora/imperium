import type { SpendingPolicy, PolicyResult } from "../types.js";

export interface TransactionAction {
  type: "swap" | "bridge" | "transfer";
  token: string;
  amountUsd: number;
  slippage?: number;
}

export class PolicyEngine {
  private policy: SpendingPolicy;
  private todaySpent: number = 0;

  constructor(policy: SpendingPolicy) {
    this.policy = policy;
  }

  checkTransaction(action: TransactionAction): PolicyResult {
    if (this.policy.blockedTokens.includes(action.token)) {
      return { approved: false, reason: `Token ${action.token} is blocked by policy` };
    }

    if (this.policy.approvedTokens.length > 0 && !this.policy.approvedTokens.includes(action.token)) {
      return { approved: false, reason: `Token ${action.token} not in approved list` };
    }

    if (action.amountUsd > this.policy.perTransactionLimit) {
      return {
        approved: false,
        reason: `$${action.amountUsd} exceeds per-transaction limit of $${this.policy.perTransactionLimit}`,
      };
    }

    if (this.todaySpent + action.amountUsd > this.policy.dailyLimit) {
      return {
        approved: false,
        reason: `$${action.amountUsd} would exceed daily limit ($${this.todaySpent}/$${this.policy.dailyLimit} spent today)`,
      };
    }

    if (action.slippage !== undefined && action.slippage > this.policy.maxSlippage) {
      return {
        approved: false,
        reason: `Slippage ${action.slippage}% exceeds max slippage of ${this.policy.maxSlippage}%`,
      };
    }

    return { approved: true };
  }

  recordSpending(amountUsd: number): void {
    this.todaySpent += amountUsd;
  }

  getPolicy(): SpendingPolicy {
    return { ...this.policy };
  }

  setPolicy(policy: SpendingPolicy): void {
    this.policy = policy;
  }

  getTodaySpent(): number {
    return this.todaySpent;
  }
}
