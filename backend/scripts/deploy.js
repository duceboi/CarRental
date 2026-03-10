const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("---------------------------------");
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("---------------------------------");

  const CarRental = await hre.ethers.getContractFactory("CarRental");

  console.log("Deploying contract...");
  const contract = await CarRental.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("SUCCESS!");
  console.log(`Contract Address: ${address}`);
  console.log("---------------------------------");

  // Automatically trigger verification if on Sepolia
  if (network.chainId === 1n) {
    console.log("Waiting for block confirmations...");
    // Wait for 5 blocks so Etherscan can "see" the bytecode
    await contract.deploymentTransaction().wait(5);

    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
