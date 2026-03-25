import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { initPyodide } from '../../lib/pyodide';

type Setter<T> = Dispatch<SetStateAction<T>>;

type Args = {
  isPyodideReady: boolean;
  setIsPyodideReady: Setter<boolean>;
  setIsPyodideLoading: Setter<boolean>;
  requiresFileReload: boolean;
};

export function usePyodideGuards({
  isPyodideReady,
  setIsPyodideReady,
  setIsPyodideLoading,
  requiresFileReload,
}: Args) {
  const ensurePyodide = useCallback(async () => {
    if (isPyodideReady) return;

    setIsPyodideLoading(true);
    try {
      await initPyodide();
      setIsPyodideReady(true);
    } catch (error) {
      console.error('Failed to init Pyodide:', error);
      throw new Error('Failed to load Python engine. Please refresh and try again.');
    } finally {
      setIsPyodideLoading(false);
    }
  }, [isPyodideReady, setIsPyodideLoading, setIsPyodideReady]);

  const ensureAnalysisReady = useCallback(async () => {
    await ensurePyodide();
    if (requiresFileReload) {
      throw new Error('Session restored from cloud. Please re-upload your CSV to continue analysis.');
    }
  }, [ensurePyodide, requiresFileReload]);

  return {
    ensurePyodide,
    ensureAnalysisReady,
  };
}
