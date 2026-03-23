import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { mnemonicToAccount } from "viem/accounts";

const baseSepolia = defineChain({
  id: 84532, name: "Base Sepolia", network: "base-sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
  blockExplorers: { default: { name: "Basescan", url: "https://sepolia.basescan.org" } },
});

const CONTRACT = "0x98e0af1509c50a3b7fe34f3ea405fc182c512c78" as `0x${string}`;
const ABI = [{type:"function" as const,name:"log",inputs:[{name:"decisionHash",type:"bytes32"},{name:"action",type:"string"}],outputs:[],stateMutability:"nonpayable" as const}];

async function main() {
  const ows = await import("@open-wallet-standard/core");
  const wallets = await (ows as any).listWallets();
  const exported = await (ows as any).exportWallet(wallets[0].id);
  const mnemonic = Object.values(exported).join("");
  const account = mnemonicToAccount(mnemonic as string);

  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

  const action = process.argv[2] || "DEPLOY: Imperium AI financial agent initialized";
  const hashData = Buffer.from(action).toString("hex").padEnd(64, "0").slice(0, 64);
  const decisionHash = `0x${hashData}` as `0x${string}`;

  console.log("Logging decision:", action);
  const tx = await walletClient.writeContract({ address: CONTRACT, abi: ABI, functionName: "log", args: [decisionHash, action] });
  console.log("TX:", tx);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log("Block:", receipt.blockNumber);
  console.log("https://sepolia.basescan.org/tx/" + tx);
}

main().catch(console.error);
