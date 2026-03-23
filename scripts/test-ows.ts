import { initWallet, getWalletAddress, isOWSAvailable, listWallets } from "../src/wallet/ows.js";

async function main() {
  console.log("OWS available:", isOWSAvailable());

  const result = await initWallet("imperium-agent");
  console.log("Init wallet:", result.address);
  console.log("Accounts:", result.accounts?.length, "chains");
  for (const a of result.accounts || []) {
    console.log(`  ${a.chainId}: ${a.address}`);
  }

  const addr = await getWalletAddress("imperium-agent");
  console.log("Get address:", addr);

  const wallets = await listWallets();
  console.log("Total wallets:", wallets.length);
}

main().catch(console.error);
