import chalk from "chalk";
import Table from "cli-table3";
import type { Allocation, RiskReport, RebalanceAction, DriftReport, PnLSummary, Activity, TrendingToken, SmartWallet, SpendingPolicy } from "../types.js";

export function header(text: string): void {
  console.log(chalk.bold.cyan(`\n⚔  ${text}`));
  console.log(chalk.gray("─".repeat(60)));
}

export function showAllocation(allocations: Allocation[]): void {
  const table = new Table({
    head: ["Token", "Chain", "Value", "Allocation"].map((h) => chalk.bold(h)),
  });
  const totalUsd = allocations.reduce((s, a) => s + a.usdValue, 0);
  for (const a of allocations) {
    table.push([a.symbol, a.chain, `$${a.usdValue.toLocaleString()}`, `${a.pct.toFixed(1)}%`]);
  }
  console.log(table.toString());
  console.log(chalk.bold(`  Total: $${totalUsd.toLocaleString()}`));
}

export function showPnL(pnl: PnLSummary): void {
  const color = pnl.totalPnL >= 0 ? chalk.green : chalk.red;
  console.log(`  Portfolio Value: ${chalk.bold(`$${pnl.totalValue.toLocaleString()}`)}`);
  console.log(`  Total PnL:      ${color(`$${pnl.totalPnL.toLocaleString()} (${pnl.pnlPct.toFixed(1)}%)`)}`);
  if (pnl.positions?.length) {
    const table = new Table({ head: ["Token", "PnL", "PnL %"].map((h) => chalk.bold(h)) });
    for (const p of pnl.positions) {
      const c = p.pnl >= 0 ? chalk.green : chalk.red;
      table.push([p.token, c(`$${p.pnl.toLocaleString()}`), c(`${p.pnlPct.toFixed(1)}%`)]);
    }
    console.log(table.toString());
  }
}

export function showActivity(activities: Activity[]): void {
  const table = new Table({ head: ["Type", "Token", "Amount", "Time", "Tx"].map((h) => chalk.bold(h)) });
  for (const a of activities) {
    table.push([a.type, a.token, a.amount, a.timestamp.slice(0, 16), a.txHash?.slice(0, 10) || "-"]);
  }
  console.log(table.toString());
}

export function showRiskReports(reports: RiskReport[]): void {
  const table = new Table({ head: ["Token", "Chain", "Risk", "Flags", "Action"].map((h) => chalk.bold(h)) });
  for (const r of reports) {
    const riskColor = r.riskScore >= 70 ? chalk.red : r.riskScore >= 40 ? chalk.yellow : chalk.green;
    const recColor = r.recommendation === "sell" ? chalk.red : r.recommendation === "watch" ? chalk.yellow : chalk.green;
    table.push([r.token, r.chain, riskColor(`${r.riskScore}/100`), r.flags.join(", ") || "none", recColor(r.recommendation.toUpperCase())]);
  }
  console.log(table.toString());
}

export function showDrift(drifts: DriftReport[]): void {
  const table = new Table({ head: ["Token", "Current", "Target", "Drift"].map((h) => chalk.bold(h)) });
  for (const d of drifts) {
    const driftColor = Math.abs(d.driftPct) > 5 ? chalk.red : chalk.green;
    table.push([d.token, `${d.currentPct.toFixed(1)}%`, `${d.targetPct.toFixed(1)}%`, driftColor(`${d.driftPct > 0 ? "+" : ""}${d.driftPct.toFixed(1)}%`)]);
  }
  console.log(table.toString());
}

export function showActions(actions: RebalanceAction[]): void {
  if (actions.length === 0) {
    console.log(chalk.green("  Portfolio is balanced. No actions needed."));
    return;
  }
  for (const a of actions) {
    const label = a.type === "bridge" ? "BRIDGE" : "SWAP";
    const color = a.type === "bridge" ? chalk.magenta : chalk.yellow;
    const chainInfo = a.type === "bridge" ? `${a.from.chain} → ${a.to.chain}` : `on ${a.from.chain}`;
    console.log(color(`  → ${label} $${a.estimatedUsd.toFixed(0)} ${a.from.token} → ${a.to.token} ${chainInfo}`));
    console.log(chalk.gray(`    ${a.reason}`));
  }
}

export function showTrending(tokens: TrendingToken[]): void {
  const table = new Table({ head: ["Token", "Price", "24h Change", "Volume"].map((h) => chalk.bold(h)) });
  for (const t of tokens) {
    const c = t.change24h >= 0 ? chalk.green : chalk.red;
    table.push([`${t.symbol}`, `$${t.price.toLocaleString()}`, c(`${t.change24h > 0 ? "+" : ""}${t.change24h.toFixed(1)}%`), `$${(t.volume24h / 1e6).toFixed(1)}M`]);
  }
  console.log(table.toString());
}

export function showSmartMoney(wallets: SmartWallet[]): void {
  const table = new Table({ head: ["Address", "PnL", "Win Rate"].map((h) => chalk.bold(h)) });
  for (const w of wallets) {
    table.push([w.address, chalk.green(`$${w.pnl.toLocaleString()}`), `${w.winRate.toFixed(1)}%`]);
  }
  console.log(table.toString());
}

export function showPolicy(policy: SpendingPolicy): void {
  console.log(`  Daily Limit:      $${policy.dailyLimit}`);
  console.log(`  Per-Tx Limit:     $${policy.perTransactionLimit}`);
  console.log(`  Max Slippage:     ${policy.maxSlippage}%`);
  console.log(`  Require Preview:  ${policy.requirePreview}`);
  console.log(`  Approved Tokens:  ${policy.approvedTokens.length ? policy.approvedTokens.join(", ") : "any"}`);
  console.log(`  Blocked Tokens:   ${policy.blockedTokens.length ? policy.blockedTokens.join(", ") : "none"}`);
  if (policy.attestation) console.log(`  Attestation:      ${policy.attestation.slice(0, 20)}...`);
}

export function success(msg: string): void { console.log(chalk.green(`✓ ${msg}`)); }
export function warn(msg: string): void { console.log(chalk.yellow(`⚠ ${msg}`)); }
export function error(msg: string): void { console.log(chalk.red(`✗ ${msg}`)); }
