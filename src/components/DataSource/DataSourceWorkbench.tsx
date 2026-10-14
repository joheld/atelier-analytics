import React, { useState, useEffect } from 'react';
import {
  Database,
  Sparkles,
  Filter,
  Plus,
  X,
  Edit2,
  Check,
  ChevronDown,
  Split,
  Eye,
  EyeOff,
  GitMerge,
  ArrowRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DatasetMeta, DataType, FilterExpression } from '../../core/ast/types';
import { duckdbEngine } from '../../core/engine/duckdbClient';

interface DataSourceWorkbenchProps {
  currentDataset: DatasetMeta | null;
  availableDatasets: DatasetMeta[];
  onToggleDataInterpreter: () => Promise<void>;
  onRemoveDataSourceFilter: (filterId: string) => Promise<void>;
  onOpenFilterModal: (filter: FilterExpression) => void;
  onRenameColumn: (oldName: string, newName: string) => Promise<void>;
  onChangeColumnType: (columnName: string, newType: DataType) => Promise<void>;
  onSplitColumn: (columnName: string, delimiter?: string) => Promise<void>;
  onCleanColumn: (columnName: string, cleanType: 'trim' | 'upper' | 'lower') => Promise<void>;
  onToggleHideColumn: (columnName: string) => void;
  onOpenDataModelModal: () => void;
  onGoToWorksheet: () => void;
}

export const DataSourceWorkbench: React.FC<DataSourceWorkbenchProps> = ({
  currentDataset,
  availableDatasets,
  onToggleDataInterpreter,
  onRemoveDataSourceFilter,
  onOpenFilterModal,
  onRenameColumn,
  onChangeColumnType,
  onSplitColumn,
  onCleanColumn,
  onToggleHideColumn,
  onOpenDataModelModal,
  onGoToWorksheet,
}) => {
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [editingColumnName, setEditingColumnName] = useState<string | null>(null);
  const [newColNameInput, setNewColNameInput] = useState<string>('');
  const [activeMenuCol, setActiveMenuCol] = useState<string | null>(null);
  const [showHiddenColumns, setShowHiddenColumns] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isAddingFilter, setIsAddingFilter] = useState<boolean>(false);

  // Load preview data from DuckDB-WASM
  useEffect(() => {
    let isCancelled = false;
    const fetchPreview = async () => {
      if (!currentDataset) return;
      setIsLoadingPreview(true);
      try {
        const result = await duckdbEngine.previewQuery(
          `SELECT * FROM "${currentDataset.tableName.replace(/"/g, '""')}"`,
          50
        );
        if (!isCancelled) {
          setPreviewRows(result.rows);
        }
      } catch (err) {
        console.warn('[DataSourceWorkbench] Error loading table preview:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingPreview(false);
        }
      }
    };

    void fetchPreview();
    return () => {
      isCancelled = true;
    };
  }, [currentDataset?.tableName, currentDataset?.rowCount, currentDataset?.isDataInterpreterEnabled]);

  if (!currentDataset) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-stone-50 dark:bg-stone-950">
        <Database className="h-12 w-12 text-stone-400 mb-3" />
        <h2 className="text-lg font-bold font-editorial text-stone-800 dark:text-stone-200">
          No hay fuente de datos conectada
        </h2>
        <p className="text-xs text-stone-500 max-w-sm mt-1">
          Carga un archivo Excel, CSV, Parquet o JSON para inspeccionar y preparar tus datos.
        </p>
      </div>
    );
  }

  const visibleColumns = currentDataset.columns.filter((c) => showHiddenColumns || !c.hidden);
  const dataSourceFilters = currentDataset.dataSourceFilters || [];

  const handleStartRename = (colName: string) => {
    setEditingColumnName(colName);
    setNewColNameInput(colName);
    setActiveMenuCol(null);
  };

  const handleCommitRename = async () => {
    if (editingColumnName && newColNameInput.trim() && newColNameInput.trim() !== editingColumnName) {
      await onRenameColumn(editingColumnName, newColNameInput.trim());
    }
    setEditingColumnName(null);
  };

  const handleCreateNewFilter = (colName: string) => {
    const col = currentDataset.columns.find((c) => c.name === colName);
    if (!col) return;

    const newFilter: FilterExpression = {
      id: `ds_filter_${col.name}_${Date.now()}`,
      columnName: col.name,
      role: col.role,
      dataType: col.dataType,
      operator: col.role === 'measure' ? 'range' : 'in',
      values: [],
    };

    setIsAddingFilter(false);
    onOpenFilterModal(newFilter);
  };

  const handleCustomSplit = async (colName: string) => {
    const delimiter = window.prompt(`Ingresa el delimitador para dividir la columna "${colName}":`, ',');
    if (delimiter !== null) {
      await onSplitColumn(colName, delimiter || ' ');
    }
    setActiveMenuCol(null);
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100 font-sans">
      {/* 1. TOP HEADER & METADATA BAR */}
      <header className="flex flex-wrap items-center justify-between border-b border-stone-200/90 bg-white px-5 py-3 dark:border-stone-800 dark:bg-stone-900 shadow-2xs gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-editorial text-base font-bold text-stone-900 dark:text-stone-100">
                {currentDataset.name}
              </h1>
              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                Tabla: {currentDataset.tableName}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {currentDataset.rowCount.toLocaleString()} filas • {currentDataset.columns.length} campos • In-Memory DuckDB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {availableDatasets.length >= 2 && (
            <button
              type="button"
              onClick={onOpenDataModelModal}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 transition-all cursor-pointer"
            >
              <GitMerge className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Modelar Datos (JOIN / UNION)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGoToWorksheet}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 focus:outline-none transition-all cursor-pointer"
          >
            <span>Ir a la Hoja de Trabajo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* 2. TABLEAU DATA INTERPRETER & DATA SOURCE FILTERS PANEL */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 pb-3">
        {/* Card: Tableau Data Interpreter */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs dark:border-stone-800 dark:bg-stone-900 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 font-mono">
                  Intérprete de datos (Tableau Data Interpreter)
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(currentDataset.isDataInterpreterEnabled)}
                  onChange={() => void onToggleDataInterpreter()}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-stone-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Detecta y estructura automáticamente hojas de cálculo con títulos, celdas combinadas, notas superiores y
              filas de subtotales o totales generales al pie para evitar duplicación en los cálculos.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-600 dark:text-stone-400">
              {currentDataset.isDataInterpreterEnabled ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ {currentDataset.dataInterpreterReport || 'Estructura tabular limpia activada.'}
                </span>
              ) : (
                <span className="text-stone-400">Modo datos sin procesar (Raw).</span>
              )}
            </span>
          </div>
        </div>

        {/* Card: Data Source Filters (Filtros desde la Fuente) */}
        <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs dark:border-stone-800 dark:bg-stone-900 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 font-mono">
                  Filtros de la fuente de datos ({dataSourceFilters.length})
                </h3>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAddingFilter(!isAddingFilter)}
                  className="flex items-center gap-1 rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Añadir Filtro</span>
                </button>

                {isAddingFilter && (
                  <div className="absolute right-0 top-full mt-1 w-56 max-h-60 overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-800 z-50">
                    <div className="px-2 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase">
                      Seleccionar campo para filtrar
                    </div>
                    {currentDataset.columns.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleCreateNewFilter(c.name)}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700 text-left"
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] font-mono text-stone-400">{c.dataType}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Los filtros de fuente se aplican en la raíz de DuckDB antes de que los datos lleguen a ninguna hoja o
              dashboard, reduciendo el volumen en memoria y garantizando consistencia global.
            </p>
          </div>

          {/* Active Data Source Filter Chips */}
          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-1.5 items-center">
            {dataSourceFilters.length === 0 ? (
              <span className="text-[11px] text-stone-400 italic">Sin filtros de fuente activos (100% de filas disponibles).</span>
            ) : (
              dataSourceFilters.map((f) => (
                <div
                  key={f.id}
                  className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
                >
                  <button
                    type="button"
                    onClick={() => onOpenFilterModal(f)}
                    className="hover:underline cursor-pointer"
                    title="Editar filtro"
                  >
                    {f.columnName}: {f.operator === 'range' ? `${f.rangeMin ?? 0} - ${f.rangeMax ?? 100}` : `${f.values?.length || 0} sel.`}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRemoveDataSourceFilter(f.id)}
                    className="text-sky-500 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-200 ml-1"
                    title="Eliminar filtro de fuente"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. DATA PREPARATION GRID & COLUMN TOOLS */}
      <section className="flex flex-1 flex-col mx-5 mb-5 rounded-xl border border-stone-200/90 bg-white overflow-hidden dark:border-stone-800 dark:bg-stone-900 shadow-2xs">
        {/* Grid Toolbar */}
        <div className="flex flex-wrap items-center justify-between border-b border-stone-200/90 bg-stone-50/80 px-4 py-2 dark:border-stone-800 dark:bg-stone-900/80 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-stone-700 dark:text-stone-300 font-mono uppercase tracking-wider">
              Cuadrícula de Prelimpieza y Perfilado de Datos
            </h2>
            <span className="text-[11px] text-stone-400">
              (Muestra interactiva de las primeras {previewRows.length} filas)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Filter in Preview */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar en vista previa..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="rounded-md border border-stone-200 bg-white pl-8 pr-2.5 py-1 text-xs text-stone-800 dark:border-stone-700 dark:bg-stone-850 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Toggle Hidden Columns */}
            <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHiddenColumns}
                onChange={(e) => setShowHiddenColumns(e.target.checked)}
                className="rounded border-stone-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Mostrar campos ocultos</span>
            </label>
          </div>
        </div>

        {/* Scrollable Data Prep Table */}
        <div className="flex-1 overflow-auto">
          {isLoadingPreview ? (
            <div className="flex h-64 items-center justify-center gap-2 text-xs text-stone-500">
              <RefreshCw className="h-4 w-4 animate-spin text-sky-600" />
              <span>Cargando datos vectorizados desde DuckDB...</span>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800 text-left border-collapse">
              <thead className="sticky top-0 bg-stone-100/95 dark:bg-stone-850/95 backdrop-blur-xs z-10">
                <tr>
                  <th className="w-12 px-3 py-2 text-[10px] font-mono text-stone-400 uppercase text-center border-r border-stone-200 dark:border-stone-800">
                    #
                  </th>
                  {visibleColumns.map((col) => {
                    const isEditing = editingColumnName === col.name;
                    const isMenuOpen = activeMenuCol === col.name;

                    return (
                      <th
                        key={col.name}
                        className={`min-w-[160px] max-w-[240px] px-3 py-2 border-r border-stone-200 dark:border-stone-800 transition-colors ${
                          col.hidden ? 'bg-stone-200/50 dark:bg-stone-800/40 opacity-70' : ''
                        }`}
                      >
                        {/* Header Controls: Type Selector & Column Menu */}
                        <div className="flex items-center justify-between gap-1 pb-1">
                          {/* Data Type Selector Dropdown */}
                          <div className="relative group">
                            <select
                              value={col.dataType}
                              onChange={(e) => void onChangeColumnType(col.name, e.target.value as DataType)}
                              className="appearance-none rounded bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-700 shadow-2xs border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 cursor-pointer pr-4 hover:border-sky-400 focus:outline-none"
                              title="Cambiar tipo de dato en DuckDB"
                            >
                              <option value="string">Abc Cadena</option>
                              <option value="number"># Número</option>
                              <option value="date">📅 Fecha</option>
                              <option value="boolean">T/F Booleano</option>
                            </select>
                            <ChevronDown className="absolute right-1 top-1.5 h-2.5 w-2.5 pointer-events-none text-stone-400" />
                          </div>

                          {/* Column Action Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuCol(isMenuOpen ? null : col.name)}
                              className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 dark:hover:text-stone-200 dark:hover:bg-stone-700 cursor-pointer"
                              title="Herramientas de preparación del campo"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-800 z-50 text-left">
                                <button
                                  type="button"
                                  onClick={() => handleStartRename(col.name)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  <Edit2 className="h-3 w-3 text-stone-400" />
                                  <span>Renombrar campo</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void onSplitColumn(col.name, ' ');
                                    setActiveMenuCol(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  <Split className="h-3 w-3 text-stone-400" />
                                  <span>Dividir por espacio</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleCustomSplit(col.name)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  <Split className="h-3 w-3 text-stone-400" />
                                  <span>División personalizada...</span>
                                </button>

                                <div className="border-t border-stone-100 dark:border-stone-700 my-1"></div>

                                <div className="px-3 py-0.5 text-[9px] font-mono text-stone-400 uppercase font-bold">
                                  Limpieza de texto
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void onCleanColumn(col.name, 'trim');
                                    setActiveMenuCol(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  <span>Recortar espacios (TRIM)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void onCleanColumn(col.name, 'upper');
                                    setActiveMenuCol(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  <span>Convertir a MAYÚSCULAS</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void onCleanColumn(col.name, 'lower');
                                    setActiveMenuCol(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  <span>Convertir a minúsculas</span>
                                </button>

                                <div className="border-t border-stone-100 dark:border-stone-700 my-1"></div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    onToggleHideColumn(col.name);
                                    setActiveMenuCol(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  {col.hidden ? (
                                    <>
                                      <Eye className="h-3 w-3 text-stone-400" />
                                      <span>Mostrar campo</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-3 w-3 text-stone-400" />
                                      <span>Ocultar campo</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Column Name (Double click or Edit) */}
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={newColNameInput}
                              onChange={(e) => setNewColNameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleCommitRename();
                                if (e.key === 'Escape') setEditingColumnName(null);
                              }}
                              autoFocus
                              className="w-full rounded border border-sky-400 bg-white px-1.5 py-0.5 text-xs text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                            />
                            <button
                              type="button"
                              onClick={() => void handleCommitRename()}
                              className="text-emerald-600 dark:text-emerald-400 p-0.5"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => handleStartRename(col.name)}
                            className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate cursor-text"
                            title="Doble clic para renombrar campo"
                          >
                            {col.name}
                            {col.hidden && (
                              <span className="ml-1 text-[10px] font-normal text-stone-400 italic">
                                (oculto)
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-mono text-xs">
                {previewRows
                  .filter((row) => {
                    if (!searchFilter.trim()) return true;
                    return Object.values(row).some((val) =>
                      String(val ?? '')
                        .toLowerCase()
                        .includes(searchFilter.toLowerCase())
                    );
                  })
                  .map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="px-3 py-1.5 text-[10px] text-stone-400 text-center border-r border-stone-200 dark:border-stone-800">
                        {idx + 1}
                      </td>
                      {visibleColumns.map((col) => {
                        const cellVal = row[col.name];
                        const displayVal = cellVal === null || cellVal === undefined ? 'null' : String(cellVal);
                        const isNull = cellVal === null || cellVal === undefined;

                        return (
                          <td
                            key={col.name}
                            className={`px-3 py-1.5 truncate border-r border-stone-100 dark:border-stone-800/40 ${
                              col.role === 'measure' ? 'text-right' : 'text-left'
                            } ${isNull ? 'text-stone-400 italic text-[11px]' : 'text-stone-700 dark:text-stone-300'}`}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
