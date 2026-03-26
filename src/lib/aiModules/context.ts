import type { DataFrameInfo } from '../../types/index';

export function getDfContext(dfInfo: DataFrameInfo | null): string {
  if (!dfInfo) return 'No dataframe context available.';

  return `CURRENT DATAFRAME STATE:
- Shape: ${dfInfo.shape[0]} rows × ${dfInfo.shape[1]} columns
- Columns: ${dfInfo.columns.join(', ')}
- Data types: ${Object.entries(dfInfo.dtypes).map(([k, v]) => `${k}: ${v}`).join(', ')}
- Missing values: ${Object.entries(dfInfo.missing).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}
- Duplicate rows: ${dfInfo.duplicates}
- Sample (first 10 rows):
${dfInfo.head}

- Statistics:
${dfInfo.describe}`;
}

export function getDatasetCatalogContext(datasetNames: string[], activeDatasetName: string | null): string {
  if (datasetNames.length === 0) return 'No uploaded dataset catalog is available yet.';

  return `UPLOADED DATASETS:
- Active dataset (df): ${activeDatasetName ?? datasetNames[0]}
- Available dataset names: ${datasetNames.join(', ')}

MULTI-DATASET RULES:
- In Python, all datasets are available as pandas DataFrames in \`datasets\` dict.
- Use \`datasets["name.csv"]\` to reference a specific uploaded dataset.
- \`df\` always points to the active/latest uploaded dataset.`;
}
