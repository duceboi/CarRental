const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const address = process.env.CONTRACT_ADDRESS;
  const carRental = await hre.ethers.getContractAt("CarRental", address, owner);

  const carId = 1;
  console.log("Owner is cancelling rental for Car ID " + carId);

  try {
    const tx = await carRental.cancelRental(carId);
    await tx.wait();
    console.log("SUCCESS: Rental cancelled. Renter has been refunded.");
  } catch (error) {
    console.log("REVERT: " + error.message);
  }
}

main().catch(console.error);