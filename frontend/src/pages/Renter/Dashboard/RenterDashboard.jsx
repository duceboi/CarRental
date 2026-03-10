import { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import { Web3Context } from "../../../context/Web3Context";
import {
  fetchAllCars,
  getRenterHistory,
  getActiveRental,
  returnCar as returnCarOnChain,
} from "../../../context/useCarRental";
import AvailableCars from "./components/AvailableCars";
import CurrentRental from "./components/CurrentRentals";
import RentalHistory from "./components/RentalHistory";
import SearchSection from "./components/SearchSection";
import "./RenterDashboard.css";

function filterCars(cars, filters) {
  return cars.filter((car) => {
    const matchesModel = filters?.model
      ? car.model.toLowerCase().includes(filters.model.toLowerCase())
      : true;
    const matchesLocation = filters?.location
      ? car.location.toLowerCase().includes(filters.location.toLowerCase()) ||
        filters.location.toLowerCase().includes(car.location.toLowerCase())
      : true;

    return matchesModel && matchesLocation;
  });
}

export default function RenterDashboard() {
  const { account, signer } = useContext(Web3Context);
  const initialFilters = { model: "", location: "", startDate: "", endDate: "" };

  const [filters, setFilters] = useState(initialFilters);
  const [activeView, setActiveView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returningCarId, setReturningCarId] = useState(null);
  const [blockchainData, setBlockchainData] = useState({
    available: [],
    current: [],
    history: [],
  });

  const searchSectionRef = useRef(null);

  const loadDashboardData = useCallback(async () => {
    if (!account) return;

    setLoading(true);

    try {
      const [allCars, rawHistory] = await Promise.all([
        fetchAllCars(),
        getRenterHistory(account),
      ]);

      const rentedCars = allCars.filter((car) => Number(car.status) === 1);
      const rentalDetailsArray = await Promise.all(rentedCars.map((car) => getActiveRental(car.id)));

      const activeRentals = rentedCars
        .map((car, index) => ({ ...car, rentalDetails: rentalDetailsArray[index] }))
        .filter(
          (item) =>
            item.rentalDetails?.active &&
            item.rentalDetails.renter?.toLowerCase() === account.toLowerCase()
        );

      const detailedHistory = rawHistory
        .map((item) => ({
          ...item,
          model: allCars.find((car) => car.id === item.carId)?.model || `Car #${item.carId}`,
        }))
        .reverse();

      setBlockchainData({
        available: allCars.filter((car) => Number(car.status) === 0),
        current: activeRentals,
        history: detailedHistory,
      });
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const handleReturnCar = async (carId) => {
    if (!signer) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      setReturningCarId(carId);
      await returnCarOnChain(signer, carId);
      alert("Car returned successfully. The owner will verify the fuel check next.");
      await loadDashboardData();
    } catch (error) {
      console.error("Return car failed:", error);
      alert(error.reason || error.message || "Unable to return this car right now.");
    } finally {
      setReturningCarId(null);
    }
  };

  const handleAutoFill = (carDetails) => {
    setFilters((current) => ({
      ...current,
      model: carDetails.model,
      location: carDetails.location,
    }));
    setActiveView(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      searchSectionRef.current?.focusStartDate();
    }, 400);
  };

  const filteredAvailableCars = useMemo(
    () => filterCars(blockchainData.available, filters),
    [blockchainData.available, filters]
  );

  return (
    <main className="page-shell">
      <div className="page-container renter-dashboard">
        <section className="panel page-hero">
          <div className="page-hero__copy">
            <p className="page-hero__eyebrow">Renter workspace</p>
            <h1 className="page-hero__title">Search, book, and return cars with less friction.</h1>
            <p className="page-hero__text">
              The renter flow keeps discovery simple: filter the marketplace, review your active
              bookings, and keep the return process clear before handoff to the owner.
            </p>
            <div className="page-hero__meta">
              <span className="subtle-badge">
                {loading ? "Syncing blockchain data" : "Live marketplace data"}
              </span>
              <span className="subtle-badge">Light booking workflow</span>
            </div>
          </div>

          <div className="hero-stat-grid">
            <article className="hero-stat">
              <span className="hero-stat__label">Marketplace matches</span>
              <strong className="hero-stat__value">{filteredAvailableCars.length}</strong>
              <span className="hero-stat__copy">Available cars matching your current filters.</span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">Current rentals</span>
              <strong className="hero-stat__value">{blockchainData.current.length}</strong>
              <span className="hero-stat__copy">Vehicles you are actively renting right now.</span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">Completed bookings</span>
              <strong className="hero-stat__value">{blockchainData.history.length}</strong>
              <span className="hero-stat__copy">Historical renter transactions associated with this wallet.</span>
            </article>
          </div>
        </section>

        {activeView === "market" && (
          <AvailableCars
            expanded={true}
            data={filteredAvailableCars}
            totalCount={blockchainData.available.length}
            filters={filters}
            onAutoFill={handleAutoFill}
            close={() => setActiveView(null)}
          />
        )}

        {activeView === "current" && (
          <CurrentRental
            expanded={true}
            data={blockchainData.current}
            close={() => setActiveView(null)}
            onReturnCar={handleReturnCar}
            returningCarId={returningCarId}
          />
        )}

        {activeView === "history" && (
          <RentalHistory
            expanded={true}
            data={blockchainData.history}
            close={() => setActiveView(null)}
          />
        )}

        {!activeView && (
          <>
            <SearchSection
              ref={searchSectionRef}
              onSearch={setFilters}
              onClear={() => setFilters(initialFilters)}
              currentFilters={filters}
            />

            <AvailableCars
              expanded={false}
              data={filteredAvailableCars}
              totalCount={blockchainData.available.length}
              filters={filters}
              onAutoFill={handleAutoFill}
              open={() => setActiveView("market")}
            />

            <div className="dual-panel-grid">
              <CurrentRental
                expanded={false}
                data={blockchainData.current}
                open={() => setActiveView("current")}
                onReturnCar={handleReturnCar}
                returningCarId={returningCarId}
              />

              <RentalHistory
                expanded={false}
                data={blockchainData.history}
                open={() => setActiveView("history")}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
