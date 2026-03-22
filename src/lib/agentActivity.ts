import type { CleaningToolName } from '../types/index';

export function getToolActivityLabel(tool: CleaningToolName): string {
  switch (tool) {
    case 'dataset_summary':
      return 'Reviewing dataset summary';
    case 'detect_missing_values':
      return 'Checking missing values';
    case 'fill_missing_mean':
      return 'Filling missing values with mean';
    case 'fill_missing_median':
      return 'Filling missing values with median';
    case 'fill_missing_mode':
      return 'Filling missing values with mode';
    case 'fill_missing_constant':
      return 'Filling missing values with constant value';
    case 'drop_missing_rows':
      return 'Dropping rows with missing values';
    case 'drop_missing_columns':
      return 'Dropping columns with too many missing values';
    case 'detect_duplicates':
      return 'Checking duplicate rows';
    case 'remove_duplicates':
      return 'Removing duplicate rows';
    case 'convert_to_numeric':
      return 'Converting column to numeric type';
    case 'convert_to_datetime':
      return 'Converting column to datetime type';
    case 'convert_to_category':
      return 'Converting column to category type';
    case 'detect_outliers_iqr':
      return 'Detecting outliers with IQR';
    case 'cap_outliers_iqr':
      return 'Capping outliers with IQR bounds';
    case 'normalize_categories':
      return 'Normalizing category values';
    case 'strip_whitespace':
      return 'Trimming extra whitespace';
    case 'lowercase_text':
      return 'Lowercasing text values';
    case 'validate_dataset':
      return 'Validating cleaned dataset';
    default:
      return 'Processing current step';
  }
}
