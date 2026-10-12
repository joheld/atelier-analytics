import { describe, it, expect } from 'vitest';
import { WorksheetState, Pill } from '../ast/types';
import { buildWorksheetAST } from '../ast/builder';
import { compileASTtoDuckDB } from './sqlCompiler';

describe('Atelier Analytics Compiler & AST Builder', () => {
  it('compiles standard Bar Chart (Dimension on Columns, Measure on Rows)', () => {
    const categoryPill: Pill = {
      id: 'p1',
      columnName: 'category',
      role: 'dimension',
      dataType: 'string',
    };
    const salesPill: Pill = {
      id: 'p2',
      columnName: 'sales',
      role: 'measure',
      dataType: 'number',
      aggregation: 'SUM',
    };

    const state: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [categoryPill],
      rows: [salesPill],
      filters: [],
      marks: {
        markType: 'auto',
        detail: [],
        tooltip: [],
        opacity: 0.9,
      },
    };

    const ast = buildWorksheetAST(state);
    expect(ast.markType).toBe('bar');
    expect(ast.groupByDimensions).toHaveLength(1);
    expect(ast.aggregatedMeasures).toHaveLength(1);

    const compiled = compileASTtoDuckDB(ast);
    expect(compiled.sql).toContain('SELECT');
    expect(compiled.sql).toContain('category AS category');
    expect(compiled.sql).toContain('SUM(sales) AS sum_sales');
    expect(compiled.sql).toContain('FROM superstore');
    expect(compiled.sql).toContain('GROUP BY category');
    expect(compiled.sql).toContain('ORDER BY category ASC');
  });

  it('incorporates Marks Detail to increase query granularity without adding spatial axes', () => {
    const categoryPill: Pill = {
      id: 'p1',
      columnName: 'category',
      role: 'dimension',
      dataType: 'string',
    };
    const regionPill: Pill = {
      id: 'p3',
      columnName: 'region',
      role: 'dimension',
      dataType: 'string',
    };
    const salesPill: Pill = {
      id: 'p2',
      columnName: 'sales',
      role: 'measure',
      dataType: 'number',
      aggregation: 'SUM',
    };

    const state: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [categoryPill],
      rows: [salesPill],
      filters: [],
      marks: {
        markType: 'auto',
        detail: [regionPill], // Region in Detail shelf
        tooltip: [],
        opacity: 0.9,
      },
    };

    const ast = buildWorksheetAST(state);
    expect(ast.groupByDimensions).toHaveLength(2); // Both category and region
    expect(ast.spatialX).toHaveLength(1); // Spatial X only has category!
    expect(ast.detailChannel).toHaveLength(1); // Detail has region!

    const compiled = compileASTtoDuckDB(ast);
    expect(compiled.sql).toContain('region AS region');
    expect(compiled.sql).toContain('GROUP BY category, region');
  });

  it('correctly handles filter expressions', () => {
    const state: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [
        {
          id: 'p1',
          columnName: 'category',
          role: 'dimension',
          dataType: 'string',
        },
      ],
      rows: [
        {
          id: 'p2',
          columnName: 'profit',
          role: 'measure',
          dataType: 'number',
          aggregation: 'AVG',
        },
      ],
      filters: [
        {
          id: 'f1',
          columnName: 'region',
          role: 'dimension',
          dataType: 'string',
          operator: 'in',
          values: ['West', 'East'],
        },
      ],
      marks: {
        markType: 'bar',
        detail: [],
        tooltip: [],
        opacity: 1,
      },
    };

    const ast = buildWorksheetAST(state);
    const compiled = compileASTtoDuckDB(ast);
    expect(compiled.sql).toContain("WHERE region IN ('West', 'East')");
    expect(compiled.sql).toContain('AVG(profit) AS avg_profit');
  });

  it('escapes column names with spaces or special characters', () => {
    const state: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [
        {
          id: 'p1',
          columnName: 'Sub-Category',
          role: 'dimension',
          dataType: 'string',
        },
      ],
      rows: [
        {
          id: 'p2',
          columnName: 'Unit Price',
          role: 'measure',
          dataType: 'number',
          aggregation: 'SUM',
        },
      ],
      filters: [],
      marks: {
        markType: 'auto',
        detail: [],
        tooltip: [],
        opacity: 1,
      },
    };

    const ast = buildWorksheetAST(state);
    const compiled = compileASTtoDuckDB(ast);
    expect(compiled.sql).toContain('"Sub-Category" AS "Sub-Category"');
    expect(compiled.sql).toContain('SUM("Unit Price") AS "sum_Unit Price"');
  });
});
