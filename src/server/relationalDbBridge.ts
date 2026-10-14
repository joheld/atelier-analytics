import { Plugin } from 'vite';
import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';

/**
 * Vite plugin providing local backend bridge for Relational Database connections (PostgreSQL, MySQL)
 * Exposes endpoint POST /api/connect-relational-db for testing connections and streaming query results.
 */
export function relationalDbPlugin(): Plugin {
  return {
    name: 'atelier-relational-db-bridge',
    configureServer(server) {
      server.middlewares.use('/api/connect-relational-db', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const payload = JSON.parse(body);
            const { action, dbType, config, table, query } = payload;

            // 1. PostgreSQL Connection Handler
            if (dbType === 'postgres') {
              const client = new PgClient({
                host: config.host || 'localhost',
                port: Number(config.port) || 5432,
                database: config.database,
                user: config.user,
                password: config.password,
                ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
                connectionTimeoutMillis: 8000,
              });

              await client.connect();

              try {
                if (action === 'test') {
                  const tablesRes = await client.query(`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                      AND table_type = 'BASE TABLE'
                    ORDER BY table_name;
                  `);
                  const tables = tablesRes.rows.map((r: any) => String(r.table_name));
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, tables }));
                  return;
                }

                if (action === 'query') {
                  const sqlQuery = query || `SELECT * FROM "${String(table).replace(/"/g, '""')}" LIMIT 50000;`;
                  const queryRes = await client.query(sqlQuery);
                  const columns = queryRes.fields.map((f: any) => f.name);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, columns, rows: queryRes.rows }));
                  return;
                }
              } finally {
                await client.end().catch(() => {});
              }
            }

            // 2. MySQL Connection Handler
            if (dbType === 'mysql') {
              const conn = await mysql.createConnection({
                host: config.host || 'localhost',
                port: Number(config.port) || 3306,
                database: config.database,
                user: config.user,
                password: config.password,
                ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
                connectTimeout: 8000,
              });

              try {
                if (action === 'test') {
                  const [rows] = await conn.query('SHOW TABLES;');
                  const tables = (rows as any[]).map((r) => String(Object.values(r)[0]));
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, tables }));
                  return;
                }

                if (action === 'query') {
                  const sqlQuery = query || `SELECT * FROM \`${String(table).replace(/`/g, '``')}\` LIMIT 50000;`;
                  const [rows, fields] = await conn.query(sqlQuery);
                  const columns = (fields as any[]).map((f) => f.name);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, columns, rows }));
                  return;
                }
              } finally {
                await conn.end().catch(() => {});
              }
            }

            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: `Tipo de base de datos no soportado: ${dbType}` }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message || 'Error del servidor de base de datos' }));
          }
        });
      });
    },
  };
}
