import { normalizeError } from '../errors';
import { logAppError } from '../observability';

export type PyodideApi = {
  loadPackage: (packages: string[]) => Promise<void>;
  runPythonAsync: (code: string) => Promise<string>;
  globals: { set: (key: string, value: unknown) => void };
};

export type WindowWithPyodide = Window & {
  loadPyodide?: (config: { indexURL: string }) => Promise<PyodideApi>;
};

let pyodide: PyodideApi | null = null;
let initDone = false;

export function getPyodide(): PyodideApi | null {
  return pyodide;
}

export function setPyodide(next: PyodideApi | null): void {
  pyodide = next;
}

export function isInitDone(): boolean {
  return initDone;
}

export function setInitDone(next: boolean): void {
  initDone = next;
}

export function assertPyodideReady(): PyodideApi {
  if (!pyodide || !initDone) {
    throw new Error('Pyodide not initialized. Please refresh the page.');
  }

  return pyodide;
}

export function resetPyodideState(scope: string, error: unknown): void {
  const appError = normalizeError(error);
  logAppError(scope, `${scope}.reset`, appError);
  pyodide = null;
  initDone = false;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
