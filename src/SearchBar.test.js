/* eslint-disable no-undef */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from './SearchBar';

// Test to check if the SearchBar displays the correct value
test('displays the correct value in the input', () => {
  const testValue = "John Doe";
  render(<SearchBar value={testValue} onChange={() => {}} />);
  
  // Check if the input element has the correct value
  const inputElement = screen.getByPlaceholderText(/Search by name.../i);
  expect(inputElement.value).toBe(testValue);
});

// Test to check if the onChange handler is called when the input value changes
test('calls onChange handler when value changes', () => {
  const handleChange = jest.fn();
  render(<SearchBar value="" onChange={handleChange} />);
  
  // Get the input element
  const inputElement = screen.getByPlaceholderText(/Search by name.../i);
  
  // Simulate changing the input value
  fireEvent.change(inputElement, { target: { value: 'Jane Doe' } });
  
  // Check if the onChange handler was called
  expect(handleChange).toHaveBeenCalledTimes(1);
});
