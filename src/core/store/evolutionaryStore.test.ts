import { describe, it, expect, beforeEach } from 'vitest';
import { useWorksheetStore } from './worksheetStore';
import { Pill } from '../ast/types';

describe('Evolutionary Store Features: Hierarchies, Drill-down & Number Formatting', () => {
  beforeEach(() => {
    // Reset store state
    useWorksheetStore.setState({
      columns: [],
      rows: [],
      sheets: [
        {
          id: 'sheet_1',
          name: 'Sheet 1',
          type: 'worksheet',
          columns: [],
          rows: [],
          filters: [],
          marks: { markType: 'auto', detail: [], tooltip: [], opacity: 0.9 },
        },
      ],
      activeTabId: 'sheet_1',
      currentDataset: {
        id: 'ds_1',
        name: 'Superstore',
        tableName: 'superstore',
        description: 'Test dataset',
        rowCount: 1000,
        columns: [],
        hierarchies: [
          {
            id: 'hier_geo',
            name: 'Geografía',
            levels: ['country', 'state', 'city'],
          },
        ],
      },
    });
  });

  it('drills down date dimension from year to quarter, month, and day', () => {
    const store = useWorksheetStore.getState();
    const datePill: Pill = {
      id: 'pill_date_1',
      columnName: 'order_date',
      role: 'dimension',
      dataType: 'date',
      dateTruncation: 'year',
    };

    useWorksheetStore.setState({ columns: [datePill] });

    // 1st Drill-down: year -> inserts quarter
    store.drillDownPill('columns', 'pill_date_1');
    let cols = useWorksheetStore.getState().columns;
    expect(cols).toHaveLength(2);
    expect(cols[0].dateTruncation).toBe('year');
    expect(cols[1].dateTruncation).toBe('quarter');

    // 2nd Drill-down: quarter -> inserts month
    const quarterPillId = cols[1].id;
    store.drillDownPill('columns', quarterPillId);
    cols = useWorksheetStore.getState().columns;
    expect(cols).toHaveLength(3);
    expect(cols[2].dateTruncation).toBe('month');

    // Drill-up: removes month pill
    const monthPillId = cols[2].id;
    store.drillUpPill('columns', monthPillId);
    cols = useWorksheetStore.getState().columns;
    expect(cols).toHaveLength(2);
    expect(cols.map((c) => c.dateTruncation)).toEqual(['year', 'quarter']);
  });

  it('drills down custom multi-level dimensional hierarchy', () => {
    const store = useWorksheetStore.getState();
    const countryPill: Pill = {
      id: 'pill_country',
      columnName: 'country',
      role: 'dimension',
      dataType: 'string',
      hierarchyId: 'hier_geo',
      hierarchyLevelIndex: 0,
    };

    useWorksheetStore.setState({ rows: [countryPill] });

    // Drill-down country -> inserts state
    store.drillDownPill('rows', 'pill_country');
    const rows = useWorksheetStore.getState().rows;
    expect(rows).toHaveLength(2);
    expect(rows[0].columnName).toBe('country');
    expect(rows[1].columnName).toBe('state');
    expect(rows[1].hierarchyId).toBe('hier_geo');
    expect(rows[1].hierarchyLevelIndex).toBe(1);
  });

  it('updates pill metric number formatting correctly', () => {
    const store = useWorksheetStore.getState();
    const salesPill: Pill = {
      id: 'pill_sales',
      columnName: 'sales',
      role: 'measure',
      dataType: 'number',
      aggregation: 'SUM',
    };

    useWorksheetStore.setState({ rows: [salesPill] });

    // Update to currency formatting
    store.updatePillFormat('rows', 'pill_sales', {
      type: 'currency',
      currencySymbol: '$',
      decimals: 2,
    });

    const updatedRows = useWorksheetStore.getState().rows;
    expect(updatedRows[0].formatConfig).toEqual({
      type: 'currency',
      currencySymbol: '$',
      decimals: 2,
    });
  });

  it('allows creating custom hierarchies dynamically', () => {
    const store = useWorksheetStore.getState();
    store.createHierarchy('Producto', ['category', 'sub_category', 'product_name']);

    const currentDataset = useWorksheetStore.getState().currentDataset;
    expect(currentDataset?.hierarchies).toBeDefined();
    const prodHier = currentDataset?.hierarchies?.find((h) => h.name === 'Producto');
    expect(prodHier).toBeDefined();
    expect(prodHier?.levels).toEqual(['category', 'sub_category', 'product_name']);
  });
});
