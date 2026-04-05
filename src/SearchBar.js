/* eslint-disable react/prop-types */
import React from 'react';

const SearchBar = ({ value, onChange }) => {
  return (
    <input
      className="input-control"
      type="text"
      placeholder="Search by name, role, or skill..."
      value={value}
      onChange={onChange}
      aria-label="Search assistants by name"
    />
  );
};

export default SearchBar;
