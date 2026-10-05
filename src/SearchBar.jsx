/* eslint-disable react/prop-types */
import React from 'react';

const SearchBar = ({ value, onChange, onClear, isSearching = false }) => {
  return (
    <div className="search-shell">
      <span className="search-icon" aria-hidden="true">
        <i className="fa fa-search"></i>
      </span>
      <input
        className="input-control search-input"
        type="text"
        placeholder="Search by name, role, or skill..."
        value={value}
        onChange={onChange}
        aria-label="Search assistants by name"
      />
      {value && (
        <button type="button" className="clear-search-button" aria-label="Clear search" onClick={onClear}>
          Clear
        </button>
      )}
      {isSearching && <span className="search-hint">Searching...</span>}
    </div>
  );
};

export default SearchBar;
