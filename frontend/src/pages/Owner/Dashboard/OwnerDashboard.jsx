import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Web3Context } from "../../../context/Web3Context";
import {
  fetchAllCars,
  registerCar as registerCarOnChain,
  toggleCarAvailability,
} from "../../../context/useCarRental";
import LocationInput from "../../../components/LocationInput";
import { uploadImagesToCloudinary } from "../../../lib/cloudinary";
import ActiveRentals from "./components/ActiveRentals";
import EarningsOverview from "./components/EarningsOverview";
import Notifications from "./components/Notifications";
import "./OwnerDashboard.css";

function getStatusMeta(status) {
  if (Number(status) === 0) {
    return {
      label: "Available",
      tone: "status-chip status-chip--success",
      actionLabel: "Hide from market",
      actionClass: "ui-button ui-button--danger",
    };
  }

  if (Number(status) === 2) {
    return {
      label: "Hidden",
      tone: "status-chip status-chip--neutral",
      actionLabel: "Make available",
      actionClass: "ui-button ui-button--success",
    };
  }

  return {
    label: "Rented",
    tone: "status-chip status-chip--warning",
    actionLabel: "",
    actionClass: "",
  };
}

export default function OwnerDashboard() {
  const { signer, account } = useContext(Web3Context);
  const navigate = useNavigate();

  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  // imageFiles: File[] used for IPFS upload
  // imagePreviews: object-URL[] used only for rendering
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 4 - imageFiles.length;
    const toProcess = files.slice(0, remaining);
    const previews = toProcess.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...toProcess]);
    setImagePreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
  };

  const loadOwnerCars = useCallback(async () => {
    if (!account) return;

    try {
      const allCars = await fetchAllCars();
      const ownedCars = allCars.filter(
        (car) => car.owner.toLowerCase() === account.toLowerCase(),
      );

      setCars(
        ownedCars.map((car) => ({
          id: car.id,
          model: car.model,
          status: car.status,
          earnings: car.earnings,
        })),
      );
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      setCars([]);
    }
  }, [account]);

  useEffect(() => {
    if (account) void loadOwnerCars();
  }, [account, loadOwnerCars]);

  const handleToggleAvailability = async (carId, currentStatus) => {
    if (!signer) {
      alert("Wallet not connected");
      return;
    }

    try {
      setLoading(true);
      const isAvailable = Number(currentStatus) === 0;
      await toggleCarAvailability(signer, carId, isAvailable);
      await loadOwnerCars();
    } catch (error) {
      console.error("Toggle failed:", error);
      alert("Transaction failed. Make sure you are the owner of this car.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCar = async () => {
    if (!model || !location || !pricePerDay) {
      alert("Please complete the full registration form.");
      return;
    }

    if (!signer) {
      alert("Wallet not connected");
      return;
    }

    try {
      setLoading(true);

      // 1. Upload photos to Cloudinary (before blockchain tx so errors are separated cleanly)
      let urls = [];
      if (imageFiles.length > 0) {
        try {
          setUploadStatus(`Uploading ${imageFiles.length} photo(s) to Cloudinary…`);
          urls = await uploadImagesToCloudinary(imageFiles);
        } catch (uploadError) {
          console.error("Cloudinary upload error:", uploadError);
          const proceed = window.confirm(
            `Photo upload failed: ${uploadError.message}\n\nDo you still want to register the car without photos?`,
          );
          if (!proceed) {
            setLoading(false);
            setUploadStatus("");
            return;
          }
        }
      }

      // 2. Submit blockchain transaction and get the actual car ID from the event
      setUploadStatus("Submitting to blockchain…");
      const { carId: newCarId } = await registerCarOnChain(
        signer,
        model,
        location,
        pricePerDay,
      );

      // 3. Persist Cloudinary URLs to localStorage keyed by the real on-chain car ID
      if (urls.length > 0 && newCarId != null) {
        localStorage.setItem(`car_images_${newCarId}`, JSON.stringify(urls));
      }

      // 5. Reset form
      setModel("");
      setLocation("");
      setPricePerDay("");
      clearImages();
      setTimeout(() => void loadOwnerCars(), 2000);
      alert("Car registered successfully.");
    } catch (error) {
      console.error("Registration failed:", error);
      alert(error.reason || error.message || "Transaction failed.");
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  };

  const stats = useMemo(() => {
    const available = cars.filter((car) => Number(car.status) === 0).length;
    const rented = cars.filter((car) => Number(car.status) === 1).length;
    const hidden = cars.filter((car) => Number(car.status) === 2).length;

    return { total: cars.length, available, rented, hidden };
  }, [cars]);

  return (
    <main className="page-shell">
      <div className="page-container owner-dashboard">
        <section className="panel page-hero">
          <div className="page-hero__copy">
            <p className="page-hero__eyebrow">Owner workspace</p>
            <h1 className="page-hero__title">
              Operate your fleet with a lighter control surface.
            </h1>
            <p className="page-hero__text">
              Add new vehicles, review revenue, watch live rental activity, and
              keep availability accurate without jumping across disconnected
              screens.
            </p>
            <div className="page-hero__meta">
              <span className="subtle-badge">Sepolia connected flow</span>
              <span className="subtle-badge">Live rental signals</span>
            </div>
          </div>

          <div className="hero-stat-grid">
            <article className="hero-stat">
              <span className="hero-stat__label">Fleet size</span>
              <strong className="hero-stat__value">{stats.total}</strong>
              <span className="hero-stat__copy">
                All vehicles registered to this owner wallet.
              </span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">Available now</span>
              <strong className="hero-stat__value">{stats.available}</strong>
              <span className="hero-stat__copy">
                Cars currently visible for renter bookings.
              </span>
            </article>

            <article className="hero-stat">
              <span className="hero-stat__label">In rental flow</span>
              <strong className="hero-stat__value">
                {stats.rented + stats.hidden}
              </strong>
              <span className="hero-stat__copy">
                Vehicles that are either rented or intentionally hidden from the
                market.
              </span>
            </article>
          </div>
        </section>

        <EarningsOverview />

        <section className="panel owner-register-panel">
          <div className="section-header">
            <div className="section-title-block">
              <p className="section-kicker">Add inventory</p>
              <h2 className="section-title">Register a new car</h2>
              <p className="section-copy">
                Capture the model, daily rate, and pickup location before
                submitting the on-chain registration transaction.
              </p>
            </div>

            <span className="subtle-badge">Owner action</span>
          </div>

          <div className="owner-register-grid">
            <div className="owner-register-fields">
              <label className="field">
                <span className="field-label">Car model</span>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Toyota Camry 2023"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">Daily price in ETH</span>
                <input
                  type="number"
                  className="ui-input"
                  placeholder="0.005"
                  value={pricePerDay}
                  onChange={(event) => setPricePerDay(event.target.value)}
                  min="0"
                  step="0.0001"
                />
              </label>

              <div className="field">
                <span className="field-label">
                  Vehicle photos
                  <span className="field-label__hint"> (up to 4)</span>
                </span>

                {imagePreviews.length > 0 && (
                  <div className="img-preview-grid">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="img-preview-item">
                        <img src={src} alt={`Car photo ${i + 1}`} />
                        <button
                          type="button"
                          className="img-preview-item__remove"
                          onClick={() => removeImage(i)}
                          aria-label="Remove photo"
                          disabled={loading}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {imagePreviews.length < 4 && (
                  <label className="img-upload-zone">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                      disabled={loading}
                    />
                    <span className="img-upload-zone__icon">+</span>
                    <span>
                      {imagePreviews.length === 0
                        ? "Click to upload photos"
                        : `Add more (${imagePreviews.length}/4)`}
                    </span>
                  </label>
                )}

                {uploadStatus && (
                  <p className="upload-status">{uploadStatus}</p>
                )}
              </div>

              <div className="owner-register-actions">
                <button
                  className="ui-button ui-button--primary"
                  onClick={handleRegisterCar}
                  disabled={loading}
                >
                  {uploadStatus
                    ? uploadStatus
                    : loading
                      ? "Submitting"
                      : "Add to blockchain"}
                </button>
              </div>
            </div>

            <div className="owner-register-map">
              <LocationInput
                label="Pickup location"
                placeholder="Search address or use GPS"
                value={location}
                onChange={setLocation}
                showMap={true}
              />
            </div>
          </div>
        </section>

        <section className="panel section-stack owner-preview-panel">
          <div className="section-header">
            <div className="section-title-block">
              <p className="section-kicker">Fleet preview</p>
              <h2 className="section-title">Registered cars</h2>
              <p className="section-copy">
                See the most recent portion of your fleet and jump into the full
                management view for fuel verification or visibility updates.
              </p>
            </div>

            <button
              className="ui-button ui-button--ghost"
              onClick={() => navigate("/owner/cars")}
            >
              View full fleet
            </button>
          </div>

          {cars.length > 0 ? (
            <div className="card-grid owner-preview-grid">
              {cars.slice(0, 4).map((car) => {
                const meta = getStatusMeta(car.status);

                return (
                  <article key={car.id} className="owner-preview-card">
                    <div className="owner-preview-card__top">
                      <span className="item-eyebrow">Car #{car.id}</span>
                      <span className={meta.tone}>{meta.label}</span>
                    </div>

                    <h3>{car.model}</h3>
                    <p>
                      {Number(car.earnings || 0).toFixed(4)} ETH earned so far.
                    </p>

                    {Number(car.status) !== 1 && (
                      <button
                        className={meta.actionClass}
                        onClick={() =>
                          handleToggleAvailability(car.id, car.status)
                        }
                        disabled={loading}
                      >
                        {loading ? "Updating" : meta.actionLabel}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state__title">No registered cars yet</p>
              <p className="empty-state__copy">
                Add your first vehicle above and it will appear here with live
                availability status.
              </p>
            </div>
          )}
        </section>

        <div className="owner-dashboard__bottom">
          <ActiveRentals
            rentals={cars.filter((car) => Number(car.status) === 1)}
          />
          <Notifications />
        </div>
      </div>
    </main>
  );
}
