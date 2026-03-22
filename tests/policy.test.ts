import { describe, it, expect, beforeEach } from "vitest";
import { PolicyEngine } from "../src/wallet/policy.js";

describe("PolicyEngine", () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine({
      dailyLimit: 1000,
      perTransactionLimit: 500,
      approvedTokens: ["ETH", "USDC"],
      blockedTokens: ["SCAM"],
      maxSlippage: 2,
      requirePreview: true,
    });
  });

  it("approves transaction within limits", () => {
    const result = engine.checkTransaction({ type: "swap", token: "ETH", amountUsd: 200, slippage: 1 });
    expect(result.approved).toBe(true);
  });

  it("rejects transaction exceeding per-tx limit", () => {
    const result = engine.checkTransaction({ type: "swap", token: "ETH", amountUsd: 600, slippage: 1 });
    expect(result.approved).toBe(false);
    expect(result.reason).toContain("per-transaction limit");
  });

  it("rejects transaction exceeding daily limit", () => {
    engine.recordSpending(800);
    const result = engine.checkTransaction({ type: "swap", token: "ETH", amountUsd: 300, slippage: 1 });
    expect(result.approved).toBe(false);
    expect(result.reason).toContain("daily limit");
  });

  it("rejects blocked tokens", () => {
    const result = engine.checkTransaction({ type: "swap", token: "SCAM", amountUsd: 100, slippage: 1 });
    expect(result.approved).toBe(false);
    expect(result.reason).toContain("blocked");
  });

  it("rejects excessive slippage", () => {
    const result = engine.checkTransaction({ type: "swap", token: "ETH", amountUsd: 100, slippage: 5 });
    expect(result.approved).toBe(false);
    expect(result.reason).toContain("slippage");
  });

  it("allows any token when approvedTokens is empty", () => {
    engine = new PolicyEngine({
      dailyLimit: 1000, perTransactionLimit: 500, approvedTokens: [],
      blockedTokens: [], maxSlippage: 5, requirePreview: false,
    });
    const result = engine.checkTransaction({ type: "swap", token: "RANDOM", amountUsd: 100, slippage: 1 });
    expect(result.approved).toBe(true);
  });
});
