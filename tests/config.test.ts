import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, saveConfig, getDefaultConfig } from "../src/utils/config.js";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("Config", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "imperium-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it("returns default config when no file exists", () => {
    const config = loadConfig(join(tempDir, "config.json"));
    expect(config.walletName).toBe("");
    expect(config.policy.dailyLimit).toBe(1000);
  });

  it("saves and loads config", () => {
    const path = join(tempDir, "config.json");
    const config = getDefaultConfig();
    config.walletName = "test-wallet";
    config.evmAddress = "0x123";
    saveConfig(config, path);

    const loaded = loadConfig(path);
    expect(loaded.walletName).toBe("test-wallet");
    expect(loaded.evmAddress).toBe("0x123");
  });

  it("preserves spending history across saves", () => {
    const path = join(tempDir, "config.json");
    const config = getDefaultConfig();
    config.spendingHistory.push({ date: "2026-03-22", totalUsd: 150 });
    saveConfig(config, path);

    const loaded = loadConfig(path);
    expect(loaded.spendingHistory).toHaveLength(1);
    expect(loaded.spendingHistory[0].totalUsd).toBe(150);
  });
});
