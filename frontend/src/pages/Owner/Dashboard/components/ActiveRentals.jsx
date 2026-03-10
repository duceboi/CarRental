import { useNavigate } from "react-router-dom";

export default function ActiveRentals({ rentals }) {
  const navigate = useNavigate();

  return (
    <section className="panel section-stack owner-preview-panel">
      <div className="section-header">
        <div className="section-title-block">
          <p className="section-kicker">Current operations</p>
          <h2 className="section-title">Active rentals</h2>
          <p className="section-copy">
            Watch the vehicles that are currently on hire and move into the detailed rentals view
            when you need the full schedule.
          </p>
        </div>

        <button className="ui-button ui-button--ghost" onClick={() => navigate("/owner/rentals")}>
          View all rentals
        </button>
      </div>

      {rentals && rentals.length > 0 ? (
        <div className="card-grid owner-preview-grid">
          {rentals.slice(0, 4).map((rental) => (
            <article key={rental.id} className="owner-preview-card">
              <div className="owner-preview-card__top">
                <span className="item-eyebrow">Rented now</span>
                <span className="status-chip status-chip--warning">In progress</span>
              </div>

              <h3>{rental.model}</h3>
              <p>The return workflow will move back into your fleet once the renter checks in.</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state__title">No active rentals</p>
          <p className="empty-state__copy">
            Rentals that are currently underway will appear here for quick monitoring.
          </p>
        </div>
      )}
    </section>
  );
}
