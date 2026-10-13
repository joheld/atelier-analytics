import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TextTableRenderer } from './TextTableRenderer';
import { WorksheetAST, Pill } from '../../core/ast/types';
import { QueryExecutionResult } from '../../core/engine/duckdbClient';

describe('TextTableRenderer (Cross-Tab / Tabla de Texto)', () => {
  it('renders a rich interactive table with columns, cells, and Grand Totals', () => {
    const regionPill: Pill = {
      id: 'p1',
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
    const profitPill: Pill = {
      id: 'p3',
      columnName: 'profit',
      role: 'measure',
      dataType: 'number',
      aggregation: 'SUM',
    };

    const ast: WorksheetAST = {
      tableName: 'superstore',
      groupByDimensions: [regionPill],
      aggregatedMeasures: [salesPill, profitPill],
      filters: [],
      orderBy: [{ field: 'region', direction: 'ASC' }],
      limit: 1000,
      spatialX: [regionPill],
      spatialY: [salesPill, profitPill],
      markType: 'text',
      detailChannel: [],
      analyticsLines: [],
    };

    const result: QueryExecutionResult = {
      sql: 'SELECT region, SUM(sales) as sum_sales, SUM(profit) as sum_profit FROM superstore GROUP BY region',
      arrowTable: null,
      rows: [
        { region: 'East', sum_sales: 15000, sum_profit: 3200 },
        { region: 'West', sum_sales: 22000, sum_profit: -500 },
      ],
      rowCount: 2,
      durationMs: 4,
      columnNames: ['region', 'sum_sales', 'sum_profit'],
    };

    const html = renderToString(
      <TextTableRenderer ast={ast} result={result} theme="light" />
    );

    // Verify Title and Toolbar
    expect(html).toContain('Tabla de Texto (Cross-Tab)');
    expect(html).toContain('filas');
    expect(html).toContain('Buscar en celdas...');
    expect(html).toContain('Copiar TSV');
    expect(html).toContain('CSV');

    // Verify Headers
    expect(html).toContain('region');
    expect(html).toContain('SUM(sales)');
    expect(html).toContain('SUM(profit)');

    // Verify Cell Data
    expect(html).toContain('East');
    expect(html).toContain('15,000');
    expect(html).toContain('West');
    expect(html).toContain('-500');

    // Verify Grand Totals Footer Row
    expect(html).toContain('Total General');
    expect(html).toContain('37,000'); // 15000 + 22000
    expect(html).toContain('2,700');  // 3200 + (-500)
  });

  it('handles BigInt and empty data without crashing', () => {
    const categoryPill: Pill = {
      id: 'c1',
      columnName: 'category',
      role: 'dimension',
      dataType: 'string',
    };
    const countPill: Pill = {
      id: 'c2',
      columnName: 'orders',
      role: 'measure',
      dataType: 'number',
      aggregation: 'COUNT',
    };

    const ast: WorksheetAST = {
      tableName: 'superstore',
      groupByDimensions: [categoryPill],
      aggregatedMeasures: [countPill],
      filters: [],
      orderBy: [],
      limit: 1000,
      spatialX: [categoryPill],
      spatialY: [countPill],
      markType: 'text',
      detailChannel: [],
      analyticsLines: [],
    };

    const result: QueryExecutionResult = {
      sql: 'SELECT category, COUNT(orders) as count_orders FROM superstore GROUP BY category',
      arrowTable: null,
      rows: [
        { category: 'Furniture', count_orders: 42n as unknown as number },
      ],
      rowCount: 1,
      durationMs: 2,
      columnNames: ['category', 'count_orders'],
    };

    const html = renderToString(
      <TextTableRenderer ast={ast} result={result} theme="dark" />
    );

    expect(html).toContain('Furniture');
    expect(html).toContain('42');
    expect(html).toContain('Total General');
  });
});
