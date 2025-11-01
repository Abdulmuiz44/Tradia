import { useState, useEffect } from 'react';
import { debounce } from '../utils';

export function useDebouncedInput(initialValue: string, delay: number = 300) {
  const [input, setInput] = useState(initialValue);
  const [debouncedInput, setDebouncedInput] = useState(initialValue);

  useEffect(() => {
    const debouncedSet = debounce(setDebouncedInput, delay);
    debouncedSet(input);
    return () => {
      // Cleanup
    };
  }, [input, delay]);

  return [input, debouncedInput, setInput] as const;
}
