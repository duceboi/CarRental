const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [, renter] = await hre.ethers.getSigners();

  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

  const carRental = await hre.ethers.getContractAt(
    "CarRental",
    CONTRACT_ADDRESS,
    renter,
  );

  const carCount = await carRental.carCount();

  console.log("Total cars:", carCount.toString());

  for (let i = 1; i <= carCount; i++) {
    const car = await carRental.cars(i);

    const statusNumber = Number(car.status);


    console.log({
      id: car.id.toString(),
      model: car.model,
      location: car.pickupLocation,
      pricePerDay: hre.ethers.formatEther(car.pricePerDay),
      status:
         statusNumber === 0 ? "Available" :
         statusNumber === 1 ? "Rented" :
         "Unavailable",
    });
  }
}

main().catch(console.error);
