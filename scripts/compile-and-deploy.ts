import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import solc from "solc";

const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  network: "base-sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
  blockExplorers: { default: { name: "Basescan", url: "https://sepolia.basescan.org" } },
});

async function getPrivateKey(): Promise<`0x${string}`> {
  try {
    const ows = await import("@open-wallet-standard/core");
    const wallets = await (ows as any).listWallets();
    // Find wallet that matches the funded address
    const fundedAddress = "0xCA44AFB7fa6A82c1951D73342330f09b27a949d7".toLowerCase();
    let wallet = wallets.find((w: any) =>
      w.accounts?.some((a: any) => a.address?.toLowerCase() === fundedAddress)
    );
    if (!wallet) wallet = wallets[0];
    if (!wallet) throw new Error("No wallet found");

    console.log("Using wallet:", wallet.name);
    const exported = await (ows as any).exportWallet(wallet.id);

    // OWS returns mnemonic as indexed chars or as string
    let mnemonic: string;
    if (typeof exported === "string") {
      mnemonic = exported;
    } else if (exported.mnemonic) {
      mnemonic = exported.mnemonic;
    } else {
      // Indexed chars (0: 'p', 1: 'u', ...)
      mnemonic = Object.values(exported).join("");
    }

    if (!mnemonic.includes(" ")) throw new Error("Invalid mnemonic");

    const account = mnemonicToAccount(mnemonic as string);
    const hdKey = account.getHdKey();
    if (!hdKey.privateKey) throw new Error("No private key from HD key");
    const hex = Buffer.from(hdKey.privateKey).toString("hex");
    return `0x${hex}`;
  } catch (e: any) {
    console.error("OWS export failed:", e.message);
    process.exit(1);
  }
}

function compileSolidity(): { abi: any[]; bytecode: `0x${string}` } {
  const source = readFileSync("contracts/ImperiumDecisionLog.sol", "utf-8");

  const input = {
    language: "Solidity",
    sources: { "ImperiumDecisionLog.sol": { content: source } },
    settings: {
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  console.log("Compiling contract...");
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors?.some((e: any) => e.severity === "error")) {
    console.error("Compilation errors:");
    for (const e of output.errors) console.error(e.formattedMessage);
    process.exit(1);
  }

  const contract = output.contracts["ImperiumDecisionLog.sol"]["ImperiumDecisionLog"];
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  };
}

async function main() {
  // Compile
  const { abi, bytecode } = compileSolidity();
  console.log("Compiled. Bytecode size:", bytecode.length / 2, "bytes");
  console.log("ABI functions:", abi.filter((a: any) => a.type === "function").map((a: any) => a.name).join(", "));

  // Get key
  const privateKey = await getPrivateKey();
  const account = privateKeyToAccount(privateKey);
  console.log("Deploying from:", account.address);

  // Check balance
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", Number(balance) / 1e18, "ETH");

  if (balance === 0n) {
    console.error("No balance! Send testnet ETH to", account.address);
    process.exit(1);
  }

  // Deploy
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });

  console.log("\nDeploying ImperiumDecisionLog to Base Sepolia...");
  const hash = await walletClient.deployContract({ abi, bytecode });
  console.log("TX:", hash);
  console.log("Explorer:", `https://sepolia.basescan.org/tx/${hash}`);

  console.log("Waiting for confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log("\n=== DEPLOYED ===");
  console.log("Contract:", receipt.contractAddress);
  console.log("Block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Explorer:", `https://sepolia.basescan.org/address/${receipt.contractAddress}`);

  // Log first decision
  if (receipt.contractAddress) {
    console.log("\nLogging first decision...");
    const decisionHash = "0x" + Buffer.from("Imperium deployed - AI financial agent active on Base Sepolia").toString("hex").padEnd(64, "0").slice(0, 64);

    const logHash = await walletClient.writeContract({
      address: receipt.contractAddress,
      abi,
      functionName: "log",
      args: [decisionHash as `0x${string}`, "DEPLOY: Imperium agent initialized on Base Sepolia"],
    });

    console.log("Decision logged TX:", logHash);
    console.log("Explorer:", `https://sepolia.basescan.org/tx/${logHash}`);

    const logReceipt = await publicClient.waitForTransactionReceipt({ hash: logHash });
    console.log("Decision logged in block:", logReceipt.blockNumber);
  }
}

main().catch(console.error);
