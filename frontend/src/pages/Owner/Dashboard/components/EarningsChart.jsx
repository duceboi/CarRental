import "./EarningsChart.css";

function formatDayLabel(day) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function EarningsChart({ data }) {
  const entries = Object.entries(data).sort(([left], [right]) => left.localeCompare(right)).slice(-7);

  if (entries.length === 0) {
    return (
      <div className="earnings-chart__empty">
        Revenue bars will appear here once completed rentals settle on-chain.
      </div>
    );
  }

  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="earnings-chart">
      {entries.map(([day, value]) => (
        <div key={day} className="earnings-chart__column" title={`${day}: ${value.toFixed(4)} ETH`}>
          <span className="earnings-chart__value">{value.toFixed(3)} ETH</span>
          <div className="earnings-chart__track">
            <div
              className="earnings-chart__bar"
              style={{ height: `${Math.max((value / max) * 100, 8)}%` }}
            />
          </div>
          <span className="earnings-chart__label">{formatDayLabel(day)}</span>
        </div>
      ))}
    </div>
  );
}
