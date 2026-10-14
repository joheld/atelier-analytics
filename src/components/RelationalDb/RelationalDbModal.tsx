import React, { useState } from 'react';
import {
  Database,
  Server,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Play,
  Table as TableIcon,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { DbConnectionConfig, testRelationalDb } from '../../core/engine/relationalDbClient';

interface RelationalDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    dbType: 'postgres' | 'mysql' | 'sqlite',
    config: DbConnectionConfig,
    target: { table?: string; query?: string }
  ) => Promise<void>;
}

export const RelationalDbModal: React.FC<RelationalDbModalProps> = ({ isOpen, onClose, onImport }) => {
  const [dbType, setDbType] = useState<'postgres' | 'mysql'>('postgres');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState<string>('5432');
  const [database, setDatabase] = useState('');
  const [user, setUser] = useState('postgres');
  const [password, setPassword] = useState('');
  const [ssl, setSsl] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [selectionMode, setSelectionMode] = useState<'table' | 'custom_sql'>('table');
  const [customSql, setCustomSql] = useState('SELECT * FROM public.orders LIMIT 1000;');
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    message?: string;
  }>({ tested: false, success: false });
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleDbTypeChange = (type: 'postgres' | 'mysql') => {
    setDbType(type);
    setPort(type === 'postgres' ? '5432' : '3306');
    setUser(type === 'postgres' ? 'postgres' : 'root');
    setTables([]);
    setSelectedTable('');
    setConnectionStatus({ tested: false, success: false });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus({ tested: false, success: false });
    try {
      const config: DbConnectionConfig = {
        host: host.trim() || 'localhost',
        port: parseInt(port, 10) || (dbType === 'postgres' ? 5432 : 3306),
        database: database.trim(),
        user: user.trim(),
        password,
        ssl,
      };

      const res = await testRelationalDb(dbType, config);
      if (res.success && res.tables.length > 0) {
        setTables(res.tables);
        setSelectedTable(res.tables[0]);
        setConnectionStatus({
          tested: true,
          success: true,
          message: `Conexión exitosa. Se detectaron ${res.tables.length} tablas disponibles.`,
        });
      } else if (res.success) {
        setTables([]);
        setConnectionStatus({
          tested: true,
          success: true,
          message: 'Conexión exitosa, pero no se encontraron tablas públicas en la base de datos.',
        });
      } else {
        setTables([]);
        setConnectionStatus({
          tested: true,
          success: false,
          message: res.error || 'Error de autenticación o conexión.',
        });
      }
    } catch (err: unknown) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: err instanceof Error ? err.message : 'Error desconocido al conectar',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    try {
      const config: DbConnectionConfig = {
        host: host.trim() || 'localhost',
        port: parseInt(port, 10) || (dbType === 'postgres' ? 5432 : 3306),
        database: database.trim(),
        user: user.trim(),
        password,
        ssl,
      };

      await onImport(dbType, config, {
        table: selectionMode === 'table' ? selectedTable : undefined,
        query: selectionMode === 'custom_sql' ? customSql.trim() : undefined,
      });

      onClose();
    } catch (err) {
      console.error('[RelationalDbModal] Error al importar:', err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/80 px-6 py-4 dark:border-stone-800 dark:bg-stone-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-editorial text-base font-bold text-stone-900 dark:text-stone-100">
                Conectar a Servidor Relacional
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Importa tablas o consultas SQL directamente a DuckDB-WASM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Database Engine Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 px-6 dark:border-stone-800 dark:bg-stone-900">
          <button
            type="button"
            onClick={() => handleDbTypeChange('postgres')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              dbType === 'postgres'
                ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Server className="h-4 w-4 text-sky-600" />
            <span>PostgreSQL</span>
          </button>
          <button
            type="button"
            onClick={() => handleDbTypeChange('mysql')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              dbType === 'mysql'
                ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Database className="h-4 w-4 text-amber-600" />
            <span>MySQL</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleImportSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Connection Parameters Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Servidor (Host)
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost o db.empresa.com"
                required
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Puerto
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder={dbType === 'postgres' ? '5432' : '3306'}
                required
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Nombre de la Base de Datos
            </label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder={dbType === 'postgres' ? 'postgres o mi_base' : 'mi_base'}
              required
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder={dbType === 'postgres' ? 'postgres' : 'root'}
                required
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* SSL Checkbox & Test Button */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={ssl}
                onChange={(e) => setSsl(e.target.checked)}
                className="rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
              />
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Requiere conexión segura SSL / TLS</span>
            </label>

            <button
              type="button"
              disabled={isTesting || !database}
              onClick={handleTestConnection}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
                  <span>Probar y Listar Tablas</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback Banner */}
          {connectionStatus.tested && (
            <div
              className={`rounded-lg p-3 text-xs flex items-start gap-2.5 ${
                connectionStatus.success
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
              }`}
            >
              {connectionStatus.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <div className="flex-1 font-mono">{connectionStatus.message}</div>
            </div>
          )}

          {/* Data Selection Section */}
          {connectionStatus.success && (
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">
                Datos a Importar en DuckDB
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-stone-800 dark:text-stone-200 cursor-pointer">
                  <input
                    type="radio"
                    name="selectionMode"
                    checked={selectionMode === 'table'}
                    onChange={() => setSelectionMode('table')}
                    className="text-indigo-600"
                  />
                  <TableIcon className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Importar tabla completa:</span>
                </label>

                {selectionMode === 'table' && (
                  <div className="relative ml-6">
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 font-mono appearance-none pr-8 cursor-pointer focus:border-indigo-500 focus:outline-none"
                    >
                      {tables.map((tbl) => (
                        <option key={tbl} value={tbl}>
                          {tbl}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 pointer-events-none text-stone-400" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-stone-800 dark:text-stone-200 cursor-pointer">
                  <input
                    type="radio"
                    name="selectionMode"
                    checked={selectionMode === 'custom_sql'}
                    onChange={() => setSelectionMode('custom_sql')}
                    className="text-indigo-600"
                  />
                  <span>Consulta SQL personalizada (Custom SQL):</span>
                </label>

                {selectionMode === 'custom_sql' && (
                  <div className="ml-6">
                    <textarea
                      rows={3}
                      value={customSql}
                      onChange={(e) => setCustomSql(e.target.value)}
                      placeholder="SELECT col1, SUM(col2) FROM tabla GROUP BY col1 LIMIT 10000;"
                      className="w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isImporting || !connectionStatus.success}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isImporting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{isImporting ? 'Importando a DuckDB...' : 'Conectar e Importar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
