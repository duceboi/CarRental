import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Web3Context } from "../../context/Web3Context";
import "./Login.css";

export default function Login() {
  const { account, connectWallet } = useContext(Web3Context);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleConnect = async () => {
    await connectWallet();
    setStep(2);
  };

  const chooseRole = (role) => {
    localStorage.setItem("role", role);
    navigate(role === "owner" ? "/owner" : "/renter");
  };

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-showcase panel">
          <div className="login-showcase__copy">
            <p className="page-hero__eyebrow">Blockchain-first rentals</p>
            <h1 className="login-showcase__title">
              Premium car rental operations with a cleaner wallet flow.
            </h1>
            <p className="page-hero__text">
              Manage listings, book vehicles, and coordinate returns from one light,
              minimal interface built around Sepolia-based transactions.
            </p>
          </div>

          <div className="login-feature-grid">
            <article className="login-feature">
              <span className="item-eyebrow">Owner</span>
              <h2>Fleet visibility</h2>
              <p>Register vehicles, monitor active bookings, and verify return readiness.</p>
            </article>

            <article className="login-feature">
              <span className="item-eyebrow">Renter</span>
              <h2>Focused booking flow</h2>
              <p>Search by location, review totals, and return cars with clear next steps.</p>
            </article>

            <article className="login-feature">
              <span className="item-eyebrow">Shared</span>
              <h2>Consistent on every screen</h2>
              <p>Calm spacing, premium typography, and the same interaction language throughout.</p>
            </article>
          </div>
        </section>

        <section className="login-card panel">
          <div className="login-card__head">
            <p className="section-kicker">Start session</p>
            <h2 className="section-title">Connect, then choose your workspace</h2>
            <p className="section-copy">
              The app keeps the entry flow short: connect MetaMask, confirm the network, and
              move into the owner or renter experience.
            </p>
          </div>

          <div className="login-progress">
            <div className="login-progress__track">
              <div
                className="login-progress__fill"
                style={{ width: step === 1 ? "50%" : "100%" }}
              />
            </div>
            <span className="subtle-badge">Step {step} of 2</span>
          </div>

          {step === 1 && (
            <button className="ui-button ui-button--primary ui-button--wide" onClick={handleConnect}>
              Connect wallet
            </button>
          )}

          {step === 2 && account && (
            <div className="login-role-stack">
              <div className="login-wallet">
                <span className="field-label">Connected wallet</span>
                <strong>{account}</strong>
              </div>

              <div className="login-role-grid">
                <button className="login-role-card" onClick={() => chooseRole("owner")}>
                  <span className="item-eyebrow">Owner</span>
                  <strong>Manage fleet</strong>
                  <p>Register cars, review earnings, and handle return verification.</p>
                </button>

                <button className="login-role-card" onClick={() => chooseRole("renter")}>
                  <span className="item-eyebrow">Renter</span>
                  <strong>Book a vehicle</strong>
                  <p>Browse available cars, confirm dates, and track active rentals.</p>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
