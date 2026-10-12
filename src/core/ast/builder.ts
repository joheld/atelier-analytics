import {
  WorksheetState,
  WorksheetAST,
  Pill,
  MarkType,
} from './types';

/**
 * Builds a normalized WorksheetAST from raw interactive WorksheetState.
 * Enforces the Tableau Declarative Invariants:
 * - Dimensions in Columns, Rows, Color, and Detail form the GROUP BY set.
 * - Measures in Columns, Rows, Color, Size, and Tooltip form the aggregated SELECT set.
 * - Detail adds granularity without creating visual spatial axes.
 * - Auto-infers the optimal MarkType when set to 'auto'.
 */
export function buildWorksheetAST(state: WorksheetState): WorksheetAST {
  const { tableName, columns, rows, filters, marks, limit = 50000 } = state;

  // 1. Gather all Dimensions (Group By candidates)
  const rawDimensions: Pill[] = [
    ...columns.filter((p) => p.role === 'dimension'),
    ...rows.filter((p) => p.role === 'dimension'),
    ...(marks.color && marks.color.role === 'dimension' ? [marks.color] : []),
    ...marks.detail, // Detail pills are guaranteed dimensions
  ];

  // Deduplicate dimensions by column + dateTruncation
  const dimensionMap = new Map<string, Pill>();
  for (const dim of rawDimensions) {
    const key = `${dim.columnName}:${dim.dateTruncation ?? 'raw'}`;
    if (!dimensionMap.has(key)) {
      dimensionMap.set(key, dim);
    }
  }
  const groupByDimensions = Array.from(dimensionMap.values());

  // 2. Gather all Measures (Aggregation candidates)
  const rawMeasures: Pill[] = [
    ...columns.filter((p) => p.role === 'measure'),
    ...rows.filter((p) => p.role === 'measure'),
    ...(marks.color && marks.color.role === 'measure' ? [marks.color] : []),
    ...(marks.size ? [marks.size] : []),
    ...marks.tooltip.filter((p) => p.role === 'measure'),
  ];

  // Assign default aggregation (SUM) if missing
  const measuresWithAgg = rawMeasures.map((m) => ({
    ...m,
    aggregation: m.aggregation || 'SUM',
  }));

  // Deduplicate measures by column + aggregation
  const measureMap = new Map<string, Pill>();
  for (const m of measuresWithAgg) {
    const key = `${m.columnName}:${m.aggregation}`;
    if (!measureMap.has(key)) {
      measureMap.set(key, m);
    }
  }
  const aggregatedMeasures = Array.from(measureMap.values());

  // 3. Resolve MarkType
  let resolvedMarkType: MarkType = marks.markType;
  if (resolvedMarkType === 'auto') {
    resolvedMarkType = inferOptimalMarkType(columns, rows);
  }

  // 4. Construct Order By specs (prefer explicit sort, fallback to X dimension)
  const orderBy: { field: string; direction: 'ASC' | 'DESC' }[] = [];
  for (const pill of [...columns, ...rows]) {
    if (pill.sort && pill.sort !== 'none') {
      const fieldIdentifier = getPillSqlIdentifier(pill);
      orderBy.push({
        field: fieldIdentifier,
        direction: pill.sort === 'asc' ? 'ASC' : 'DESC',
      });
    }
  }

  // Default ordering if none specified: order by first dimension ascending
  if (orderBy.length === 0 && groupByDimensions.length > 0) {
    orderBy.push({
      field: getPillSqlIdentifier(groupByDimensions[0]),
      direction: 'ASC',
    });
  }

  return {
    tableName,
    groupByDimensions,
    aggregatedMeasures,
    filters: filters || [],
    orderBy,
    limit,
    spatialX: columns,
    spatialY: rows,
    markType: resolvedMarkType,
    colorChannel: marks.color,
    sizeChannel: marks.size,
    detailChannel: marks.detail,
    analyticsLines: state.analyticsLines || [],
  };
}

/**
 * Heuristics for Tableau 'Show Me' automatic mark selection
 */
export function inferOptimalMarkType(columns: Pill[], rows: Pill[]): MarkType {
  const xDim = columns.some((p) => p.role === 'dimension');
  const xMeasure = columns.some((p) => p.role === 'measure');
  const yDim = rows.some((p) => p.role === 'dimension');
  const yMeasure = rows.some((p) => p.role === 'measure');

  // Both measures -> Scatter / Dot plot
  if (xMeasure && yMeasure) {
    return 'dot';
  }

  // Date dimension on X + Measure on Y -> Line plot
  const xDate = columns.some((p) => p.role === 'dimension' && p.dataType === 'date');
  if (xDate && yMeasure) {
    return 'line';
  }

  // Dimension on X + Measure on Y -> Bar chart
  if (xDim && yMeasure) {
    return 'bar';
  }

  // Measure on X + Dimension on Y -> Horizontal Bar chart
  if (xMeasure && yDim) {
    return 'bar';
  }

  // Both dimensions -> Heatmap / Cell matrix
  if (xDim && yDim) {
    return 'rect';
  }

  // Default fallback
  return 'bar';
}

/**
 * Returns the column name or aggregated alias for SQL reference
 */
export function getPillSqlIdentifier(pill: Pill): string {
  if (pill.role === 'measure') {
    const agg = pill.aggregation || 'SUM';
    const base = `${agg.toLowerCase()}_${pill.columnName}`;
    if (pill.quickTableCalc) {
      return `${pill.quickTableCalc.type}_${base}`;
    }
    return base;
  }
  if (pill.dateTruncation) {
    return `${pill.dateTruncation}_${pill.columnName}`;
  }
  return pill.columnName;
}
