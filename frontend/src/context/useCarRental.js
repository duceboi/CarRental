import { ethers } from "ethers";
import artifact from "../abi/CarRental.json";
import { CONTRACT_ADDRESS, SEPOLIA_RPC } from "../abi/contract";

const ABI = artifact.abi;

/* -------------------------------------------------------------------------- */
/* CONTRACT INSTANCES                                                         */
/* -------------------------------------------------------------------------- */

export function getReadContract() {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
}

export function getWriteContract(signer) {
  if (!signer) throw new Error("Signer required - Please connect MetaMask");
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}

/* -------------------------------------------------------------------------- */
/* READ HELPERS                                                               */
/* -------------------------------------------------------------------------- */

export async function getCarCount() {
  const contract = getReadContract();
  return Number(await contract.carCount());
}

export async function fetchAllCars() {
  const contract = getReadContract();
  try {
    const count = Number(await contract.carCount());
    const cars = [];
    for (let i = 1; i <= count; i++) {
      const car = await contract.cars(i);
      cars.push({
        id: car.id.toString(),
        owner: car.owner,
        model: car.model,
        location: car.pickupLocation,
        pricePerDay: ethers.formatEther(car.pricePerDay),
        status: Number(car.status),
        earnings: ethers.formatEther(car.earnings),
        fuelStatus: Number(car.fuelStatus), // 0 = Full, 1 = NeedsRefuel
      });
    }
    return cars;
  } catch (error) {
    console.error("Error fetching all cars:", error);
    return [];
  }
}

export async function getActiveRental(carId) {
  const contract = getReadContract();
  try {
    const rental = await contract.activeRental(carId);
    return {
      carId: rental.carId.toString(),
      renter: rental.renter,
      startDate: Number(rental.startDate),
      endDate: Number(rental.endDate),
      paid: ethers.formatEther(rental.paid),
      active: rental.active,
    };
  } catch (error) {
    console.error("Error fetching active rental:", error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* HISTORY FETCHING                                                           */
/* -------------------------------------------------------------------------- */

export async function getOwnerHistory(address) {
  const contract = getReadContract();
  try {
    const history = await contract.getOwnerHistory(address);
    return history.map((rental) => ({
      carId: rental.carId.toString(),
      renter: rental.renter,
      startDate: Number(rental.startDate),
      endDate: Number(rental.endDate),
      paid: ethers.formatEther(rental.paid),
      active: rental.active,
    }));
  } catch (error) {
    console.error("Error fetching owner history:", error);
    return [];
  }
}

export async function getRenterHistory(address) {
  const contract = getReadContract();
  try {
    const history = await contract.getRenterHistory(address);
    return history.map((rental) => ({
      carId: rental.carId.toString(),
      renter: rental.renter,
      startDate: Number(rental.startDate),
      endDate: Number(rental.endDate),
      paid: ethers.formatEther(rental.paid),
      active: rental.active,
    }));
  } catch (error) {
    console.error("Error fetching renter history:", error);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* OWNER ACTIONS                                                              */
/* -------------------------------------------------------------------------- */

export async function registerCar(signer, model, location, priceEth) {
  const contract = getWriteContract(signer);
  const tx = await contract.registerCar(
    model,
    location,
    ethers.parseUnits(priceEth.toString(), "ether"),
    { gasLimit: 500000 },
  );
  const receipt = await tx.wait();

  // Parse the CarRegistered event to get the actual on-chain car ID
  let carId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "CarRegistered") {
        carId = Number(parsed.args[0]);
        break;
      }
    } catch {
      // Not our event, skip
    }
  }

  return { receipt, carId };
}

/**
 * Toggles car visibility based on current status
 */
export async function toggleCarAvailability(
  signer,
  carId,
  isCurrentlyAvailable,
) {
  try {
    const contract = getWriteContract(signer);
    // Call setCarUnavailable if currently 0, otherwise call setCarAvailable
    const tx = isCurrentlyAvailable
      ? await contract.setCarUnavailable(carId)
      : await contract.setCarAvailable(carId);
    return await tx.wait();
  } catch (error) {
    console.error("Error toggling car availability:", error);
    throw error;
  }
}

/**
 * Owner confirms car has been physically refueled after a rental.
 * Sets fuelStatus → Full and car status → Available on-chain.
 */
export async function verifyFuelRefill(signer, carId) {
  try {
    const contract = getWriteContract(signer);
    const tx = await contract.verifyFuelRefill(carId, { gasLimit: 500000 });
    return await tx.wait();
  } catch (error) {
    console.error("Error verifying fuel refill:", error);
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* RENTER ACTIONS                                                             */
/* -------------------------------------------------------------------------- */

export async function rentCar(signer, carId, startDate, endDate, totalEth) {
  const contract = getWriteContract(signer);
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

  if (endTimestamp <= startTimestamp) {
    throw new Error("End date must be after start date.");
  }

  const tx = await contract.rentCar(carId, startTimestamp, endTimestamp, {
    value: ethers.parseUnits(totalEth.toString(), "ether"),
    gasLimit: 1000000,
  });
  return await tx.wait();
}

/**
 * Calls the smart contract to cancel a rental
 */
export async function cancelRental(signer, carId) {
  try {
    const contract = getWriteContract(signer);
    const tx = await contract.cancelRental(carId, { gasLimit: 500000 });
    return await tx.wait();
  } catch (error) {
    console.error("Error cancelling rental:", error);
    throw error;
  }
}

/**
 * Renter returns a rented car to owner.
 * Owner must verify fuel on-chain before it becomes available again.
 */
export async function returnCar(signer, carId) {
  try {
    const contract = getWriteContract(signer);
    const tx = await contract.returnCar(carId, { gasLimit: 500000 });
    return await tx.wait();
  } catch (error) {
    console.error("Error returning car:", error);
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* NOTIFICATIONS / EVENTS                                                     */
/* -------------------------------------------------------------------------- */

export function listenToAllEvents(callback) {
  const contract = getReadContract();

  const handleEvent = async (carId, type, extraData = {}) => {
    const allCars = await fetchAllCars();
    const carDetails = allCars.find((c) => c.id === carId.toString());
    const carName = carDetails ? carDetails.model : `Car #${carId}`;

    if (type === "REGISTRATION") {
      callback({
        type: "REGISTRATION",
        title: "New Car Registered!",
        message: `${carName} has been added to your fleet.`,
        time: new Date().toLocaleTimeString(),
      });
    } else if (type === "RENTAL") {
      callback({
        type: "RENTAL",
        title: "Payment Received!",
        message: `${carName} was rented by ${extraData.renter?.substring(0, 6)}...`,
        amount: `Earnings: +${ethers.formatEther(extraData.paid || 0)} ETH`,
        time: new Date().toLocaleTimeString(),
      });
    } else if (type === "FUEL_VERIFIED") {
      callback({
        type: "FUEL_VERIFIED",
        title: "Fuel Verified!",
        message: `${carName} return fuel has been verified and it is now available for rent.`,
        time: new Date().toLocaleTimeString(),
      });
    } else if (type === "RETURNED") {
      callback({
        type: "RETURNED",
        title: "Car Returned",
        message: `${carName} was returned by renter and is awaiting your fuel verification.`,
        time: new Date().toLocaleTimeString(),
      });
    }
  };

  contract.on("CarRegistered", (carId) => handleEvent(carId, "REGISTRATION"));
  contract.on("CarRented", (carId, renter, start, end, paid) =>
    handleEvent(carId, "RENTAL", { renter, paid }),
  );
  contract.on("FuelRefillVerified", (carId) =>
    handleEvent(carId, "FUEL_VERIFIED"),
  );
  contract.on("RentalReturned", (carId) => handleEvent(carId, "RETURNED"));

  return () => {
    contract.removeAllListeners("CarRegistered");
    contract.removeAllListeners("CarRented");
    contract.removeAllListeners("FuelRefillVerified");
    contract.removeAllListeners("RentalReturned");
  };
}
