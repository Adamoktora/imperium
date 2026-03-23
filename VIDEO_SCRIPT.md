# Imperium Demo Video Script

## Setup Sebelum Record

```bash
cd ~/hackathon/synthesis/imperium
rm -rf ~/.imperium    # Reset config biar clean
clear                 # Clear terminal
```

---

## SCENE 1: Intro (10 detik)

**Command:** (tidak ada, tampilkan terminal kosong atau website)

**Voice:**
> "Imperium is an AI-powered financial agent that manages your crypto portfolio across multiple chains. It uses 13 MoonPay CLI tools via real MCP protocol, Groq AI for autonomous decisions, and OpenWallet Standard for secure wallet management. Let me show you how it works."

---

## SCENE 2: Init Wallet (10 detik)

**Command:**
```bash
./imp init
```

**Voice:**
> "First, we initialize the wallet. Imperium creates a real HD wallet via OpenWallet Standard, supporting 7 chains - Ethereum, Solana, Bitcoin, Cosmos, Tron, TON, and Filecoin. One wallet, all chains."

---

## SCENE 3: Portfolio (10 detik)

**Command:**
```bash
./imp --demo portfolio
```

**Voice:**
> "Here's our portfolio - four tokens across two chains. WETH and USDC on Base, VVV on Base, and POL on Polygon. Total value around eight thousand dollars. All data comes from MoonPay CLI via MCP."

---

## SCENE 4: Risk Scan (10 detik)

**Command:**
```bash
./imp --demo risk scan
```

**Voice:**
> "The risk scanner checks every token for rug pull signals, holder concentration, and liquidity issues. WETH and USDC are safe - score zero. VVV gets a 40 - watch it. But POL scores 75 out of 100 - concentrated holders, low liquidity. The agent says: sell."

---

## SCENE 5: AI Analysis - STAR MOMENT (20 detik)

**Command:**
```bash
./imp --demo analyze
```

**Voice (saat "Gathering portfolio data..."):**
> "Now the AI kicks in. This is real - Groq Llama 3.3, 70 billion parameters. Not hardcoded. The agent sends portfolio data and risk scores to the LLM..."

**Voice (saat output muncul):**
> "And it comes back with a full assessment. It identifies POL as the top concern, recommends selling it entirely, and suggests a new target allocation focused on stable assets. This is a real AI making real financial decisions."

---

## SCENE 6: AI Rebalance (15 detik)

**Command:**
```bash
./imp --demo ai-rebalance
```

**Voice:**
> "AI rebalance takes it further. The LLM decides the optimal allocation: 50% WETH, 40% USDC, 10% VVV, zero POL. It generates the exact swap and bridge actions needed - sell VVV on Base, bridge POL from Polygon to Base. Each action is checked against the spending policy before execution."

---

## SCENE 7: Live MoonPay Data (15 detik)

**Command:**
```bash
./imp discover trending base
```

**Voice (saat trending output):**
> "This is NOT demo mode. These are live trending tokens from MoonPay CLI via real MCP connection. Real prices, real volumes, real-time data."

**Command:**
```bash
./imp discover whales base
```

**Voice:**
> "Smart money discovery - real whale wallets on Base. Top wallet made 2.5 million dollars in profit last month with a 48% win rate. All from MoonPay."

---

## SCENE 8: Watch Mode - Autonomous Agent (20 detik)

**Command:**
```bash
./imp --demo watch --interval 30
```

**Voice (saat header muncul):**
> "Watch mode is the fully autonomous agent loop. AI is enabled, on-chain logging is enabled. It runs continuously."

**Voice (saat cycle 1 berjalan):**
> "Every cycle: scan portfolio, check risks, detect alerts. POL triggers a sell alert. The AI automatically analyzes the situation, decides a rebalance target, generates swap and bridge actions, checks each one against the spending policy, and logs the decision on-chain as immutable proof."

**Voice (saat on-chain link muncul):**
> "That transaction hash is real - verifiable on Base Sepolia Basescan right now."

**(Ctrl+C untuk stop)**

---

## SCENE 9: Close (10 detik)

**Voice:**
> "Imperium. 13 MoonPay tools via real MCP. Groq AI for autonomous decisions. OpenWallet Standard for secure wallet management. On-chain decision logging on Base. 40 tests passing. Built for The Synthesis hackathon."

**(Tampilkan website: https://imperium-demo.vercel.app)**

---

## Command Cheat Sheet (copy-paste cepat)

```bash
clear
./imp init
./imp --demo portfolio
./imp --demo risk scan
./imp --demo analyze
./imp --demo ai-rebalance
./imp discover trending base
./imp discover whales base
./imp --demo watch --interval 30
```

## Tips Recording

- Terminal fullscreen, font besar (14-16pt)
- Dark theme (terminal default)
- Jangan buru-buru - beri 2-3 detik setiap output muncul
- AI commands (analyze, ai-rebalance) butuh 3-5 detik response
- Watch mode butuh 15-20 detik untuk 1 cycle penuh
- Total target: 2 menit
- Tools: OBS Studio, Loom (free), atau QuickTime (Mac)
