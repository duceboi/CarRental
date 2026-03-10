import { forwardRef, useImperativeHandle, useRef } from "react";
import LocationInput from "../../../../components/LocationInput";
import LocationPreviewCard from "../../../../components/LocationPreviewCard";

const SearchSection = forwardRef(({ onSearch, onClear, currentFilters }, ref) => {
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focusStartDate: () => {
      if (startDateRef.current) {
        startDateRef.current.focus();
        if (startDateRef.current.showPicker) startDateRef.current.showPicker();
      }
    },
  }));

  const handleStartDateChange = (event) => {
    const nextValue = event.target.value;
    onSearch({ ...currentFilters, startDate: nextValue });

    if (nextValue) {
      setTimeout(() => {
        if (endDateRef.current) {
          endDateRef.current.focus();
          if (endDateRef.current.showPicker) endDateRef.current.showPicker();
        }
      }, 100);
    }
  };

  return (
    <section className="panel renter-panel renter-search">
      <div className="section-header">
        <div className="section-title-block">
          <p className="section-kicker">Search marketplace</p>
          <h2 className="section-title">Find the right car for your next booking</h2>
          <p className="section-copy">
            Filter by model, pickup location, and rental dates to focus the available inventory.
          </p>
        </div>

        <button className="ui-button ui-button--ghost" onClick={onClear}>
          Clear filters
        </button>
      </div>

      <div className="renter-search__grid">
        <label className="field">
          <span className="field-label">Car model</span>
          <input
            type="text"
            className="ui-input"
            value={currentFilters.model}
            onChange={(event) => onSearch({ ...currentFilters, model: event.target.value })}
            placeholder="Tesla Model 3"
          />
        </label>

        <LocationInput
          label="Pickup location"
          placeholder="Search city or address"
          value={currentFilters.location}
          onChange={(value) => onSearch({ ...currentFilters, location: value })}
          showMap={false}
        />

        <label className="field">
          <span className="field-label">Start date</span>
          <input
            ref={startDateRef}
            type="date"
            className="ui-input"
            value={currentFilters.startDate}
            onChange={handleStartDateChange}
          />
        </label>

        <label className="field">
          <span className="field-label">End date</span>
          <input
            ref={endDateRef}
            type="date"
            className="ui-input"
            value={currentFilters.endDate}
            onChange={(event) => onSearch({ ...currentFilters, endDate: event.target.value })}
          />
        </label>
      </div>

      <LocationPreviewCard
        query={currentFilters.location}
        title="Pickup location preview"
        description="Confirm the area before picking your booking dates."
        height={190}
        className="renter-search__preview"
      />
    </section>
  );
});

export default SearchSection;
