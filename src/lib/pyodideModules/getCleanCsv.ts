import { assertPyodideReady } from './runtime';

export async function getCleanCSV(): Promise<string> {
  const pyodide = assertPyodideReady();
  return pyodide.runPythonAsync('df.to_csv(index=False)');
}
