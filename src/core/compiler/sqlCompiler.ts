import { WorksheetAST, Pill, FilterExpression, AggregationFunction } from '../ast/types';
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
 * Compiles an aggregation function to DuckDB SQL syntax
 */
function compileAggregation(func: AggregationFunction, columnName: string): string {
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
 * Compiles a dimension expression (handles date truncation)
 */
function compileDimensionExpr(pill: Pill): { expr: string; alias: string } {
  const safeCol = escapeIdentifier(pill.columnName);
  if (pill.dateTruncation) {
    const alias = `${pill.dateTruncation}_${pill.columnName}`;
    return {
      expr: `DATE_TRUNC('${pill.dateTruncation}', ${safeCol})`,
      alias: escapeIdentifier(alias),
    };
  }
  return {
    expr: safeCol,
    alias: safeCol,
  };
}

/**
 * Compiles a single filter expression into a SQL WHERE clause
 */
function compileFilter(f: FilterExpression): string {
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
export function compileASTtoDuckDB(ast: WorksheetAST): CompiledQuery {
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
    const { expr, alias } = compileDimensionExpr(dim);
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
  const isAggregated = ast.aggregatedMeasures.length > 0 || ast.groupByDimensions.length > 0;
  for (const measure of ast.aggregatedMeasures) {
    const aggFunc = measure.aggregation || 'SUM';
    const aggExpr = compileAggregation(aggFunc, measure.columnName);
    const aliasRaw = getPillSqlIdentifier(measure);
    const safeAlias = escapeIdentifier(aliasRaw);

    selectParts.push(`${aggExpr} AS ${safeAlias}`);
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
  if (groupByParts.length > 0 && ast.aggregatedMeasures.length > 0) {
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
