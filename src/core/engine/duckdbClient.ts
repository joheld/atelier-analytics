import * as duckdb from '@duckdb/duckdb-wasm';
import { DatasetMeta, JoinType } from '../ast/types';

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
   * Starts with a pristine, empty analytical memory space (zero synthetic seeds).
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
   * Loads a user file (Parquet, CSV, TSV, or JSON) directly into DuckDB in-memory columnar storage.
   * Leverages browser FileReader protocol and native DuckDB readers.
   */
  public async loadUserFile(file: File): Promise<DatasetMeta> {
    const db = await this.getDB();
    const conn = await this.getConnection();

    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const baseName = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const tableName = baseName || 'dataset';

    // Register file handle inside DuckDB virtual filesystem
    await db.registerFileHandle(fileName, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);

    // Drop table if reloaded
    await conn.query(`DROP TABLE IF EXISTS "${tableName}";`);

    // Determine reader function by extension
    if (extension === 'parquet' || fileName.endsWith('.parquet.snappy')) {
      await conn.query(`CREATE TABLE "${tableName}" AS SELECT * FROM read_parquet('${fileName}');`);
    } else if (extension === 'tsv') {
      await conn.query(`CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${fileName}', delim='\\t');`);
    } else if (extension === 'json' || extension === 'ndjson') {
      await conn.query(`CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${fileName}');`);
    } else {
      // Default to auto-detecting CSV
      await conn.query(`CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${fileName}');`);
    }

    // Introspect table schema dynamically
    const schemaResult = await conn.query(`DESCRIBE "${tableName}";`);
    const countResult = await conn.query(`SELECT COUNT(*) AS total FROM "${tableName}";`);
    const count = Number(countResult.toArray()[0]?.toJSON()?.total ?? 0);

    const columns: DatasetMeta['columns'] = [];
    for (const row of schemaResult.toArray()) {
      const col = row.toJSON();
      const colName = String(col.column_name);
      const colType = String(col.column_type).toUpperCase();

      let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string';
      let role: 'dimension' | 'measure' = 'dimension';

      if (
        colType.includes('INT') ||
        colType.includes('DOUBLE') ||
        colType.includes('FLOAT') ||
        colType.includes('DECIMAL') ||
        colType.includes('NUMERIC') ||
        colType.includes('REAL')
      ) {
        dataType = 'number';
        role = 'measure';
      } else if (colType.includes('DATE') || colType.includes('TIMESTAMP') || colType.includes('TIME')) {
        dataType = 'date';
        role = 'dimension';
      } else if (colType.includes('BOOL')) {
        dataType = 'boolean';
        role = 'dimension';
      } else {
        dataType = 'string';
        role = 'dimension';
      }

      columns.push({ name: colName, dataType, role });
    }

    const meta: DatasetMeta = {
      id: tableName,
      name: file.name,
      tableName,
      description: `${file.name} (${count.toLocaleString()} filas)`,
      rowCount: count,
      columns,
    };

    this.activeDatasets.set(tableName, meta);
    return meta;
  }

  public getAvailableDatasets(): DatasetMeta[] {
    return Array.from(this.activeDatasets.values());
  }

  public getDataset(id: string): DatasetMeta | undefined {
    return this.activeDatasets.get(id);
  }

  public removeDataset(id: string): void {
    this.activeDatasets.delete(id);
  }

  /**
   * Creates a relational view joining two tables in DuckDB-WASM and introspects its schema.
   * Handles column name collision gracefully by aliasing duplicate columns from the right table.
   */
  public async createRelationalJoinView(
    viewName: string,
    leftTable: string,
    rightTable: string,
    joinType: JoinType,
    leftKey: string,
    rightKey: string
  ): Promise<DatasetMeta> {
    const conn = await this.getConnection();

    // Inspect columns of both tables to avoid collisions
    const leftSchemaRes = await conn.query(`DESCRIBE "${leftTable.replace(/"/g, '""')}";`);
    const rightSchemaRes = await conn.query(`DESCRIBE "${rightTable.replace(/"/g, '""')}";`);

    const leftCols = leftSchemaRes.toArray().map((r) => String(r.toJSON().column_name));
    const rightCols = rightSchemaRes.toArray().map((r) => String(r.toJSON().column_name));

    const leftColSet = new Set(leftCols);

    // Build SELECT expressions with column disambiguation
    const leftSelects = leftCols.map((c) => `l."${c.replace(/"/g, '""')}"`);
    const rightSelects = rightCols.map((c) => {
      if (leftColSet.has(c)) {
        return `r."${c.replace(/"/g, '""')}" AS "${rightTable}_${c.replace(/"/g, '""')}"`;
      }
      return `r."${c.replace(/"/g, '""')}"`;
    });

    const allSelects = [...leftSelects, ...rightSelects].join(', ');
    const safeViewName = viewName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    const sql = `
      CREATE OR REPLACE VIEW "${safeViewName}" AS
      SELECT ${allSelects}
      FROM "${leftTable.replace(/"/g, '""')}" l
      ${joinType} JOIN "${rightTable.replace(/"/g, '""')}" r
        ON l."${leftKey.replace(/"/g, '""')}" = r."${rightKey.replace(/"/g, '""')}";
    `;

    await conn.query(sql);

    // Introspect resulting view
    const viewSchema = await conn.query(`DESCRIBE "${safeViewName}";`);
    const countResult = await conn.query(`SELECT COUNT(*) AS total FROM "${safeViewName}";`);
    const count = Number(countResult.toArray()[0]?.toJSON()?.total ?? 0);

    const columns: DatasetMeta['columns'] = [];
    for (const row of viewSchema.toArray()) {
      const col = row.toJSON();
      const colName = String(col.column_name);
      const colType = String(col.column_type).toUpperCase();

      let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string';
      let role: 'dimension' | 'measure' = 'dimension';

      if (
        colType.includes('INT') ||
        colType.includes('DOUBLE') ||
        colType.includes('FLOAT') ||
        colType.includes('DECIMAL') ||
        colType.includes('NUMERIC') ||
        colType.includes('REAL')
      ) {
        dataType = 'number';
        role = 'measure';
      } else if (colType.includes('DATE') || colType.includes('TIMESTAMP') || colType.includes('TIME')) {
        dataType = 'date';
        role = 'dimension';
      } else if (colType.includes('BOOL')) {
        dataType = 'boolean';
        role = 'dimension';
      } else {
        dataType = 'string';
        role = 'dimension';
      }

      columns.push({ name: colName, dataType, role });
    }

    const meta: DatasetMeta = {
      id: safeViewName,
      name: `${viewName} (${joinType} JOIN)`,
      tableName: safeViewName,
      description: `${joinType} JOIN entre ${leftTable} y ${rightTable} (${count.toLocaleString()} filas)`,
      rowCount: count,
      columns,
    };

    this.activeDatasets.set(safeViewName, meta);
    return meta;
  }

  /**
   * Creates a UNION ALL view stacking multiple tables by column name in DuckDB-WASM
   */
  public async createUnionView(
    viewName: string,
    tableNames: string[]
  ): Promise<DatasetMeta> {
    const conn = await this.getConnection();
    if (tableNames.length < 2) {
      throw new Error('Se requieren al menos dos tablas para una unión.');
    }

    const safeViewName = viewName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const selectParts = tableNames.map(
      (t) => `SELECT * FROM "${t.replace(/"/g, '""')}"`
    );
    const sql = `
      CREATE OR REPLACE VIEW "${safeViewName}" AS
      ${selectParts.join(' UNION ALL BY NAME ')};
    `;

    await conn.query(sql);

    // Introspect resulting view
    const viewSchema = await conn.query(`DESCRIBE "${safeViewName}";`);
    const countResult = await conn.query(`SELECT COUNT(*) AS total FROM "${safeViewName}";`);
    const count = Number(countResult.toArray()[0]?.toJSON()?.total ?? 0);

    const columns: DatasetMeta['columns'] = [];
    for (const row of viewSchema.toArray()) {
      const col = row.toJSON();
      const colName = String(col.column_name);
      const colType = String(col.column_type).toUpperCase();

      let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string';
      let role: 'dimension' | 'measure' = 'dimension';

      if (
        colType.includes('INT') ||
        colType.includes('DOUBLE') ||
        colType.includes('FLOAT') ||
        colType.includes('DECIMAL') ||
        colType.includes('NUMERIC') ||
        colType.includes('REAL')
      ) {
        dataType = 'number';
        role = 'measure';
      } else if (colType.includes('DATE') || colType.includes('TIMESTAMP') || colType.includes('TIME')) {
        dataType = 'date';
        role = 'dimension';
      } else if (colType.includes('BOOL')) {
        dataType = 'boolean';
        role = 'dimension';
      } else {
        dataType = 'string';
        role = 'dimension';
      }

      columns.push({ name: colName, dataType, role });
    }

    const meta: DatasetMeta = {
      id: safeViewName,
      name: `${viewName} (UNION)`,
      tableName: safeViewName,
      description: `Unión apilada de ${tableNames.join(', ')} (${count.toLocaleString()} filas)`,
      rowCount: count,
      columns,
    };

    this.activeDatasets.set(safeViewName, meta);
    return meta;
  }

  /**
   * Previews query results with a strict LIMIT for interactive validation
   */
  public async previewQuery(sql: string, limit = 5): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
    const conn = await this.getConnection();
    const cleanSql = sql.trim().replace(/;$/, '');
    const result = await conn.query(`${cleanSql} LIMIT ${limit};`);
    const rows = result.toArray().map((r) => r.toJSON());
    const columns = result.schema.fields.map((f) => f.name);
    return { columns, rows };
  }

  /**
   * Retrieves unique discrete values of a column for filter selector
   */
  public async getDistinctColumnValues(tableName: string, columnName: string, limit = 100): Promise<string[]> {
    const conn = await this.getConnection();
    const safeCol = `"${columnName.replace(/"/g, '""')}"`;
    const safeTable = `"${tableName.replace(/"/g, '""')}"`;
    const result = await conn.query(`
      SELECT DISTINCT ${safeCol} AS val
      FROM ${safeTable}
      WHERE ${safeCol} IS NOT NULL
      ORDER BY 1
      LIMIT ${limit};
    `);
    return result.toArray().map((r) => String(r.toJSON().val));
  }

  /**
   * Retrieves min and max numeric values of a column for range filter
   */
  public async getColumnMinMax(tableName: string, columnName: string): Promise<{ min: number; max: number }> {
    const conn = await this.getConnection();
    const safeCol = `"${columnName.replace(/"/g, '""')}"`;
    const safeTable = `"${tableName.replace(/"/g, '""')}"`;
    const result = await conn.query(`
      SELECT MIN(${safeCol}) AS min_val, MAX(${safeCol}) AS max_val
      FROM ${safeTable}
      WHERE ${safeCol} IS NOT NULL;
    `);
    const row = result.toArray()[0]?.toJSON();
    return {
      min: Number(row?.min_val ?? 0),
      max: Number(row?.max_val ?? 100),
    };
  }

  /**
   * Validates a calculated field formula expression against DuckDB and automatically
   * infers the analytical role (measure vs dimension) and data type (number, string, date, boolean).
   */
  public async validateCalculatedFormula(
    tableName: string,
    formula: string
  ): Promise<{
    valid: boolean;
    error?: string;
    rawType?: string;
    inferredDataType?: 'string' | 'number' | 'date' | 'boolean';
    inferredRole?: 'dimension' | 'measure';
  }> {
    try {
      const conn = await this.getConnection();
      const safeTable = `"${tableName.replace(/"/g, '""')}"`;
      const testQuery = `SELECT typeof((${formula})) AS col_type, (${formula}) AS sample_val FROM ${safeTable} LIMIT 1;`;
      const result = await conn.query(testQuery);
      const row = result.toArray()[0]?.toJSON();
      const rawType = String(row?.col_type || '').toUpperCase();

      let inferredDataType: 'string' | 'number' | 'date' | 'boolean' = 'string';
      let inferredRole: 'dimension' | 'measure' = 'dimension';

      if (
        rawType.includes('INT') ||
        rawType.includes('DOUBLE') ||
        rawType.includes('FLOAT') ||
        rawType.includes('DECIMAL') ||
        rawType.includes('NUMERIC') ||
        rawType.includes('REAL') ||
        rawType.includes('HUGEINT')
      ) {
        inferredDataType = 'number';
        inferredRole = 'measure';
      } else if (
        rawType.includes('DATE') ||
        rawType.includes('TIMESTAMP') ||
        rawType.includes('TIME')
      ) {
        inferredDataType = 'date';
        inferredRole = 'dimension';
      } else if (rawType.includes('BOOL')) {
        inferredDataType = 'boolean';
        inferredRole = 'dimension';
      } else {
        inferredDataType = 'string';
        inferredRole = 'dimension';
      }

      return {
        valid: true,
        rawType,
        inferredDataType,
        inferredRole,
      };
    } catch (err: unknown) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const duckdbEngine = new DuckDBManager();
