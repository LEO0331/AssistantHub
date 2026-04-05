import { useEffect, useState } from 'react';

export const usePersistentState = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return defaultValue;
      }

      const parsed = JSON.parse(raw);
      return parsed ?? defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};
