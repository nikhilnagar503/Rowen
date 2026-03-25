import { createCorrelationId, logAppEvent } from '../observability';
import {
  getPyodide,
  isInitDone,
  resetPyodideState,
  setInitDone,
  setPyodide,
  type WindowWithPyodide,
} from './runtime';

export async function initPyodide(): Promise<void> {
  const correlationId = createCorrelationId('pyodide-init');

  if (isInitDone() && getPyodide()) {
    logAppEvent('pyodide.init', 'already_initialized', { correlationId });
    return;
  }

  try {
    logAppEvent('pyodide.init', 'start', { correlationId });
    const pyodideWindow = window as WindowWithPyodide;

    if (!pyodideWindow.loadPyodide) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      document.head.appendChild(script);

      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide CDN script'));
      });
    }

    if (!pyodideWindow.loadPyodide) {
      throw new Error('Pyodide loader was not found on window.');
    }

    const instance = await pyodideWindow.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    });

    await instance.loadPackage(['pandas', 'numpy']);
    await instance.runPythonAsync(`
import pandas as pd
import numpy as np
import json

datasets = {}
active_dataset_name = None
`);

    setPyodide(instance);
    setInitDone(true);
  } catch (error) {
    resetPyodideState('pyodide.init', correlationId, error);
    throw error;
  }
}
