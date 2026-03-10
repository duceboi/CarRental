import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getCarRentalHistory } from "../../../../context/useCarRental";
import { BLOCK_EXPLORER_URL } from "../../../../abi/contract";
import "./VehicleHistoryModal.css";

function fmt(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function ReliabilityBadge({ count }) {
  if (count === 0)
    return <span className="vh-badge vh-badge--new">New listing</span>;
  if (count >= 10)
    return <span className="vh-badge vh-badge--trusted">Trusted</span>;
  if (count >= 4)
    return <span className="vh-badge vh-badge--verified">Verified</span>;
  return <span className="vh-badge vh-badge--starter">Getting started</span>;
}

export default function VehicleHistoryModal({ car, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCarRentalHistory(car.id).then((data) => {
      if (!cancelled) {
        setHistory(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [car.id]);

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const totalEarned = history
    .reduce((sum, r) => sum + parseFloat(r.paid), 0)
    .toFixed(4);

  const modal = (
    <div
      className="vh-backdrop"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Rental history for ${car.model}`}
    >
      <div className="vh-modal">
        {/* ── Header ── */}
        <div className="vh-header">
          <div>
            <p className="vh-kicker">Vehicle track record</p>
            <h2 className="vh-title">{car.model}</h2>
            <p className="vh-subtitle">{car.location}</p>
          </div>
          <button className="vh-close" onClick={onClose} aria-label="Close">
            &#x2715;
          </button>
        </div>

        {/* ── Reliability stats ── */}
        <div className="vh-stats">
          <div className="vh-stat">
            <span className="vh-stat__label">Total trips</span>
            <strong className="vh-stat__value">
              {loading ? "—" : history.length}
            </strong>
          </div>
          <div className="vh-stat">
            <span className="vh-stat__label">Total earned</span>
            <strong className="vh-stat__value">
              {loading ? "—" : `${totalEarned} ETH`}
            </strong>
          </div>
          <div className="vh-stat">
            <span className="vh-stat__label">Daily rate</span>
            <strong className="vh-stat__value">{car.pricePerDay} ETH</strong>
          </div>
          <div className="vh-stat">
            <span className="vh-stat__label">Fuel status</span>
            <strong className="vh-stat__value vh-stat__value--green">
              &#10003; Verified full
            </strong>
          </div>
        </div>

        {/* ── Badge ── */}
        {!loading && (
          <div className="vh-badge-row">
            <ReliabilityBadge count={history.length} />
            <p className="vh-badge-copy">
              {history.length === 0
                ? "This car has no prior rental history — it is freshly listed and owner-maintained."
                : history.length === 1
                  ? "This vehicle has completed 1 verified on-chain rental."
                  : `This vehicle has completed ${history.length} verified on-chain rentals, with all payments confirmed on Sepolia.`}
            </p>
          </div>
        )}

        {/* ── Transaction list ── */}
        <div className="vh-section">
          <p className="vh-section__label">Past rental transactions</p>

          {loading ? (
            <div className="vh-loading">
              <span className="vh-spinner" />
              Fetching on-chain history…
            </div>
          ) : history.length === 0 ? (
            <div className="vh-empty">
              <p className="vh-empty__title">No transactions yet</p>
              <p className="vh-empty__copy">
                This is the first time this vehicle is listed. Your rental will
                appear here once completed.
              </p>
            </div>
          ) : (
            <ul className="vh-list">
              {history.map((entry, i) => {
                const duration = Math.round(
                  (entry.endDate - entry.startDate) / 86400,
                );
                const etherscanUrl = `${BLOCK_EXPLORER_URL}/tx/${entry.txHash}`;
                return (
                  <li key={entry.txHash} className="vh-entry">
                    <div className="vh-entry__index">#{history.length - i}</div>
                    <div className="vh-entry__body">
                      <div className="vh-entry__row">
                        <span className="vh-entry__dates">
                          {fmt(entry.startDate)} → {fmt(entry.endDate)}
                        </span>
                        <span className="vh-entry__days">
                          {duration} day{duration === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="vh-entry__row vh-entry__row--sub">
                        <span className="vh-entry__renter" title={entry.renter}>
                          Rented by <code>{shortAddr(entry.renter)}</code>
                        </span>
                        <span className="vh-entry__paid">{entry.paid} ETH</span>
                      </div>
                      <a
                        className="vh-entry__tx"
                        href={etherscanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={entry.txHash}
                      >
                        View on Etherscan ↗
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Footer note ── */}
        <p className="vh-footer-note">
          All data is sourced directly from the Sepolia blockchain. Transactions
          are immutable and cannot be altered by any party.
        </p>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
