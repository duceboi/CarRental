const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const address = process.env.CONTRACT_ADDRESS;
  const carRental = await hre.ethers.getContractAt("CarRental", address, signer);

  // STEP 1: Register a BRAND NEW CAR (ID 2)
  console.log("Registering a new test car...");
  const regTx = await carRental.registerCar("Test Car", "Delhi", hre.ethers.parseEther("0.001"));
  await regTx.wait();
  
  const carId = await carRental.carCount();
  console.log(`New Car Registered with ID: ${carId}`);

  // STEP 2: Rent it immediately with a massive time buffer
  const now = Math.floor(Date.now() / 1000);
  const start = now + 3600; // 1 hour from now
  const end = start + (86400 * 2); // 2 days later
  const cost = hre.ethers.parseEther("0.002"); // 2 days * 0.001

  console.log(`Renting Car ${carId} for ${hre.ethers.formatEther(cost)} ETH...`);

  const rentTx = await carRental.rentCar(carId, start, end, {
    value: cost,
    gasLimit: 1000000 
  });

  await rentTx.wait();
  console.log("✅ SUCCESS! Check your wallet on Etherscan.");
}

main().catch(console.error);