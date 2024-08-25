/* eslint-disable react/prop-types */
import React from 'react';

const SearchBar = ({ value, onChange }) => {
  return (
    <input
      className="input is-info"
      type="text"
      placeholder="Search by name..."
      value={value}
      onChange={onChange}
    />
  );
};

export default SearchBar;
