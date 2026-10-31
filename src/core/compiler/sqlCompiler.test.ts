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

  it('compiles Quick Table Calculations (Tableau Window Functions)', () => {
    // 1. Percent of Total
    const percentState: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [{ id: 'c1', columnName: 'category', role: 'dimension', dataType: 'string' }],
      rows: [
        {
          id: 'r1',
          columnName: 'sales',
          role: 'measure',
          dataType: 'number',
          aggregation: 'SUM',
          quickTableCalc: { type: 'percent_of_total' },
        },
      ],
      filters: [],
      marks: { markType: 'bar', detail: [], tooltip: [], opacity: 1 },
    };
    const ast1 = buildWorksheetAST(percentState);
    const compiled1 = compileASTtoDuckDB(ast1);
    expect(compiled1.sql).toContain('ROUND(100.0 * SUM(sales) / NULLIF(SUM(SUM(sales)) OVER (), 0), 2) AS percent_of_total_sum_sales');

    // 2. Running Total
    const runningState: WorksheetState = {
      ...percentState,
      rows: [
        {
          id: 'r1',
          columnName: 'sales',
          role: 'measure',
          dataType: 'number',
          aggregation: 'SUM',
          quickTableCalc: { type: 'running_total' },
        },
      ],
    };
    const ast2 = buildWorksheetAST(runningState);
    const compiled2 = compileASTtoDuckDB(ast2);
    expect(compiled2.sql).toContain('SUM(SUM(sales)) OVER (ORDER BY category ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total_sum_sales');

    // 3. Rank
    const rankState: WorksheetState = {
      ...percentState,
      rows: [
        {
          id: 'r1',
          columnName: 'sales',
          role: 'measure',
          dataType: 'number',
          aggregation: 'SUM',
          quickTableCalc: { type: 'rank' },
        },
      ],
    };
    const ast3 = buildWorksheetAST(rankState);
    const compiled3 = compileASTtoDuckDB(ast3);
    expect(compiled3.sql).toContain('RANK() OVER (ORDER BY SUM(sales) DESC) AS rank_sum_sales');

    // 4. Moving Average
    const movingState: WorksheetState = {
      ...percentState,
      rows: [
        {
          id: 'r1',
          columnName: 'sales',
          role: 'measure',
          dataType: 'number',
          aggregation: 'SUM',
          quickTableCalc: { type: 'moving_average' },
        },
      ],
    };
    const ast4 = buildWorksheetAST(movingState);
    const compiled4 = compileASTtoDuckDB(ast4);
    expect(compiled4.sql).toContain('ROUND(AVG(SUM(sales)) OVER (ORDER BY category ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_average_sum_sales');
  });

  it('compiles unaggregated distribution queries for Histogram and Boxplot marks', () => {
    // Histogram with single continuous measure
    const histState: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [{ id: 'c1', columnName: 'profit', role: 'measure', dataType: 'number', aggregation: 'SUM' }],
      rows: [],
      filters: [],
      marks: { markType: 'histogram', detail: [], tooltip: [], opacity: 1 },
    };
    const histAst = buildWorksheetAST(histState);
    const histCompiled = compileASTtoDuckDB(histAst);
    expect(histCompiled.sql).toContain('SELECT\n  profit AS sum_profit\nFROM superstore');
    expect(histCompiled.sql).not.toContain('GROUP BY');

    // Boxplot with dimension on X and measure on Y
    const boxState: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [{ id: 'c1', columnName: 'region', role: 'dimension', dataType: 'string' }],
      rows: [{ id: 'r1', columnName: 'sales', role: 'measure', dataType: 'number', aggregation: 'SUM' }],
      filters: [],
      marks: { markType: 'box', detail: [], tooltip: [], opacity: 1 },
    };
    const boxAst = buildWorksheetAST(boxState);
    const boxCompiled = compileASTtoDuckDB(boxAst);
    expect(boxCompiled.sql).toContain('SELECT\n  region AS region,\n  sales AS sum_sales\nFROM superstore');
    expect(boxCompiled.sql).not.toContain('GROUP BY');
  });

  it('compiles multi-measure clustered queries projecting multiple aggregated metrics simultaneously', () => {
    const multiMeasureState: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [{ id: 'c1', columnName: 'category', role: 'dimension', dataType: 'string' }],
      rows: [
        { id: 'r1', columnName: 'sales', role: 'measure', dataType: 'number', aggregation: 'SUM' },
        { id: 'r2', columnName: 'profit', role: 'measure', dataType: 'number', aggregation: 'SUM' },
        { id: 'r3', columnName: 'discount', role: 'measure', dataType: 'number', aggregation: 'AVG' },
      ],
      filters: [],
      marks: { markType: 'bar', detail: [], tooltip: [], opacity: 0.9 },
    };

    const ast = buildWorksheetAST(multiMeasureState);
    expect(ast.spatialX).toHaveLength(1);
    expect(ast.spatialY).toHaveLength(3);
    expect(ast.aggregatedMeasures).toHaveLength(3);

    const compiled = compileASTtoDuckDB(ast);
    expect(compiled.sql).toContain('category AS category');
    expect(compiled.sql).toContain('SUM(sales) AS sum_sales');
    expect(compiled.sql).toContain('SUM(profit) AS sum_profit');
    expect(compiled.sql).toContain('AVG(discount) AS avg_discount');
    expect(compiled.sql).toContain('GROUP BY category');
  });

  it('compiles Text Table (Cross-Tab) with multiple dimensions and measures', () => {
    const crossTabState: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [
        { id: 'c1', columnName: 'region', role: 'dimension', dataType: 'string' },
      ],
      rows: [
        { id: 'r1', columnName: 'category', role: 'dimension', dataType: 'string' },
        { id: 'r2', columnName: 'sales', role: 'measure', dataType: 'number', aggregation: 'SUM' },
        { id: 'r3', columnName: 'profit', role: 'measure', dataType: 'number', aggregation: 'SUM' },
      ],
      filters: [],
      marks: { markType: 'text', detail: [], tooltip: [], opacity: 1 },
    };

    const ast = buildWorksheetAST(crossTabState);
    expect(ast.markType).toBe('text');
    expect(ast.groupByDimensions).toHaveLength(2);
    expect(ast.aggregatedMeasures).toHaveLength(2);

    const compiled = compileASTtoDuckDB(ast);
    expect(compiled.sql).toContain('region AS region');
    expect(compiled.sql).toContain('category AS category');
    expect(compiled.sql).toContain('SUM(sales) AS sum_sales');
    expect(compiled.sql).toContain('SUM(profit) AS sum_profit');
    expect(compiled.sql).toContain('GROUP BY region, category');
  });

  it('compiles Tableau Level of Detail (LOD) FIXED expressions with and without dimensions', () => {
    // 1. FIXED by Region
    const fixedRegionState: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [
        { id: 'c1', columnName: 'region', role: 'dimension', dataType: 'string' },
      ],
      rows: [
        {
          id: 'r1',
          columnName: 'region_sales',
          role: 'measure',
          dataType: 'number',
          isCalculated: true,
          formula: '{FIXED [region] : SUM([sales])}',
        },
        {
          id: 'r2',
          columnName: 'table_sales',
          role: 'measure',
          dataType: 'number',
          isCalculated: true,
          formula: '{FIXED : SUM([sales])}',
        },
      ],
      filters: [],
      marks: { markType: 'bar', detail: [], tooltip: [], opacity: 0.9 },
    };

    const ast = buildWorksheetAST(fixedRegionState);
    const compiled = compileASTtoDuckDB(ast);

    // Should generate correlated subquery for FIXED [region]
    expect(compiled.sql).toContain('(SELECT SUM(_lod.sales) FROM superstore AS _lod WHERE _lod.region = superstore.region)');
    // Should generate scalar subquery for FIXED : (table-scoped)
    expect(compiled.sql).toContain('(SELECT SUM(_lod.sales) FROM superstore AS _lod)');
    expect(compiled.sql).toContain('GROUP BY region');
  });

  it('compiles Tableau EXCLUDE and INCLUDE Level of Detail expressions based on viz grain', () => {
    const lodState: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [
        { id: 'c1', columnName: 'region', role: 'dimension', dataType: 'string' },
        { id: 'c2', columnName: 'category', role: 'dimension', dataType: 'string' },
      ],
      rows: [
        {
          id: 'r1',
          columnName: 'sales_excluding_category',
          role: 'measure',
          dataType: 'number',
          isCalculated: true,
          formula: '{EXCLUDE [category] : SUM([sales])}',
        },
        {
          id: 'r2',
          columnName: 'avg_including_customer',
          role: 'measure',
          dataType: 'number',
          isCalculated: true,
          formula: '{INCLUDE [customer_id] : AVG([sales])}',
        },
      ],
      filters: [],
      marks: { markType: 'bar', detail: [], tooltip: [], opacity: 0.9 },
    };

    const ast = buildWorksheetAST(lodState);
    const compiled = compileASTtoDuckDB(ast);

    // EXCLUDE [category] from [region, category] leaves [region]
    expect(compiled.sql).toContain('(SELECT SUM(_lod.sales) FROM superstore AS _lod WHERE _lod.region = superstore.region)');
    // INCLUDE [customer_id] on [region, category] expands to [region, category, customer_id]
    expect(compiled.sql).toContain('_lod.region = superstore.region AND _lod.category = superstore.category AND _lod.customer_id = superstore.customer_id');
  });

  it('compiles ratio formulas combining aggregated measures with LOD expressions', () => {
    const ratioState: WorksheetState = {
      datasetId: 'superstore',
      tableName: 'superstore',
      columns: [
        { id: 'c1', columnName: 'region', role: 'dimension', dataType: 'string' },
      ],
      rows: [
        {
          id: 'r1',
          columnName: 'sales_pct_of_region',
          role: 'measure',
          dataType: 'number',
          isCalculated: true,
          formula: 'SUM([sales]) / {FIXED [region] : SUM([sales])} * 100',
        },
      ],
      filters: [],
      marks: { markType: 'bar', detail: [], tooltip: [], opacity: 0.9 },
    };

    const ast = buildWorksheetAST(ratioState);
    const compiled = compileASTtoDuckDB(ast);

    expect(compiled.sql).toContain('SUM([sales]) / (SELECT SUM(_lod.sales) FROM superstore AS _lod WHERE _lod.region = superstore.region) * 100');
    expect(compiled.sql).toContain('GROUP BY region');
  });
});
