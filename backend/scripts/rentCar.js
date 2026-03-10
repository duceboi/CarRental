const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const address = process.env.CONTRACT_ADDRESS;
  const carRental = await hre.ethers.getContractAt("CarRental", address, signer);

  const carId = 1;
  const car = await carRental.cars(carId);
  
  const now = Math.floor(Date.now() / 1000);
  const startDate = now + 3600; // 1 hour from now
  const endDate = startDate + (86400 * 2); // 2 days later

  // We send slightly MORE than needed to test the new Refund Logic
  const exactCost = car.pricePerDay * 2n;
  const extraAmount = hre.ethers.parseEther("0.001"); 
  const totalToSend = exactCost + extraAmount;

  console.log("Renting Car 1. Sending extra to test Refund Logic...");
  const tx = await carRental.rentCar(carId, startDate, endDate, {
    value: totalToSend,
    gasLimit: 1000000
  });

  await tx.wait();
  console.log("SUCCESS: Car rented and excess ETH should have been refunded!");
}

main().catch(console.error);