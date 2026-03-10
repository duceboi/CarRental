import { useState, useEffect } from "react";
import { listenToAllEvents } from "../../../../context/useCarRental";

const toneByType = {
  REGISTRATION: "status-chip status-chip--accent",
  RENTAL: "status-chip status-chip--success",
  FUEL_VERIFIED: "status-chip status-chip--warning",
  RETURNED: "status-chip status-chip--neutral",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = listenToAllEvents((nextNotification) => {
      setNotifications((current) => [nextNotification, ...current].slice(0, 5));
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <section className="panel section-stack owner-preview-panel">
      <div className="section-header">
        <div className="section-title-block">
          <p className="section-kicker">Live feed</p>
          <h2 className="section-title">Recent activity</h2>
          <p className="section-copy">
            Smart contract events are surfaced here so owner actions and renter activity stay easy
            to scan without leaving the dashboard.
          </p>
        </div>

        <span className="subtle-badge">Live monitoring</span>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state__title">No activity yet</p>
          <p className="empty-state__copy">
            Registrations, rentals, returns, and fuel verification events will stream in here.
          </p>
        </div>
      ) : (
        <div className="activity-list">
          {notifications.map((notification, index) => (
            <article key={`${notification.title}-${index}`} className="activity-item">
              <div className="activity-item__header">
                <div className="activity-item__title">
                  <span className={toneByType[notification.type] || "status-chip status-chip--neutral"}>
                    {notification.title}
                  </span>
                </div>
                <span className="activity-item__time">{notification.time}</span>
              </div>

              <p className="activity-item__message">{notification.message}</p>
              {notification.amount && <p className="activity-item__amount">{notification.amount}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
