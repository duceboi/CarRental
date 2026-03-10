import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Web3Context } from "../../../context/Web3Context";
import {
  fetchAllCars,
  registerCar as registerCarOnChain,
  toggleCarAvailability,
} from "../../../context/useCarRental";
import LocationInput from "../../../components/LocationInput";
import ActiveRentals from "./components/ActiveRentals";
import EarningsOverview from "./components/EarningsOverview";
import Notifications from "./components/Notifications";
import "./OwnerDashboard.css";

function getStatusMeta(status) {
  if (Number(status) === 0) {
    return {
      label: "Available",
      tone: "status-chip status-chip--success",
      actionLabel: "Hide from market",
      actionClass: "ui-button ui-button--danger",
    };
  }

  if (Number(status) === 2) {
    return {
      label: "Hidden",
      tone: "status-chip status-chip--neutral",
      actionLabel: "Make available",
      actionClass: "ui-button ui-button--success",
    };
  }

  return {
    label: "Rented",
    tone: "status-chip status-chip--warning",
    actionLabel: "",
    actionClass: "",
  };
}

export default function OwnerDashboard() {
  const { signer, account } = useContext(Web3Context);
  const navigate = useNavigate();

  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadOwnerCars = useCallback(async () => {
    if (!account) return;

    try {
      const allCars = await fetchAllCars();
      const ownedCars = allCars.filter(
        (car) => car.owner.toLowerCase() === account.toLowerCase()
      );

      setCars(
        ownedCars.map((car) => ({
          id: car.id,
          model: car.model,
          status: car.status,
          earnings: car.earnings,
        }))
      );
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      setCars([]);
    }
  }, [account]);

  useEffect(() => {
    if (account) void loadOwnerCars();
  }, [account, loadOwnerCars]);

  const handleToggleAvailability = async (carId, currentStatus) => {
    if (!signer) {
      alert("Wallet not connected");
      return;
    }

    try {
      setLoading(true);
      const isAvailable = Number(currentStatus) === 0;
      await toggleCarAvailability(signer, carId, isAvailable);
      await loadOwnerCars();
    } catch (error) {
      console.error("Toggle failed:", error);
      alert("Transaction failed. Make sure you are the owner of this car.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCar = async () => {
    if (!model || !location || !pricePerDay) {
      alert("Please complete the full registration form.");
      return;
    }

    if (!signer) {
      alert("Wallet not connected");
      return;
    }

    try {
      setLoading(true);
      await registerCarOnChain(signer, model, location, pricePerDay);
      setModel("");
      setLocation("");
      setPricePerDay("");
      setTimeout(() => {
        void loadOwnerCars();
      }, 2000);
      alert("Car registration submitted successfully.");
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const available = cars.filter((car) => Number(car.status) === 0).length;
    const rented = cars.filter((car) => Number(car.status) === 1).length;
    const hidden = cars.filter((car) => Number(car.status) === 2).length;

    return { total: cars.length, available, rented, hidden };
  }, [cars]);

  return (
    <main className="page-shell">
      <div className="page-container owner-dashboard">
        <section className="panel page-hero">
          <div className="page-hero__copy">
            <p className="page-hero__eyebrow">Owner workspace</p>
            <h1 className="page-hero__title">Operate your fleet with a lighter control surface.</h1>
            <p className="page-hero__text">
              Add new vehicles, review revenue, watch live rental activity, and keep availability
              accurate without jumping across disconnected screens.
            </p>
            <div className="page-hero__meta">
              <span className="subtle-badge">Sepolia connected flow</span>
              <span className="subtle-badge">Live rental signals</span>
            </div>
          </div>

          <div className="hero-stat-grid">
            <article className="hero-stat">
              <span className="hero-stat__label">Fleet size</span>
              <strong className="hero-stat__value">{stats.total}</strong>
              <span className="hero-stat__copy">All vehicles registered to this owner wallet.</span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">Available now</span>
              <strong className="hero-stat__value">{stats.available}</strong>
              <span className="hero-stat__copy">Cars currently visible for renter bookings.</span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">In rental flow</span>
              <strong className="hero-stat__value">{stats.rented + stats.hidden}</strong>
              <span className="hero-stat__copy">
                Vehicles that are either rented or intentionally hidden from the market.
              </span>
            </article>
          </div>
        </section>

        <EarningsOverview />

        <section className="panel owner-register-panel">
          <div className="section-header">
            <div className="section-title-block">
              <p className="section-kicker">Add inventory</p>
              <h2 className="section-title">Register a new car</h2>
              <p className="section-copy">
                Capture the model, daily rate, and pickup location before submitting the on-chain
                registration transaction.
              </p>
            </div>

            <span className="subtle-badge">Owner action</span>
          </div>

          <div className="owner-register-grid">
            <div className="owner-register-fields">
              <label className="field">
                <span className="field-label">Car model</span>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Toyota Camry 2023"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">Daily price in ETH</span>
                <input
                  type="number"
                  className="ui-input"
                  placeholder="0.005"
                  value={pricePerDay}
                  onChange={(event) => setPricePerDay(event.target.value)}
                  min="0"
                  step="0.0001"
                />
              </label>

              <div className="owner-register-actions">
                <button
                  className="ui-button ui-button--primary"
                  onClick={handleRegisterCar}
                  disabled={loading}
                >
                  {loading ? "Submitting" : "Add to blockchain"}
                </button>
              </div>
            </div>

            <div className="owner-register-map">
              <LocationInput
                label="Pickup location"
                placeholder="Search address or use GPS"
                value={location}
                onChange={setLocation}
                showMap={true}
              />
            </div>
          </div>
        </section>

        <section className="panel section-stack owner-preview-panel">
          <div className="section-header">
            <div className="section-title-block">
              <p className="section-kicker">Fleet preview</p>
              <h2 className="section-title">Registered cars</h2>
              <p className="section-copy">
                See the most recent portion of your fleet and jump into the full management view
                for fuel verification or visibility updates.
              </p>
            </div>

            <button className="ui-button ui-button--ghost" onClick={() => navigate("/owner/cars")}>
              View full fleet
            </button>
          </div>

          {cars.length > 0 ? (
            <div className="card-grid owner-preview-grid">
              {cars.slice(0, 4).map((car) => {
                const meta = getStatusMeta(car.status);

                return (
                  <article key={car.id} className="owner-preview-card">
                    <div className="owner-preview-card__top">
                      <span className="item-eyebrow">Car #{car.id}</span>
                      <span className={meta.tone}>{meta.label}</span>
                    </div>

                    <h3>{car.model}</h3>
                    <p>{Number(car.earnings || 0).toFixed(4)} ETH earned so far.</p>

                    {Number(car.status) !== 1 && (
                      <button
                        className={meta.actionClass}
                        onClick={() => handleToggleAvailability(car.id, car.status)}
                        disabled={loading}
                      >
                        {loading ? "Updating" : meta.actionLabel}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state__title">No registered cars yet</p>
              <p className="empty-state__copy">
                Add your first vehicle above and it will appear here with live availability status.
              </p>
            </div>
          )}
        </section>

        <div className="owner-dashboard__bottom">
          <ActiveRentals rentals={cars.filter((car) => Number(car.status) === 1)} />
          <Notifications />
        </div>
      </div>
    </main>
  );
}
