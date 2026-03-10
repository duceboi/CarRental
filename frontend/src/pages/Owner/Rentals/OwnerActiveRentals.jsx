import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Web3Context } from "../../../context/Web3Context";
import { fetchAllCars, getActiveRental } from "../../../context/useCarRental";
import "./OwnerRentals.css";

function formatDate(timestamp) {
  if (!timestamp || timestamp === 0) return "N/A";

  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calculateDuration(start, end) {
  const diff = end - start;
  const days = Math.ceil(diff / 86400);
  return days > 0 ? days : 0;
}

function truncateAddress(address) {
  if (!address) return "Unavailable";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function OwnerActiveRentals() {
  const { account } = useContext(Web3Context);
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRentalsWithDetails = useCallback(async () => {
    if (!account) return;

    try {
      setLoading(true);
      const allCars = await fetchAllCars();
      const ownedRentedCars = allCars.filter(
        (car) =>
          car.owner.toLowerCase() === account.toLowerCase() && Number(car.status) === 1
      );

      const detailedRentals = await Promise.all(
        ownedRentedCars.map(async (car) => {
          const details = await getActiveRental(car.id);
          return { ...car, rentalDetails: details };
        })
      );

      setRentals(detailedRentals);
    } catch (error) {
      console.error("Error loading detailed rentals:", error);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account) void loadRentalsWithDetails();
  }, [account, loadRentalsWithDetails]);

  const stats = useMemo(() => {
    const projectedValue = rentals.reduce(
      (total, rental) => total + parseFloat(rental.rentalDetails?.paid || 0),
      0
    );
    const averageDuration =
      rentals.length > 0
        ? Math.round(
            rentals.reduce(
              (total, rental) =>
                total +
                calculateDuration(
                  rental.rentalDetails?.startDate || 0,
                  rental.rentalDetails?.endDate || 0
                ),
              0
            ) / rentals.length
          )
        : 0;

    return {
      total: rentals.length,
      projectedValue: projectedValue.toFixed(4),
      averageDuration,
    };
  }, [rentals]);

  return (
    <main className="page-shell">
      <div className="page-container">
        <section className="panel page-hero">
          <div className="page-hero__copy">
            <p className="page-hero__eyebrow">Rental monitoring</p>
            <h1 className="page-hero__title">Active schedules and payout visibility in one place.</h1>
            <p className="page-hero__text">
              Review who is currently renting each vehicle, when the booking ends, and what value
              is already committed to the rental.
            </p>
          </div>

          <div className="hero-stat-grid">
            <article className="hero-stat">
              <span className="hero-stat__label">Active rentals</span>
              <strong className="hero-stat__value">{stats.total}</strong>
              <span className="hero-stat__copy">Cars that are currently with renters.</span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">Projected value</span>
              <strong className="hero-stat__value">{stats.projectedValue} ETH</strong>
              <span className="hero-stat__copy">Current payment value attached to live bookings.</span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">Average duration</span>
              <strong className="hero-stat__value">{stats.averageDuration} days</strong>
              <span className="hero-stat__copy">Rounded average across ongoing rental periods.</span>
            </article>
          </div>
        </section>

        <div className="section-header">
          <div className="section-title-block">
            <p className="section-kicker">Detailed view</p>
            <h2 className="section-title">Current rental contracts</h2>
            <p className="section-copy">
              Use this screen to keep track of end dates and stay ready for the return and fuel
              verification workflow.
            </p>
          </div>

          <button className="ui-button ui-button--ghost" onClick={() => navigate("/owner")}>
            Back to dashboard
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <p className="empty-state__title">Fetching rental schedules</p>
            <p className="empty-state__copy">
              Pulling active rental details from the blockchain for the owner fleet.
            </p>
          </div>
        ) : rentals.length > 0 ? (
          <div className="rentals-grid">
            {rentals.map((item) => {
              const details = item.rentalDetails;
              const duration = details
                ? calculateDuration(details.startDate, details.endDate)
                : 0;

              return (
                <article key={item.id} className="panel rental-detail-card">
                  <div className="rental-detail-card__top">
                    <div>
                      <span className="item-eyebrow">Car #{item.id}</span>
                      <h3>{item.model}</h3>
                    </div>

                    <span className="status-chip status-chip--warning">In progress</span>
                  </div>

                  <div className="info-grid">
                    <div className="info-card">
                      <span>Pickup</span>
                      <strong>{item.location || "Not specified"}</strong>
                    </div>
                    <div className="info-card">
                      <span>Renter</span>
                      <strong>{details ? truncateAddress(details.renter) : "Unavailable"}</strong>
                    </div>
                    <div className="info-card">
                      <span>Duration</span>
                      <strong>{duration} days</strong>
                    </div>
                    <div className="info-card">
                      <span>Earnings</span>
                      <strong>{details ? `${details.paid} ETH` : "Unavailable"}</strong>
                    </div>
                  </div>

                  {details ? (
                    <div className="notice-banner notice-banner--warning">
                      Booking window: {formatDate(details.startDate)} to {formatDate(details.endDate)}.
                      Once the renter returns the vehicle, reopen it from the fleet view after
                      verifying fuel.
                    </div>
                  ) : (
                    <div className="notice-banner notice-banner--warning">
                      Rental details are temporarily unavailable for this booking.
                    </div>
                  )}

                  {item.location && (
                    <a
                      className="ui-link"
                      href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
                        item.location
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open pickup location
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state__title">No active rentals</p>
            <p className="empty-state__copy">
              Current booking contracts will appear here whenever a renter checks out one of your
              listed vehicles.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
