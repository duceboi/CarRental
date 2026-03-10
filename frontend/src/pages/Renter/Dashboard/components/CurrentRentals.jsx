function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CurrentRentals({
  expanded,
  data,
  open,
  close,
  onReturnCar,
  returningCarId,
}) {
  if (expanded) {
    return (
      <section className="section-stack fade-in">
        <div className="section-header">
          <div className="section-title-block">
            <p className="section-kicker">Active bookings</p>
            <h2 className="section-title">Current rentals</h2>
            <p className="section-copy">
              Review every live booking and return the vehicle once you have refueled it.
            </p>
          </div>

          <button className="ui-button ui-button--ghost" onClick={close}>
            Back to dashboard
          </button>
        </div>

        {data.length > 0 ? (
          <div className="renter-detail-grid">
            {data.map((car) => (
              <article key={car.id} className="panel renter-detail-card">
                <div className="renter-detail-card__top">
                  <div>
                    <span className="item-eyebrow">In progress</span>
                    <h3>{car.model}</h3>
                  </div>
                  <span className="status-chip status-chip--warning">Return pending</span>
                </div>

                <div className="info-grid">
                  <div className="info-card">
                    <span>Pickup</span>
                    <strong>{car.location}</strong>
                  </div>
                  <div className="info-card">
                    <span>Rental ends</span>
                    <strong>{formatDate(car.rentalDetails.endDate)}</strong>
                  </div>
                  <div className="info-card">
                    <span>Paid</span>
                    <strong>{car.rentalDetails.paid} ETH</strong>
                  </div>
                </div>

                <div className="notice-banner notice-banner--success">
                  Return the car only after topping up the fuel. The owner will confirm the refill
                  and reopen the listing after inspection.
                </div>

                <button
                  className="ui-button ui-button--success"
                  onClick={() => onReturnCar?.(car.id)}
                  disabled={returningCarId === car.id}
                >
                  {returningCarId === car.id ? "Returning" : "Return car with full fuel"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state__title">No active rentals</p>
            <p className="empty-state__copy">
              Any cars you are currently renting will appear here until the return flow completes.
            </p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="panel renter-panel">
      <div className="section-header">
        <div className="section-title-block">
          <p className="section-kicker">Active bookings</p>
          <h2 className="section-title">Current rentals</h2>
          <p className="section-copy">A compact view of the cars you have checked out right now.</p>
        </div>

        <button className="ui-button ui-button--ghost" onClick={open}>
          View all ({data.length})
        </button>
      </div>

      {data.length > 0 ? (
        <div className="list-stack">
          {data.slice(0, 4).map((car) => (
            <article key={car.id} className="list-card">
              <div className="list-card__copy">
                <h3 className="list-card__title">{car.model}</h3>
                <p className="list-card__meta">{car.location}</p>
              </div>
              <span className="status-chip status-chip--warning">Active</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state__title">Nothing active right now</p>
          <p className="empty-state__copy">
            Start a booking from the marketplace and it will appear here immediately.
          </p>
        </div>
      )}
    </section>
  );
}
