# Imperium Demo Video Script (2 minutes)

## Setup Before Recording

```bash
cd ~/hackathon/synthesis/imperium

# Reset config agar clean
rm -rf ~/.imperium

# Pastikan .env ada GROQ_API_KEY
cat .env

# Clear terminal
clear
```

## Recording Script

### Scene 1: Intro (10 detik)

Bicara atau text overlay:
"Imperium - AI-powered financial agent. 13 MoonPay tools via real MCP. Let me show you."

### Scene 2: Init OWS Wallet (10 detik)

```bash
./imp init
```

Output: 7-chain HD wallet (EVM, Solana, Bitcoin, Cosmos, Tron, TON, Filecoin)

### Scene 3: Portfolio (10 detik)

```bash
./imp --demo portfolio
```

Output: 4 tokens across 2 chains, total $8,188

### Scene 4: Risk Scan (10 detik)

```bash
./imp --demo risk scan
```

Output: WETH=HOLD, USDC=HOLD, VVV=WATCH (40/100), POL=SELL (75/100)

### Scene 5: AI Analysis - THE STAR (20 detik)

```bash
./imp --demo analyze
```

Output: Real Groq Llama 3.3 70B response - portfolio health, top risk, recommended action

Bicara: "Real AI analysis via Groq. Not hardcoded."

### Scene 6: AI Rebalance (15 detik)

```bash
./imp --demo ai-rebalance
```

Output: AI decides WETH:50 USDC:40 VVV:10 POL:0 + swap/bridge actions

### Scene 7: Real MoonPay Data (15 detik)

```bash
./imp discover trending base
```

Tanpa --demo! Live data dari MoonPay CLI via MCP.

```bash
./imp discover whales base
```

Real smart money wallets.

### Scene 8: Watch Mode - Autonomous (20 detik)

```bash
./imp --demo watch --interval 30
```

Tunjukkan 1 cycle: detect -> AI analyze -> AI decide rebalance -> policy check -> dry-run execute -> on-chain log.

Tekan Ctrl+C setelah 1 cycle selesai.

### Scene 9: Close (10 detik)

Bicara atau text:
"Imperium. 13 MoonPay tools. Groq AI. OWS wallet. On-chain decisions. Built for The Synthesis."

Tunjukkan: https://imperium-demo.vercel.app

---

## Command Cheat Sheet (copy-paste)

```bash
# 1. Init
./imp init

# 2. Portfolio
./imp --demo portfolio

# 3. Risk
./imp --demo risk scan

# 4. AI Analyze (REAL GROQ)
./imp --demo analyze

# 5. AI Rebalance (REAL GROQ)
./imp --demo ai-rebalance

# 6. Real MoonPay data (NO --demo)
./imp discover trending base
./imp discover whales base

# 7. Watch mode (autonomous)
./imp --demo watch --interval 30
# Wait for 1 cycle, then Ctrl+C
```

## Tips Recording

- Gunakan terminal fullscreen (font besar)
- Dark theme
- Jangan terlalu cepat - beri waktu baca output
- AI commands butuh 3-5 detik untuk response (Groq)
- Watch mode butuh 15-20 detik untuk 1 cycle penuh
- Total: sekitar 2 menit

## Tools Recording

- Windows: OBS Studio, ShareX
- Mac: QuickTime (Cmd+Shift+5)
- Linux: OBS Studio, SimpleScreenRecorder
- Online: Loom (free)
