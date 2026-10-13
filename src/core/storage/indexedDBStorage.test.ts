import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveActiveSession,
  getActiveSession,
  clearActiveSession,
  ActiveSessionSnapshot,
} from './indexedDBStorage';

describe('IndexedDB and Session Storage Persistence', () => {
  beforeEach(() => {
    clearActiveSession();
  });

  it('saves and restores active session snapshot accurately', () => {
    const snapshot: ActiveSessionSnapshot = {
      version: 1,
      updatedAt: 1700000000000,
      activeTabId: 'sheet_2',
      sheets: [
        {
          id: 'sheet_1',
          name: 'Ventas por Región',
          type: 'worksheet',
          columns: [{ id: 'p1', columnName: 'region', role: 'dimension', dataType: 'string' }],
          rows: [{ id: 'p2', columnName: 'sales', role: 'measure', dataType: 'number', aggregation: 'SUM' }],
          filters: [],
          marks: { markType: 'bar', detail: [], tooltip: [], opacity: 0.9 },
        },
        {
          id: 'sheet_2',
          name: 'Tabla de Ganancias',
          type: 'worksheet',
          columns: [{ id: 'p3', columnName: 'category', role: 'dimension', dataType: 'string' }],
          rows: [{ id: 'p4', columnName: 'profit', role: 'measure', dataType: 'number', aggregation: 'SUM' }],
          filters: [],
          marks: { markType: 'text', detail: [], tooltip: [], opacity: 1 },
        },
      ],
      calculatedFields: [
        {
          id: 'cf_1',
          name: 'Margen',
          formula: '[profit] / [sales]',
          role: 'measure',
          dataType: 'number',
        },
      ],
      parameters: [
        {
          id: 'param_top_n',
          name: 'Top N',
          dataType: 'number',
          currentValue: 10,
          allowableType: 'range',
          min: 1,
          max: 100,
        },
      ],
      theme: 'dark',
      currentDatasetId: 'superstore_sales',
      currentDatasetName: 'superstore.parquet',
    };

    saveActiveSession(snapshot);

    const loaded = getActiveSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(1);
    expect(loaded?.activeTabId).toBe('sheet_2');
    expect(loaded?.sheets).toHaveLength(2);
    expect(loaded?.sheets[1].marks.markType).toBe('text');
    expect(loaded?.calculatedFields).toHaveLength(1);
    expect(loaded?.calculatedFields[0].formula).toBe('[profit] / [sales]');
    expect(loaded?.parameters[0].name).toBe('Top N');
    expect(loaded?.theme).toBe('dark');
    expect(loaded?.currentDatasetName).toBe('superstore.parquet');
  });

  it('clears active session correctly on logout or close dataset', () => {
    saveActiveSession({
      version: 1,
      updatedAt: Date.now(),
      activeTabId: 'sheet_1',
      sheets: [],
      calculatedFields: [],
      parameters: [],
      theme: 'light',
    });

    expect(getActiveSession()).not.toBeNull();

    clearActiveSession();

    expect(getActiveSession()).toBeNull();
  });
});
