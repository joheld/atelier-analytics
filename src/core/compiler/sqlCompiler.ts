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
  if (!parameters || parameters.length === 0) return expression;
  let result = expression;
  for (const param of parameters) {
    const token = `[${param.name}]`;
    const tokenUnderscore = `[${param.name.replace(/\s+/g, '_')}]`;

    let replacement: string;
    if (param.dataType === 'string') {
      replacement = `'${String(param.currentValue).replace(/'/g, "''")}'`;
    } else if (param.dataType === 'boolean') {
      replacement = param.currentValue === true || String(param.currentValue).toLowerCase() === 'true' ? 'TRUE' : 'FALSE';
    } else {
      replacement = String(param.currentValue);
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
 * Compiles an aggregation function to DuckDB SQL syntax
 */
function compileAggregation(func: AggregationFunction, columnName: string, formula?: string, parameters?: Parameter[]): string {
  const target = formula
    ? `(${substituteParameters(formula, parameters)})`
    : escapeIdentifier(columnName);

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

/**
 * Compiles a dimension expression (handles date truncation and calculated formulas)
 */
function compileDimensionExpr(pill: Pill, parameters?: Parameter[]): { expr: string; alias: string } {
  const target = pill.formula
    ? `(${substituteParameters(pill.formula, parameters)})`
    : escapeIdentifier(pill.columnName);

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

  // 1. Process Dimensions
  for (const dim of ast.groupByDimensions) {
    const { expr, alias } = compileDimensionExpr(dim, parameters);
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
    const aggExpr = compileAggregation(aggFunc, measure.columnName, measure.formula, parameters);
    const rawTarget = measure.formula
      ? `(${substituteParameters(measure.formula, parameters)})`
      : escapeIdentifier(measure.columnName);
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
