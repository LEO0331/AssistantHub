/* eslint-disable no-undef */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchBar from './SearchBar';

test('displays the correct value in the input', () => {
  const testValue = 'John Doe';
  render(<SearchBar value={testValue} onChange={() => {}} onClear={() => {}} />);

  const inputElement = screen.getByPlaceholderText(/Search by name, role, or skill.../i);
  expect(inputElement.value).toBe(testValue);
});

test('calls onChange handler when value changes', () => {
  const handleChange = jest.fn();
  render(<SearchBar value="" onChange={handleChange} onClear={() => {}} />);

  const inputElement = screen.getByPlaceholderText(/Search by name, role, or skill.../i);

  fireEvent.change(inputElement, { target: { value: 'Jane Doe' } });

  expect(handleChange).toHaveBeenCalledTimes(1);
});

test('calls onClear when clear button is clicked', () => {
  const handleClear = jest.fn();
  render(<SearchBar value="abc" onChange={() => {}} onClear={handleClear} />);

  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

  expect(handleClear).toHaveBeenCalledTimes(1);
});

test('shows searching hint when debounce is pending', () => {
  render(<SearchBar value="abc" onChange={() => {}} onClear={() => {}} isSearching />);
  expect(screen.getByText('Searching...')).toBeInTheDocument();
});
