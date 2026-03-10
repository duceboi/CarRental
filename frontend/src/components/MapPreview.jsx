import { useMemo } from "react";
import { buildOsmEmbedUrl } from "../lib/location";

const DEFAULT_ZOOM = 16;

export default function MapPreview({
  coords,
  label,
  title = "Map preview",
  height = 220,
  zoom = DEFAULT_ZOOM,
  directUrl,
  showLink = true,
}) {
  const embedUrl = useMemo(() => buildOsmEmbedUrl(coords, zoom), [coords, zoom]);

  return (
    <div className="map-preview">
      <div className="map-preview__frame-shell" style={{ height }}>
        {embedUrl ? (
          <iframe
            className="map-preview__frame"
            title={title}
            src={embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="map-preview__fallback">Map preview unavailable for this location.</div>
        )}

        {label && <div className="map-preview__label">{label}</div>}

        {showLink && directUrl && (
          <a
            className="map-link"
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in OpenStreetMap
          </a>
        )}
      </div>
    </div>
  );
}
