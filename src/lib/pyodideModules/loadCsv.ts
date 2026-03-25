import type { DataFrameInfo } from '../../types/index';
import { assertPyodideReady } from './runtime';

export async function loadCSV(fileName: string, csvContent: string): Promise<DataFrameInfo> {
  const pyodide = assertPyodideReady();

  pyodide.globals.set('_csv_name', fileName);
  pyodide.globals.set('_csv_data', csvContent);

  const result = await pyodide.runPythonAsync(`
import io
_new_df = pd.read_csv(io.StringIO(_csv_data))
datasets[_csv_name] = _new_df
df = _new_df
active_dataset_name = _csv_name

_info = {
    'shape': list(df.shape),
    'columns': list(df.columns),
    'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
    'missing': {col: int(count) for col, count in df.isnull().sum().items()},
    'duplicates': int(df.duplicated().sum()),
    'sample': df.head(5).fillna('NaN').values.tolist(),
    'head': df.head(10).to_string(),
    'describe': df.describe(include='all').to_string(),
}
json.dumps(_info)
`);

  return JSON.parse(result);
}
