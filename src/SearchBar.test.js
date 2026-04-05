/* eslint-disable no-undef */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from './SearchBar';

test('displays the correct value in the input', () => {
  const testValue = 'John Doe';
  render(<SearchBar value={testValue} onChange={() => {}} />);

  const inputElement = screen.getByPlaceholderText(/Search by name, role, or skill.../i);
  expect(inputElement.value).toBe(testValue);
});

test('calls onChange handler when value changes', () => {
  const handleChange = jest.fn();
  render(<SearchBar value="" onChange={handleChange} />);

  const inputElement = screen.getByPlaceholderText(/Search by name, role, or skill.../i);

  fireEvent.change(inputElement, { target: { value: 'Jane Doe' } });

  expect(handleChange).toHaveBeenCalledTimes(1);
});
