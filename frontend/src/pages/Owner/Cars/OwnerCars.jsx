import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Web3Context } from "../../../context/Web3Context";
import {
  fetchAllCars,
  toggleCarAvailability,
  verifyFuelRefill,
} from "../../../context/useCarRental";
import "./OwnerCars.css";

function getStatusMeta(status, fuelStatus) {
  if (Number(status) === 1) {
    return {
      label: "Currently rented",
      tone: "status-chip status-chip--warning",
      helper: "This vehicle is with a renter right now.",
    };
  }

  if (Number(status) === 2 && Number(fuelStatus) === 1) {
    return {
      label: "Fuel check required",
      tone: "status-chip status-chip--warning",
      helper: "Verify the refill before reopening this listing.",
    };
  }

  if (Number(status) === 0) {
    return {
      label: "Available",
      tone: "status-chip status-chip--success",
      helper: "Visible in the marketplace for new renters.",
    };
  }

  return {
    label: "Hidden",
    tone: "status-chip status-chip--neutral",
    helper: "Hidden manually until you reopen the car.",
  };
}

export default function OwnerCars() {
  const { account, signer } = useContext(Web3Context);
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [fuelLoading, setFuelLoading] = useState(null);

  const loadCars = useCallback(async () => {
    if (!account) return;

    try {
      setLoading(true);
      const allCars = await fetchAllCars();
      const owned = allCars.filter(
        (car) => car.owner.toLowerCase() === account.toLowerCase()
      );
      setCars(owned);
    } catch (error) {
      console.error("Error fetching cars:", error);
    } finally {
      setLoading(false);
    }
  }, [account]);

  const handleToggle = async (carId, currentStatus) => {
    if (!signer) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      setActionLoading(carId);
      const isAvailable = Number(currentStatus) === 0;
      await toggleCarAvailability(signer, carId, isAvailable);
      await loadCars();
    } catch (error) {
      console.error("Toggle failed:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyFuel = async (carId) => {
    if (!signer) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      setFuelLoading(carId);
      await verifyFuelRefill(signer, carId);
      await loadCars();
    } catch (error) {
      alert(error.reason || error.message || "Fuel verification failed");
    } finally {
      setFuelLoading(null);
    }
  };

  useEffect(() => {
    void loadCars();
  }, [loadCars]);

  const stats = useMemo(() => {
    const available = cars.filter((car) => Number(car.status) === 0).length;
    const rented = cars.filter((car) => Number(car.status) === 1).length;
    const fuelChecks = cars.filter(
      (car) => Number(car.status) === 2 && Number(car.fuelStatus) === 1
    ).length;

    return { total: cars.length, available, rented, fuelChecks };
  }, [cars]);

  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="panel page-hero">
          <div className="page-hero__copy">
            <p className="page-hero__eyebrow">Fleet management</p>
            <h1 className="page-hero__title">Your full vehicle inventory, without the clutter.</h1>
            <p className="page-hero__text">
              Every registered car, every visibility state, and every fuel verification checkpoint
              is managed from this single owner view.
            </p>
          </div>

          <div className="hero-stat-grid">
            <article className="hero-stat">
              <span className="hero-stat__label">Total cars</span>
              <strong className="hero-stat__value">{stats.total}</strong>
              <span className="hero-stat__copy">Vehicles registered to the connected owner.</span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">Marketplace ready</span>
              <strong className="hero-stat__value">{stats.available}</strong>
              <span className="hero-stat__copy">Cars that renters can book right now.</span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">Action required</span>
              <strong className="hero-stat__value">{stats.fuelChecks}</strong>
              <span className="hero-stat__copy">Returns waiting on your fuel verification.</span>
            </article>
          </div>
        </section>

        <div className="section-header">
          <div className="section-title-block">
            <p className="section-kicker">Fleet list</p>
            <h2 className="section-title">Every registered vehicle</h2>
            <p className="section-copy">
              Toggle visibility, monitor rented cars, or verify fuel on returned vehicles before
              reopening them to the market.
            </p>
          </div>

          <button className="ui-button ui-button--ghost" onClick={() => navigate("/owner")}>
            Back to dashboard
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <p className="empty-state__title">Loading fleet data</p>
            <p className="empty-state__copy">
              Pulling vehicle state from the blockchain and preparing the fleet view.
            </p>
          </div>
        ) : cars.length > 0 ? (
          <div className="fleet-grid">
            {cars.map((car) => {
              const status = Number(car.status);
              const fuelStatus = Number(car.fuelStatus);
              const needsFuelVerify = status === 2 && fuelStatus === 1;
              const isProcessing = actionLoading === car.id;
              const isFuelProcessing = fuelLoading === car.id;
              const meta = getStatusMeta(status, fuelStatus);

              return (
                <article
                  key={car.id}
                  className={`panel fleet-card${needsFuelVerify ? " fleet-card--attention" : ""}`}
                >
                  <div className="fleet-card__top">
                    <div className="fleet-card__title">
                      <span className="item-eyebrow">Car #{car.id}</span>
                      <h3>{car.model}</h3>
                    </div>
                    <span className={meta.tone}>{meta.label}</span>
                  </div>

                  <div className="info-grid">
                    <div className="info-card">
                      <span>Pickup</span>
                      <strong>{car.location || "Not specified"}</strong>
                    </div>
                    <div className="info-card">
                      <span>Price</span>
                      <strong>{car.pricePerDay} ETH / day</strong>
                    </div>
                    <div className="info-card">
                      <span>Fuel</span>
                      <strong>{fuelStatus === 0 ? "Verified full" : "Awaiting owner check"}</strong>
                    </div>
                  </div>

                  <p className="fleet-card__helper">{meta.helper}</p>

                  {needsFuelVerify && (
                    <div className="notice-banner notice-banner--warning">
                      Confirm the tank is full after the physical inspection, then verify the car so
                      it can return to the marketplace.
                    </div>
                  )}

                  <div className="fleet-card__actions">
                    {status === 1 ? (
                      <span className="subtle-badge">Awaiting renter return</span>
                    ) : needsFuelVerify ? (
                      <button
                        className="ui-button ui-button--warning"
                        onClick={() => handleVerifyFuel(car.id)}
                        disabled={isFuelProcessing}
                      >
                        {isFuelProcessing ? "Verifying" : "Verify fuel full"}
                      </button>
                    ) : (
                      <button
                        className={
                          status === 0
                            ? "ui-button ui-button--danger"
                            : "ui-button ui-button--success"
                        }
                        onClick={() => handleToggle(car.id, status)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Updating" : status === 0 ? "Hide from market" : "Make available"}
                      </button>
                    )}

                    {car.location && (
                      <a
                        className="ui-link"
                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
                          car.location
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open map
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state__title">No cars to manage</p>
            <p className="empty-state__copy">
              Return to the dashboard and register your first vehicle to start building the fleet.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
