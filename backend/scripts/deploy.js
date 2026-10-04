const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners(); // Get the first account
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Sepolia ETH:", hre.ethers.formatEther(balance));

  if (balance === 0n) {
    throw new Error(
      `Deployer wallet has 0 Sepolia ETH. Fund ${deployer.address} and retry.`
    );
  }

  const RewardHub = await hre.ethers.getContractFactory("RewardHubToken");

  // Pass deployer.address as the constructor argument (initial owner)
  const contract = await RewardHub.deploy(deployer.address);

  await contract.waitForDeployment();

  console.log("✅ Contract deployed at:", await contract.getAddress());
  console.log("👤 Contract owner (initialOwner):", deployer.address);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
