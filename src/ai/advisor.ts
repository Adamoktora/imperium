import Groq from "groq-sdk";
import type { Allocation, RiskReport, TrendingToken, SmartWallet } from "../types.js";

let groqClient: Groq | null = null;

export function initGroq(): boolean {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "gsk_your_api_key_here") {
    return false;
  }
  groqClient = new Groq({ apiKey });
  return true;
}

export function isAIAvailable(): boolean {
  return groqClient !== null;
}

const MODEL = "llama-3.3-70b-versatile";

async function ask(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!groqClient) return "[AI unavailable - set GROQ_API_KEY in .env]";
  try {
    const response = await groqClient.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });
    return response.choices[0]?.message?.content || "[No response]";
  } catch (err: any) {
    return `[AI error: ${err.message}]`;
  }
}

const SYSTEM_PROMPT = `You are Imperium, an AI financial advisor for crypto portfolios.
You analyze portfolio data, market conditions, and risk factors to provide actionable advice.
Be concise, specific, and data-driven. Use numbers and percentages.
Format your response with clear sections. No fluff.`;

export async function analyzePortfolio(
  allocation: Allocation[],
  riskReports: RiskReport[],
): Promise<string> {
  const totalUsd = allocation.reduce((s, a) => s + a.usdValue, 0);
  const portfolioData = allocation.map(a =>
    `${a.symbol}: ${a.pct.toFixed(1)}% ($${a.usdValue.toFixed(0)}) on ${a.chain}`
  ).join("\n");
  const riskData = riskReports.map(r =>
    `${r.token}: risk ${r.riskScore}/100 [${r.flags.join(", ") || "none"}] -> ${r.recommendation}`
  ).join("\n");

  return ask(SYSTEM_PROMPT, `Analyze this crypto portfolio and give actionable recommendations:

PORTFOLIO (Total: $${totalUsd.toFixed(0)}):
${portfolioData}

RISK SCAN:
${riskData}

Provide:
1. Portfolio health assessment (1 sentence)
2. Top risk concern (if any)
3. Recommended action (specific: what to sell/buy/hold and why)
4. Suggested target allocation with reasoning`);
}

export async function analyzeRisk(
  token: string,
  chain: string,
  riskReport: RiskReport,
  holderData?: any,
): Promise<string> {
  return ask(SYSTEM_PROMPT, `Deep risk analysis for ${token} on ${chain}:

Risk Score: ${riskReport.riskScore}/100
Flags: ${riskReport.flags.join(", ") || "none"}
Current Recommendation: ${riskReport.recommendation}
${holderData ? `Holder concentration: top 10 hold ${holderData.top10ConcentrationPercent || "?"}%` : ""}

Provide:
1. Risk assessment (1 sentence)
2. What the flags mean for this specific token
3. Should I hold, reduce, or exit? With specific reasoning
4. What would change your recommendation?`);
}

export async function analyzeTrending(
  tokens: TrendingToken[],
  whales?: SmartWallet[],
): Promise<string> {
  const tokenData = tokens.slice(0, 10).map(t =>
    `${t.symbol}: $${t.price.toFixed(6)} | 24h: ${(t.change24h * 100).toFixed(1)}% | vol: $${(t.volume24h / 1e6).toFixed(1)}M | liq: $${(t.liquidity / 1e6).toFixed(1)}M`
  ).join("\n");
  const whaleData = whales?.slice(0, 3).map(w =>
    `${w.address.slice(0, 10)}...: PnL $${Number(w.pnl).toLocaleString()} | win rate ${w.winRate.toFixed(0)}%`
  ).join("\n") || "No whale data";

  return ask(SYSTEM_PROMPT, `Analyze trending tokens and smart money activity:

TRENDING TOKENS:
${tokenData}

SMART MONEY:
${whaleData}

Provide:
1. Market sentiment (bullish/bearish/neutral with reason)
2. Top pick: which token looks most promising and why
3. Avoid: which token has red flags
4. Smart money signal: what are whales doing?`);
}

export async function decideRebalance(
  allocation: Allocation[],
  riskReports: RiskReport[],
): Promise<{ targets: { token: string; pct: number }[]; reasoning: string }> {
  const totalUsd = allocation.reduce((s, a) => s + a.usdValue, 0);
  const data = allocation.map(a => {
    const risk = riskReports.find(r => r.token === a.symbol);
    return `${a.symbol}: ${a.pct.toFixed(1)}% ($${a.usdValue.toFixed(0)}) risk=${risk?.riskScore ?? "?"}/100 [${risk?.recommendation ?? "?"}]`;
  }).join("\n");

  const response = await ask(SYSTEM_PROMPT, `Based on this portfolio and risk data, suggest optimal target allocation:

CURRENT PORTFOLIO (Total: $${totalUsd.toFixed(0)}):
${data}

Rules:
- Allocations must sum to 100%
- Tokens with risk >= 70 should be reduced or eliminated
- Prefer stable assets (USDC, WETH) for safety
- Keep it simple: max 4 tokens in target

Respond in EXACTLY this format (no other text):
TOKEN1:PERCENT
TOKEN2:PERCENT
REASONING: your one-line reasoning`);

  const lines = response.trim().split("\n");
  const targets: { token: string; pct: number }[] = [];
  let reasoning = "";

  for (const line of lines) {
    if (line.startsWith("REASONING:")) {
      reasoning = line.replace("REASONING:", "").trim();
    } else if (line.includes(":")) {
      const [token, pctStr] = line.split(":");
      const pct = parseFloat(pctStr);
      if (token && !isNaN(pct) && pct > 0) {
        targets.push({ token: token.trim(), pct });
      }
    }
  }

  // Normalize to 100% if AI didn't do it perfectly
  const total = targets.reduce((s, t) => s + t.pct, 0);
  if (total > 0 && Math.abs(total - 100) > 1) {
    for (const t of targets) {
      t.pct = (t.pct / total) * 100;
    }
  }

  return { targets, reasoning: reasoning || "AI-optimized allocation based on risk analysis" };
}
