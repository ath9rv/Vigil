import { useState, useEffect, useCallback } from 'react';
import { StorageSchema } from '../../shared/types';
import { getStorageValue, setStorageValue, onStorageChange } from '../../shared/storage';

export function useStorageState<K extends keyof StorageSchema>(
  key: K
): [StorageSchema[K] | undefined, (val: StorageSchema[K]) => void] {
  const [state, setState] = useState<StorageSchema[K] | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    
    getStorageValue(key).then((val) => {
      if (mounted) setState(val);
    });

    const unsubscribe = onStorageChange(key, (newValue) => {
      if (mounted) setState(newValue);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [key]);

  const setValue = useCallback((val: StorageSchema[K]) => {
    setState(val);
    setStorageValue(key, val).catch(console.error);
  }, [key]);

  return [state, setValue];
}
