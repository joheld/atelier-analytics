import initSqlJs, { SqlJsStatic } from 'sql.js';

let sqlJsInstance: SqlJsStatic | null = null;

export interface SqliteTableData {
  tableName: string;
  displayName: string;
  csv: string;
  rowCount: number;
  columns: string[];
}

export interface SqliteIngestionResult {
  tables: SqliteTableData[];
}

/**
 * Escapes values into standard CSV string format
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Lazily initializes sql.js WebAssembly runtime
 */
export async function getSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsInstance) return sqlJsInstance;

  sqlJsInstance = await initSqlJs({
    locateFile: (file) => {
      if (typeof window !== 'undefined') {
        return `/${file}`;
      }
      if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
        return `${process.cwd()}/node_modules/sql.js/dist/${file}`;
      }
      return file;
    },
  });

  return sqlJsInstance;
}

/**
 * Parses an SQLite database binary file (.db, .sqlite, .sqlite3)
 * Extracts all user tables and serializes them into clean CSV streams for DuckDB.
 */
export async function parseSqliteDatabase(
  buffer: ArrayBuffer | Uint8Array,
  baseTableName: string,
  fileName: string
): Promise<SqliteIngestionResult> {
  const SQL = await getSqlJs();
  const u8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const db = new SQL.Database(u8Array);

  try {
    // List all user tables (exclude internal sqlite_ or system tables)
    const tablesQuery = db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
        AND name NOT LIKE 'sqlite_%' 
        AND name NOT LIKE 'android_%'
      ORDER BY name;
    `);

    if (!tablesQuery.length || !tablesQuery[0].values.length) {
      throw new Error(`La base de datos SQLite "${fileName}" no contiene tablas de usuario válidas.`);
    }

    const tableNames = tablesQuery[0].values.map((v) => String(v[0]));
    const resultTables: SqliteTableData[] = [];

    for (const rawName of tableNames) {
      const escapedRaw = rawName.replace(/"/g, '""');
      const dataRes = db.exec(`SELECT * FROM "${escapedRaw}";`);

      if (!dataRes.length) {
        // Table exists but is completely empty or has no schema
        continue;
      }

      const columns = dataRes[0].columns;
      const values = dataRes[0].values;
      const cleanName = rawName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'table';

      const duckdbTableName =
        tableNames.length === 1
          ? baseTableName
          : `${baseTableName}_${cleanName}`;

      const headerRow = columns.map(escapeCsvCell).join(',');
      const dataRows = values.map((row) => row.map(escapeCsvCell).join(','));
      const fullCsv = [headerRow, ...dataRows].join('\n');

      const displayName =
        tableNames.length === 1
          ? fileName
          : `${fileName} [${rawName}]`;

      resultTables.push({
        tableName: duckdbTableName,
        displayName,
        csv: fullCsv,
        rowCount: values.length,
        columns,
      });
    }

    if (resultTables.length === 0) {
      throw new Error(`No se pudieron extraer datos de las tablas en la base de datos SQLite "${fileName}".`);
    }

    return { tables: resultTables };
  } finally {
    db.close();
  }
}
