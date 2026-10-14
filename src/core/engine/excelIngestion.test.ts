import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';

describe('Excel Ingestion Pipeline (SheetJS to DuckDB Columnar)', () => {
  it('parses single-sheet Excel workbook and generates valid tabular CSV with raw numbers', () => {
    // 1. Create in-memory workbook with numbers, currency-formatted cells, and dates
    const ws = XLSX.utils.aoa_to_sheet([
      ['ID', 'Producto', 'Precio', 'Cantidad', 'Fecha'],
      [101, 'Silla Ergonómica', 299.99, 4, '2024-01-15'],
      [102, 'Escritorio Roble', 549.50, 2, '2024-02-20'],
      [103, 'Monitor 4K', 380.00, 5, '2024-03-10'],
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    // 2. Simulate reading file buffer with cellDates
    const parsedWb = XLSX.read(u8, { type: 'array', cellDates: true });
    expect(parsedWb.SheetNames).toEqual(['Ventas']);

    const sheetName = parsedWb.SheetNames[0];
    const sheet = parsedWb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false, rawNumbers: true });

    expect(csv).toContain('"ID",Producto,Precio,Cantidad,Fecha');
    expect(csv).toContain('101,Silla Ergonómica,299.99,4,2024-01-15');
    expect(csv).toContain('102,Escritorio Roble,549.5,2,2024-02-20');
  });

  it('handles multi-sheet workbooks by extracting distinct sheets with clean table names', () => {
    // Sheet 1: Orders
    const wsOrders = XLSX.utils.aoa_to_sheet([
      ['OrderID', 'CustomerID', 'Sales'],
      ['ORD-1', 'CUST-A', 150.0],
      ['ORD-2', 'CUST-B', 320.5],
    ]);

    // Sheet 2: Customers
    const wsCustomers = XLSX.utils.aoa_to_sheet([
      ['CustomerID', 'CustomerName', 'Region'],
      ['CUST-A', 'Ana García', 'Norte'],
      ['CUST-B', 'Carlos López', 'Sur'],
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const parsedWb = XLSX.read(u8, { type: 'array', cellDates: true });
    expect(parsedWb.SheetNames).toHaveLength(2);
    expect(parsedWb.SheetNames).toEqual(['Orders', 'Customers']);

    const baseName = 'superstore';
    const sheetConfigs = parsedWb.SheetNames.map((sheetName, i) => {
      const cleanSheetName = sheetName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const sheetTableName =
        parsedWb.SheetNames.length === 1
          ? baseName
          : `${baseName}_${cleanSheetName || `sheet${i + 1}`}`;

      const csv = XLSX.utils.sheet_to_csv(parsedWb.Sheets[sheetName], { blankrows: false, rawNumbers: true });
      return {
        sheetName,
        tableName: sheetTableName,
        csv,
      };
    });

    expect(sheetConfigs[0].tableName).toBe('superstore_orders');
    expect(sheetConfigs[0].csv).toContain('OrderID,CustomerID,Sales');
    expect(sheetConfigs[1].tableName).toBe('superstore_customers');
    expect(sheetConfigs[1].csv).toContain('CustomerID,CustomerName,Region');
  });

  it('preserves unformatted raw floating numbers even when currency formatting is present', () => {
    const ws = {
      '!ref': 'A1:B3',
      A1: { t: 's', v: 'Item' },
      B1: { t: 's', v: 'Revenue' },
      A2: { t: 's', v: 'Laptop Pro' },
      B2: { t: 'n', v: 2499.95, z: '$#,##0.00', w: '$2,499.95' },
      A3: { t: 's', v: 'Wireless Mouse' },
      B3: { t: 'n', v: 49.99, z: '$#,##0.00', w: '$49.99' },
    };

    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false, rawNumbers: true });
    // Must contain raw 2499.95 without currency commas to prevent CSV column splitting
    expect(csv).toContain('Laptop Pro,2499.95');
    expect(csv).toContain('Wireless Mouse,49.99');
  });

  it('correctly handles XLS (BIFF8 legacy Excel binary) files', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Codigo', 'Descripcion', 'Stock'],
      ['ART-01', 'Tornillo M6', 5000],
      ['ART-02', 'Tuerca M6', 4500],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    // Write as legacy .xls (BIFF8)
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'biff8' });
    const parsedWb = XLSX.read(u8, { type: 'array', cellDates: true });

    expect(parsedWb.SheetNames).toEqual(['Inventario']);
    const csv = XLSX.utils.sheet_to_csv(parsedWb.Sheets['Inventario'], { blankrows: false, rawNumbers: true });
    expect(csv).toContain('ART-01,Tornillo M6,5000');
    expect(csv).toContain('ART-02,Tuerca M6,4500');
  });
});
