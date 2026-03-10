import { useEffect, useMemo, useState } from "react";
import MapPreview from "./MapPreview";
import { buildOsmDirectUrl, geocodeLocation } from "../lib/location";

export default function LocationPreviewCard({
  query,
  title = "Pickup map preview",
  description = "Review the selected pickup point before booking.",
  height = 220,
  className = "",
}) {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmedQuery = query?.trim() || "";

  useEffect(() => {
    if (!trimmedQuery || trimmedQuery.length < 3) {
      setCoords(null);
      setLoading(false);
      setError("");
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    void geocodeLocation(trimmedQuery, { signal: controller.signal })
      .then((result) => {
        if (!result) {
          setCoords(null);
          setError("Map preview needs a more specific location.");
          return;
        }

        setCoords({ lat: result.lat, lon: result.lon });
      })
      .catch((nextError) => {
        if (nextError.name !== "AbortError") {
          setCoords(null);
          setError("Map preview could not be loaded for this location.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [trimmedQuery]);

  const directUrl = useMemo(() => buildOsmDirectUrl(coords, trimmedQuery), [coords, trimmedQuery]);
  const cardClassName = className ? `location-preview-card ${className}` : "location-preview-card";

  if (!trimmedQuery) {
    return null;
  }

  return (
    <section className={cardClassName}>
      <div className="location-preview-card__header">
        <div>
          <p className="section-kicker">Pickup preview</p>
          <h3 className="section-title">{title}</h3>
        </div>
        <p className="field-help">{description}</p>
      </div>

      {loading ? (
        <div className="location-preview-card__placeholder">
          Loading map preview for this location.
        </div>
      ) : coords ? (
        <MapPreview
          coords={coords}
          label={trimmedQuery}
          title={title}
          height={height}
          directUrl={directUrl}
        />
      ) : (
        <div className="location-preview-card__placeholder">
          {error || "Enter a more specific pickup location to preview it on the map."}
        </div>
      )}
    </section>
  );
}
