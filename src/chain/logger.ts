import { createWalletClient, createPublicClient, http, defineChain, createHash } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import type { WalletClient, PublicClient } from "viem";

const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  network: "base-sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
  blockExplorers: { default: { name: "Basescan", url: "https://sepolia.basescan.org" } },
});

const CONTRACT = "0x98e0af1509c50a3b7fe34f3ea405fc182c512c78" as `0x${string}`;
const ABI = [
  {
    type: "function" as const,
    name: "log",
    inputs: [
      { name: "decisionHash", type: "bytes32" },
      { name: "action", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable" as const,
  },
] as const;

let walletClient: WalletClient | null = null;
let publicClient: PublicClient | null = null;
let initialized = false;
let available = false;

export async function initOnChainLogger(): Promise<boolean> {
  if (initialized) return available;
  initialized = true;

  try {
    const ows = await import("@open-wallet-standard/core");
    const wallets = await (ows as any).listWallets();
    if (!wallets || wallets.length === 0) return false;

    const exported = await (ows as any).exportWallet(wallets[0].id);
    const mnemonic = Object.values(exported).join("");
    if (!mnemonic || !(mnemonic as string).includes(" ")) return false;

    const account = mnemonicToAccount(mnemonic as string);

    publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance === 0n) return false;

    walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });
    available = true;
    return true;
  } catch {
    return false;
  }
}

export function isOnChainAvailable(): boolean {
  return available;
}

function toBytes32(text: string): `0x${string}` {
  const hex = Buffer.from(text).toString("hex").padEnd(64, "0").slice(0, 64);
  return `0x${hex}` as `0x${string}`;
}

export async function logDecision(action: string): Promise<string | null> {
  if (!walletClient || !publicClient) return null;

  try {
    const hash = toBytes32(action);
    // Truncate action to 256 chars for gas efficiency
    const truncated = action.length > 256 ? action.slice(0, 253) + "..." : action;

    const tx = await walletClient.writeContract({
      address: CONTRACT,
      abi: ABI,
      functionName: "log",
      args: [hash, truncated],
    });

    // Don't wait for receipt to avoid blocking the CLI
    // Just return the tx hash
    return tx;
  } catch {
    // Silently fail - on-chain logging is optional, should not break the agent
    return null;
  }
}

export function getExplorerUrl(txHash: string): string {
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

export function getContractUrl(): string {
  return `https://sepolia.basescan.org/address/${CONTRACT}`;
}
