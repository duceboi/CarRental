import CarCard from "./CarCard";

export default function AvailableCars({
  expanded,
  data,
  totalCount,
  filters,
  onAutoFill,
  open,
  close,
}) {
  const visibleCars = expanded ? data : data.slice(0, 3);

  const content =
    data.length > 0 ? (
      <div className="market-grid">
        {visibleCars.map((car) => (
          <CarCard key={car.id} car={car} bookingDates={filters} onAutoFill={onAutoFill} />
        ))}
      </div>
    ) : (
      <div className="empty-state">
        <p className="empty-state__title">No cars match these filters</p>
        <p className="empty-state__copy">
          Adjust the model or location filters to widen the current marketplace view.
        </p>
      </div>
    );

  if (expanded) {
    return (
      <section className="section-stack fade-in">
        <div className="section-header">
          <div className="section-title-block">
            <p className="section-kicker">Marketplace</p>
            <h2 className="section-title">Available cars</h2>
            <p className="section-copy">
              Showing {data.length} match{data.length === 1 ? "" : "es"} from {totalCount} total
              listed vehicles.
            </p>
          </div>

          <button className="ui-button ui-button--ghost" onClick={close}>
            Back to dashboard
          </button>
        </div>

        {content}
      </section>
    );
  }

  return (
    <section className="panel renter-panel">
      <div className="section-header">
        <div className="section-title-block">
          <p className="section-kicker">Marketplace</p>
          <h2 className="section-title">Available cars</h2>
          <p className="section-copy">
            {data.length} filtered result{data.length === 1 ? "" : "s"} ready for review.
          </p>
        </div>

        <button className="ui-button ui-button--primary" onClick={open}>
          View all ({data.length})
        </button>
      </div>

      {content}
    </section>
  );
}
