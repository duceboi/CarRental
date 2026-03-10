const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CarRental - return + fuel verification", function () {
  async function deployFixture() {
    const [owner, renter, other] = await ethers.getSigners();
    const CarRental = await ethers.getContractFactory("CarRental");
    const contract = await CarRental.deploy();
    await contract.waitForDeployment();

    return { contract, owner, renter, other };
  }

  it("allows renter to return car, then owner verifies fuel before relisting", async function () {
    const { contract, owner, renter } = await deployFixture();

    const pricePerDay = ethers.parseEther("0.01");
    await contract.connect(owner).registerCar("Tesla Model 3", "Campus Gate", pricePerDay);

    const latest = await ethers.provider.getBlock("latest");
    const startDate = latest.timestamp + 60;
    const endDate = startDate + 24 * 60 * 60;

    await contract.connect(renter).rentCar(1, startDate, endDate, { value: pricePerDay });

    let car = await contract.cars(1);
    expect(Number(car.status)).to.equal(1); // Rented
    expect(Number(car.fuelStatus)).to.equal(0); // Full

    await expect(contract.connect(renter).returnCar(1))
      .to.emit(contract, "RentalReturned")
      .withArgs(1, renter.address);

    car = await contract.cars(1);
    expect(Number(car.status)).to.equal(2); // Unavailable
    expect(Number(car.fuelStatus)).to.equal(1); // NeedsRefuel/Needs verification

    await expect(contract.connect(renter).rentCar(1, startDate, endDate, { value: pricePerDay }))
      .to.be.revertedWith("Car not available");

    await expect(contract.connect(owner).verifyFuelRefill(1))
      .to.emit(contract, "FuelRefillVerified")
      .withArgs(1, owner.address);

    car = await contract.cars(1);
    expect(Number(car.status)).to.equal(0); // Available
    expect(Number(car.fuelStatus)).to.equal(0); // Full
  });

  it("rejects returnCar from non-active renter", async function () {
    const { contract, owner, renter, other } = await deployFixture();

    const pricePerDay = ethers.parseEther("0.01");
    await contract.connect(owner).registerCar("Swift Dzire", "Main Gate", pricePerDay);

    const latest = await ethers.provider.getBlock("latest");
    const startDate = latest.timestamp + 60;
    const endDate = startDate + 24 * 60 * 60;

    await contract.connect(renter).rentCar(1, startDate, endDate, { value: pricePerDay });

    await expect(contract.connect(other).returnCar(1)).to.be.revertedWith(
      "Only active renter can return"
    );
  });
});
