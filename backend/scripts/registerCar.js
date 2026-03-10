const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await hre.ethers.getSigners();

  const address = process.env.CONTRACT_ADDRESS;

  // Added this check to help you debug
  if (!address) {
    console.error("❌ ERROR: CONTRACT_ADDRESS is missing in your .env file!");
    process.exit(1);
  }

  console.log("Using contract address:", address);

  const carRental = await hre.ethers.getContractAt(
    "CarRental",
    address,
    owner,
  );

  console.log("Registering car on Sepolia...");
  const tx = await carRental.registerCar(
    "Hyundai Verna",
    "Delhi",
    hre.ethers.parseEther("0.005"), // Lowered price to 0.005 ETH
  );

  await tx.wait();
  console.log("Car registered successfully!");
}

main().catch(console.error);