import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import MapPreview from "./MapPreview";
import {
  buildOsmDirectUrl,
  geocodeLocation,
  getCurrentBrowserCoordinates,
  getGeolocationErrorMessage,
  reverseGeocode,
  searchPlaces,
} from "../lib/location";

function useDebounce(fn, delay) {
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

export default function LocationInput({
  value,
  onChange,
  placeholder = "Search pickup location",
  showMap = false,
  inputStyle = {},
  label,
}) {
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchAbortRef = useRef(null);
  const resolveAbortRef = useRef(null);
  const coordsRef = useRef(null);
  const skipResolveOnBlurRef = useRef(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolvingMap, setResolvingMap] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  useEffect(() => {
    if (!value) {
      setCoords(null);
      setSuggestions([]);
      setShowDropdown(false);
      setError("");
    }
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedInsideField = containerRef.current?.contains(event.target);
      const clickedInsideDropdown = dropdownRef.current?.contains(event.target);

      if (!clickedInsideField && !clickedInsideDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(
    () => () => {
      searchAbortRef.current?.abort();
      resolveAbortRef.current?.abort();
    },
    []
  );

  const updateDropdownPosition = useCallback(() => {
    if (!searchRef.current) {
      setDropdownStyle(null);
      return;
    }

    const rect = searchRef.current.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 10,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!showDropdown || suggestions.length === 0) {
      setDropdownStyle(null);
      return;
    }

    updateDropdownPosition();

    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [showDropdown, suggestions.length, updateDropdownPosition]);

  const doSearch = useCallback(async (query) => {
    const trimmedQuery = query?.trim();

    searchAbortRef.current?.abort();

    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);

    try {
      const results = await searchPlaces(trimmedQuery, { signal: controller.signal });
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    } catch (error) {
      if (error.name !== "AbortError") {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
        setSearching(false);
      }
    }
  }, [showMap]);

  const debouncedSearch = useDebounce(doSearch, 350);

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    onChange(nextValue);
    setCoords(null);
    setError("");
    debouncedSearch(nextValue);
  };

  const handleSelectSuggestion = (suggestion) => {
    skipResolveOnBlurRef.current = true;
    onChange(suggestion.label);
    setCoords({ lat: suggestion.lat, lon: suggestion.lon });
    setSuggestions([]);
    setShowDropdown(false);
    setError("");
  };

  const resolveTypedLocation = useCallback(
    async (nextValue) => {
      const trimmedValue = nextValue?.trim();

      if (!showMap || !trimmedValue || trimmedValue.length < 3 || coordsRef.current) {
        return;
      }

      resolveAbortRef.current?.abort();
      const controller = new AbortController();
      resolveAbortRef.current = controller;
      setResolvingMap(true);
      setError("");

      try {
        const result = await geocodeLocation(trimmedValue, { signal: controller.signal });
        if (result) {
          setCoords({ lat: result.lat, lon: result.lon });
          return;
        }

        setError("Map preview needs a more specific location. Choose a suggestion or use GPS.");
      } catch (error) {
        if (error.name !== "AbortError") {
          setError("Map preview could not be loaded for this location.");
        }
      } finally {
        if (resolveAbortRef.current === controller) {
          resolveAbortRef.current = null;
          setResolvingMap(false);
        }
      }
    },
    [showMap]
  );

  const handleUseCurrentLocation = useCallback(async () => {
    if (!showMap) {
      setCoords(null);
    }

    searchAbortRef.current?.abort();
    resolveAbortRef.current?.abort();
    setSuggestions([]);
    setShowDropdown(false);
    setLocating(true);
    setResolvingMap(false);
    setError("");

    try {
      const currentPosition = await getCurrentBrowserCoordinates();
      const result = await reverseGeocode(currentPosition.lat, currentPosition.lon);
      onChange(result.address);
      setCoords({ lat: result.lat, lon: result.lon });
    } catch (geoError) {
      setError(getGeolocationErrorMessage(geoError));
    } finally {
      skipResolveOnBlurRef.current = false;
      setLocating(false);
    }
  }, [onChange, showMap]);

  const handleInputBlur = () => {
    if (skipResolveOnBlurRef.current) {
      skipResolveOnBlurRef.current = false;
      return;
    }

    void resolveTypedLocation(value);
  };

  const osmDirectUrl = buildOsmDirectUrl(coords, value);

  const shouldRenderDropdown = showDropdown && suggestions.length > 0 && dropdownStyle;

  return (
    <div ref={containerRef} className="field">
      {label && <label className="field-label">{label}</label>}

      <div className="location-row">
        <div ref={searchRef} className="location-search">
          <span className="location-prefix">Map</span>

          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder={placeholder}
            autoComplete="off"
            className="ui-input location-input"
            style={inputStyle}
          />

          {searching && <span className="location-busy">Searching</span>}
        </div>

        <button
          type="button"
          className="ui-button ui-button--ghost"
          onMouseDown={() => {
            skipResolveOnBlurRef.current = true;
          }}
          onClick={handleUseCurrentLocation}
          disabled={locating}
        >
          {locating ? "Locating" : "Use GPS"}
        </button>
      </div>

      {shouldRenderDropdown &&
        createPortal(
          <ul
            ref={dropdownRef}
            className="location-dropdown"
            style={dropdownStyle}
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.label}-${index}`}
                className="location-option"
                onMouseDown={() => handleSelectSuggestion(suggestion)}
              >
                {suggestion.label}
              </li>
            ))}
          </ul>,
          document.body
        )}

      {error && <p className="field-help field-help--error">{error}</p>}

      {showMap && value && !coords && (
        <p className="field-help">
          {resolvingMap
            ? "Resolving the map preview for this address."
            : "Select a suggestion, finish typing the address, or use GPS to preview the exact pickup point."}
        </p>
      )}

      {showMap && coords && (
        <MapPreview
          coords={coords}
          label={value}
          title="Pickup location map"
          height={220}
          directUrl={osmDirectUrl}
        />
      )}
    </div>
  );
}
