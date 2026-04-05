/* eslint-disable no-undef */
import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns initial value and updates after delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'a', delay: 200 },
    });

    expect(result.current).toBe('a');

    rerender({ value: 'abc', delay: 200 });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('abc');
  });

  test('clears previous timer when value changes quickly', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });
    act(() => {
      jest.advanceTimersByTime(50);
    });
    rerender({ value: 'third' });

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('first');

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('third');
  });
});
