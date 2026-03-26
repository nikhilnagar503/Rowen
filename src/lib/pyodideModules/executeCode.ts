import type { CodeExecutionResult } from '../../types/index';
import { logAppError, logAppEvent } from '../observability';
import { assertPyodideReady, getErrorMessage } from './runtime';

export async function executeCode(code: string): Promise<CodeExecutionResult> {
  try {
    const pyodide = assertPyodideReady();
    logAppEvent('pyodide.execute', 'start');
    const wrappedCode = `
import sys
import io

_old_stdout = sys.stdout
sys.stdout = _captured_output = io.StringIO()

try:
${code.split('\n').map((line) => `    ${line}`).join('\n')}
except Exception as e:
    print('Error: ' + str(e))

sys.stdout = _old_stdout
_output_text = _captured_output.getvalue()

_result = {
    'output': _output_text,
    'error': None,
}

try:
    _result['updatedDfInfo'] = {
        'shape': list(df.shape),
        'columns': list(df.columns),
        'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
        'missing': {col: int(count) for col, count in df.isnull().sum().items()},
        'duplicates': int(df.duplicated().sum()),
        'sample': df.head(5).fillna('NaN').values.tolist(),
        'head': df.head(10).to_string(),
        'describe': df.describe(include='all').to_string(),
    }
except Exception:
    _result['updatedDfInfo'] = None

json.dumps(_result)
`;

    const result = JSON.parse(await pyodide.runPythonAsync(wrappedCode));
    return {
      output: result.output || '',
      tableHtml: null,
      error: result.error || null,
      updatedDfInfo: result.updatedDfInfo || null,
    };
  } catch (error: unknown) {
    logAppError('pyodide.execute', 'pyodide-execute', { code: 'PYODIDE_EXECUTION_FAILED', message: getErrorMessage(error), retryable: false, cause: error });
    return {
      output: '',
      tableHtml: null,
      error: getErrorMessage(error),
      updatedDfInfo: null,
    };
  }
}
