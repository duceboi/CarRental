import { useEffect, useState, useContext } from "react";
import { Web3Context } from "../../../../context/Web3Context";
import { getOwnerHistory } from "../../../../context/useCarRental";
import EarningsChart from "./EarningsChart";
import "./EarningsOverview.css";

export default function EarningsOverview() {
  const { account } = useContext(Web3Context);
  const [dailyEarnings, setDailyEarnings] = useState({});
  const [summary, setSummary] = useState({
    totalEarnings: "0.0000",
    completedRentals: 0,
    payoutDays: 0,
    latestPayout: "0.0000",
  });

  useEffect(() => {
    if (!account) return;

    const loadEarnings = async () => {
      try {
        const history = await getOwnerHistory(account);
        const validRentals = history
          .map((rental) => ({
            ...rental,
            paidValue: parseFloat(rental.paid),
            endValue: Number(rental.endDate),
          }))
          .filter((rental) => rental.paidValue > 0 && !Number.isNaN(rental.endValue));

        const dayMap = {};
        let totalSum = 0;

        validRentals.forEach((rental) => {
          const day = new Date(rental.endValue * 1000).toISOString().slice(0, 10);
          dayMap[day] = (dayMap[day] || 0) + rental.paidValue;
          totalSum += rental.paidValue;
        });

        const sortedByDate = [...validRentals].sort((left, right) => right.endValue - left.endValue);

        setDailyEarnings(dayMap);
        setSummary({
          totalEarnings: totalSum.toFixed(4),
          completedRentals: validRentals.length,
          payoutDays: Object.keys(dayMap).length,
          latestPayout: sortedByDate[0] ? sortedByDate[0].paidValue.toFixed(4) : "0.0000",
        });
      } catch (error) {
        console.error("Failed to load owner earnings:", error);
      }
    };

    loadEarnings();
  }, [account]);

  return (
    <section className="panel earnings-panel">
      <div className="earnings-panel__header">
        <div className="section-title-block">
          <p className="section-kicker">Revenue overview</p>
          <h2 className="section-title">Owner earnings at a glance</h2>
          <p className="section-copy">
            Track settled rentals, payout activity, and the most recent booking revenue from one
            lightweight summary.
          </p>
        </div>

        <div className="earnings-panel__headline">
          <span className="field-label">Total earned</span>
          <strong>{summary.totalEarnings} ETH</strong>
        </div>
      </div>

      <div className="metric-grid earnings-panel__stats">
        <article className="metric-card">
          <span className="metric-label">Completed rentals</span>
          <strong className="metric-value">{summary.completedRentals}</strong>
          <span className="metric-copy">Closed bookings that have already settled.</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Active payout days</span>
          <strong className="metric-value">{summary.payoutDays}</strong>
          <span className="metric-copy">Distinct dates with confirmed rental revenue.</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Latest payout</span>
          <strong className="metric-value">{summary.latestPayout} ETH</strong>
          <span className="metric-copy">Most recent payout pulled from owner history.</span>
        </article>
      </div>

      <div className="earnings-panel__chart">
        <EarningsChart data={dailyEarnings} />
      </div>
    </section>
  );
}
