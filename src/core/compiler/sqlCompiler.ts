import { WorksheetAST, Pill, FilterExpression, AggregationFunction, Parameter } from '../ast/types';
import { getPillSqlIdentifier } from '../ast/builder';

export interface CompiledQuery {
  sql: string;
  isAggregated: boolean;
  projections: {
    columnName: string;
    alias: string;
    role: 'dimension' | 'measure';
    pillId: string;
  }[];
}

/**
 * Escapes an identifier with double quotes if needed for DuckDB SQL
 */
export function escapeIdentifier(ident: string): string {
  // If already escaped, return as is
  if (ident.startsWith('"') && ident.endsWith('"')) {
    return ident;
  }
  // Safe characters: alphanumeric and underscore without spaces
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(ident)) {
    return ident;
  }
  return `"${ident.replace(/"/g, '""')}"`;
}

/**
 * Substitutes [ParameterName] tokens with their current values
 */
export function substituteParameters(expression: string, parameters?: Parameter[]): string {
  if (!parameters || !Array.isArray(parameters) || parameters.length === 0) return expression;
  let result = expression;
  for (const param of parameters) {
    if (!param || typeof param !== 'object' || !param.name) continue;
    const token = `[${param.name}]`;
    const tokenParams = `[Parameters].[${param.name}]`;
    const tokenUnderscore = `[${param.name.replace(/\s+/g, '_')}]`;

    let replacement: string;
    if (param.dataType === 'string') {
      replacement = `'${String(param.currentValue).replace(/'/g, "''")}'`;
    } else if (param.dataType === 'boolean') {
      replacement = param.currentValue === true || String(param.currentValue).toLowerCase() === 'true' ? 'TRUE' : 'FALSE';
    } else {
      replacement = String(param.currentValue);
    }

    if (result.includes(tokenParams)) {
      result = result.split(tokenParams).join(replacement);
    }
    if (result.includes(token)) {
      result = result.split(token).join(replacement);
    }
    if (token !== tokenUnderscore && result.includes(tokenUnderscore)) {
      result = result.split(tokenUnderscore).join(replacement);
    }
  }
  return result;
}

/**
 * Transpiles common Tableau Desktop formulas into DuckDB SQL:
 * - [FieldName] -> "FieldName"
 * - IF <cond> THEN <a> [ELSEIF <c2> THEN <b2>] [ELSE <b>] END -> CASE WHEN <cond> THEN <a> ... END
 * - IIF(test, then, else) -> (CASE WHEN test THEN then ELSE else END)
 * - ZN(expr) -> COALESCE(expr, 0)
 * - ISNULL(expr) -> ((expr) IS NULL)
 */
export function normalizeTableauFormula(
  expression: string,
  parameters?: Parameter[],
  availableColumns?: string[]
): string {
  if (!expression) return '';
  // 1. Substitute any parameters first
  let result = substituteParameters(expression, parameters);

  // 2. Tableau IF ... THEN ... ELSEIF ... ELSE ... END -> CASE WHEN ... THEN ... END
  result = result.replace(/\bIF\b\s+([\s\S]+?)\s+\bTHEN\b/gi, 'CASE WHEN $1 THEN');
  result = result.replace(/\bELSEIF\b\s+([\s\S]+?)\s+\bTHEN\b/gi, 'WHEN $1 THEN');

  // 3. IIF(cond, a, b) -> (CASE WHEN cond THEN a ELSE b END)
  result = result.replace(/\bIIF\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi, '(CASE WHEN $1 THEN $2 ELSE $3 END)');

  // 4. ZN(expr) -> COALESCE(expr, 0)
  result = result.replace(/\bZN\s*\(\s*([^)]+)\s*\)/gi, 'COALESCE($1, 0)');

  // 5. ISNULL(expr) -> (($1) IS NULL)
  result = result.replace(/\bISNULL\s*\(\s*([^)]+)\s*\)/gi, '(($1) IS NULL)');

  // 6. Transpile any remaining [Column Name] into "Column Name"
  result = result.replace(/(?<!\{[^}]*)\[([^\]]+)\](?![^{]*\})/g, (_match, colName) => {
    if (availableColumns && availableColumns.length > 0) {
      const matchCol = availableColumns.find(
        (c) => c.toLowerCase() === colName.trim().toLowerCase()
      );
      if (matchCol) {
        return escapeIdentifier(matchCol);
      }
    }
    return escapeIdentifier(colName.trim());
  });

  return result;
}

/**
 * Compiles Tableau Level of Detail (LOD) expressions:
 * - { FIXED [Dim1], [Dim2] : AGG([Measure]) }
 * - { FIXED : AGG([Measure]) }
 * - { EXCLUDE [Dim1] : AGG([Measure]) }
 * - { INCLUDE [Dim1] : AGG([Measure]) }
 */
export function compileLodExpressions(
  expression: string,
  tableName: string,
  currentVizDimensions: string[] = []
): string {
  if (!expression || !expression.includes('{')) return expression;

  const lodRegex = /\{\s*(FIXED|INCLUDE|EXCLUDE)\s*([^:]*)\s*:\s*([^}]+)\}/gi;

  return expression.replace(lodRegex, (_match, typeRaw, dimListRaw, aggExprRaw) => {
    const lodType = typeRaw.toUpperCase() as 'FIXED' | 'INCLUDE' | 'EXCLUDE';
    const rawDims = dimListRaw
      .split(',')
      .map((d: string) => d.trim().replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').trim())
      .filter((d: string) => d.length > 0);

    let effectiveDims: string[] = [];
    if (lodType === 'FIXED') {
      effectiveDims = rawDims;
    } else if (lodType === 'EXCLUDE') {
      const excludedSet = new Set(rawDims.map((d: string) => d.toLowerCase()));
      effectiveDims = currentVizDimensions.filter((d: string) => !excludedSet.has(d.toLowerCase()));
    } else if (lodType === 'INCLUDE') {
      const merged = new Set([...currentVizDimensions, ...rawDims]);
      effectiveDims = Array.from(merged);
    }

    // Convert columns in inner aggregation expression to _lod."col"
    let innerAgg = aggExprRaw.trim();
    // 1. Replace [Field] -> _lod."Field"
    innerAgg = innerAgg.replace(/\[([^\]]+)\]/g, (_m: string, col: string) => `_lod.${escapeIdentifier(col)}`);
    // 2. Replace "Field" if not already prefixed
    innerAgg = innerAgg.replace(/(?<!_lod\.)"([^"]+)"/g, (_m: string, col: string) => `_lod.${escapeIdentifier(col)}`);

    const safeTable = escapeIdentifier(tableName || 'main_table');

    if (effectiveDims.length === 0) {
      return `(SELECT ${innerAgg} FROM ${safeTable} AS _lod)`;
    }

    const whereClauses = effectiveDims.map(
      (dim) => `_lod.${escapeIdentifier(dim)} = ${safeTable}.${escapeIdentifier(dim)}`
    );

    return `(SELECT ${innerAgg} FROM ${safeTable} AS _lod WHERE ${whereClauses.join(' AND ')})`;
  });
}

/**
 * Compiles an aggregation function to DuckDB SQL syntax
 */
function compileAggregation(
  func: AggregationFunction,
  columnName: string,
  formula?: string,
  parameters?: Parameter[],
  tableName = '',
  vizDims: string[] = []
): string {
  if (formula) {
    const withLod = compileLodExpressions(formula, tableName, vizDims);
    const normalized = normalizeTableauFormula(withLod, parameters);
    // If formula already contains aggregate calls or is an LOD, treat as Tableau 'AGG' pill
    if (/^\s*(SUM|AVG|MIN|MAX|COUNT|MEDIAN|COUNT_DISTINCT)\s*\(/i.test(normalized.trim()) || normalized.trim().startsWith('{') || normalized.trim().startsWith('(SELECT')) {
      return normalized;
    }
    const target = `(${normalized})`;
    switch (func) {
      case 'SUM':
        return `SUM(${target})`;
      case 'AVG':
        return `AVG(${target})`;
      case 'MIN':
        return `MIN(${target})`;
      case 'MAX':
        return `MAX(${target})`;
      case 'COUNT':
        return `COUNT(${target})`;
      case 'COUNT_DISTINCT':
        return `COUNT(DISTINCT ${target})`;
      case 'MEDIAN':
        return `MEDIAN(${target})`;
      default:
        return `SUM(${target})`;
    }
  }

  const safeCol = escapeIdentifier(columnName);
  switch (func) {
    case 'SUM':
      return `SUM(${safeCol})`;
    case 'AVG':
      return `AVG(${safeCol})`;
    case 'MIN':
      return `MIN(${safeCol})`;
    case 'MAX':
      return `MAX(${safeCol})`;
    case 'COUNT':
      return `COUNT(${safeCol})`;
    case 'COUNT_DISTINCT':
      return `COUNT(DISTINCT ${safeCol})`;
    case 'MEDIAN':
      return `MEDIAN(${safeCol})`;
    default:
      return `SUM(${safeCol})`;
  }
}

/**
 * Compiles a dimension expression (handles date truncation and calculated formulas)
 */
function compileDimensionExpr(
  pill: Pill,
  parameters?: Parameter[],
  tableName = '',
  vizDims: string[] = []
): { expr: string; alias: string } {
  let target = escapeIdentifier(pill.columnName);
  if (pill.formula) {
    const withLod = compileLodExpressions(pill.formula, tableName, vizDims);
    const normalized = normalizeTableauFormula(withLod, parameters);
    target = normalized.startsWith('(') ? normalized : `(${normalized})`;
  }

  const safeCol = escapeIdentifier(pill.columnName);

  if (pill.dateTruncation) {
    const alias = `${pill.dateTruncation}_${pill.columnName}`;
    return {
      expr: `DATE_TRUNC('${pill.dateTruncation}', ${target})`,
      alias: escapeIdentifier(alias),
    };
  }
  return {
    expr: target,
    alias: safeCol,
  };
}

/**
 * Compiles a single filter expression into a SQL WHERE clause
 */
export function compileFilter(f: FilterExpression): string {
  const safeCol = escapeIdentifier(f.columnName);

  switch (f.operator) {
    case 'in': {
      if (!f.values || f.values.length === 0) return '1=1';
      const formatted = f.values
        .map((v) => (typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v)))
        .join(', ');
      return `${safeCol} IN (${formatted})`;
    }
    case 'not_in': {
      if (!f.values || f.values.length === 0) return '1=1';
      const formatted = f.values
        .map((v) => (typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v)))
        .join(', ');
      return `${safeCol} NOT IN (${formatted})`;
    }
    case 'range': {
      const parts: string[] = [];
      if (f.rangeMin !== undefined) {
        parts.push(`${safeCol} >= ${f.rangeMin}`);
      }
      if (f.rangeMax !== undefined) {
        parts.push(`${safeCol} <= ${f.rangeMax}`);
      }
      return parts.length > 0 ? parts.join(' AND ') : '1=1';
    }
    case 'equals': {
      const val = f.values?.[0];
      if (val === undefined) return '1=1';
      return typeof val === 'string'
        ? `${safeCol} = '${val.replace(/'/g, "''")}'`
        : `${safeCol} = ${val}`;
    }
    case 'greater_than': {
      const val = f.values?.[0];
      return val !== undefined ? `${safeCol} > ${val}` : '1=1';
    }
    case 'less_than': {
      const val = f.values?.[0];
      return val !== undefined ? `${safeCol} < ${val}` : '1=1';
    }
    default:
      return '1=1';
  }
}

/**
 * Translates a WorksheetAST into an ultra-fast, vectorized DuckDB SQL query.
 * Eliminates redundant subqueries and leverages native DuckDB functions.
 */
export function compileASTtoDuckDB(ast: WorksheetAST, parameters?: Parameter[]): CompiledQuery {
  const safeTable = escapeIdentifier(ast.tableName);
  const projections: CompiledQuery['projections'] = [];

  // Edge case: Empty worksheet state
  if (ast.groupByDimensions.length === 0 && ast.aggregatedMeasures.length === 0) {
    return {
      sql: `SELECT * FROM ${safeTable} LIMIT 100;`,
      isAggregated: false,
      projections: [],
    };
  }

  const selectParts: string[] = [];
  const groupByParts: string[] = [];
  const currentVizDims = ast.groupByDimensions.map((d) => d.columnName);

  // 1. Process Dimensions
  for (const dim of ast.groupByDimensions) {
    const { expr, alias } = compileDimensionExpr(dim, parameters, ast.tableName, currentVizDims);
    selectParts.push(`${expr} AS ${alias}`);
    groupByParts.push(expr);
    projections.push({
      columnName: dim.columnName,
      alias: alias.replace(/^"|"$/g, ''),
      role: 'dimension',
      pillId: dim.id,
    });
  }

  // 2. Process Measures
  const isDistributionMark =
    (ast.markType === 'histogram' || ast.markType === 'box') &&
    !ast.aggregatedMeasures.some((m) => m.quickTableCalc);
  const isAggregated =
    !isDistributionMark &&
    (ast.aggregatedMeasures.length > 0 || ast.groupByDimensions.length > 0);

  for (const measure of ast.aggregatedMeasures) {
    const aggFunc = measure.aggregation || 'SUM';
    const aggExpr = compileAggregation(aggFunc, measure.columnName, measure.formula, parameters, ast.tableName, currentVizDims);
    let rawTarget = escapeIdentifier(measure.columnName);
    if (measure.formula) {
      const withLod = compileLodExpressions(measure.formula, ast.tableName, currentVizDims);
      const normalized = normalizeTableauFormula(withLod, parameters);
      rawTarget = normalized.startsWith('(') ? normalized : `(${normalized})`;
    }
    const aliasRaw = getPillSqlIdentifier(measure);
    const safeAlias = escapeIdentifier(aliasRaw);

    let measureSelectExpr = isDistributionMark ? rawTarget : aggExpr;
    if (!isDistributionMark && measure.quickTableCalc) {
      const orderClause = groupByParts.length > 0 ? `ORDER BY ${groupByParts.join(', ')}` : '';
      switch (measure.quickTableCalc.type) {
        case 'percent_of_total':
          measureSelectExpr = `ROUND(100.0 * ${aggExpr} / NULLIF(SUM(${aggExpr}) OVER (), 0), 2)`;
          break;
        case 'running_total':
          measureSelectExpr = `SUM(${aggExpr}) OVER (${orderClause} ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`;
          break;
        case 'difference_from_previous':
          measureSelectExpr = `(${aggExpr} - LAG(${aggExpr}) OVER (${orderClause}))`;
          break;
        case 'percent_difference_from_previous':
          measureSelectExpr = `ROUND(100.0 * (${aggExpr} - LAG(${aggExpr}) OVER (${orderClause})) / NULLIF(LAG(${aggExpr}) OVER (${orderClause}), 0), 2)`;
          break;
        case 'rank':
          measureSelectExpr = `RANK() OVER (ORDER BY ${aggExpr} DESC)`;
          break;
        case 'moving_average':
          measureSelectExpr = `ROUND(AVG(${aggExpr}) OVER (${orderClause} ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)`;
          break;
      }
    }

    selectParts.push(`${measureSelectExpr} AS ${safeAlias}`);
    projections.push({
      columnName: measure.columnName,
      alias: aliasRaw,
      role: 'measure',
      pillId: measure.id,
    });
  }

  // Build the main SQL statement
  let sql = `SELECT\n  ${selectParts.join(',\n  ')}\nFROM ${safeTable}`;

  // WHERE clause
  const activeFilters = ast.filters.filter((f) => f.values?.length || f.rangeMin !== undefined || f.rangeMax !== undefined);
  if (activeFilters.length > 0) {
    const whereConditions = activeFilters.map(compileFilter).filter((c) => c !== '1=1');
    if (whereConditions.length > 0) {
      sql += `\nWHERE ${whereConditions.join(' AND ')}`;
    }
  }

  // GROUP BY clause (only needed if there are dimensions AND either measures exist or multiple dims)
  if (!isDistributionMark && groupByParts.length > 0 && ast.aggregatedMeasures.length > 0) {
    sql += `\nGROUP BY ${groupByParts.join(', ')}`;
  } else if (groupByParts.length > 0 && ast.aggregatedMeasures.length === 0) {
    // If only dimensions, group by them to get distinct rows
    sql += `\nGROUP BY ${groupByParts.join(', ')}`;
  }

  // ORDER BY clause
  if (ast.orderBy.length > 0) {
    const orderDirectives = ast.orderBy.map(
      (o) => `${escapeIdentifier(o.field)} ${o.direction}`
    );
    sql += `\nORDER BY ${orderDirectives.join(', ')}`;
  }

  // LIMIT clause
  if (ast.limit && ast.limit > 0) {
    sql += `\nLIMIT ${ast.limit}`;
  }

  sql += ';';

  return {
    sql,
    isAggregated,
    projections,
  };
}
