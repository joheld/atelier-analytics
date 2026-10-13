import React, { useState, useEffect } from 'react';
import {
  X,
  GitMerge,
  Layers,
  Database,
  Check,
  AlertCircle,
  Play,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';
import { DatasetMeta, JoinType } from '../../core/ast/types';
import { duckdbEngine } from '../../core/engine/duckdbClient';

interface DataModelModalProps {
  isOpen: boolean;
  availableDatasets: DatasetMeta[];
  onClose: () => void;
  onCreateJoin: (config: {
    name: string;
    leftTableName: string;
    rightTableName: string;
    joinType: JoinType;
    leftKey: string;
    rightKey: string;
  }) => Promise<DatasetMeta>;
  onCreateUnion: (config: {
    name: string;
    tableNames: string[];
  }) => Promise<DatasetMeta>;
}

export const DataModelModal: React.FC<DataModelModalProps> = ({
  isOpen,
  availableDatasets,
  onClose,
  onCreateJoin,
  onCreateUnion,
}) => {
  const [mode, setMode] = useState<'join' | 'union'>('join');
  const [leftTable, setLeftTable] = useState<string>('');
  const [rightTable, setRightTable] = useState<string>('');
  const [joinType, setJoinType] = useState<JoinType>('LEFT');
  const [leftKey, setLeftKey] = useState<string>('');
  const [rightKey, setRightKey] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [selectedUnionTables, setSelectedUnionTables] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live preview state
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
  } | null>(null);

  // Initialize selected tables when datasets change
  useEffect(() => {
    if (availableDatasets.length >= 2) {
      if (!leftTable || !availableDatasets.some((d) => d.tableName === leftTable)) {
        setLeftTable(availableDatasets[0].tableName);
      }
      if (!rightTable || !availableDatasets.some((d) => d.tableName === rightTable)) {
        setRightTable(availableDatasets[1].tableName);
      }
      if (selectedUnionTables.length === 0) {
        setSelectedUnionTables([availableDatasets[0].tableName, availableDatasets[1].tableName]);
      }
    } else if (availableDatasets.length === 1) {
      setLeftTable(availableDatasets[0].tableName);
    }
  }, [availableDatasets]);

  const leftMeta = availableDatasets.find((d) => d.tableName === leftTable);
  const rightMeta = availableDatasets.find((d) => d.tableName === rightTable);

  // Auto-suggest join keys with common names
  useEffect(() => {
    if (leftMeta && rightMeta) {
      const rightColNames = new Set(rightMeta.columns.map((c) => c.name.toLowerCase()));
      // Look for identical column name (e.g. id, cliente_id, customer_id, codigo)
      const matching = leftMeta.columns.find((c) => rightColNames.has(c.name.toLowerCase()));
      if (matching) {
        setLeftKey(matching.name);
        const rightMatching = rightMeta.columns.find((c) => c.name.toLowerCase() === matching.name.toLowerCase());
        if (rightMatching) setRightKey(rightMatching.name);
      } else {
        if (leftMeta.columns.length > 0 && !leftKey) setLeftKey(leftMeta.columns[0].name);
        if (rightMeta.columns.length > 0 && !rightKey) setRightKey(rightMeta.columns[0].name);
      }

      const defaultName = `${leftTable}_con_${rightTable}`;
      if (!modelName || modelName.includes('_con_') || modelName.includes('_union')) {
        setModelName(defaultName);
      }
    }
  }, [leftTable, rightTable, leftMeta, rightMeta]);

  // Update default name for union mode
  useEffect(() => {
    if (mode === 'union') {
      setModelName('datos_consolidados_union');
    } else if (leftTable && rightTable) {
      setModelName(`${leftTable}_con_${rightTable}`);
    }
    setPreviewResult(null);
    setError(null);
  }, [mode]);

  if (!isOpen) return null;

  const handlePreview = async () => {
    try {
      setIsPreviewLoading(true);
      setError(null);

      if (mode === 'join') {
        if (!leftTable || !rightTable || !leftKey || !rightKey) {
          setError('Selecciona ambas tablas y sus columnas de enlace.');
          return;
        }

        // Generate query
        const sql = `
          SELECT l.*, r.*
          FROM "${leftTable}" l
          ${joinType} JOIN "${rightTable}" r
            ON l."${leftKey}" = r."${rightKey}"
        `;
        const res = await duckdbEngine.previewQuery(sql, 5);
        setPreviewResult(res);
      } else {
        if (selectedUnionTables.length < 2) {
          setError('Selecciona al menos dos tablas para apilar.');
          return;
        }
        const selectParts = selectedUnionTables.map((t) => `SELECT * FROM "${t}"`);
        const sql = selectParts.join(' UNION ALL BY NAME ');
        const res = await duckdbEngine.previewQuery(sql, 5);
        setPreviewResult(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'join') {
        if (!leftTable || !rightTable || !leftKey || !rightKey) {
          throw new Error('Debes seleccionar las dos tablas y las columnas clave para la relación.');
        }
        await onCreateJoin({
          name: modelName.trim() || `${leftTable}_${rightTable}_join`,
          leftTableName: leftTable,
          rightTableName: rightTable,
          joinType,
          leftKey,
          rightKey,
        });
      } else {
        if (selectedUnionTables.length < 2) {
          throw new Error('Debes seleccionar al menos dos tablas para apilar.');
        }
        await onCreateUnion({
          name: modelName.trim() || 'datos_consolidados_union',
          tableNames: selectedUnionTables,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUnionTable = (tableName: string) => {
    setSelectedUnionTables((prev) =>
      prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-stone-200/90 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/80 px-6 py-4 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <GitMerge className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-editorial text-base font-bold text-stone-900 dark:text-stone-100">
                Modelado de Datos Relacional
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Combina múltiples tablas en DuckDB-WASM mediante relaciones (JOIN) o apilado vertical (UNION)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-stone-200/80 bg-stone-100/50 px-6 pt-2 dark:border-stone-800 dark:bg-stone-950/20">
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              mode === 'join'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-300'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>Relación / JOIN (Cruzar por clave)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('union')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              mode === 'union'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-300'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Apilar Tablas / UNION (Mismo esquema)</span>
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {availableDatasets.length < 2 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Se necesitan al menos 2 archivos cargados</p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  Actualmente tienes {availableDatasets.length} archivo en memoria. Carga un segundo archivo en la barra lateral para poder relacionarlos o unirlos.
                </p>
              </div>
            </div>
          )}

          {mode === 'join' ? (
            <div className="space-y-4">
              {/* Visual Model Canvas */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/40">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 font-mono mb-3">
                  Configuración de Enlace Relacional
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  {/* Left Table & Key */}
                  <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900 shadow-2xs">
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Tabla Izquierda
                    </label>
                    <select
                      value={leftTable}
                      onChange={(e) => setLeftTable(e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    >
                      {availableDatasets.map((ds) => (
                        <option key={ds.tableName} value={ds.tableName}>
                          {ds.name} ({ds.rowCount.toLocaleString()} f.)
                        </option>
                      ))}
                    </select>

                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mt-2.5 mb-1">
                      Columna Clave (Izquierda)
                    </label>
                    <select
                      value={leftKey}
                      onChange={(e) => setLeftKey(e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    >
                      {leftMeta?.columns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.dataType})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Join Type Selector */}
                  <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 font-mono">
                      Tipo de JOIN
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 w-full">
                      {(['LEFT', 'INNER', 'FULL', 'RIGHT'] as JoinType[]).map((jt) => (
                        <button
                          key={jt}
                          type="button"
                          onClick={() => setJoinType(jt)}
                          className={`rounded-md border px-2 py-1 text-2xs font-mono font-bold transition-all ${
                            joinType === jt
                              ? 'border-sky-600 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300 shadow-2xs'
                              : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400'
                          }`}
                        >
                          {jt}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-center text-stone-500 dark:text-stone-400 mt-1">
                      {joinType === 'LEFT' && 'Conserva todas las filas de la tabla izquierda.'}
                      {joinType === 'INNER' && 'Solo filas con coincidencia en ambas tablas.'}
                      {joinType === 'FULL' && 'Todas las filas de ambas tablas con nulos.'}
                      {joinType === 'RIGHT' && 'Conserva todas las filas de la tabla derecha.'}
                    </span>
                  </div>

                  {/* Right Table & Key */}
                  <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900 shadow-2xs">
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      Tabla Derecha
                    </label>
                    <select
                      value={rightTable}
                      onChange={(e) => setRightTable(e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    >
                      {availableDatasets.map((ds) => (
                        <option key={ds.tableName} value={ds.tableName} disabled={ds.tableName === leftTable}>
                          {ds.name} ({ds.rowCount.toLocaleString()} f.)
                        </option>
                      ))}
                    </select>

                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mt-2.5 mb-1">
                      Columna Clave (Derecha)
                    </label>
                    <select
                      value={rightKey}
                      onChange={(e) => setRightKey(e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    >
                      {rightMeta?.columns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.dataType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* UNION Mode */
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/40">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 font-mono mb-2">
                  Selecciona las tablas a apilar verticalmente (UNION ALL BY NAME)
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                  DuckDB emparejará automáticamente columnas con el mismo nombre y rellenará con NULL si una columna solo existe en una tabla.
                </p>

                <div className="space-y-2">
                  {availableDatasets.map((ds) => {
                    const isChecked = selectedUnionTables.includes(ds.tableName);
                    return (
                      <label
                        key={ds.tableName}
                        onClick={() => toggleUnionTable(ds.tableName)}
                        className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all ${
                          isChecked
                            ? 'border-sky-500 bg-sky-50/50 dark:border-sky-600 dark:bg-sky-950/30'
                            : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded-sm border-stone-300 text-sky-600 focus:ring-sky-500"
                          />
                          <div>
                            <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                              {ds.name}
                            </span>
                            <span className="block text-[11px] font-mono text-stone-400">
                              Tabla: "{ds.tableName}" • {ds.rowCount.toLocaleString()} filas • {ds.columns.length} columnas
                            </span>
                          </div>
                        </div>
                        <Database className="h-4 w-4 text-stone-400" />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Model Name Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Nombre de la Nueva Fuente Unificada
            </label>
            <div className="relative">
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="ej: pedidos_con_clientes"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-mono text-stone-800 focus:border-sky-500 focus:outline-hidden dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                required
              />
              <Sparkles className="absolute right-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Validación de Esquema
              </span>
              <button
                type="button"
                onClick={handlePreview}
                disabled={isPreviewLoading || availableDatasets.length < 2}
                className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 disabled:opacity-50 cursor-pointer"
              >
                <Play className="h-3 w-3" />
                <span>{isPreviewLoading ? 'Ejecutando...' : 'Previsualizar 5 filas'}</span>
              </button>
            </div>

            {previewResult && (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-800 dark:bg-stone-950 overflow-x-auto text-2xs font-mono">
                <div className="text-[11px] font-sans font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Esquema validado exitosamente ({previewResult.columns.length} columnas resultantes):</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800">
                      {previewResult.columns.slice(0, 7).map((col) => (
                        <th key={col} className="p-1 font-bold text-stone-600 dark:text-stone-400 truncate max-w-[120px]">
                          {col}
                        </th>
                      ))}
                      {previewResult.columns.length > 7 && (
                        <th className="p-1 text-stone-400">+{previewResult.columns.length - 7} más</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-stone-200/50 dark:border-stone-800/50">
                        {previewResult.columns.slice(0, 7).map((col) => (
                          <td key={col} className="p-1 truncate max-w-[120px] text-stone-700 dark:text-stone-300">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200/80 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableDatasets.length < 2}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Creando modelo...</span>
              ) : (
                <>
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>
                    {mode === 'join' ? 'Crear Relación y Activar' : 'Crear Unión y Activar'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
