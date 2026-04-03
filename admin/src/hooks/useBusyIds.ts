import { useState, useCallback, useRef } from 'react';

export function useBusyIds() {
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const busyRef = useRef<Set<string>>(new Set());

  const isBusy = useCallback((id: string) => busyIds.has(id), [busyIds]);

  const withBusy = useCallback(async (id: string, fn: () => Promise<void>) => {
    if (busyRef.current.has(id)) return;
    busyRef.current.add(id);
    setBusyIds(new Set(busyRef.current));
    try {
      await fn();
    } finally {
      busyRef.current.delete(id);
      setBusyIds(new Set(busyRef.current));
    }
  }, []);

  return { isBusy, withBusy };
}
