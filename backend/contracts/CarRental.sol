// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CarRental {
    uint256 public carCount;

    /* -------------------- ENUMS -------------------- */

    enum CarStatus {
        Available,     // 0
        Rented,        // 1
        Unavailable    // 2
    }

    /**
     * @dev Tracks whether the returned car's fuel has been owner-verified.
     * Full    (0): Fuel is verified full — car can be rented.
     * NeedsRefuel (1): Car return is pending owner fuel verification.
     */
    enum FuelStatus {
        Full,        // 0
        NeedsRefuel  // 1
    }

    /* -------------------- STRUCTS -------------------- */

    struct Car {
        uint256 id;
        address owner;
        string model;
        string pickupLocation;
        uint256 pricePerDay; // in wei
        CarStatus status;
        uint256 earnings;
        FuelStatus fuelStatus; // fuel verification state
    }

    struct Rental {
        uint256 carId;
        address renter;
        uint256 startDate;
        uint256 endDate;
        uint256 paid;
        bool active;
    }

    /* -------------------- STORAGE -------------------- */

    mapping(uint256 => Car) public cars;
    mapping(uint256 => Rental) public activeRental;
    mapping(address => Rental[]) private renterHistory;
    mapping(address => Rental[]) private ownerHistory;

    /* -------------------- EVENTS -------------------- */

    event CarRegistered(uint256 indexed carId, address indexed owner);
    event CarUpdated(uint256 indexed carId);
    event CarUnavailable(uint256 indexed carId);
    event CarRented(uint256 indexed carId, address indexed renter, uint256 startDate, uint256 endDate, uint256 paid);
    event RentalCancelled(uint256 indexed carId, address indexed renter, uint256 refunded);
    event RentalEnded(uint256 indexed carId);
    event RentalReturned(uint256 indexed carId, address indexed renter);
    /**
     * @dev Emitted when a car owner verifies the car has been refueled
     *      after a rental. The car becomes Available again only after this.
     */
    event FuelRefillVerified(uint256 indexed carId, address indexed owner);

    /* -------------------- OWNER FUNCTIONS -------------------- */

    function registerCar(
        string memory _model,
        string memory _pickupLocation,
        uint256 _pricePerDay
    ) external {
        require(_pricePerDay > 0, "Invalid price");

        carCount++;

        cars[carCount] = Car({
            id: carCount,
            owner: msg.sender,
            model: _model,
            pickupLocation: _pickupLocation,
            pricePerDay: _pricePerDay,
            status: CarStatus.Available,
            earnings: 0,
            fuelStatus: FuelStatus.Full  // new cars start with full fuel
        });

        emit CarRegistered(carCount, msg.sender);
    }

    function updateCarDetails(
        uint256 _carId,
        string memory _pickupLocation,
        uint256 _pricePerDay
    ) external {
        Car storage car = cars[_carId];
        require(car.owner == msg.sender, "Only owner");
        require(car.status == CarStatus.Available, "Car not editable");
        require(_pricePerDay > 0, "Invalid price");

        car.pickupLocation = _pickupLocation;
        car.pricePerDay = _pricePerDay;

        emit CarUpdated(_carId);
    }

    /**
     * @dev Hides a car from the marketplace. Sets status to Unavailable (2).
     *      Only works when fuel is already Full (i.e., not pending refuel verification).
     */
    function setCarUnavailable(uint256 _carId) external {
        Car storage car = cars[_carId];
        require(car.owner == msg.sender, "Only owner");
        require(car.status == CarStatus.Available, "Car must be Available to hide");

        car.status = CarStatus.Unavailable;

        emit CarUnavailable(_carId);
    }

    /**
     * @dev Brings a manually-hidden car back to the marketplace.
     *      Requires fuel to already be Full. If fuelStatus is NeedsRefuel,
     *      the owner must call verifyFuelRefill() instead.
     */
    function setCarAvailable(uint256 _carId) external {
        Car storage car = cars[_carId];
        require(car.owner == msg.sender, "Only owner");
        require(car.status == CarStatus.Unavailable, "Car is not currently hidden");
        require(
            car.fuelStatus == FuelStatus.Full,
            "Fuel not verified: call verifyFuelRefill() first"
        );

        car.status = CarStatus.Available;

        emit CarUpdated(_carId);
    }

    /**
     * @dev Called by owner after receiving the returned car and confirming full fuel.
     *      Marks fuel as Full and sets car back to Available for the next renter.
     */
    function verifyFuelRefill(uint256 _carId) external {
        Car storage car = cars[_carId];
        require(car.owner == msg.sender, "Only owner can verify fuel");
        require(car.status == CarStatus.Unavailable, "Car must be in Unavailable state");
        require(car.fuelStatus == FuelStatus.NeedsRefuel, "Fuel is already verified as Full");

        car.fuelStatus = FuelStatus.Full;
        car.status = CarStatus.Available;

        emit FuelRefillVerified(_carId, msg.sender);
    }

    function cancelRental(uint256 _carId) external {
        Car storage car = cars[_carId];
        require(car.owner == msg.sender, "Only owner");
        require(car.status == CarStatus.Rented, "Car not rented");

        Rental storage r = activeRental[_carId];
        require(r.active, "No active rental");

        r.active = false;

        // Car goes Unavailable and marked as needing fuel check,
        // even on cancel — the renter may have used some fuel.
        car.status = CarStatus.Unavailable;
        car.fuelStatus = FuelStatus.NeedsRefuel;

        (bool success, ) = payable(r.renter).call{value: r.paid}("");
        require(success, "Refund failed");

        emit RentalCancelled(_carId, r.renter, r.paid);
    }

    /**
     * @dev Owner force-ends an expired rental if renter has not returned the car on-chain.
     *      Car moves to Unavailable + NeedsRefuel for manual owner follow-up.
     */
    function endRental(uint256 _carId) external {
        Car storage car = cars[_carId];
        require(car.owner == msg.sender, "Only owner");
        require(car.status == CarStatus.Rented, "Not rented");

        Rental storage r = activeRental[_carId];
        require(block.timestamp >= r.endDate, "Rental still active");

        r.active = false;

        // Do NOT set to Available yet — fuel must be verified first.
        car.status = CarStatus.Unavailable;
        car.fuelStatus = FuelStatus.NeedsRefuel;

        emit RentalEnded(_carId);
    }

    /* -------------------- RENTER FUNCTIONS -------------------- */

    function rentCar(
        uint256 _carId,
        uint256 _startDate,
        uint256 _endDate
    ) external payable {
        Car storage car = cars[_carId];

        require(car.status == CarStatus.Available, "Car not available");
        // Guarantee every renter gets a fully-fueled car.
        require(car.fuelStatus == FuelStatus.Full, "Car fuel not verified by owner yet");
        require(_endDate > _startDate, "End date must be after start");

        uint256 daysRented = (_endDate - _startDate) / 1 days;
        require(daysRented > 0, "Minimum 1 day rental");

        uint256 totalCost = daysRented * car.pricePerDay;

        require(msg.value >= totalCost, "Not enough ETH sent");

        car.status = CarStatus.Rented;
        car.earnings += totalCost;

        Rental memory rental = Rental({
            carId: _carId,
            renter: msg.sender,
            startDate: _startDate,
            endDate: _endDate,
            paid: totalCost,
            active: true
        });

        activeRental[_carId] = rental;
        renterHistory[msg.sender].push(rental);
        ownerHistory[car.owner].push(rental);

        (bool ownerPaid, ) = payable(car.owner).call{value: totalCost}("");
        require(ownerPaid, "Owner payment failed");

        if (msg.value > totalCost) {
            uint256 refundAmount = msg.value - totalCost;
            (bool refundSuccess, ) = payable(msg.sender).call{value: refundAmount}("");
            require(refundSuccess, "Refund failed");
        }

        emit CarRented(_carId, msg.sender, _startDate, _endDate, totalCost);
    }

    /**
     * @dev Renter returns the car to owner. Owner must still verify fuel is full on-chain.
     *      This closes the active rental and puts the car into Unavailable + NeedsRefuel.
     */
    function returnCar(uint256 _carId) external {
        Car storage car = cars[_carId];
        require(car.status == CarStatus.Rented, "Car is not rented");

        Rental storage r = activeRental[_carId];
        require(r.active, "No active rental");
        require(r.renter == msg.sender, "Only active renter can return");

        r.active = false;

        // Always require owner verification before the next rental.
        car.status = CarStatus.Unavailable;
        car.fuelStatus = FuelStatus.NeedsRefuel;

        emit RentalReturned(_carId, msg.sender);
    }

    /* -------------------- VIEW FUNCTIONS -------------------- */

    function getRenterHistory(address user)
        external
        view
        returns (Rental[] memory)
    {
        return renterHistory[user];
    }

    function getOwnerHistory(address user)
        external
        view
        returns (Rental[] memory)
    {
        return ownerHistory[user];
    }
}
