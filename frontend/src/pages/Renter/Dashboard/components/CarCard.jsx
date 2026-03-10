import {
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { Web3Context } from "../../../../context/Web3Context";
import { rentCar } from "../../../../context/useCarRental";
import MapPreview from "../../../../components/MapPreview";
import { buildOsmDirectUrl, geocodeLocation } from "../../../../lib/location";

import "./CarCard.css";

export default function CarCard({ car, bookingDates, onAutoFill }) {
  const { signer, account } = useContext(Web3Context);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapCoords, setMapCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [mapError, setMapError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const geocodeAbortRef = useRef(null);

  const carUrls = useMemo(() => {
    const stored = localStorage.getItem(`car_images_${car.id}`);
    return stored ? JSON.parse(stored) : [];
  }, [car.id]);

  useEffect(
    () => () => {
      geocodeAbortRef.current?.abort();
    },
    [],
  );

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i + 1) % carUrls.length);
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i - 1 + carUrls.length) % carUrls.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, carUrls.length]);

  const calculateDays = () => {
    if (!bookingDates?.startDate || !bookingDates?.endDate) return 0;

    const start = new Date(bookingDates.startDate);
    const end = new Date(bookingDates.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const days = calculateDays();
  const totalCost =
    days > 0 ? (days * parseFloat(car.pricePerDay)).toFixed(4) : "0.0000";

  const handleRentClick = async () => {
    if (!account || !signer) {
      alert("Connect your wallet first.");
      return;
    }

    if (days === 0) {
      onAutoFill({ model: car.model, location: car.location });
      return;
    }

    try {
      setLoading(true);
      await rentCar(
        signer,
        car.id,
        bookingDates.startDate,
        bookingDates.endDate,
        totalCost,
      );
      alert("Rental submitted successfully.");
      window.location.reload();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMap = useCallback(async () => {
    const next = !showMap;
    setShowMap(next);

    if (next && !mapCoords && car.location) {
      geocodeAbortRef.current?.abort();
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      setGeocoding(true);
      setMapError("");

      try {
        const coords = await geocodeLocation(car.location, {
          signal: controller.signal,
        });
        if (coords) {
          setMapCoords({ lat: coords.lat, lon: coords.lon });
        } else {
          setMapError("Map preview unavailable for this location.");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setMapError("Map preview unavailable for this location.");
        }
      } finally {
        if (geocodeAbortRef.current === controller) {
          geocodeAbortRef.current = null;
          setGeocoding(false);
        }
      }
    }
  }, [showMap, mapCoords, car.location]);

  const osmDirectUrl = buildOsmDirectUrl(mapCoords, car.location);

  return (
    <article className="vehicle-card">
      {carUrls.length > 0 && (
        <div className="vehicle-card__photos">
          {carUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${car.model} photo ${i + 1}`}
              className="vehicle-card__photo"
              onClick={() => setLightboxIndex(i)}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ))}
        </div>
      )}

      <div className="vehicle-card__top">
        <div className="vehicle-card__title">
          <span className="item-eyebrow">Available now</span>
          <h3>{car.model}</h3>
        </div>

        <span className="status-chip status-chip--success">Fuel checked</span>
      </div>

      <p className="vehicle-card__location">{car.location}</p>

      <div className="info-grid vehicle-card__meta">
        <div className="info-card">
          <span>Daily rate</span>
          <strong>{car.pricePerDay} ETH</strong>
        </div>
        <div className="info-card">
          <span>Stay length</span>
          <strong>
            {days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "Select dates"}
          </strong>
        </div>
      </div>

      <div className="inline-actions">
        <button
          className="ui-button ui-button--ghost"
          onClick={handleToggleMap}
          disabled={geocoding}
        >
          {geocoding ? "Loading map" : showMap ? "Hide map" : "Preview map"}
        </button>

        {osmDirectUrl && (
          <a
            className="ui-button ui-button--soft"
            href={osmDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open map
          </a>
        )}
      </div>

      {showMap && (
        <div className="vehicle-card__map">
          {geocoding || !mapCoords ? (
            <div className="vehicle-card__map-placeholder">
              {geocoding
                ? "Loading map preview"
                : mapError || "Map preview unavailable for this location"}
            </div>
          ) : (
            <MapPreview
              coords={mapCoords}
              label={car.location}
              title={`Map for ${car.location}`}
              height={180}
              directUrl={osmDirectUrl}
              showLink={false}
            />
          )}
        </div>
      )}

      {days > 0 ? (
        <div className="vehicle-card__cost">
          <span>Total trip cost</span>
          <strong>{totalCost} ETH</strong>
          <p>
            Calculated from {days} booked day{days === 1 ? "" : "s"}.
          </p>
        </div>
      ) : (
        <p className="field-help">
          Choose start and end dates to calculate the full rental price.
        </p>
      )}

      <button
        className="ui-button ui-button--primary ui-button--wide"
        onClick={handleRentClick}
        disabled={loading}
      >
        {loading ? "Processing" : days > 0 ? "Rent now" : "Select dates"}
      </button>

      {/* Lightbox */}
      {lightboxIndex !== null &&
        createPortal(
          <div
            className="photo-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${car.model} photos`}
            onClick={() => setLightboxIndex(null)}
          >
            <button
              className="photo-lightbox__close"
              aria-label="Close"
              onClick={() => setLightboxIndex(null)}
            >
              &#x2715;
            </button>

            {carUrls.length > 1 && (
              <button
                className="photo-lightbox__nav photo-lightbox__nav--prev"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (i) => (i - 1 + carUrls.length) % carUrls.length,
                  );
                }}
              >
                &#8249;
              </button>
            )}

            <div
              className="photo-lightbox__frame"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={carUrls[lightboxIndex]}
                alt={`${car.model} — photo ${lightboxIndex + 1} of ${carUrls.length}`}
                className="photo-lightbox__img"
              />
            </div>

            {carUrls.length > 1 && (
              <button
                className="photo-lightbox__nav photo-lightbox__nav--next"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i + 1) % carUrls.length);
                }}
              >
                &#8250;
              </button>
            )}

            <div className="photo-lightbox__counter">
              {car.model} &middot; {lightboxIndex + 1} / {carUrls.length}
            </div>
          </div>,
          document.body,
        )}
    </article>
  );
}
