const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const address = process.env.CONTRACT_ADDRESS;
  const carRental = await hre.ethers.getContractAt("CarRental", address, owner);

  const carId = 1;
  const newPrice = hre.ethers.parseEther("0.007");
  const newLocation = "Gurgaon";

  console.log("Updating car details...");
  const tx = await carRental.updateCarDetails(carId, newLocation, newPrice);
  await tx.wait();
  console.log("SUCCESS: Car details updated.");
}

main().catch(console.error);