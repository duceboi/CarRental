const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const address = process.env.CONTRACT_ADDRESS;
  const carRental = await hre.ethers.getContractAt("CarRental", address, signer);

  const carId = 1; 
  console.log("Attempting to end rental for Car ID " + carId);

  try {
    const tx = await carRental.endRental(carId);
    await tx.wait();
    console.log("SUCCESS: Rental force-ended. Car now awaits owner fuel verification before becoming Available.");
  } catch (error) {
    console.log("REVERT: Likely because the rental time has not actually expired yet.");
  }
}

main().catch(console.error);