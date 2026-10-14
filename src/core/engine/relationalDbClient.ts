import { escapeCsvCell } from './sqliteIngestion';

export interface DbConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  filePath?: string;
}

export interface DbQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  csv: string;
  rowCount: number;
}

/**
 * Formats relational rows array to standard RFC 4180 CSV string
 */
export function formatRowsToCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.map(escapeCsvCell).join(',');
  const lines = rows.map((r) => columns.map((c) => escapeCsvCell(r[c])).join(','));
  return [header, ...lines].join('\n');
}

/**
 * Tests connection to a relational database (PostgreSQL, MySQL, SQLite) and fetches table list
 */
export async function testRelationalDb(
  dbType: 'postgres' | 'mysql' | 'sqlite',
  config: DbConnectionConfig
): Promise<{ success: boolean; tables: string[]; error?: string }> {
  try {
    const res = await fetch('/api/connect-relational-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        dbType,
        config,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { success: false, tables: [], error: errJson.error || 'Error de conexión con el servidor.' };
    }

    const data = await res.json();
    return { success: Boolean(data.success), tables: data.tables || [], error: data.error };
  } catch (err) {
    return {
      success: false,
      tables: [],
      error: err instanceof Error ? err.message : 'No se pudo contactar al conector de base de datos.',
    };
  }
}

/**
 * Imports a table or custom SQL query from a relational database and serializes to CSV
 */
export async function queryRelationalDb(
  dbType: 'postgres' | 'mysql' | 'sqlite',
  config: DbConnectionConfig,
  target: { table?: string; query?: string }
): Promise<DbQueryResult> {
  const res = await fetch('/api/connect-relational-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'query',
      dbType,
      config,
      table: target.table,
      query: target.query,
    }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errJson.error || 'Error al ejecutar consulta en la base de datos.');
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Fallo en la importación de datos relacionales.');
  }

  const columns: string[] = data.columns || [];
  const rows: Record<string, unknown>[] = data.rows || [];
  const csv = formatRowsToCsv(columns, rows);

  return {
    columns,
    rows,
    csv,
    rowCount: rows.length,
  };
}
