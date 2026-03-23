#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { createMcpClient } from "./mcp/client.js";
import { PortfolioService } from "./core/portfolio.js";
import { RiskService } from "./core/risk.js";
import { RebalanceService, calculateDrift, generateActions } from "./core/rebalance.js";
import { DiscoveryService } from "./core/discovery.js";
import { PolicyEngine } from "./wallet/policy.js";
import { loadConfig, saveConfig, getConfigPath, getDefaultPolicy } from "./utils/config.js";
import { initWallet, isOWSAvailable, signPolicyAttestation } from "./wallet/ows.js";
import { initGroq, isAIAvailable, analyzePortfolio, analyzeRisk, analyzeTrending, decideRebalance } from "./ai/advisor.js";
import * as display from "./utils/display.js";
import type { TargetAllocation } from "./types.js";

// Initialize AI
const aiReady = initGroq();

const program = new Command();

program
  .name("imperium")
  .description("⚔  Imperium  - Multi-Chain Financial Command Center\n\n   Powered by MoonPay CLI (MCP) + OpenWallet Standard")
  .version("1.0.0")
  .option("--demo", "Run in demo mode (fixture data, no real funds needed)");

// === INIT ===
program
  .command("init")
  .description("Initialize Imperium  - create OWS wallet and config")
  .action(async () => {
    display.header("Imperium Init");
    const config = loadConfig();
    if (config.walletName) {
      display.warn(`Already initialized. Wallet: ${config.walletName}, Address: ${config.evmAddress}`);
      return;
    }
    console.log(`  OWS Available: ${isOWSAvailable() ? "yes" : "no (using demo wallet)"}`);
    const { address } = await initWallet("imperium-agent");
    config.walletName = "imperium-agent";
    config.evmAddress = address;
    saveConfig(config);
    display.success(`Wallet created! Address: ${address}`);
    display.success(`Config saved to ${getConfigPath()}`);
  });

// === PORTFOLIO ===
const portfolio = program.command("portfolio").description("View portfolio holdings, allocation, PnL");

portfolio
  .command("view")
  .description("Show holdings and allocation")
  .argument("[chain]", "Filter by chain")
  .action(async (chain?: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header("Portfolio");
    const allocation = await service.getAllocation();
    display.showAllocation(allocation);
    await client.disconnect();
  });

portfolio
  .command("pnl")
  .description("Profit & loss summary")
  .action(async () => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header("Profit & Loss");
    const pnl = await service.getPnL();
    display.showPnL(pnl);
    await client.disconnect();
  });

portfolio
  .command("activity")
  .description("Recent activity")
  .argument("<chain>", "Chain to query")
  .action(async (chain: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header(`Activity  - ${chain}`);
    const activities = await service.getActivity(chain);
    display.showActivity(activities);
    await client.disconnect();
  });

portfolio
  .command("buy")
  .description("Buy crypto with fiat (returns checkout URL)")
  .argument("<token>", "Token to buy (e.g., ETH)")
  .argument("[amount]", "Fiat amount in USD", "100")
  .action(async (token: string, amount: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header(`Buy ${token}`);
    const result = await service.buyWithFiat(token, amount);
    console.log(`  Checkout URL: ${(result as any).checkoutUrl || JSON.stringify(result)}`);
    display.success("Open the URL in your browser to complete the purchase.");
    await client.disconnect();
  });

portfolio
  .command("deposit")
  .description("Create a multi-chain deposit link")
  .argument("[chain]", "Destination chain", "base")
  .argument("[token]", "Destination token", "USDC")
  .action(async (chain: string, token: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new PortfolioService(client);
    display.header(`Deposit → ${token} on ${chain}`);
    const result = await service.createDeposit(chain, token);
    console.log(JSON.stringify(result, null, 2));
    display.success("Share the deposit addresses above. Incoming crypto auto-converts.");
    await client.disconnect();
  });

// Default: `imperium portfolio` shows view
portfolio.action(async () => {
  const client = createMcpClient(program.opts().demo);
  await client.connect();
  const service = new PortfolioService(client);
  display.header("Portfolio");
  const allocation = await service.getAllocation();
  display.showAllocation(allocation);
  await client.disconnect();
});

// === RISK ===
const risk = program.command("risk").description("Risk analysis and safety scanning");

risk
  .command("scan")
  .description("Scan all holdings for risks")
  .action(async () => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const portfolioService = new PortfolioService(client);
    const riskService = new RiskService(client);
    display.header("Risk Scan");
    const holdings = await portfolioService.getHoldings();
    const reports = await riskService.scanPortfolio(holdings);
    display.showRiskReports(reports);
    await client.disconnect();
  });

risk
  .command("check")
  .description("Check a specific token")
  .argument("<address>", "Token address")
  .argument("<chain>", "Chain")
  .action(async (address: string, chain: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const riskService = new RiskService(client);
    display.header(`Risk Check  - ${address.slice(0, 10)}...`);
    const report = await riskService.checkToken(address, chain);
    display.showRiskReports([report]);
    await client.disconnect();
  });

// === REBALANCE ===
const rebalance = program.command("rebalance").description("Portfolio rebalancing");

rebalance
  .command("target")
  .description("Set target allocation (e.g., ETH:50 USDC:50)")
  .argument("<pairs...>", "Token:Percentage pairs")
  .action(async (pairs: string[]) => {
    display.header("Set Target Allocation");
    const targets: TargetAllocation[] = pairs.map((p) => {
      const [token, pctStr] = p.split(":");
      return { token, pct: parseFloat(pctStr) };
    });
    const totalPct = targets.reduce((s, t) => s + t.pct, 0);
    if (Math.abs(totalPct - 100) > 0.1) {
      display.error(`Allocation must sum to 100%. Got ${totalPct}%`);
      return;
    }
    const config = loadConfig();
    config.targetAllocation = targets;
    saveConfig(config);
    for (const t of targets) {
      console.log(`  ${t.token}: ${t.pct}%`);
    }
    display.success("Target allocation saved.");
  });

rebalance
  .command("preview")
  .description("Preview rebalance actions (dry run)")
  .action(async () => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const config = loadConfig();
    if (!config.targetAllocation.length) {
      display.error("No target set. Run: imperium rebalance target ETH:50 USDC:50");
      return;
    }
    const portfolioService = new PortfolioService(client);
    display.header("Rebalance Preview");
    const allocation = await portfolioService.getAllocation();
    const drift = calculateDrift(allocation, config.targetAllocation);
    display.showDrift(drift);
    const actions = generateActions(drift, allocation);
    console.log("");
    display.header("Proposed Actions");
    display.showActions(actions);
    await client.disconnect();
  });

rebalance
  .command("execute")
  .description("Execute rebalance (with policy check)")
  .action(async () => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const config = loadConfig();
    if (!config.targetAllocation.length) {
      display.error("No target set. Run: imperium rebalance target ETH:50 USDC:50");
      return;
    }
    const policyEngine = new PolicyEngine(config.policy);
    const portfolioService = new PortfolioService(client);
    const rebalanceService = new RebalanceService(client, policyEngine);

    display.header("Rebalance Execute");
    const allocation = await portfolioService.getAllocation();
    const actions = await rebalanceService.preview(allocation, config.targetAllocation);

    if (actions.length === 0) {
      display.success("Portfolio is balanced. No actions needed.");
      return;
    }

    console.log(`  Executing ${actions.length} action(s)...`);
    const results = await rebalanceService.execute(actions);
    for (const r of results) {
      if (r.success) {
        display.success(`Swapped ${r.action.from.token} → ${r.action.to.token} | tx: ${r.txHash?.slice(0, 16)}...`);
      } else {
        display.error(`Failed: ${r.action.from.token} → ${r.action.to.token} | ${r.error}`);
      }
    }
    await client.disconnect();
  });

// === DISCOVER ===
const discover = program.command("discover").description("Discover trending tokens and smart money");

discover
  .command("trending")
  .description("Trending tokens on a chain")
  .argument("<chain>", "Chain to query")
  .action(async (chain: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new DiscoveryService(client);
    display.header(`Trending  - ${chain}`);
    const tokens = await service.getTrending(chain);
    display.showTrending(tokens);
    await client.disconnect();
  });

discover
  .command("whales")
  .description("Top wallets by PnL (smart money)")
  .argument("<chain>", "Chain to query")
  .action(async (chain: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new DiscoveryService(client);
    display.header(`Smart Money  - ${chain}`);
    const wallets = await service.getSmartMoney(chain);
    display.showSmartMoney(wallets);
    await client.disconnect();
  });

discover
  .command("search")
  .description("Search tokens")
  .argument("<query>", "Search query")
  .action(async (query: string) => {
    const client = createMcpClient(program.opts().demo);
    await client.connect();
    const service = new DiscoveryService(client);
    display.header(`Search: "${query}"`);
    const results = await service.search(query);
    console.log(JSON.stringify(results, null, 2));
    await client.disconnect();
  });

// === POLICY ===
const policy = program.command("policy").description("Manage spending policies");

policy
  .command("show")
  .description("Show current spending policy")
  .action(() => {
    display.header("Spending Policy");
    const config = loadConfig();
    display.showPolicy(config.policy);
  });

policy
  .command("set")
  .description("Update spending policy")
  .option("--daily-limit <n>", "Max USD per day", parseFloat)
  .option("--tx-limit <n>", "Max USD per transaction", parseFloat)
  .option("--max-slippage <n>", "Max slippage %", parseFloat)
  .option("--block <tokens>", "Comma-separated blocked tokens")
  .option("--approve <tokens>", "Comma-separated approved tokens")
  .action(async (opts: any) => {
    display.header("Update Policy");
    const config = loadConfig();
    if (opts.dailyLimit !== undefined) config.policy.dailyLimit = opts.dailyLimit;
    if (opts.txLimit !== undefined) config.policy.perTransactionLimit = opts.txLimit;
    if (opts.maxSlippage !== undefined) config.policy.maxSlippage = opts.maxSlippage;
    if (opts.block) config.policy.blockedTokens = opts.block.split(",");
    if (opts.approve) config.policy.approvedTokens = opts.approve.split(",");

    const attestation = await signPolicyAttestation(config.policy, config.walletName || "imperium-agent");
    config.policy.attestation = attestation;
    saveConfig(config);
    display.showPolicy(config.policy);
    display.success("Policy updated and signed.");
  });

// Default action
policy.action(() => {
  display.header("Spending Policy");
  const config = loadConfig();
  display.showPolicy(config.policy);
});

// === ANALYZE (AI-POWERED) ===
program
  .command("analyze")
  .description("AI-powered portfolio analysis and recommendations (requires GROQ_API_KEY)")
  .action(async () => {
    if (!isAIAvailable()) {
      display.error("AI unavailable. Set GROQ_API_KEY in .env (free: https://console.groq.com)");
      return;
    }
    const client = createMcpClient(program.opts().demo);
    await client.connect();

    display.header("AI Portfolio Analysis");
    console.log(chalk.dim("  Gathering portfolio data..."));

    const portfolioService = new PortfolioService(client);
    const riskService = new RiskService(client);

    const allocation = await portfolioService.getAllocation();
    if (allocation.length === 0) {
      display.warn("Empty portfolio. Nothing to analyze.");
      await client.disconnect();
      return;
    }

    const holdings = await portfolioService.getHoldings();
    const riskReports = await riskService.scanPortfolio(holdings);

    console.log(chalk.dim("  Asking AI for analysis...\n"));
    const analysis = await analyzePortfolio(allocation, riskReports);
    console.log(chalk.white(analysis));

    await client.disconnect();
  });

// === AI REBALANCE ===
program
  .command("ai-rebalance")
  .description("AI decides optimal target allocation based on risk analysis")
  .action(async () => {
    if (!isAIAvailable()) {
      display.error("AI unavailable. Set GROQ_API_KEY in .env (free: https://console.groq.com)");
      return;
    }
    const client = createMcpClient(program.opts().demo);
    await client.connect();

    display.header("AI Rebalance Advisor");
    console.log(chalk.dim("  Analyzing portfolio and risks...\n"));

    const portfolioService = new PortfolioService(client);
    const riskService = new RiskService(client);

    const allocation = await portfolioService.getAllocation();
    const holdings = await portfolioService.getHoldings();
    const riskReports = await riskService.scanPortfolio(holdings);

    const { targets, reasoning } = await decideRebalance(allocation, riskReports);

    if (targets.length === 0) {
      display.error("AI could not determine target allocation.");
      await client.disconnect();
      return;
    }

    display.header("AI Recommended Allocation");
    for (const t of targets) {
      console.log(`  ${t.token}: ${t.pct.toFixed(0)}%`);
    }
    console.log(chalk.dim(`\n  Reasoning: ${reasoning}`));

    // Preview what rebalance would look like
    const drift = calculateDrift(allocation, targets);
    const actions = generateActions(drift, allocation);
    console.log("");
    display.header("Proposed Actions");
    display.showActions(actions);

    // Save targets to config
    const config = loadConfig();
    config.targetAllocation = targets;
    saveConfig(config);
    display.success("AI targets saved. Run 'imperium rebalance execute' to apply.");

    await client.disconnect();
  });

// === WATCH MODE (AUTONOMOUS) ===
program
  .command("watch")
  .description("Autonomous monitoring - continuously scans portfolio and alerts on changes")
  .option("--interval <seconds>", "Check interval in seconds", "60")
  .action(async (opts: any) => {
    const interval = parseInt(opts.interval) * 1000;
    const isDemo = program.opts().demo;
    const client = createMcpClient(isDemo);
    await client.connect();

    const portfolioService = new PortfolioService(client);
    const riskService = new RiskService(client);

    display.header("Imperium Watch Mode");
    console.log(chalk.dim(`  Mode: ${isDemo ? "demo" : "live"}`));
    console.log(chalk.dim(`  AI: ${isAIAvailable() ? "enabled (Groq)" : "disabled (rule-based only)"}`));
    console.log(chalk.dim(`  Interval: ${opts.interval}s`));
    console.log(chalk.dim("  Press Ctrl+C to stop\n"));

    let lastRiskScores: Record<string, number> = {};
    let cycle = 0;

    const runCycle = async () => {
      cycle++;
      const timestamp = new Date().toLocaleTimeString();
      console.log(chalk.dim(`\n--- Cycle ${cycle} | ${timestamp} ---`));

      try {
        const holdings = await portfolioService.getHoldings();
        const allocation = await portfolioService.getAllocation();
        const totalUsd = allocation.reduce((s, a) => s + a.usdValue, 0);

        console.log(chalk.dim(`  Portfolio: $${totalUsd.toLocaleString()} | ${holdings.length} tokens`));

        // Risk scan
        const reports = await riskService.scanPortfolio(holdings);
        let alerts = 0;

        for (const r of reports) {
          const prevScore = lastRiskScores[r.token] ?? r.riskScore;
          const delta = r.riskScore - prevScore;

          if (r.riskScore >= 70) {
            display.error(`ALERT: ${r.token} risk ${r.riskScore}/100 -> ${r.recommendation}`);
            alerts++;
          } else if (delta > 10) {
            display.warn(`${r.token} risk increased: ${prevScore} -> ${r.riskScore}`);
            alerts++;
          } else if (r.riskScore >= 40) {
            display.warn(`${r.token}: risk ${r.riskScore}/100 [${r.recommendation}]`);
          } else {
            console.log(chalk.green(`  ${r.token}: OK (${r.riskScore}/100)`));
          }

          lastRiskScores[r.token] = r.riskScore;
        }

        // AI analysis on alerts
        if (alerts > 0 && isAIAvailable()) {
          console.log(chalk.dim("\n  AI analyzing alerts..."));
          const analysis = await analyzePortfolio(allocation, reports);
          console.log(chalk.white(`\n${analysis}`));
        }

        if (alerts === 0) {
          display.success("All clear. No risk alerts.");
        }
      } catch (err: any) {
        display.error(`Cycle error: ${err.message}`);
      }
    };

    // Run first cycle immediately
    await runCycle();

    // Continue running
    const timer = setInterval(runCycle, interval);

    process.on("SIGINT", async () => {
      clearInterval(timer);
      console.log(chalk.dim("\n  Watch mode stopped."));
      await client.disconnect();
      process.exit(0);
    });
  });

// === INTERACTIVE REPL ===
program
  .command("interactive")
  .alias("i")
  .description("Interactive mode - type commands in a live shell")
  .action(async () => {
    const readline = await import("readline");
    const isDemo = program.opts().demo;
    const client = createMcpClient(isDemo);
    await client.connect();

    const portfolioService = new PortfolioService(client);
    const riskService = new RiskService(client);
    const discoveryService = new DiscoveryService(client);
    const config = loadConfig();
    const policyEngine = new PolicyEngine(config.policy);
    const rebalanceService = new RebalanceService(client, policyEngine);

    console.log("");
    console.log(chalk.bold.cyan("  IMPERIUM v1.0 - Multi-Chain Financial Command Center"));
    console.log(chalk.dim(`  Mode: ${isDemo ? "demo (fixture data)" : "live (MoonPay CLI)"}`));
    console.log(chalk.dim(`  AI: ${isAIAvailable() ? "enabled (Groq Llama 3.3 70B)" : "disabled (set GROQ_API_KEY in .env)"}`));
    console.log(chalk.dim("  Type 'help' for commands, 'quit' to exit\n"));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan("imperium> "),
    });

    const commands: Record<string, () => Promise<void>> = {
      "help": async () => {
        console.log(chalk.bold("\n  Available commands:\n"));
        console.log("  portfolio          Show holdings & allocation");
        console.log("  pnl                Profit & loss summary");
        console.log("  activity           Recent transactions (Base)");
        console.log("  risk               Scan all holdings for risks");
        console.log("  trending           Trending tokens on Base");
        console.log("  whales             Smart money wallets on Base");
        console.log("  rebalance          Set target ETH:50 USDC:50 + preview");
        console.log("  execute            Execute rebalance (policy-gated)");
        console.log("  policy             Show spending policy");
        console.log(chalk.cyan("  analyze            AI portfolio analysis (requires GROQ_API_KEY)"));
        console.log(chalk.cyan("  ai-rebalance       AI decides optimal allocation"));
        console.log("  clear              Clear screen");
        console.log("  quit               Exit");
        console.log(chalk.dim(`\n  AI: ${isAIAvailable() ? "enabled (Groq Llama 3.3)" : "disabled (set GROQ_API_KEY)"}\n`));
      },
      "portfolio": async () => {
        display.header("Portfolio");
        const allocation = await portfolioService.getAllocation();
        display.showAllocation(allocation);
      },
      "pnl": async () => {
        display.header("Profit & Loss");
        const pnl = await portfolioService.getPnL();
        display.showPnL(pnl);
      },
      "activity": async () => {
        display.header("Activity - base");
        const activities = await portfolioService.getActivity("base");
        display.showActivity(activities);
      },
      "risk": async () => {
        display.header("Risk Scan");
        const holdings = await portfolioService.getHoldings();
        const reports = await riskService.scanPortfolio(holdings);
        display.showRiskReports(reports);
      },
      "trending": async () => {
        display.header("Trending - base");
        const tokens = await discoveryService.getTrending("base");
        display.showTrending(tokens);
      },
      "whales": async () => {
        display.header("Smart Money - base");
        const wallets = await discoveryService.getSmartMoney("base");
        display.showSmartMoney(wallets);
      },
      "rebalance": async () => {
        const targets = [{ token: "ETH", pct: 50 }, { token: "USDC", pct: 50 }];
        const cfg = loadConfig();
        cfg.targetAllocation = targets;
        saveConfig(cfg);
        display.header("Set Target Allocation");
        console.log("  ETH: 50%");
        console.log("  USDC: 50%");
        display.success("Target set.");

        display.header("Rebalance Preview");
        const allocation = await portfolioService.getAllocation();
        const drift = calculateDrift(allocation, targets);
        display.showDrift(drift);
        const actions = generateActions(drift, allocation);
        console.log("");
        display.header("Proposed Actions");
        display.showActions(actions);
      },
      "execute": async () => {
        const cfg = loadConfig();
        if (!cfg.targetAllocation.length) {
          display.error("Run 'rebalance' first to set a target.");
          return;
        }
        display.header("Rebalance Execute");
        const allocation = await portfolioService.getAllocation();
        const actions = await rebalanceService.preview(allocation, cfg.targetAllocation);
        if (actions.length === 0) {
          display.success("Portfolio is balanced.");
          return;
        }
        console.log(`  Executing ${actions.length} action(s)...`);
        const results = await rebalanceService.execute(actions);
        for (const r of results) {
          if (r.success) {
            display.success(`${r.action.from.token} -> ${r.action.to.token} | tx: ${r.txHash?.slice(0, 16)}...`);
          } else {
            display.error(`Failed: ${r.action.from.token} -> ${r.action.to.token} | ${r.error}`);
          }
        }
      },
      "policy": async () => {
        display.header("Spending Policy");
        const cfg = loadConfig();
        display.showPolicy(cfg.policy);
      },
      "analyze": async () => {
        if (!isAIAvailable()) {
          display.error("AI unavailable. Set GROQ_API_KEY in .env");
          return;
        }
        display.header("AI Portfolio Analysis");
        console.log(chalk.dim("  Gathering data..."));
        const allocation = await portfolioService.getAllocation();
        const holdings = await portfolioService.getHoldings();
        const reports = await riskService.scanPortfolio(holdings);
        console.log(chalk.dim("  Asking AI...\n"));
        const analysis = await analyzePortfolio(allocation, reports);
        console.log(chalk.white(analysis));
      },
      "ai-rebalance": async () => {
        if (!isAIAvailable()) {
          display.error("AI unavailable. Set GROQ_API_KEY in .env");
          return;
        }
        display.header("AI Rebalance Advisor");
        console.log(chalk.dim("  Analyzing..."));
        const allocation = await portfolioService.getAllocation();
        const holdings = await portfolioService.getHoldings();
        const reports = await riskService.scanPortfolio(holdings);
        const { targets, reasoning } = await decideRebalance(allocation, reports);
        if (targets.length === 0) { display.error("AI could not determine allocation."); return; }
        for (const t of targets) console.log(`  ${t.token}: ${t.pct.toFixed(0)}%`);
        console.log(chalk.dim(`\n  Reasoning: ${reasoning}`));
        const drift = calculateDrift(allocation, targets);
        const actions = generateActions(drift, allocation);
        console.log("");
        display.header("Proposed Actions");
        display.showActions(actions);
        const cfg = loadConfig();
        cfg.targetAllocation = targets;
        saveConfig(cfg);
        display.success("AI targets saved.");
      },
      "clear": async () => {
        console.clear();
      },
    };

    rl.prompt();

    rl.on("line", async (line: string) => {
      const cmd = line.trim().toLowerCase();
      if (cmd === "quit" || cmd === "exit" || cmd === "q") {
        console.log(chalk.dim("\n  Goodbye.\n"));
        await client.disconnect();
        rl.close();
        process.exit(0);
      }
      const handler = commands[cmd];
      if (handler) {
        try {
          await handler();
        } catch (e: any) {
          display.error(e.message);
        }
      } else if (cmd) {
        console.log(chalk.dim(`  Unknown command: '${cmd}'. Type 'help' for available commands.`));
      }
      console.log("");
      rl.prompt();
    });

    rl.on("close", async () => {
      await client.disconnect();
      process.exit(0);
    });
  });

// Import chalk for interactive mode
import chalk from "chalk";

// Parse and run
program.parse();
