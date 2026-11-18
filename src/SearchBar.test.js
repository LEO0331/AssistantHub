/* eslint-disable no-undef */
import React from 'react';
import { readFileSync } from 'node:fs';
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

test('search icon cannot overlap placeholder: computed padding survives the general input style', () => {
  // Load the actual stylesheet: this catches the original CSS cascade bug
  // where the later .input-control rule replaced .search-input padding.
  const style = document.createElement('style');
  style.textContent = readFileSync('src/App.css', 'utf8');
  document.head.appendChild(style);
  try {
    const { container } = render(<SearchBar value="" onChange={() => {}} onClear={() => {}} />);
    const input = screen.getByRole('textbox', { name: 'Search assistants by name' });
    const icon = container.querySelector('.search-icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toContainElement(container.querySelector('.fa-search'));
    expect(parseFloat(getComputedStyle(input).paddingLeft)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(getComputedStyle(input).paddingRight)).toBeGreaterThanOrEqual(64);
    expect(getComputedStyle(icon).pointerEvents).toBe('none');
  } finally {
    style.remove();
  }
});
