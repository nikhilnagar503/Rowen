import type { CodeExecutionResult, CleaningToolName, DataFrameInfo } from '../types/index';

type PyodideApi = {
    loadPackage: (packages: string[]) => Promise<void>;
    runPythonAsync: (code: string) => Promise<string>;
    globals: {
        set: (key: string, value: unknown) => void;
    };
};

type WindowWithPyodide = Window & {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideApi>;
};

let pyodide: PyodideApi | null = null;
let initDone = false;

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export async function initPyodide(): Promise<void> {
  if (initDone && pyodide) {
    return;
  }

  try {
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

        pyodide = await pyodideWindow.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    });

        await pyodide.loadPackage(['pandas', 'numpy']);

    await pyodide.runPythonAsync(`
import pandas as pd
import numpy as np
import json

datasets = {}
active_dataset_name = None

`);

    initDone = true;
  } catch (error) {
    pyodide = null;
    initDone = false;
    throw error;
  }
}

export async function loadCSV(fileName: string, csvContent: string): Promise<DataFrameInfo> {
  if (!pyodide || !initDone) {
    throw new Error('Pyodide not initialized. Please refresh the page.');
  }

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

export async function executeCode(code: string): Promise<CodeExecutionResult> {
  if (!pyodide || !initDone) {
    throw new Error('Pyodide not initialized. Please refresh the page.');
  }

  try {
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

    const resultJson = await pyodide.runPythonAsync(wrappedCode);
    const result = JSON.parse(resultJson);

    return {
      output: result.output || '',
      tableHtml: null,
      error: result.error || null,
      updatedDfInfo: result.updatedDfInfo || null,
    };
    } catch (error: unknown) {
    return {
      output: '',
      tableHtml: null,
            error: getErrorMessage(error),
      updatedDfInfo: null,
    };
  }
}

export async function runCleaningTool(
  tool: CleaningToolName,
  args: Record<string, unknown> = {}
): Promise<CodeExecutionResult> {
  if (!pyodide || !initDone) {
    throw new Error('Pyodide not initialized. Please refresh the page.');
  }

  pyodide.globals.set('_tool_name', tool);
  pyodide.globals.set('_tool_args_json', JSON.stringify(args));

  try {
    const resultJson = await pyodide.runPythonAsync(`
import json
import sys
import io

_tool = _tool_name
_args = json.loads(_tool_args_json)

_old_stdout = sys.stdout
sys.stdout = _captured_output = io.StringIO()

try:
    if _tool == 'dataset_summary':
        print('Rows: ' + str(df.shape[0]))
        print('Columns: ' + str(df.shape[1]))
        print('Duplicate rows: ' + str(int(df.duplicated().sum())))
        print('Total missing values: ' + str(int(df.isnull().sum().sum())))

    elif _tool == 'detect_missing_values':
        missing = df.isnull().sum()
        missing = missing[missing > 0].sort_values(ascending=False)
        if missing.empty:
            print('No missing values detected.')
        else:
            print('Missing values by column:')
            print(missing.to_string())

    elif _tool == 'fill_missing_mean':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            df[col] = df[col].fillna(df[col].mean())
            print('Filled missing values in ' + str(col) + ' with mean.')
        else:
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            for c in numeric_cols:
                df[c] = df[c].fillna(df[c].mean())
            print('Filled numeric missing values with mean in ' + str(len(numeric_cols)) + ' columns.')

    elif _tool == 'fill_missing_median':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            df[col] = df[col].fillna(df[col].median())
            print('Filled missing values in ' + str(col) + ' with median.')
        else:
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            for c in numeric_cols:
                df[c] = df[c].fillna(df[c].median())
            print('Filled numeric missing values with median in ' + str(len(numeric_cols)) + ' columns.')

    elif _tool == 'fill_missing_mode':
        col = _args.get('column')
        if col and col in df.columns:
            mode_vals = df[col].mode(dropna=True)
            if len(mode_vals) > 0:
                df[col] = df[col].fillna(mode_vals.iloc[0])
            print('Filled missing values in ' + str(col) + ' with mode.')
        else:
            count = 0
            for c in df.columns:
                mode_vals = df[c].mode(dropna=True)
                if len(mode_vals) > 0 and df[c].isnull().any():
                    df[c] = df[c].fillna(mode_vals.iloc[0])
                    count = count + 1
            print('Filled missing values with mode in ' + str(count) + ' columns.')

    elif _tool == 'fill_missing_constant':
        col = _args.get('column')
        value = _args.get('value', 'Unknown')
        if col and col in df.columns:
            df[col] = df[col].fillna(value)
            print('Filled missing values in ' + str(col) + ' with a constant value.')
        else:
            df = df.fillna(value)
            print('Filled all missing values with a constant value.')

    elif _tool == 'drop_missing_rows':
        before = len(df)
        subset = _args.get('subset')
        if isinstance(subset, list) and len(subset) > 0:
            df = df.dropna(subset=subset)
        else:
            df = df.dropna()
        print('Dropped ' + str(before - len(df)) + ' rows with missing values.')

    elif _tool == 'drop_missing_columns':
        threshold = _args.get('threshold', 0.4)
        threshold = float(threshold)
        drop_cols = [c for c in df.columns if df[c].isnull().mean() >= threshold]
        if drop_cols:
            df = df.drop(columns=drop_cols)
        print('Dropped ' + str(len(drop_cols)) + ' columns by missing-value threshold.')

    elif _tool == 'detect_duplicates':
        print('Duplicate rows detected: ' + str(int(df.duplicated().sum())))

    elif _tool == 'remove_duplicates':
        before = len(df)
        subset = _args.get('subset')
        if isinstance(subset, list) and len(subset) > 0:
            df = df.drop_duplicates(subset=subset)
        else:
            df = df.drop_duplicates()
        print('Removed ' + str(before - len(df)) + ' duplicate rows.')

    elif _tool == 'convert_to_numeric':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            print('Converted ' + str(col) + ' to numeric.')
        else:
            print('No valid column provided for numeric conversion.')

    elif _tool == 'convert_to_datetime':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
            print('Converted ' + str(col) + ' to datetime.')
        else:
            print('No valid column provided for datetime conversion.')

    elif _tool == 'convert_to_category':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = df[col].astype('category')
            print('Converted ' + str(col) + ' to category.')
        else:
            print('No valid column provided for category conversion.')

    elif _tool == 'detect_outliers_iqr':
        col = _args.get('column')
        if not col or col not in df.columns:
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            col = numeric_cols[0] if numeric_cols else None
        if not col:
            print('No numeric column available for outlier detection.')
        else:
            values = pd.to_numeric(df[col], errors='coerce').dropna()
            q1 = values.quantile(0.25)
            q3 = values.quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            outliers = ((values < lower) | (values > upper)).sum()
            print('IQR outliers in ' + str(col) + ': ' + str(int(outliers)))

    elif _tool == 'cap_outliers_iqr':
        col = _args.get('column')
        if not col or col not in df.columns:
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            col = numeric_cols[0] if numeric_cols else None
        if not col:
            print('No numeric column available for outlier capping.')
        else:
            series = pd.to_numeric(df[col], errors='coerce')
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            df[col] = series.clip(lower=lower, upper=upper)
            print('Capped outliers in ' + str(col) + ' using IQR bounds.')

    elif _tool == 'normalize_categories':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.lower()
            print('Normalized categories in ' + str(col) + '.')
        else:
            print('No valid column provided for category normalization.')

    elif _tool == 'strip_whitespace':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            print('Trimmed whitespace in ' + str(col) + '.')
        else:
            object_cols = df.select_dtypes(include=['object', 'string']).columns.tolist()
            for c in object_cols:
                df[c] = df[c].astype(str).str.strip()
            print('Trimmed whitespace in ' + str(len(object_cols)) + ' text columns.')

    elif _tool == 'lowercase_text':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = df[col].astype(str).str.lower()
            print('Lowercased text in ' + str(col) + '.')
        else:
            object_cols = df.select_dtypes(include=['object', 'string']).columns.tolist()
            for c in object_cols:
                df[c] = df[c].astype(str).str.lower()
            print('Lowercased text in ' + str(len(object_cols)) + ' text columns.')

    elif _tool == 'validate_dataset':
        print('Validation report')
        print('Rows: ' + str(df.shape[0]))
        print('Columns: ' + str(df.shape[1]))
        print('Total missing values: ' + str(int(df.isnull().sum().sum())))
        print('Duplicate rows: ' + str(int(df.duplicated().sum())))

    elif _tool == 'get_column_types':
        print(df.dtypes.astype(str).to_string())

    elif _tool == 'get_unique_values':
        unique_counts = {c: int(df[c].nunique(dropna=True)) for c in df.columns}
        print(pd.Series(unique_counts).sort_values(ascending=False).to_string())

    elif _tool == 'get_summary_statistics':
        print(df.describe(include='all').to_string())

    elif _tool == 'get_value_distribution':
        col = _safe_column(_args.get('column'), text=True)
        if col:
            print(df[col].astype(str).value_counts(dropna=False).head(int(_args.get('top_n', 20))).to_string())
        else:
            print('No column available for value distribution.')

    elif _tool == 'get_correlation_matrix':
        num = df.select_dtypes(include=['number'])
        if num.shape[1] < 2:
            print('Need at least two numeric columns for correlation matrix.')
        else:
            print(num.corr().to_string())

    elif _tool == 'detect_skewness':
        num = df.select_dtypes(include=['number'])
        if num.shape[1] == 0:
            print('No numeric columns available.')
        else:
            print(num.skew(numeric_only=True).sort_values(ascending=False).to_string())

    elif _tool == 'detect_high_cardinality':
        threshold = int(_args.get('threshold', 50))
        out = []
        for c in df.columns:
            cnt = int(df[c].nunique(dropna=True))
            if cnt >= threshold:
                out.append((c, cnt))
        if out:
            print(pd.DataFrame(out, columns=['column', 'unique_count']).to_string(index=False))
        else:
            print('No high-cardinality columns found.')

    elif _tool == 'detect_constant_columns':
        cols = [c for c in df.columns if df[c].nunique(dropna=False) <= 1]
        print('Constant columns: ' + (', '.join(cols) if cols else 'none'))

    elif _tool == 'detect_id_columns':
        potential = []
        for c in df.columns:
            name = str(c).lower()
            unique_ratio = float(df[c].nunique(dropna=True)) / max(len(df), 1)
            if 'id' in name or unique_ratio > 0.95:
                potential.append(c)
        print('Potential ID columns: ' + (', '.join(potential) if potential else 'none'))

    elif _tool == 'detect_date_columns':
        detected = []
        for c in df.columns:
            if 'date' in str(c).lower() or 'time' in str(c).lower():
                detected.append(c)
                continue
            parsed = pd.to_datetime(df[c], errors='coerce')
            if parsed.notna().mean() > 0.7:
                detected.append(c)
        print('Potential date columns: ' + (', '.join(detected) if detected else 'none'))

    elif _tool == 'detect_numeric_columns':
        cols = df.select_dtypes(include=['number']).columns.tolist()
        print('Numeric columns: ' + (', '.join(cols) if cols else 'none'))

    elif _tool == 'detect_categorical_columns':
        cols = df.select_dtypes(include=['object', 'category', 'string']).columns.tolist()
        print('Categorical/text columns: ' + (', '.join(cols) if cols else 'none'))

    elif _tool == 'fill_missing_forward_fill':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = df[col].ffill()
            print('Applied forward-fill to ' + str(col) + '.')
        else:
            df = df.ffill()
            print('Applied forward-fill to dataframe.')

    elif _tool == 'fill_missing_backward_fill':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = df[col].bfill()
            print('Applied backward-fill to ' + str(col) + '.')
        else:
            df = df.bfill()
            print('Applied backward-fill to dataframe.')

    elif _tool == 'fill_missing_interpolation':
        col = _args.get('column')
        if col and col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').interpolate(limit_direction='both')
            print('Interpolated missing values in ' + str(col) + '.')
        else:
            num = df.select_dtypes(include=['number']).columns.tolist()
            for c in num:
                df[c] = pd.to_numeric(df[c], errors='coerce').interpolate(limit_direction='both')
            print('Interpolated numeric columns: ' + str(len(num)))

    elif _tool == 'flag_missing_values':
        flagged = 0
        for c in df.columns:
            if df[c].isna().any():
                df[str(c) + '_was_missing'] = df[c].isna().astype(int)
                flagged += 1
        print('Created missing flags for ' + str(flagged) + ' columns.')

    elif _tool == 'keep_first_duplicate':
        before = len(df)
        subset = _args.get('subset')
        df = df.drop_duplicates(subset=subset if isinstance(subset, list) and len(subset) > 0 else None, keep='first')
        print('Kept first duplicate occurrences. Removed ' + str(before - len(df)) + ' rows.')

    elif _tool == 'keep_last_duplicate':
        before = len(df)
        subset = _args.get('subset')
        df = df.drop_duplicates(subset=subset if isinstance(subset, list) and len(subset) > 0 else None, keep='last')
        print('Kept last duplicate occurrences. Removed ' + str(before - len(df)) + ' rows.')

    elif _tool == 'detect_fuzzy_duplicates':
        col = _safe_column(_args.get('column'), text=True)
        if not col:
            print('No text column available for fuzzy duplicate hints.')
        else:
            norm = df[col].astype(str).str.lower().str.replace(r'[^a-z0-9]', '', regex=True)
            dup = norm.duplicated().sum()
            print('Potential fuzzy duplicates in ' + str(col) + ': ' + str(int(dup)))

    elif _tool == 'merge_duplicate_records':
        before = len(df)
        subset = _args.get('subset')
        df = df.drop_duplicates(subset=subset if isinstance(subset, list) and len(subset) > 0 else None, keep='first')
        print('Merged duplicates by keeping first record. Removed ' + str(before - len(df)) + ' rows.')

    elif _tool == 'convert_to_boolean':
        col = _safe_column(_args.get('column'), text=True)
        if col:
            df[col] = df[col].astype(str).str.strip().str.lower().map({'true': True, 'false': False, '1': True, '0': False, 'yes': True, 'no': False})
            print('Converted ' + str(col) + ' to boolean-like values.')
        else:
            print('No valid column provided for boolean conversion.')

    elif _tool == 'fix_mixed_types':
        fixed = 0
        for c in df.columns:
            if df[c].dtype == 'object':
                coerced = pd.to_numeric(df[c], errors='coerce')
                if coerced.notna().mean() > 0.8:
                    df[c] = coerced
                    fixed += 1
        print('Fixed mixed-type columns: ' + str(fixed))

    elif _tool == 'detect_wrong_datatypes':
        findings = []
        for c in df.columns:
            if df[c].dtype == 'object':
                n_num = pd.to_numeric(df[c], errors='coerce').notna().mean()
                n_dt = pd.to_datetime(df[c], errors='coerce').notna().mean()
                if n_num > 0.8:
                    findings.append((c, 'likely numeric stored as text'))
                elif n_dt > 0.8:
                    findings.append((c, 'likely datetime stored as text'))
        if findings:
            print(pd.DataFrame(findings, columns=['column', 'issue']).to_string(index=False))
        else:
            print('No obvious datatype mismatches detected.')

    elif _tool == 'standardize_datetime_format':
        col = _safe_column(_args.get('column'))
        if col:
            parsed = pd.to_datetime(df[col], errors='coerce')
            df[col] = parsed.dt.strftime('%Y-%m-%d')
            print('Standardized datetime format in ' + str(col) + ' to YYYY-MM-DD.')
        else:
            print('No valid column provided for datetime standardization.')

    elif _tool == 'extract_datetime_features':
        col = _safe_column(_args.get('column'))
        if col:
            parsed = pd.to_datetime(df[col], errors='coerce')
            base = str(col)
            df[base + '_year'] = parsed.dt.year
            df[base + '_month'] = parsed.dt.month
            df[base + '_day'] = parsed.dt.day
            print('Extracted year/month/day features from ' + str(col) + '.')
        else:
            print('No valid column provided for datetime feature extraction.')

    elif _tool == 'detect_outliers_zscore':
        col = _safe_column(_args.get('column'), numeric=True)
        if not col:
            print('No numeric column available for z-score outlier detection.')
        else:
            s = pd.to_numeric(df[col], errors='coerce').dropna()
            std = s.std(ddof=0)
            if std == 0:
                print('No variation in column to compute z-scores.')
            else:
                z = ((s - s.mean()) / std).abs()
                print('Z-score outliers in ' + str(col) + ': ' + str(int((z > float(_args.get('threshold', 3))).sum())))

    elif _tool == 'detect_outliers_percentile':
        col = _safe_column(_args.get('column'), numeric=True)
        if not col:
            print('No numeric column available for percentile outlier detection.')
        else:
            lower_p = float(_args.get('lower', 0.01))
            upper_p = float(_args.get('upper', 0.99))
            s = pd.to_numeric(df[col], errors='coerce').dropna()
            lo, hi = s.quantile(lower_p), s.quantile(upper_p)
            print('Percentile outliers in ' + str(col) + ': ' + str(int(((s < lo) | (s > hi)).sum())))

    elif _tool == 'remove_outliers':
        col = _safe_column(_args.get('column'), numeric=True)
        if not col:
            print('No numeric column available for removing outliers.')
        else:
            s = pd.to_numeric(df[col], errors='coerce')
            q1, q3 = s.quantile(0.25), s.quantile(0.75)
            iqr = q3 - q1
            lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            before = len(df)
            df = df[(s >= lo) & (s <= hi) | s.isna()]
            print('Removed outlier rows: ' + str(before - len(df)))

    elif _tool == 'cap_outliers_percentile':
        col = _safe_column(_args.get('column'), numeric=True)
        if not col:
            print('No numeric column available for percentile capping.')
        else:
            s = pd.to_numeric(df[col], errors='coerce')
            lo = s.quantile(float(_args.get('lower', 0.01)))
            hi = s.quantile(float(_args.get('upper', 0.99)))
            df[col] = s.clip(lower=lo, upper=hi)
            print('Capped outliers by percentiles in ' + str(col) + '.')

    elif _tool == 'log_transform':
        col = _safe_column(_args.get('column'), numeric=True)
        if col:
            s = pd.to_numeric(df[col], errors='coerce')
            df[col] = np.log1p(s.clip(lower=0))
            print('Applied log1p transform to ' + str(col) + '.')
        else:
            print('No numeric column available for log transform.')

    elif _tool == 'robust_scaling':
        col = _safe_column(_args.get('column'), numeric=True)
        if col:
            s = pd.to_numeric(df[col], errors='coerce')
            med = s.median()
            iqr = s.quantile(0.75) - s.quantile(0.25)
            df[col] = (s - med) / (iqr if iqr != 0 else 1)
            print('Applied robust scaling to ' + str(col) + '.')
        else:
            print('No numeric column available for robust scaling.')

    elif _tool == 'merge_similar_categories':
        col = _safe_column(_args.get('column'), text=True)
        if col:
            df[col] = df[col].astype(str).str.lower().str.strip().str.replace(r'[^a-z0-9 ]', '', regex=True)
            print('Merged similar categories with basic normalization in ' + str(col) + '.')
        else:
            print('No text column available for category merging.')

    elif _tool == 'uppercase_text':
        col = _safe_column(_args.get('column'), text=True)
        if col:
            df[col] = df[col].astype(str).str.upper()
            print('Uppercased text in ' + str(col) + '.')
        else:
            print('No text column available for uppercase operation.')

    elif _tool == 'remove_special_characters':
        col = _safe_column(_args.get('column'), text=True)
        if col:
            df[col] = df[col].astype(str).str.replace(r'[^\w\s]', '', regex=True)
            print('Removed special characters in ' + str(col) + '.')
        else:
            print('No text column available to remove special characters.')

    elif _tool == 'remove_extra_spaces':
        col = _safe_column(_args.get('column'), text=True)
        if col:
            df[col] = df[col].astype(str).str.replace(r'\s+', ' ', regex=True).str.strip()
            print('Removed extra spaces in ' + str(col) + '.')
        else:
            print('No text column available to remove extra spaces.')

    elif _tool == 'fix_spelling':
        col = _safe_column(_args.get('column'), text=True)
        if col:
            df[col] = df[col].astype(str).str.lower().str.strip()
            print('Applied basic spelling normalization in ' + str(col) + '. Advanced spell correction not enabled.')
        else:
            print('No text column available for spelling normalization.')

    elif _tool == 'encode_text_labels' or _tool == 'encode_label':
        col = _safe_column(_args.get('column'), text=True)
        if col:
            df[str(col) + '_label'] = pd.factorize(df[col].astype(str))[0]
            print('Label-encoded ' + str(col) + ' into ' + str(col) + '_label.')
        else:
            print('No text column available for label encoding.')

    elif _tool == 'rename_column':
        old_name = _args.get('old_name') or _args.get('column')
        new_name = _args.get('new_name') or _args.get('value')
        if old_name in df.columns and isinstance(new_name, str) and len(new_name) > 0:
            df = df.rename(columns={old_name: new_name})
            print('Renamed column ' + str(old_name) + ' to ' + str(new_name) + '.')
        else:
            print('Provide valid old_name and new_name for rename_column.')

    elif _tool == 'drop_column':
        col = _args.get('column')
        if col in df.columns:
            df = df.drop(columns=[col])
            print('Dropped column ' + str(col) + '.')
        else:
            print('No valid column provided for drop_column.')

    elif _tool == 'select_columns':
        cols = _args.get('columns') or _args.get('subset')
        if isinstance(cols, list) and len(cols) > 0:
            valid = [c for c in cols if c in df.columns]
            if valid:
                df = df[valid]
                print('Selected ' + str(len(valid)) + ' columns.')
            else:
                print('No valid columns found in select_columns request.')
        else:
            print('Provide columns/subset array for select_columns.')

    elif _tool == 'reorder_columns':
        cols = _args.get('columns')
        if isinstance(cols, list) and len(cols) > 0:
            front = [c for c in cols if c in df.columns]
            rest = [c for c in df.columns if c not in front]
            df = df[front + rest]
            print('Reordered columns with selected columns moved to front.')
        else:
            print('Provide columns array for reorder_columns.')

    elif _tool == 'split_column':
        col = _args.get('column')
        sep = _args.get('separator', ' ')
        if col in df.columns:
            split_df = df[col].astype(str).str.split(str(sep), expand=True)
            for i in range(split_df.shape[1]):
                df[str(col) + '_part_' + str(i + 1)] = split_df[i]
            print('Split column ' + str(col) + ' into ' + str(split_df.shape[1]) + ' parts.')
        else:
            print('No valid column provided for split_column.')

    elif _tool == 'merge_columns':
        cols = _args.get('columns') or _args.get('subset')
        new_col = _args.get('new_column', 'merged_column')
        sep = _args.get('separator', ' ')
        if isinstance(cols, list) and len(cols) >= 2:
            valid = [c for c in cols if c in df.columns]
            if len(valid) >= 2:
                df[new_col] = df[valid].astype(str).agg(str(sep).join, axis=1)
                print('Merged columns into ' + str(new_col) + '.')
            else:
                print('Need at least 2 valid columns for merge_columns.')
        else:
            print('Provide at least 2 columns for merge_columns.')

    elif _tool == 'create_column':
        new_col = _args.get('new_column') or _args.get('column')
        value = _args.get('value', '')
        if isinstance(new_col, str) and len(new_col) > 0:
            df[new_col] = value
            print('Created column ' + str(new_col) + ' with constant value.')
        else:
            print('Provide new_column name for create_column.')

    elif _tool == 'copy_column':
        src = _args.get('column')
        dst = _args.get('new_column') or (str(src) + '_copy' if src else None)
        if src in df.columns and isinstance(dst, str):
            df[dst] = df[src]
            print('Copied column ' + str(src) + ' to ' + str(dst) + '.')
        else:
            print('Provide valid source column for copy_column.')

    elif _tool == 'encode_onehot':
        col = _safe_column(_args.get('column'), text=True)
        if col:
            dummies = pd.get_dummies(df[col].astype(str), prefix=str(col), dummy_na=False)
            df = pd.concat([df, dummies], axis=1)
            print('One-hot encoded ' + str(col) + ' into ' + str(dummies.shape[1]) + ' columns.')
        else:
            print('No text column available for one-hot encoding.')

    elif _tool == 'normalize_numeric':
        col = _safe_column(_args.get('column'), numeric=True)
        if col:
            s = pd.to_numeric(df[col], errors='coerce')
            min_v, max_v = s.min(), s.max()
            df[col] = (s - min_v) / ((max_v - min_v) if max_v != min_v else 1)
            print('Normalized ' + str(col) + ' to [0, 1].')
        else:
            print('No numeric column available for normalize_numeric.')

    elif _tool == 'standardize_numeric':
        col = _safe_column(_args.get('column'), numeric=True)
        if col:
            s = pd.to_numeric(df[col], errors='coerce')
            std = s.std(ddof=0)
            df[col] = (s - s.mean()) / (std if std != 0 else 1)
            print('Standardized ' + str(col) + ' (z-score).')
        else:
            print('No numeric column available for standardize_numeric.')

    elif _tool == 'bin_numeric':
        col = _safe_column(_args.get('column'), numeric=True)
        bins = int(_args.get('bins', 5))
        if col:
            df[str(col) + '_bin'] = pd.cut(pd.to_numeric(df[col], errors='coerce'), bins=bins)
            print('Binned ' + str(col) + ' into ' + str(bins) + ' bins.')
        else:
            print('No numeric column available for bin_numeric.')

    elif _tool == 'create_interaction_features':
        cols = df.select_dtypes(include=['number']).columns.tolist()
        if len(cols) >= 2:
            a = _args.get('col_a') if _args.get('col_a') in df.columns else cols[0]
            b = _args.get('col_b') if _args.get('col_b') in df.columns else cols[1]
            name = str(a) + '_x_' + str(b)
            df[name] = pd.to_numeric(df[a], errors='coerce') * pd.to_numeric(df[b], errors='coerce')
            print('Created interaction feature ' + name + '.')
        else:
            print('Need at least two numeric columns for interaction features.')

    elif _tool == 'aggregate_features' or _tool == 'groupby_aggregation':
        by_col = _safe_column(_args.get('by'), text=True)
        val_col = _safe_column(_args.get('column'), numeric=True)
        agg = _args.get('agg', 'mean')
        if by_col and val_col:
            out = df.groupby(by_col)[val_col].agg(agg)
            print(out.head(20).to_string())
        else:
            print('Need valid group-by text column and numeric value column.')

    elif _tool == 'check_missing_after_cleaning':
        print('Missing values after cleaning: ' + str(int(df.isnull().sum().sum())))

    elif _tool == 'check_duplicates_after_cleaning':
        print('Duplicate rows after cleaning: ' + str(int(df.duplicated().sum())))

    elif _tool == 'check_value_ranges':
        num = df.select_dtypes(include=['number'])
        if num.shape[1] == 0:
            print('No numeric columns available for range checks.')
        else:
            stats = pd.DataFrame({'min': num.min(), 'max': num.max()})
            print(stats.to_string())

    elif _tool == 'check_data_consistency':
        issues = []
        if int(df.duplicated().sum()) > 0:
            issues.append('Duplicates present')
        if int(df.isnull().sum().sum()) > 0:
            issues.append('Missing values present')
        print('Consistency checks: ' + (', '.join(issues) if issues else 'No obvious issues'))

    elif _tool == 'generate_data_quality_score':
        rows, cols = df.shape
        miss = int(df.isnull().sum().sum())
        dup = int(df.duplicated().sum())
        total_cells = max(rows * cols, 1)
        score = max(0, min(100, round(100 - ((miss / total_cells) * 65 + (dup / max(rows, 1)) * 35) * 100)))
        print('Data quality score: ' + str(score) + '/100')

    elif _tool == 'detect_data_drift':
        print('Data drift detection requires baseline/reference dataset. Stub executed.')

    elif _tool == 'pivot_table':
        idx = _args.get('index')
        val = _args.get('values')
        agg = _args.get('agg', 'mean')
        if idx in df.columns and val in df.columns:
            out = pd.pivot_table(df, index=idx, values=val, aggfunc=agg)
            print(out.head(30).to_string())
        else:
            print('Provide valid index and values columns for pivot_table.')

    elif _tool == 'unpivot_table':
        id_vars = _args.get('id_vars')
        value_vars = _args.get('value_vars')
        if isinstance(id_vars, list) and isinstance(value_vars, list):
            df = df.melt(id_vars=id_vars, value_vars=value_vars)
            print('Unpivoted dataframe using melt.')
        else:
            print('Provide id_vars and value_vars arrays for unpivot_table.')

    elif _tool == 'sort_values':
        col = _safe_column(_args.get('column'))
        ascending = bool(_args.get('ascending', True))
        if col:
            df = df.sort_values(by=col, ascending=ascending)
            print('Sorted by ' + str(col) + '.')
        else:
            print('No valid column provided for sort_values.')

    elif _tool == 'filter_rows':
        col = _safe_column(_args.get('column'))
        val = _args.get('value')
        if col:
            before = len(df)
            if val is not None:
                df = df[df[col] == val]
            print('Filtered rows. Kept ' + str(len(df)) + ' of ' + str(before) + '.')
        else:
            print('No valid column provided for filter_rows.')

    elif _tool == 'sample_dataset':
        n = int(_args.get('n', 100))
        n = min(max(n, 1), len(df)) if len(df) > 0 else 0
        if n > 0:
            df = df.sample(n=n, random_state=42)
            print('Sampled ' + str(n) + ' rows.')
        else:
            print('Dataset is empty; sample skipped.')

    elif _tool == 'join_datasets' or _tool == 'merge_datasets':
        right_name = _args.get('right_dataset')
        on = _args.get('on')
        how = _args.get('how', 'left')
        if right_name in datasets:
            right_df = datasets[right_name]
            if isinstance(on, str) and on in df.columns and on in right_df.columns:
                df = df.merge(right_df, on=on, how=how)
                print('Merged active dataset with ' + str(right_name) + ' on ' + str(on) + '.')
            else:
                print('Provide valid join key via args.on for dataset merge.')
        else:
            print('Target dataset not found in uploaded catalog for merge.')

    elif _tool == 'detect_column_semantics':
        hints = []
        for c in df.columns:
            name = str(c).lower()
            if 'id' in name:
                hints.append((c, 'identifier'))
            elif 'date' in name or 'time' in name:
                hints.append((c, 'datetime'))
            elif 'price' in name or 'amount' in name or 'revenue' in name:
                hints.append((c, 'financial_metric'))
            elif df[c].dtype in ['object', 'string']:
                hints.append((c, 'category_or_text'))
            else:
                hints.append((c, 'numeric_measure'))
        print(pd.DataFrame(hints, columns=['column', 'semantic_hint']).to_string(index=False))

    elif _tool == 'detect_business_rules':
        print('Business rule detection is domain-dependent. Use custom rule templates per dataset.')

    elif _tool == 'auto_clean_pipeline':
        before = len(df)
        df = df.drop_duplicates()
        text_cols = df.select_dtypes(include=['object', 'string']).columns.tolist()
        for c in text_cols:
            df[c] = df[c].astype(str).str.strip().str.lower()
        num = df.select_dtypes(include=['number']).columns.tolist()
        for c in num:
            df[c] = df[c].fillna(df[c].median())
        print('Auto clean pipeline complete. Rows before/after: ' + str(before) + '/' + str(len(df)))

    elif _tool == 'suggest_features':
        suggestions = []
        num = df.select_dtypes(include=['number']).columns.tolist()
        text = df.select_dtypes(include=['object', 'category', 'string']).columns.tolist()
        if len(num) >= 2:
            suggestions.append('Create interaction feature between ' + str(num[0]) + ' and ' + str(num[1]))
        if len(text) >= 1:
            suggestions.append('Encode categorical feature ' + str(text[0]) + ' (one-hot or label)')
        print('Feature suggestions:\n- ' + ('\n- '.join(suggestions) if suggestions else 'No obvious suggestions.'))

    elif _tool == 'generate_data_report':
        print('Data Report')
        print('Rows: ' + str(df.shape[0]))
        print('Columns: ' + str(df.shape[1]))
        print('Missing values: ' + str(int(df.isnull().sum().sum())))
        print('Duplicates: ' + str(int(df.duplicated().sum())))
        print('Numeric columns: ' + str(len(df.select_dtypes(include=['number']).columns)))
        print('Categorical columns: ' + str(len(df.select_dtypes(include=['object', 'category', 'string']).columns)))

    elif _tool == 'explain_dataset_issues':
        miss = int(df.isnull().sum().sum())
        dup = int(df.duplicated().sum())
        print('Detected issues summary:')
        print('- Missing values: ' + str(miss))
        print('- Duplicate rows: ' + str(dup))
        if miss > 0:
            print('- Recommendation: Impute numeric with median, categorical with mode or constant.')
        if dup > 0:
            print('- Recommendation: Remove or merge duplicates with explicit subset keys.')
        if miss == 0 and dup == 0:
            print('- No major missing/duplicate issues detected.')

    else:
        print('Unsupported tool: ' + str(_tool))

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
`);

    const result = JSON.parse(resultJson);
    return {
      output: result.output || '',
      tableHtml: null,
      error: result.error || null,
      updatedDfInfo: result.updatedDfInfo || null,
    };
    } catch (error: unknown) {
    return {
      output: '',
      tableHtml: null,
            error: getErrorMessage(error),
      updatedDfInfo: null,
    };
  }
}

export async function getCleanCSV(): Promise<string> {
  if (!pyodide || !initDone) {
    throw new Error('Pyodide not initialized. Please refresh the page.');
  }

  return pyodide.runPythonAsync('df.to_csv(index=False)');
}
