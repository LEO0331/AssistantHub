/* eslint-disable no-undef */
import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('loads default value and persists updates', () => {
    const { result } = renderHook(() => usePersistentState('demo-key', []));

    expect(result.current[0]).toEqual([]);

    act(() => {
      result.current[1]([{ id: '1' }]);
    });

    expect(JSON.parse(localStorage.getItem('demo-key'))).toEqual([{ id: '1' }]);
  });

  test('loads existing localStorage value when valid JSON', () => {
    localStorage.setItem('demo-key', JSON.stringify([{ id: 'existing' }]));

    const { result } = renderHook(() => usePersistentState('demo-key', []));

    expect(result.current[0]).toEqual([{ id: 'existing' }]);
  });

  test('falls back to default value when localStorage JSON is invalid', () => {
    localStorage.setItem('demo-key', '{invalid-json');

    const { result } = renderHook(() => usePersistentState('demo-key', ['fallback']));

    expect(result.current[0]).toEqual(['fallback']);
  });
});
