import { describe, it, expect } from 'vitest';
import { getSqlJs, parseSqliteDatabase, escapeCsvCell } from './sqliteIngestion';

describe('SQLite Ingestion Pipeline (sql.js to DuckDB Columnar)', () => {
  it('correctly escapes CSV cell values', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell('Simple')).toBe('Simple');
    expect(escapeCsvCell('Hello, World')).toBe('"Hello, World"');
    expect(escapeCsvCell('She said "Yes"')).toBe('"She said ""Yes"""');
    expect(escapeCsvCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
  });

  it('parses a multi-table SQLite binary database and extracts tables with clean CSV streams', async () => {
    const SQL = await getSqlJs();
    const db = new SQL.Database();

    // Create realistic analytics schema: Orders & Customers
    db.run(`
      CREATE TABLE customers (
        customer_id INTEGER PRIMARY KEY,
        name TEXT,
        country TEXT
      );
    `);
    db.run(`
      INSERT INTO customers VALUES
        (1, 'Alice Smith', 'USA'),
        (2, 'Carlos Ruiz', 'España'),
        (3, 'Akira Tanaka', 'Japón');
    `);

    db.run(`
      CREATE TABLE orders (
        order_id INTEGER PRIMARY KEY,
        customer_id INTEGER,
        amount REAL,
        status TEXT
      );
    `);
    db.run(`
      INSERT INTO orders VALUES
        (101, 1, 250.75, 'Completed'),
        (102, 2, 89.90, 'Pending'),
        (103, 1, 410.00, 'Completed');
    `);

    const binaryData = db.export();
    db.close();

    const result = await parseSqliteDatabase(binaryData, 'ecommerce', 'ecommerce.db');

    expect(result.tables).toHaveLength(2);

    const customersTable = result.tables.find((t) => t.tableName.includes('customers'));
    expect(customersTable).toBeDefined();
    expect(customersTable?.rowCount).toBe(3);
    expect(customersTable?.columns).toEqual(['customer_id', 'name', 'country']);
    expect(customersTable?.csv).toContain('customer_id,name,country');
    expect(customersTable?.csv).toContain('1,Alice Smith,USA');
    expect(customersTable?.csv).toContain('2,Carlos Ruiz,España');

    const ordersTable = result.tables.find((t) => t.tableName.includes('orders'));
    expect(ordersTable).toBeDefined();
    expect(ordersTable?.rowCount).toBe(3);
    expect(ordersTable?.columns).toEqual(['order_id', 'customer_id', 'amount', 'status']);
    expect(ordersTable?.csv).toContain('101,1,250.75,Completed');
  });

  it('throws an informative error when SQLite database has no tables', async () => {
    const SQL = await getSqlJs();
    const db = new SQL.Database();
    const binaryData = db.export();
    db.close();

    await expect(parseSqliteDatabase(binaryData, 'empty_db', 'empty.db')).rejects.toThrow(
      'La base de datos SQLite "empty.db" no contiene tablas de usuario válidas.'
    );
  });
});
