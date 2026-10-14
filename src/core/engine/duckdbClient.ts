import * as duckdb from '@duckdb/duckdb-wasm';
import * as XLSX from 'xlsx';
import { DatasetMeta, JoinType, DataType, FilterExpression } from '../ast/types';
import { analyzeAndCleanSheet } from './dataInterpreter';
import { compileFilter } from '../compiler/sqlCompiler';

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
   * Introspects table schema dynamically and registers dataset metadata
   */
  public async introspectTable(tableName: string, displayName: string, description?: string): Promise<DatasetMeta> {
    const conn = await this.getConnection();
    const schemaResult = await conn.query(`DESCRIBE "${tableName.replace(/"/g, '""')}";`);
    const countResult = await conn.query(`SELECT COUNT(*) AS total FROM "${tableName.replace(/"/g, '""')}";`);
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
        colType.includes('REAL') ||
        colType.includes('HUGEINT')
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
      name: displayName,
      tableName,
      description: description || `${displayName} (${count.toLocaleString()} filas)`,
      rowCount: count,
      columns,
    };

    this.activeDatasets.set(tableName, meta);
    return meta;
  }

  /**
   * Loads a user file (Parquet, CSV, TSV, JSON, or Excel .xlsx/.xls) directly into DuckDB in-memory columnar storage.
   * For Excel files, analyzes the sheet with Tableau-style Data Interpreter, registering clean and raw virtual files.
   * Creates a physical base table ("_base") and an active view for zero-latency Data Source Filters and Data Prep.
   */
  public async loadUserFile(file: File): Promise<DatasetMeta> {
    const db = await this.getDB();
    const conn = await this.getConnection();

    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const baseName = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const tableName = baseName || 'dataset';

    // Handle Microsoft Excel (.xlsx, .xls) files
    if (extension === 'xlsx' || extension === 'xls') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

      const sheetNames = workbook.SheetNames || [];
      if (sheetNames.length === 0) {
        throw new Error(`El archivo Excel "${fileName}" no contiene hojas de cálculo con datos.`);
      }

      let primaryMeta: DatasetMeta | null = null;

      for (let i = 0; i < sheetNames.length; i++) {
        const sheetName = sheetNames[i];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;

        // Run Tableau-style Data Interpreter
        const interp = analyzeAndCleanSheet(worksheet);
        if (!interp.cleanCsv.trim() && sheetNames.length > 1) {
          continue; // skip empty secondary sheets
        }

        const cleanSheetName = sheetName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const sheetTableName =
          sheetNames.length === 1 && (cleanSheetName === 'sheet1' || cleanSheetName === 'hoja1' || cleanSheetName === '')
            ? tableName
            : `${tableName}_${cleanSheetName || `sheet${i + 1}`}`;

        // Register both raw and clean virtual CSV files
        const rawVirtualFile = `${sheetTableName}_raw.csv`;
        const cleanVirtualFile = `${sheetTableName}_clean.csv`;
        await db.registerFileText(rawVirtualFile, interp.rawCsv);
        await db.registerFileText(cleanVirtualFile, interp.cleanCsv);

        // If messy layout was detected, default to clean CSV; otherwise raw CSV
        const activeVirtualFile = interp.hasMessyLayout ? cleanVirtualFile : rawVirtualFile;

        await conn.query(`DROP VIEW IF EXISTS "${sheetTableName}";`);
        await conn.query(`DROP TABLE IF EXISTS "${sheetTableName}_base";`);
        await conn.query(`DROP TABLE IF EXISTS "${sheetTableName}";`);

        await conn.query(`CREATE TABLE "${sheetTableName}_base" AS SELECT * FROM read_csv_auto('${activeVirtualFile}');`);
        await conn.query(`CREATE OR REPLACE VIEW "${sheetTableName}" AS SELECT * FROM "${sheetTableName}_base";`);

        const displayName = sheetNames.length === 1 ? file.name : `${file.name} [${sheetName}]`;
        const sheetMeta = await this.introspectTable(
          sheetTableName,
          displayName,
          sheetNames.length === 1 ? undefined : `${file.name} - Hoja: ${sheetName}`
        );

        sheetMeta.isDataInterpreterAvailable = true;
        sheetMeta.isDataInterpreterEnabled = interp.hasMessyLayout;
        sheetMeta.dataInterpreterReport = interp.report;
        sheetMeta.dataSourceFilters = [];

        if (!primaryMeta) {
          primaryMeta = sheetMeta;
        }
      }

      if (!primaryMeta) {
        throw new Error(`No se pudieron extraer datos válidos del archivo Excel "${fileName}".`);
      }

      return primaryMeta;
    }

    // Register file handle inside DuckDB virtual filesystem for standard text/binary formats
    await db.registerFileHandle(fileName, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);

    await conn.query(`DROP VIEW IF EXISTS "${tableName}";`);
    await conn.query(`DROP TABLE IF EXISTS "${tableName}_base";`);
    await conn.query(`DROP TABLE IF EXISTS "${tableName}";`);

    // Determine reader function by extension
    if (extension === 'parquet' || fileName.endsWith('.parquet.snappy')) {
      await conn.query(`CREATE TABLE "${tableName}_base" AS SELECT * FROM read_parquet('${fileName}');`);
    } else if (extension === 'tsv') {
      await conn.query(`CREATE TABLE "${tableName}_base" AS SELECT * FROM read_csv_auto('${fileName}', delim='\\t');`);
    } else if (extension === 'json' || extension === 'ndjson') {
      await conn.query(`CREATE TABLE "${tableName}_base" AS SELECT * FROM read_json_auto('${fileName}');`);
    } else {
      // Default to auto-detecting CSV
      await conn.query(`CREATE TABLE "${tableName}_base" AS SELECT * FROM read_csv_auto('${fileName}');`);
    }

    await conn.query(`CREATE OR REPLACE VIEW "${tableName}" AS SELECT * FROM "${tableName}_base";`);

    const meta = await this.introspectTable(tableName, file.name);
    meta.isDataInterpreterAvailable = false;
    meta.isDataInterpreterEnabled = false;
    meta.dataSourceFilters = [];
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
   * Helper to preserve metadata flags across schema introspections
   */
  private copyDatasetFlags(source: DatasetMeta, target: DatasetMeta): void {
    target.isDataInterpreterAvailable = source.isDataInterpreterAvailable;
    target.isDataInterpreterEnabled = source.isDataInterpreterEnabled;
    target.dataInterpreterReport = source.dataInterpreterReport;
    target.dataSourceFilters = source.dataSourceFilters;

    const sourceColMap = new Map(source.columns.map((c) => [c.name, c]));
    for (const targetCol of target.columns) {
      const sourceCol = sourceColMap.get(targetCol.name);
      if (sourceCol?.hidden) {
        targetCol.hidden = true;
      }
    }
  }

  /**
   * Reapplies data source filters view over the base table
   */
  private async reapplyDataSourceFiltersView(tableName: string, filters: FilterExpression[]): Promise<void> {
    const conn = await this.getConnection();
    let whereSql = '1=1';
    if (filters.length > 0) {
      const parts = filters.map((f) => compileFilter(f)).filter(Boolean);
      if (parts.length > 0) {
        whereSql = parts.join(' AND ');
      }
    }
    await conn.query(
      `CREATE OR REPLACE VIEW "${tableName.replace(/"/g, '""')}" AS SELECT * FROM "${tableName.replace(/"/g, '""')}_base" WHERE ${whereSql};`
    );
  }

  /**
   * Toggles Tableau Data Interpreter on or off for an Excel dataset
   */
  public async setDataInterpreterEnabled(tableName: string, enabled: boolean): Promise<DatasetMeta> {
    const conn = await this.getConnection();
    const meta = this.activeDatasets.get(tableName);
    if (!meta) throw new Error(`Dataset no encontrado: ${tableName}`);

    const virtualFile = enabled ? `${tableName}_clean.csv` : `${tableName}_raw.csv`;
    await conn.query(`DROP VIEW IF EXISTS "${tableName}";`);
    await conn.query(`DROP TABLE IF EXISTS "${tableName}_base";`);
    await conn.query(`CREATE TABLE "${tableName}_base" AS SELECT * FROM read_csv_auto('${virtualFile}');`);

    await this.reapplyDataSourceFiltersView(tableName, meta.dataSourceFilters || []);

    const updatedMeta = await this.introspectTable(tableName, meta.name, meta.description);
    this.copyDatasetFlags(meta, updatedMeta);
    updatedMeta.isDataInterpreterEnabled = enabled;

    return updatedMeta;
  }

  /**
   * Applies root-level Data Source Filters in DuckDB-WASM
   */
  public async applyDataSourceFilters(tableName: string, filters: FilterExpression[]): Promise<DatasetMeta> {
    const meta = this.activeDatasets.get(tableName);
    if (!meta) throw new Error(`Dataset no encontrado: ${tableName}`);

    await this.reapplyDataSourceFiltersView(tableName, filters);

    const updatedMeta = await this.introspectTable(tableName, meta.name, meta.description);
    this.copyDatasetFlags(meta, updatedMeta);
    updatedMeta.dataSourceFilters = filters;

    return updatedMeta;
  }

  /**
   * Helper to ensure the physical base table exists for any prep operation
   */
  private async ensureBaseTable(conn: duckdb.AsyncDuckDBConnection, tableName: string): Promise<void> {
    const safeBaseTable = `${tableName}_base`.replace(/"/g, '""');
    const safeTable = tableName.replace(/"/g, '""');
    const checkBaseRes = await conn.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = '${safeBaseTable}';
    `);
    if (checkBaseRes.numRows === 0) {
      await conn.query(`CREATE TABLE "${safeBaseTable}" AS SELECT * FROM "${safeTable}";`);
      await conn.query(`CREATE OR REPLACE VIEW "${safeTable}" AS SELECT * FROM "${safeBaseTable}";`);
    }
  }

  /**
   * Generates unique column names for Tableau-style splits: [Field] - Split 1, [Field] - Split 2, etc.
   */
  private generateUniqueSplitNames(
    existingColumns: { name: string }[],
    baseColName: string,
    count: number
  ): string[] {
    const existing = new Set(existingColumns.map((c) => c.name.toLowerCase()));
    const results: string[] = [];
    for (let i = 1; i <= count; i++) {
      let candidate = `${baseColName} - Split ${i}`;
      if (!existing.has(candidate.toLowerCase())) {
        results.push(candidate);
        existing.add(candidate.toLowerCase());
      } else {
        let suffix = i + 1;
        while (existing.has(`${baseColName} - Split ${suffix}`.toLowerCase())) {
          suffix++;
        }
        const name = `${baseColName} - Split ${suffix}`;
        results.push(name);
        existing.add(name.toLowerCase());
      }
    }
    return results;
  }

  /**
   * Renames a column in the base table and updates views
   */
  public async renameColumn(tableName: string, oldName: string, newName: string): Promise<DatasetMeta> {
    const conn = await this.getConnection();
    const meta = this.activeDatasets.get(tableName);
    if (!meta) throw new Error(`Dataset no encontrado: ${tableName}`);

    await this.ensureBaseTable(conn, tableName);

    const safeBaseTable = `${tableName}_base`.replace(/"/g, '""');
    const safeOld = oldName.replace(/"/g, '""');
    const safeNew = newName.replace(/"/g, '""');

    await conn.query(`ALTER TABLE "${safeBaseTable}" RENAME COLUMN "${safeOld}" TO "${safeNew}";`);

    await this.reapplyDataSourceFiltersView(tableName, meta.dataSourceFilters || []);
    const updatedMeta = await this.introspectTable(tableName, meta.name, meta.description);
    this.copyDatasetFlags(meta, updatedMeta);

    return updatedMeta;
  }

  /**
   * Changes column data type (Cast) using safe multi-format TRY_CAST in DuckDB
   * Tableau Desktop emulation: bidirectional conversions between Number, String, Date and Boolean.
   */
  public async castColumn(tableName: string, columnName: string, newType: DataType): Promise<DatasetMeta> {
    const conn = await this.getConnection();
    const meta = this.activeDatasets.get(tableName);
    if (!meta) throw new Error(`Dataset no encontrado: ${tableName}`);

    await this.ensureBaseTable(conn, tableName);

    const safeBaseTable = `${tableName}_base`.replace(/"/g, '""');
    const safeCol = columnName.replace(/"/g, '""');

    let castExpr = `TRY_CAST("${safeCol}" AS VARCHAR)`;
    if (newType === 'number') {
      castExpr = `COALESCE(
        TRY_CAST("${safeCol}" AS DOUBLE),
        -- If it was a date or timestamp, extract the 4-digit year
        CASE
          WHEN TRY_CAST("${safeCol}" AS DATE) IS NOT NULL
            THEN CAST(EXTRACT(YEAR FROM TRY_CAST("${safeCol}" AS DATE)) AS DOUBLE)
          ELSE NULL
        END,
        -- Accounting format: (123.45) -> -123.45
        CASE
          WHEN TRIM(CAST("${safeCol}" AS VARCHAR)) LIKE '(%)'
            THEN -1.0 * TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(CAST("${safeCol}" AS VARCHAR)), '(', ''), ')', ''), '$', ''), '€', ''), '£', ''), ',', ''), ' ', '') AS DOUBLE)
          ELSE NULL
        END,
        -- Percentages: '45%' -> 45
        TRY_CAST(REPLACE(REPLACE(TRIM(CAST("${safeCol}" AS VARCHAR)), '%', ''), ' ', '') AS DOUBLE),
        -- Common currencies, thousand commas and spaces: '$ 1,234.50' -> 1234.5
        TRY_CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CAST("${safeCol}" AS VARCHAR), '$', ''), '€', ''), '£', ''), '¥', ''), ',', ''), ' ', '') AS DOUBLE),
        -- European notation: '1.234,56' -> 1234.56
        TRY_CAST(REPLACE(REPLACE(REPLACE(CAST("${safeCol}" AS VARCHAR), '.', ''), ',', '.'), ' ', '') AS DOUBLE),
        -- Extract numeric digits using regex
        TRY_CAST(REGEXP_EXTRACT(CAST("${safeCol}" AS VARCHAR), '[-+]?[0-9]+(?:\\.[0-9]+)?') AS DOUBLE)
      )`;
    } else if (newType === 'date') {
      castExpr = `COALESCE(
        TRY_CAST("${safeCol}" AS DATE),
        -- Number as 4-digit Year: 2024 -> 2024-01-01
        CASE
          WHEN TRY_CAST("${safeCol}" AS INTEGER) BETWEEN 1800 AND 2200
            THEN TRY_STRPTIME(CAST(CAST("${safeCol}" AS INTEGER) AS VARCHAR) || '-01-01', '%Y-%m-%d')::DATE
          ELSE NULL
        END,
        -- Number as Excel Serial Days: 45000 -> Excel Date
        CASE
          WHEN TRY_CAST("${safeCol}" AS INTEGER) BETWEEN 10000 AND 80000
            THEN DATE '1899-12-30' + (TRY_CAST("${safeCol}" AS INTEGER) * INTERVAL '1' DAY)
          ELSE NULL
        END,
        -- Number as Unix Epoch Seconds
        CASE
          WHEN TRY_CAST("${safeCol}" AS BIGINT) BETWEEN 100000000 AND 3000000000
            THEN TO_TIMESTAMP(TRY_CAST("${safeCol}" AS BIGINT))::DATE
          ELSE NULL
        END,
        -- Standard date and timestamp string patterns
        TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%Y-%m-%d')::DATE,
        TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%d/%m/%Y')::DATE,
        TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%m/%d/%Y')::DATE,
        TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%d-%m-%Y')::DATE,
        TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%Y/%m/%d')::DATE,
        TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%d/%m/%y')::DATE,
        TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%m/%d/%y')::DATE,
        TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%Y-%m-%d %H:%M:%S')::DATE,
        TRY_STRPTIME(CAST("${safeCol}" AS VARCHAR), '%d/%m/%Y %H:%M:%S')::DATE
      )`;
    } else if (newType === 'boolean') {
      castExpr = `COALESCE(
        TRY_CAST("${safeCol}" AS BOOLEAN),
        CASE
          WHEN LOWER(TRIM(CAST("${safeCol}" AS VARCHAR))) IN ('true', '1', 'si', 'sí', 'yes', 'verdadero', 't', 'y') THEN TRUE
          WHEN LOWER(TRIM(CAST("${safeCol}" AS VARCHAR))) IN ('false', '0', 'no', 'falso', 'f', 'n') THEN FALSE
          ELSE NULL
        END
      )`;
    } else if (newType === 'string') {
      castExpr = `CASE
        WHEN typeof("${safeCol}") IN ('BOOLEAN', 'BOOL')
          THEN CASE WHEN "${safeCol}" IS TRUE THEN 'true' WHEN "${safeCol}" IS FALSE THEN 'false' ELSE NULL END
        -- If it is a whole number (e.g. 2024.0 or 1001.0), remove trailing .0
        WHEN TRY_CAST("${safeCol}" AS DOUBLE) IS NOT NULL AND "${safeCol}" = FLOOR("${safeCol}") AND ABS("${safeCol}") < 9223372036854775807
          THEN CAST(CAST("${safeCol}" AS BIGINT) AS VARCHAR)
        ELSE CAST("${safeCol}" AS VARCHAR)
      END`;
    }

    // Preserve exact original column order in the table
    const colExprs = meta.columns.map((c) => {
      const sName = c.name.replace(/"/g, '""');
      if (c.name === columnName) {
        return `${castExpr} AS "${sName}"`;
      }
      return `"${sName}"`;
    });

    await conn.query(`
      CREATE OR REPLACE TABLE "${safeBaseTable}" AS
      SELECT ${colExprs.join(', ')}
      FROM "${safeBaseTable}";
    `);

    await this.reapplyDataSourceFiltersView(tableName, meta.dataSourceFilters || []);
    const updatedMeta = await this.introspectTable(tableName, meta.name, meta.description);
    this.copyDatasetFlags(meta, updatedMeta);

    return updatedMeta;
  }

  /**
   * Splits a column into separate columns using DuckDB SPLIT_PART / STR_SPLIT
   * Follows Tableau Desktop conventions: [Field] - Split 1, [Field] - Split 2, etc.
   * Supports 'first', 'last', and 'all' split modes.
   */
  public async splitColumn(
    tableName: string,
    columnName: string,
    delimiter: string = ' ',
    mode: 'first' | 'last' | 'all' = 'first',
    count: number = 2
  ): Promise<DatasetMeta> {
    const conn = await this.getConnection();
    const meta = this.activeDatasets.get(tableName);
    if (!meta) throw new Error(`Dataset no encontrado: ${tableName}`);

    await this.ensureBaseTable(conn, tableName);

    const safeBaseTable = `${tableName}_base`.replace(/"/g, '""');
    const safeCol = columnName.replace(/"/g, '""');
    const safeDelim = delimiter.replace(/'/g, "''");

    let totalParts = 2;
    if (mode === 'all') {
      try {
        const maxRes = await conn.query(`
          SELECT COALESCE(MAX(ARRAY_LENGTH(STR_SPLIT(CAST("${safeCol}" AS VARCHAR), '${safeDelim}'))), 2) AS max_p
          FROM "${safeBaseTable}";
        `);
        const p = Number(maxRes.toArray()[0]?.toJSON()?.max_p);
        if (Number.isFinite(p) && p > 1) {
          totalParts = Math.min(Math.max(p, 2), 10);
        }
      } catch {
        totalParts = 2;
      }
    } else {
      totalParts = Math.min(Math.max(count || 1, 1), 10);
    }

    const uniqueNames = this.generateUniqueSplitNames(meta.columns, columnName, totalParts);
    const splitExprs: string[] = [];

    if (mode === 'last') {
      // Last N parts: in DuckDB split_part with negative index counts from right (-1 is last part)
      for (let i = 0; i < totalParts; i++) {
        const negativeIdx = -(totalParts - i);
        const colAlias = uniqueNames[i].replace(/"/g, '""');
        splitExprs.push(
          `NULLIF(TRIM(SPLIT_PART(CAST("${safeCol}" AS VARCHAR), '${safeDelim}', ${negativeIdx})), '') AS "${colAlias}"`
        );
      }
    } else {
      // First N parts or All parts: 1-indexed from left
      for (let i = 0; i < totalParts; i++) {
        const partIdx = i + 1;
        const colAlias = uniqueNames[i].replace(/"/g, '""');
        splitExprs.push(
          `NULLIF(TRIM(SPLIT_PART(CAST("${safeCol}" AS VARCHAR), '${safeDelim}', ${partIdx})), '') AS "${colAlias}"`
        );
      }
    }

    await conn.query(`
      CREATE OR REPLACE TABLE "${safeBaseTable}" AS
      SELECT *,
        ${splitExprs.join(',\n        ')}
      FROM "${safeBaseTable}";
    `);

    await this.reapplyDataSourceFiltersView(tableName, meta.dataSourceFilters || []);
    const updatedMeta = await this.introspectTable(tableName, meta.name, meta.description);
    this.copyDatasetFlags(meta, updatedMeta);

    return updatedMeta;
  }

  /**
   * Cleans text column values (TRIM, UPPER, LOWER)
   * Safely casts to VARCHAR if necessary and preserves column order.
   */
  public async cleanColumn(
    tableName: string,
    columnName: string,
    cleanType: 'trim' | 'upper' | 'lower'
  ): Promise<DatasetMeta> {
    const conn = await this.getConnection();
    const meta = this.activeDatasets.get(tableName);
    if (!meta) throw new Error(`Dataset no encontrado: ${tableName}`);

    await this.ensureBaseTable(conn, tableName);

    const safeBaseTable = `${tableName}_base`.replace(/"/g, '""');
    const safeCol = columnName.replace(/"/g, '""');

    let sqlFunc = `TRIM(CAST("${safeCol}" AS VARCHAR))`;
    if (cleanType === 'upper') sqlFunc = `UPPER(CAST("${safeCol}" AS VARCHAR))`;
    else if (cleanType === 'lower') sqlFunc = `LOWER(CAST("${safeCol}" AS VARCHAR))`;

    const colExprs = meta.columns.map((c) => {
      const sName = c.name.replace(/"/g, '""');
      if (c.name === columnName) {
        return `${sqlFunc} AS "${sName}"`;
      }
      return `"${sName}"`;
    });

    await conn.query(`
      CREATE OR REPLACE TABLE "${safeBaseTable}" AS
      SELECT ${colExprs.join(', ')}
      FROM "${safeBaseTable}";
    `);

    await this.reapplyDataSourceFiltersView(tableName, meta.dataSourceFilters || []);
    const updatedMeta = await this.introspectTable(tableName, meta.name, meta.description);
    this.copyDatasetFlags(meta, updatedMeta);

    return updatedMeta;
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

    return await this.introspectTable(
      safeViewName,
      `${viewName} (${joinType} JOIN)`,
      `${joinType} JOIN entre ${leftTable} y ${rightTable}`
    );
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

    return await this.introspectTable(
      safeViewName,
      `${viewName} (UNION)`,
      `Unión apilada de ${tableNames.join(', ')}`
    );
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
