/**
 * Atelier Visual Analytics - Core AST & Type Definitions
 * Declarative Tableau-style Mental Model for Analytical Visualizations
 */

export type DataType = 'string' | 'number' | 'date' | 'boolean';

export type FieldRole = 'dimension' | 'measure';

export type AggregationFunction =
  | 'SUM'
  | 'AVG'
  | 'MIN'
  | 'MAX'
  | 'COUNT'
  | 'COUNT_DISTINCT'
  | 'MEDIAN';

export type MarkType =
  | 'auto'
  | 'bar'
  | 'line'
  | 'area'
  | 'dot'
  | 'tick'
  | 'rect'
  | 'text';

export interface DatasetColumn {
  name: string;
  dataType: DataType;
  role: FieldRole;
  description?: string;
  isCalculated?: boolean;
  formula?: string;
}

export interface DatasetMeta {
  id: string;
  name: string;
  tableName: string;
  description: string;
  rowCount: number;
  columns: DatasetColumn[];
  sourceUrl?: string;
}

/**
 * A Pill represents an analytical field placed on a shelf.
 * - Dimension (Blue): Discrete field driving grouping and partitioning.
 * - Measure (Green): Quantitative field driving continuous aggregation.
 */
export interface Pill {
  id: string;
  columnName: string;
  role: FieldRole;
  dataType: DataType;
  // If measure, the aggregation to apply
  aggregation?: AggregationFunction;
  // Custom display alias
  alias?: string;
  // Date truncation if date dimension (e.g., 'year', 'month', 'day')
  dateTruncation?: 'year' | 'quarter' | 'month' | 'day' | 'week';
  // Sorting preference
  sort?: 'asc' | 'desc' | 'none';
  // Custom calculated field metadata
  isCalculated?: boolean;
  formula?: string;
}

export interface CalculatedField {
  id: string;
  name: string;
  role: FieldRole;
  dataType: DataType;
  formula: string;
}

export type ParameterAllowableType = 'all' | 'list' | 'range';

export interface ParameterListItem {
  value: string | number | boolean;
  label: string; // "Mostrar como" / "Display As"
}

export interface Parameter {
  id: string;
  name: string;
  comment?: string;
  dataType: DataType;
  numberSubtype?: 'float' | 'integer';
  displayFormat?: 'automatic' | 'currency' | 'percentage' | 'number' | 'date';
  currentValue: string | number | boolean;
  allowableType?: ParameterAllowableType;
  listItems?: ParameterListItem[];
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // Backward compatibility
  showControl?: boolean; // Tableau "Mostrar control de parámetro" (default true)
}

export type SheetType = 'worksheet' | 'dashboard';

export interface WorksheetTab {
  id: string;
  name: string;
  type: SheetType;
  columns: Pill[];
  rows: Pill[];
  filters: FilterExpression[];
  marks: MarksCardState;
  limit?: number;
  dashboardSheetIds?: string[];
}

export interface WorkbookProject {
  version: string;
  datasetMeta: DatasetMeta | null;
  activeTabId: string;
  sheets: WorksheetTab[];
  calculatedFields: CalculatedField[];
  parameters: Parameter[];
}

export type ShelfId = 'columns' | 'rows' | 'color' | 'size' | 'detail' | 'tooltip' | 'filters';

export interface FilterExpression {
  id: string;
  columnName: string;
  role: FieldRole;
  dataType: DataType;
  operator: 'in' | 'not_in' | 'range' | 'equals' | 'greater_than' | 'less_than';
  values?: (string | number | boolean)[];
  rangeMin?: number;
  rangeMax?: number;
}

export interface MarksCardState {
  markType: MarkType;
  color?: Pill;
  size?: Pill;
  detail: Pill[]; // Pills altering query granularity without adding spatial axes
  tooltip: Pill[];
  opacity: number;
}

export interface WorksheetState {
  datasetId: string;
  tableName: string;
  columns: Pill[]; // X-Axis shelf
  rows: Pill[];    // Y-Axis shelf
  filters: FilterExpression[];
  marks: MarksCardState;
  limit?: number;
}

/**
 * Normalized Abstract Syntax Tree (AST) ready for SQL compiler
 */
export interface WorksheetAST {
  tableName: string;
  // Dimensions that dictate GROUP BY:
  // Derived from: columns (if dim), rows (if dim), marks.color (if dim), marks.detail (all)
  groupByDimensions: Pill[];
  // Measures that dictate SELECT aggregations:
  // Derived from: columns (if measure), rows (if measure), marks.color (if measure), marks.size, marks.tooltip
  aggregatedMeasures: Pill[];
  // Filter predicates (WHERE clauses)
  filters: FilterExpression[];
  // Ordering specs
  orderBy: { field: string; direction: 'ASC' | 'DESC' }[];
  limit: number;
  // Preserved visualization intent
  spatialX: Pill[];
  spatialY: Pill[];
  markType: MarkType;
  colorChannel?: Pill;
  sizeChannel?: Pill;
  detailChannel: Pill[];
}
