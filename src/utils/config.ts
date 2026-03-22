import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import type { ImperiumConfig, SpendingPolicy } from "../types.js";

const DEFAULT_CONFIG_DIR = join(homedir(), ".imperium");
const DEFAULT_CONFIG_PATH = join(DEFAULT_CONFIG_DIR, "config.json");

export function getDefaultPolicy(): SpendingPolicy {
  return {
    dailyLimit: 1000,
    perTransactionLimit: 500,
    approvedTokens: [],
    blockedTokens: [],
    maxSlippage: 2,
    requirePreview: true,
  };
}

export function getDefaultConfig(): ImperiumConfig {
  return {
    walletName: "",
    evmAddress: "",
    targetAllocation: [],
    policy: getDefaultPolicy(),
    spendingHistory: [],
  };
}

export function loadConfig(path: string = DEFAULT_CONFIG_PATH): ImperiumConfig {
  if (!existsSync(path)) {
    return getDefaultConfig();
  }
  try {
    const raw = readFileSync(path, "utf-8");
    return { ...getDefaultConfig(), ...JSON.parse(raw) };
  } catch {
    return getDefaultConfig();
  }
}

export function saveConfig(config: ImperiumConfig, path: string = DEFAULT_CONFIG_PATH): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
}

export function getConfigPath(): string {
  return DEFAULT_CONFIG_PATH;
}
