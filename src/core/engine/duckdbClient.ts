import * as duckdb from '@duckdb/duckdb-wasm';
import { DatasetMeta } from '../ast/types';

export interface QueryExecutionResult {
  sql: string;
  arrowTable: any;
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  columnNames: string[];
}

class DuckDBManager {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private isInitializing = false;
  private initPromise: Promise<duckdb.AsyncDuckDB> | null = null;
  private activeDatasets: Map<string, DatasetMeta> = new Map();

  public get initializing(): boolean {
    return this.isInitializing;
  }

  /**
   * Initializes the DuckDB-WASM engine using jsDelivr CDN bundles
   * with automatic fallback between multi-threaded and single-threaded WebAssembly.
   */
  public async getDB(): Promise<duckdb.AsyncDuckDB> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.isInitializing = true;
      try {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

        const worker = await duckdb.createWorker(bundle.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        const db = new duckdb.AsyncDuckDB(logger, worker);

        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        this.db = db;
        this.conn = await db.connect();

        // Seed default high-performance datasets
        await this.seedInitialDatasets();

        return db;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  public async getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
    await this.getDB();
    if (!this.conn) {
      this.conn = await this.db!.connect();
    }
    return this.conn;
  }

  /**
   * Generates and seeds datasets in DuckDB memory:
   * 1. Superstore Sales (Standard retail analytics with categorical hierarchy & temporal metrics)
   * 2. High-Frequency Telemetry (100,000 columnar rows for real-time stress testing)
   */
  private async seedInitialDatasets(): Promise<void> {
    if (!this.conn) return;

    // 1. Create Superstore Sales Table
    await this.conn.query(`
      CREATE TABLE superstore (
        order_id VARCHAR,
        order_date DATE,
        region VARCHAR,
        category VARCHAR,
        sub_category VARCHAR,
        segment VARCHAR,
        sales DOUBLE,
        profit DOUBLE,
        quantity INTEGER,
        discount DOUBLE
      );
    `);

    // Insert rich sample rows for Superstore
    await this.conn.query(`
      INSERT INTO superstore VALUES
        ('CA-2024-1001', '2024-01-15', 'West', 'Technology', 'Phones', 'Consumer', 1250.00, 320.50, 2, 0.0),
        ('CA-2024-1002', '2024-01-18', 'East', 'Technology', 'Accessories', 'Corporate', 450.00, 110.00, 3, 0.1),
        ('CA-2024-1003', '2024-02-04', 'Central', 'Furniture', 'Chairs', 'Home Office', 890.00, -45.00, 4, 0.2),
        ('CA-2024-1004', '2024-02-12', 'South', 'Office Supplies', 'Storage', 'Consumer', 320.00, 85.00, 5, 0.0),
        ('CA-2024-1005', '2024-02-28', 'West', 'Furniture', 'Tables', 'Corporate', 1400.00, -180.00, 1, 0.3),
        ('CA-2024-1006', '2024-03-05', 'East', 'Office Supplies', 'Paper', 'Consumer', 120.00, 48.00, 6, 0.0),
        ('CA-2024-1007', '2024-03-19', 'West', 'Technology', 'Machines', 'Corporate', 2950.00, 650.00, 2, 0.1),
        ('CA-2024-1008', '2024-04-02', 'Central', 'Office Supplies', 'Binders', 'Consumer', 210.00, 70.00, 7, 0.1),
        ('CA-2024-1009', '2024-04-14', 'South', 'Technology', 'Phones', 'Home Office', 980.00, 210.00, 2, 0.0),
        ('CA-2024-1010', '2024-05-01', 'West', 'Office Supplies', 'Art', 'Consumer', 75.00, 25.00, 4, 0.0),
        ('CA-2024-1011', '2024-05-18', 'East', 'Furniture', 'Bookcases', 'Corporate', 1150.00, 140.00, 3, 0.15),
        ('CA-2024-1012', '2024-06-03', 'Central', 'Technology', 'Accessories', 'Consumer', 380.00, 95.00, 4, 0.0),
        ('CA-2024-1013', '2024-06-22', 'South', 'Furniture', 'Furnishings', 'Consumer', 240.00, 55.00, 3, 0.1),
        ('CA-2024-1014', '2024-07-09', 'West', 'Technology', 'Copiers', 'Corporate', 4200.00, 1250.00, 3, 0.1),
        ('CA-2024-1015', '2024-07-25', 'East', 'Office Supplies', 'Appliances', 'Home Office', 640.00, 160.00, 2, 0.0),
        ('CA-2024-1016', '2024-08-11', 'Central', 'Furniture', 'Chairs', 'Consumer', 920.00, 115.00, 3, 0.1),
        ('CA-2024-1017', '2024-08-30', 'South', 'Office Supplies', 'Paper', 'Corporate', 180.00, 65.00, 5, 0.0),
        ('CA-2024-1018', '2024-09-14', 'West', 'Office Supplies', 'Storage', 'Consumer', 510.00, 120.00, 4, 0.05),
        ('CA-2024-1019', '2024-09-28', 'East', 'Technology', 'Phones', 'Corporate', 1650.00, 420.00, 3, 0.0),
        ('CA-2024-1020', '2024-10-10', 'Central', 'Technology', 'Accessories', 'Home Office', 290.00, 72.00, 2, 0.0);
    `);

    // Expand Superstore with 5,000 synthetic permutations to test instant responsive charting
    await this.conn.query(`
      INSERT INTO superstore
      SELECT 
        'SYN-' || (1000 + i) AS order_id,
        CAST('2024-01-01' AS DATE) + CAST((i % 360) AS INTEGER) AS order_date,
        CASE (i % 4) WHEN 0 THEN 'West' WHEN 1 THEN 'East' WHEN 2 THEN 'Central' ELSE 'South' END AS region,
        CASE (i % 3) WHEN 0 THEN 'Technology' WHEN 1 THEN 'Furniture' ELSE 'Office Supplies' END AS category,
        CASE (i % 8) 
          WHEN 0 THEN 'Phones' 
          WHEN 1 THEN 'Chairs' 
          WHEN 2 THEN 'Storage' 
          WHEN 3 THEN 'Accessories' 
          WHEN 4 THEN 'Tables' 
          WHEN 5 THEN 'Paper' 
          WHEN 6 THEN 'Binders' 
          ELSE 'Machines' 
        END AS sub_category,
        CASE (i % 3) WHEN 0 THEN 'Consumer' WHEN 1 THEN 'Corporate' ELSE 'Home Office' END AS segment,
        ROUND(50.0 + (i * 1.37) % 2500, 2) AS sales,
        ROUND(-100.0 + (i * 0.91) % 600, 2) AS profit,
        CAST(1 + (i % 9) AS INTEGER) AS quantity,
        ROUND((i % 5) * 0.05, 2) AS discount
      FROM range(1, 5000) t(i);
    `);

    // 2. Create 100,000-Row High-Frequency Analytical Telemetry Table
    await this.conn.query(`
      CREATE TABLE telemetry_100k AS
      SELECT 
        i AS event_id,
        CAST('2025-01-01 00:00:00' AS TIMESTAMP) + INTERVAL (i * 30) SECOND AS timestamp,
        'Cluster-' || (1 + (i % 12)) AS cluster,
        CASE (i % 5) 
          WHEN 0 THEN 'Sensor Alpha' 
          WHEN 1 THEN 'Sensor Beta' 
          WHEN 2 THEN 'Sensor Gamma' 
          WHEN 3 THEN 'Sensor Delta' 
          ELSE 'Sensor Epsilon' 
        END AS sensor_type,
        CASE (i % 4) 
          WHEN 0 THEN 'US-East' 
          WHEN 1 THEN 'US-West' 
          WHEN 2 THEN 'EU-Central' 
          ELSE 'AP-South' 
        END AS datacenter,
        ROUND(20.0 + ((i * 17) % 6500) / 100.0, 2) AS temperature,
        ROUND(40.0 + ((i * 23) % 5500) / 100.0, 2) AS humidity,
        ROUND(0.5 + ((i * 31) % 9500) / 100.0, 3) AS vibration,
        ROUND(100.0 + ((i * 7) % 18000) / 100.0, 2) AS power_draw
      FROM range(1, 100001) t(i);
    `);

    // Register metadata
    this.activeDatasets.set('superstore', {
      id: 'superstore',
      name: 'Superstore Sales & Profits',
      tableName: 'superstore',
      description: 'Retail analytics benchmark dataset (5,020 rows)',
      rowCount: 5020,
      columns: [
        { name: 'order_id', dataType: 'string', role: 'dimension' },
        { name: 'order_date', dataType: 'date', role: 'dimension' },
        { name: 'region', dataType: 'string', role: 'dimension' },
        { name: 'category', dataType: 'string', role: 'dimension' },
        { name: 'sub_category', dataType: 'string', role: 'dimension' },
        { name: 'segment', dataType: 'string', role: 'dimension' },
        { name: 'sales', dataType: 'number', role: 'measure' },
        { name: 'profit', dataType: 'number', role: 'measure' },
        { name: 'quantity', dataType: 'number', role: 'measure' },
        { name: 'discount', dataType: 'number', role: 'measure' },
      ],
    });

    this.activeDatasets.set('telemetry_100k', {
      id: 'telemetry_100k',
      name: 'High-Frequency Telemetry (100k Rows)',
      tableName: 'telemetry_100k',
      description: 'Real-time multi-sensor telemetry benchmark (100,000 rows)',
      rowCount: 100000,
      columns: [
        { name: 'event_id', dataType: 'number', role: 'dimension' },
        { name: 'cluster', dataType: 'string', role: 'dimension' },
        { name: 'sensor_type', dataType: 'string', role: 'dimension' },
        { name: 'datacenter', dataType: 'string', role: 'dimension' },
        { name: 'temperature', dataType: 'number', role: 'measure' },
        { name: 'humidity', dataType: 'number', role: 'measure' },
        { name: 'vibration', dataType: 'number', role: 'measure' },
        { name: 'power_draw', dataType: 'number', role: 'measure' },
      ],
    });
  }

  /**
   * Executes a vectorized SQL query against DuckDB-WASM, returns Arrow Table and raw JS records
   */
  public async executeQuery(sql: string): Promise<QueryExecutionResult> {
    const conn = await this.getConnection();
    const startTime = performance.now();

    const arrowResult = await conn.query(sql);
    const durationMs = performance.now() - startTime;

    // Convert Arrow table to JavaScript objects for rendering
    const rows = arrowResult.toArray().map((r) => r.toJSON());
    const columnNames = arrowResult.schema.fields.map((f) => f.name);

    return {
      sql,
      arrowTable: arrowResult,
      rows,
      rowCount: arrowResult.numRows,
      durationMs,
      columnNames,
    };
  }

  /**
   * Loads a custom user CSV file into memory as a new DuckDB table
   */
  public async loadCSVFile(name: string, file: File): Promise<DatasetMeta> {
    const db = await this.getDB();
    const conn = await this.getConnection();

    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    await db.registerFileHandle(file.name, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);

    await conn.query(`
      CREATE TABLE ${sanitizedName} AS 
      SELECT * FROM read_csv_auto('${file.name}');
    `);

    // Introspect table schema
    const schemaResult = await conn.query(`DESCRIBE ${sanitizedName};`);
    const countResult = await conn.query(`SELECT COUNT(*) AS total FROM ${sanitizedName};`);
    const count = Number(countResult.toArray()[0]?.toJSON()?.total ?? 0);

    const columns: DatasetMeta['columns'] = [];
    for (const row of schemaResult.toArray()) {
      const col = row.toJSON();
      const colName = String(col.column_name);
      const colType = String(col.column_type).toUpperCase();

      let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string';
      let role: 'dimension' | 'measure' = 'dimension';

      if (colType.includes('INT') || colType.includes('DOUBLE') || colType.includes('FLOAT') || colType.includes('DECIMAL')) {
        dataType = 'number';
        role = 'measure';
      } else if (colType.includes('DATE') || colType.includes('TIMESTAMP')) {
        dataType = 'date';
        role = 'dimension';
      } else if (colType.includes('BOOL')) {
        dataType = 'boolean';
        role = 'dimension';
      }

      columns.push({ name: colName, dataType, role });
    }

    const meta: DatasetMeta = {
      id: sanitizedName,
      name: file.name,
      tableName: sanitizedName,
      description: `Uploaded CSV file (${count.toLocaleString()} rows)`,
      rowCount: count,
      columns,
    };

    this.activeDatasets.set(sanitizedName, meta);
    return meta;
  }

  public getAvailableDatasets(): DatasetMeta[] {
    return Array.from(this.activeDatasets.values());
  }

  public getDataset(id: string): DatasetMeta | undefined {
    return this.activeDatasets.get(id);
  }
}

export const duckdbEngine = new DuckDBManager();
