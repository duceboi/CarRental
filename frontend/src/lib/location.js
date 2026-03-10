const ACCEPT_LANGUAGE_HEADER = { "Accept-Language": "en" };
const SEARCH_LIMIT = 6;
const searchCache = new Map();
const reverseCache = new Map();

function normalizeNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function uniqueStrings(parts) {
  const seen = new Set();

  return parts.filter((part) => {
    const normalized = part?.trim();
    if (!normalized) return false;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function buildPhotonLabel(properties = {}) {
  const streetLine = [properties.housenumber, properties.street].filter(Boolean).join(" ").trim();
  const locality =
    properties.city ||
    properties.town ||
    properties.village ||
    properties.county ||
    properties.district;

  const parts = uniqueStrings([
    properties.name,
    streetLine,
    locality,
    properties.state,
    properties.country,
  ]);

  return parts.join(", ");
}

function normalizePlace(place) {
  if (!place?.label) return null;

  const lat = normalizeNumber(place.lat);
  const lon = normalizeNumber(place.lon);

  if (lat === null || lon === null) return null;

  return {
    label: place.label,
    lat,
    lon,
  };
}

function dedupePlaces(places) {
  const seen = new Set();

  return places.filter((place) => {
    const normalized = normalizePlace(place);
    if (!normalized) return false;

    const key = `${normalized.label.toLowerCase()}|${normalized.lat.toFixed(5)}|${normalized.lon.toFixed(5)}`;
    if (seen.has(key)) return false;

    seen.add(key);
    Object.assign(place, normalized);
    return true;
  });
}

async function photonSearch(query, signal) {
  const response = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}&lang=en`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(`Photon search failed with status ${response.status}.`);
  }

  const data = await response.json();

  return dedupePlaces(
    (data.features || []).map((feature) => ({
      label: buildPhotonLabel(feature.properties) || feature.properties?.name || query,
      lat: feature.geometry?.coordinates?.[1],
      lon: feature.geometry?.coordinates?.[0],
    }))
  );
}

async function nominatimSearch(query, signal) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=${SEARCH_LIMIT}&addressdetails=1`,
    { headers: ACCEPT_LANGUAGE_HEADER, signal }
  );

  if (!response.ok) {
    throw new Error(`Nominatim search failed with status ${response.status}.`);
  }

  const data = await response.json();

  return dedupePlaces(
    (data || []).map((item) => ({
      label: item.display_name,
      lat: item.lat,
      lon: item.lon,
    }))
  );
}

function formatFallbackAddress(lat, lon) {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export async function searchPlaces(query, { signal } = {}) {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) return [];

  const cacheKey = trimmedQuery.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  let photonResults = [];

  try {
    photonResults = await photonSearch(trimmedQuery, signal);
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }
  }

  let nominatimResults = [];

  if (photonResults.length === 0) {
    try {
      nominatimResults = await nominatimSearch(trimmedQuery, signal);
    } catch (error) {
      if (error.name === "AbortError") {
        throw error;
      }
    }
  }

  const results = dedupePlaces([...photonResults, ...nominatimResults]);
  searchCache.set(cacheKey, results);
  return results;
}

export async function geocodeLocation(query, { signal } = {}) {
  const results = await searchPlaces(query, { signal });
  return results[0] || null;
}

export async function reverseGeocode(lat, lon, { signal } = {}) {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  if (reverseCache.has(key)) {
    return reverseCache.get(key);
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16&addressdetails=1`,
      { headers: ACCEPT_LANGUAGE_HEADER, signal }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}.`);
    }

    const data = await response.json();
    const address = data.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.suburb ||
      address.state_district ||
      "";
    const state = address.state || "";
    const shortAddress =
      city && state
        ? `${city}, ${state}`
        : city || state || data.display_name || formatFallbackAddress(lat, lon);

    const result = { address: shortAddress, lat, lon };
    reverseCache.set(key, result);
    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    return { address: formatFallbackAddress(lat, lon), lat, lon };
  }
}

export function buildOsmDirectUrl(coords, fallbackQuery = "") {
  const lat = normalizeNumber(coords?.lat);
  const lon = normalizeNumber(coords?.lon);

  if (lat !== null && lon !== null) {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
  }

  const trimmedQuery = fallbackQuery?.trim();
  return trimmedQuery
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(trimmedQuery)}`
    : null;
}

export function buildOsmEmbedUrl(coords, zoom = 16) {
  const lat = normalizeNumber(coords?.lat);
  const lon = normalizeNumber(coords?.lon);

  if (lat === null || lon === null) {
    return null;
  }

  const delta = zoom >= 16 ? 0.008 : zoom >= 14 ? 0.012 : 0.018;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta},${lat - delta},${
    lon + delta
  },${lat + delta}&layer=mapnik&marker=${lat},${lon}`;
}

function isLocalhost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function readGeolocationPermissionState() {
  if (!navigator.permissions?.query) return null;

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state;
  } catch {
    return null;
  }
}

export async function getCurrentBrowserCoordinates() {
  if (typeof window !== "undefined" && !window.isSecureContext && !isLocalhost(window.location.hostname)) {
    const error = new Error("Geolocation requires HTTPS or localhost.");
    error.code = "INSECURE_CONTEXT";
    throw error;
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    const error = new Error("Geolocation is not supported by this browser.");
    error.code = "UNSUPPORTED";
    throw error;
  }

  const permissionState = await readGeolocationPermissionState();
  if (permissionState === "denied") {
    const error = new Error("Location access was denied. Allow permission and try again.");
    error.code = "PERMISSION_DENIED";
    throw error;
  }

  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });

    return {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
    };
  } catch (error) {
    if (error?.code === 1) {
      throw error;
    }

    const fallbackPosition = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 300000,
    });

    return {
      lat: fallbackPosition.coords.latitude,
      lon: fallbackPosition.coords.longitude,
      accuracy: fallbackPosition.coords.accuracy ?? null,
    };
  }
}

export function getGeolocationErrorMessage(error) {
  if (!error) {
    return "Your location could not be retrieved right now.";
  }

  if (error.code === "UNSUPPORTED") {
    return "Geolocation is not supported by this browser.";
  }

  if (error.code === "INSECURE_CONTEXT") {
    return "Geolocation needs HTTPS or localhost. Open the app on a secure origin and try again.";
  }

  if (error.code === "PERMISSION_DENIED" || error.code === 1) {
    return "Location access was denied. Allow permission and try again.";
  }

  if (error.code === 2) {
    return "Location is unavailable. Check your device GPS or network settings.";
  }

  if (error.code === 3) {
    return "Location timed out. Try again where your device has a better signal.";
  }

  return error.message || "Your location could not be retrieved right now.";
}
