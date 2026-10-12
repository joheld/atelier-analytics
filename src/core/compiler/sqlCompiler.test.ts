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

  it('compiles custom calculated fields with formulas and parameter substitution', () => {
    const marginPill: Pill = {
      id: 'p_margin',
      columnName: 'profit_margin',
      role: 'measure',
      dataType: 'number',
      aggregation: 'AVG',
      isCalculated: true,
      formula: '"profit" / [Target_Ratio]',
    };

    const state: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [
        {
          id: 'p_cat',
          columnName: 'category',
          role: 'dimension',
          dataType: 'string',
        },
      ],
      rows: [marginPill],
      filters: [],
      marks: {
        markType: 'auto',
        detail: [],
        tooltip: [],
        opacity: 1,
      },
    };

    const ast = buildWorksheetAST(state);
    const parameters = [
      {
        id: 'param_target',
        name: 'Target_Ratio',
        dataType: 'number' as const,
        currentValue: 1.25,
      },
    ];

    const compiled = compileASTtoDuckDB(ast, parameters);
    expect(compiled.sql).toContain('AVG(("profit" / 1.25)) AS avg_profit_margin');
    expect(compiled.sql).toContain('GROUP BY category');
  });

  it('compiles Tableau parameters with spaces, strings, and allowable types', () => {
    const calcPill: Pill = {
      id: 'p_dynamic',
      columnName: 'dynamic_calc',
      role: 'dimension',
      dataType: 'string',
      isCalculated: true,
      formula: "CASE WHEN \"sales\" >= [Meta Ventas] AND [Habilitar Flag] THEN [Segmento Seleccionado] ELSE 'Normal' END",
    };

    const state: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [calcPill],
      rows: [],
      filters: [],
      marks: {
        markType: 'auto',
        detail: [],
        tooltip: [],
        opacity: 1,
      },
    };

    const ast = buildWorksheetAST(state);
    const parameters = [
      {
        id: 'p1',
        name: 'Meta Ventas',
        dataType: 'number' as const,
        currentValue: 50000,
        allowableType: 'range' as const,
        min: 1000,
        max: 100000,
      },
      {
        id: 'p2',
        name: 'Habilitar Flag',
        dataType: 'boolean' as const,
        currentValue: true,
        allowableType: 'all' as const,
      },
      {
        id: 'p3',
        name: 'Segmento Seleccionado',
        dataType: 'string' as const,
        currentValue: 'Premium VIP',
        allowableType: 'list' as const,
        listItems: [
          { value: 'Premium VIP', label: 'Clientes VIP' },
          { value: 'Estándar', label: 'Clientes Comunes' },
        ],
      },
    ];

    const compiled = compileASTtoDuckDB(ast, parameters);
    expect(compiled.sql).toContain("(CASE WHEN \"sales\" >= 50000 AND TRUE THEN 'Premium VIP' ELSE 'Normal' END) AS dynamic_calc");
    expect(compiled.sql).toContain("GROUP BY (CASE WHEN \"sales\" >= 50000 AND TRUE THEN 'Premium VIP' ELSE 'Normal' END)");
  });

  it('correctly applies dashboard filters and parameter scoping across isolated worksheets', () => {
    // Worksheet 1: targeted by dashboard filter
    const sheet1State: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [{ id: 'c1', columnName: 'category', role: 'dimension', dataType: 'string' }],
      rows: [{ id: 'r1', columnName: 'sales', role: 'measure', dataType: 'number', aggregation: 'SUM' }],
      filters: [],
      marks: { markType: 'bar', detail: [], tooltip: [], opacity: 1 },
    };

    // Dashboard filter scoped strictly to sheet_1
    const dashFilter: import('../ast/types').FilterExpression = {
      id: 'df_1',
      columnName: 'region',
      role: 'dimension',
      dataType: 'string',
      operator: 'in',
      values: ['Central', 'South'],
      applyScope: 'selected',
      targetSheetIds: ['sheet_1'],
    };

    // When compiling sheet 1 (targeted):
    const isTargetedSheet1 = dashFilter.applyScope === 'all' || dashFilter.targetSheetIds?.includes('sheet_1');
    expect(isTargetedSheet1).toBe(true);
    const effectiveFilters1 = isTargetedSheet1 ? [dashFilter] : [];
    const ast1 = buildWorksheetAST({ ...sheet1State, filters: effectiveFilters1 });
    const compiled1 = compileASTtoDuckDB(ast1);
    expect(compiled1.sql).toContain("WHERE region IN ('Central', 'South')");

    // Worksheet 2: NOT targeted by dashboard filter
    const sheet2State: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [{ id: 'c2', columnName: 'segment', role: 'dimension', dataType: 'string' }],
      rows: [{ id: 'r2', columnName: 'profit', role: 'measure', dataType: 'number', aggregation: 'SUM' }],
      filters: [],
      marks: { markType: 'bar', detail: [], tooltip: [], opacity: 1 },
    };
    const isTargetedSheet2 = dashFilter.applyScope === 'all' || dashFilter.targetSheetIds?.includes('sheet_2');
    expect(isTargetedSheet2).toBe(false);
    const effectiveFilters2 = isTargetedSheet2 ? [dashFilter] : [];
    const ast2 = buildWorksheetAST({ ...sheet2State, filters: effectiveFilters2 });
    const compiled2 = compileASTtoDuckDB(ast2);
    expect(compiled2.sql).not.toContain('WHERE region');
  });
});
