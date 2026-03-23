import type { SpendingPolicy } from "../types.js";

let owsAvailable = false;
let owsModule: any = null;

try {
  owsModule = await import("@open-wallet-standard/core");
  owsAvailable = true;
} catch {
  // OWS native binary not available  - graceful degradation
}

export function isOWSAvailable(): boolean {
  return owsAvailable;
}

export async function initWallet(name: string): Promise<{ address: string; accounts: any[] }> {
  if (!owsAvailable) {
    return { address: "0xDEMO_ADDRESS_OWS_UNAVAILABLE", accounts: [] };
  }
  try {
    // Check if wallet already exists
    const existing = await owsModule.listWallets();
    const found = existing?.find((w: any) => w.name === name);
    if (found) {
      const evmAccount = found.accounts?.find((a: any) => a.chainId?.startsWith("eip155")) || found.accounts?.[0];
      return { address: evmAccount?.address || "0x0", accounts: found.accounts || [] };
    }
    // Create new wallet
    const wallet = await owsModule.createWallet(name);
    const accounts = wallet.accounts || [];
    const evmAccount = accounts.find((a: any) => a.chainId?.startsWith("eip155")) || accounts[0];
    return { address: evmAccount?.address || "0x0", accounts };
  } catch (e: any) {
    return { address: `0xOWS_ERROR_${e.message?.slice(0, 20)}`, accounts: [] };
  }
}

export async function getWalletAddress(name: string): Promise<string> {
  if (!owsAvailable) return "0xDEMO_ADDRESS";
  try {
    const wallets = await owsModule.listWallets();
    const wallet = wallets?.find((w: any) => w.name === name);
    if (!wallet) return "0xWALLET_NOT_FOUND";
    const evmAccount = wallet.accounts?.find((a: any) => a.chainId?.startsWith("eip155")) || wallet.accounts?.[0];
    return evmAccount?.address || "0x0";
  } catch {
    return "0xDEMO_ADDRESS";
  }
}

export async function listWallets(): Promise<any[]> {
  if (!owsAvailable) return [];
  try {
    return await owsModule.listWallets() || [];
  } catch {
    return [];
  }
}

export async function signPolicyAttestation(policy: SpendingPolicy, walletName: string): Promise<string> {
  if (!owsAvailable) return "DEMO_ATTESTATION_SIGNATURE";
  try {
    const policyHash = JSON.stringify(policy);
    const result = await owsModule.signMessage(walletName, policyHash);
    return result.signature || result;
  } catch {
    return "DEMO_ATTESTATION_SIGNATURE";
  }
}

export async function signTransaction(walletName: string, tx: unknown): Promise<string> {
  if (!owsAvailable) return "DEMO_TX_SIGNATURE";
  try {
    const result = await owsModule.signTransaction(walletName, tx);
    return result.signature || result;
  } catch {
    return "DEMO_TX_SIGNATURE";
  }
}
