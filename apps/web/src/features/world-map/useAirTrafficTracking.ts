import { useState, useCallback, useRef, useEffect } from 'react';

export function useAirTrafficTracking() {
  const [active, setActive] = useState(false);
  const [aircraftCount, setAircraftCount] = useState<number | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPositionsRef = useRef<((features: any[]) => void) | null>(null);
  const onTrailsRef = useRef<((trails: any[]) => void) | null>(null);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const w = new Worker(
      new URL('./workers/air-traffic-interpolation.worker.ts', import.meta.url),
      { type: 'module' },
    );
    w.onmessage = (e) => {
      if (e.data.type === 'positions') {
        setAircraftCount(e.data.features.length);
        onPositionsRef.current?.(e.data.features);
      } else if (e.data.type === 'trails') {
        onTrailsRef.current?.(e.data.features);
      }
    };
    w.onerror = (err) => {
      console.error('[air-traffic] Worker error:', err);
    };
    workerRef.current = w;
    return w;
  }, []);

  const startTicking = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      workerRef.current?.postMessage({ type: 'tick' });
    }, 2000);
  }, []);

  const stopTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    ensureWorker();
    startTicking();
    setActive(true);
  }, [ensureWorker, startTicking]);

  const stop = useCallback(() => {
    stopTicking();
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setActive(false);
    setAircraftCount(null);
  }, [stopTicking]);

  const feedSnapshot = useCallback((fc: GeoJSON.FeatureCollection) => {
    const worker = ensureWorker();
    worker.postMessage({ type: 'snapshot', features: fc.features });
  }, [ensureWorker]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  return {
    active,
    aircraftCount,
    start,
    stop,
    feedSnapshot,
    setOnPositions: (cb: (features: any[]) => void) => { onPositionsRef.current = cb; },
    setOnTrails: (cb: (trails: any[]) => void) => { onTrailsRef.current = cb; },
  };
}
