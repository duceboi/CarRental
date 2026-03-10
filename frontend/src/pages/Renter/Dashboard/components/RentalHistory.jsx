function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RentalHistory({ expanded, data, open, close }) {
  if (expanded) {
    return (
      <section className="section-stack fade-in">
        <div className="section-header">
          <div className="section-title-block">
            <p className="section-kicker">History</p>
            <h2 className="section-title">Completed rental history</h2>
            <p className="section-copy">
              Your renter ledger keeps each finished booking visible together with the completion
              date and payment amount.
            </p>
          </div>

          <button className="ui-button ui-button--ghost" onClick={close}>
            Back to dashboard
          </button>
        </div>

        {data.length > 0 ? (
          <section className="panel renter-table-panel">
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Completed</th>
                    <th>Amount paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={`${item.carId}-${index}`}>
                      <td>
                        <strong>{item.model}</strong>
                      </td>
                      <td>{formatDate(item.endDate)}</td>
                      <td>
                        <strong>{item.paid} ETH</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <div className="empty-state">
            <p className="empty-state__title">No completed rentals yet</p>
            <p className="empty-state__copy">
              Finished renter transactions will be recorded here once your first booking closes.
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
          <p className="section-kicker">History</p>
          <h2 className="section-title">Rental history</h2>
          <p className="section-copy">A quick snapshot of your latest completed transactions.</p>
        </div>

        <button className="ui-button ui-button--ghost" onClick={open}>
          View all
        </button>
      </div>

      {data.length > 0 ? (
        <div className="list-stack">
          {data.slice(0, 5).map((item, index) => (
            <article key={`${item.carId}-${index}`} className="list-card">
              <div className="list-card__copy">
                <h3 className="list-card__title">{item.model}</h3>
                <p className="list-card__meta">{formatDate(item.endDate)}</p>
              </div>
              <strong>{item.paid} ETH</strong>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state__title">No booking history yet</p>
          <p className="empty-state__copy">
            Past rentals will appear here after a booking reaches its completion date.
          </p>
        </div>
      )}
    </section>
  );
}
