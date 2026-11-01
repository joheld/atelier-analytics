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
  ArrowRightLeft,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DatasetMeta, DataType, FieldRole, FilterExpression } from '../../core/ast/types';
import { duckdbEngine } from '../../core/engine/duckdbClient';

interface DataSourceWorkbenchProps {
  currentDataset: DatasetMeta | null;
  availableDatasets: DatasetMeta[];
  onToggleDataInterpreter: () => Promise<void>;
  onRemoveDataSourceFilter: (filterId: string) => Promise<void>;
  onOpenFilterModal: (filter: FilterExpression) => void;
  onRenameColumn: (oldName: string, newName: string) => Promise<void>;
  onChangeColumnType: (columnName: string, newType: DataType) => Promise<void>;
  onChangeColumnRole?: (columnName: string, newRole: FieldRole) => Promise<void>;
  onSplitColumn: (
    columnName: string,
    delimiter?: string,
    mode?: 'first' | 'last' | 'all',
    count?: number
  ) => Promise<void>;
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
  onChangeColumnRole,
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
  const [customSplit, setCustomSplit] = useState<{
    isOpen: boolean;
    columnName: string;
    delimiter: string;
    mode: 'first' | 'last' | 'all';
    count: number;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    columnName: '',
    delimiter: ' ',
    mode: 'first',
    count: 2,
    isSubmitting: false,
  });

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
  }, [currentDataset]);

  if (!currentDataset) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-stone-50 dark:bg-stone-950">
        <Database className="h-12 w-12 text-stone-400 mb-3" />
        <h2 className="text-lg font-bold font-editorial text-stone-800 dark:text-stone-200">
          No data source connected
        </h2>
        <p className="text-xs text-stone-500 max-w-sm mt-1">
          Load an Excel, CSV, Parquet, or JSON file to inspect and prepare your data.
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

  const handleOpenCustomSplit = (colName: string) => {
    setCustomSplit({
      isOpen: true,
      columnName: colName,
      delimiter: ' ',
      mode: 'first',
      count: 2,
      isSubmitting: false,
    });
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
                Table: {currentDataset.tableName}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {currentDataset.rowCount.toLocaleString()} rows • {currentDataset.columns.length} fields • In-Memory DuckDB
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
              <span>Model Data (JOIN / UNION)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGoToWorksheet}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 focus:outline-none transition-all cursor-pointer"
          >
            <span>Go to Worksheet</span>
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
                  Data Interpreter
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
              Automatically detects and structures spreadsheets with titles, merged cells, header notes, and footer subtotal or grand total rows to prevent calculation duplication.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-stone-600 dark:text-stone-400">
              {currentDataset.isDataInterpreterEnabled ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ {currentDataset.dataInterpreterReport || 'Clean tabular structure enabled.'}
                </span>
              ) : (
                <span className="text-stone-400">Raw data mode.</span>
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
                  Data Source Filters ({dataSourceFilters.length})
                </h3>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAddingFilter(!isAddingFilter)}
                  className="flex items-center gap-1 rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Filter</span>
                </button>

                {isAddingFilter && (
                  <div className="absolute right-0 top-full mt-1 w-56 max-h-60 overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-800 z-50">
                    <div className="px-2 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase">
                      Select field to filter
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
              Data source filters are applied at the DuckDB root before data reaches any worksheet or dashboard, reducing in-memory volume and ensuring global consistency.
            </p>
          </div>

          {/* Active Data Source Filter Chips */}
          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-1.5 items-center">
            {dataSourceFilters.length === 0 ? (
              <span className="text-[11px] text-stone-400 italic">No active data source filters (100% of rows available).</span>
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
                    title="Edit filter"
                  >
                    {f.columnName}: {f.operator === 'range' ? `${f.rangeMin ?? 0} - ${f.rangeMax ?? 100}` : `${f.values?.length || 0} sel.`}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRemoveDataSourceFilter(f.id)}
                    className="text-sky-500 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-200 ml-1"
                    title="Remove data source filter"
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
              Data Prep & Profiling Grid
            </h2>
            <span className="text-[11px] text-stone-400">
              (Interactive sample of first {previewRows.length} rows)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Filter in Preview */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search in preview..."
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
              <span>Show hidden fields</span>
            </label>
          </div>
        </div>

        {/* Scrollable Data Prep Table */}
        <div className="flex-1 overflow-auto">
          {isLoadingPreview ? (
            <div className="flex h-64 items-center justify-center gap-2 text-xs text-stone-500">
              <RefreshCw className="h-4 w-4 animate-spin text-sky-600" />
              <span>Loading vectorized data from DuckDB...</span>
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
                              title="Change data type in DuckDB"
                            >
                              <option value="string">Abc String</option>
                              <option value="number"># Number</option>
                              <option value="date">📅 Date</option>
                              <option value="boolean">T/F Boolean</option>
                            </select>
                            <ChevronDown className="absolute right-1 top-1.5 h-2.5 w-2.5 pointer-events-none text-stone-400" />
                          </div>

                          {/* Column Action Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuCol(isMenuOpen ? null : col.name)}
                              className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 dark:hover:text-stone-200 dark:hover:bg-stone-700 cursor-pointer"
                              title="Field prep tools"
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
                                  <span>Rename field</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void onSplitColumn(col.name, ' ', 'first', 2);
                                    setActiveMenuCol(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700 cursor-pointer"
                                >
                                  <Split className="h-3 w-3 text-stone-400" />
                                  <span>Split by space</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomSplit(col.name)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700 cursor-pointer"
                                >
                                  <Split className="h-3 w-3 text-stone-400" />
                                  <span>Custom Split...</span>
                                </button>

                                <div className="border-t border-stone-100 dark:border-stone-700 my-1"></div>

                                <div className="px-3 py-0.5 text-[9px] font-mono text-stone-400 uppercase font-bold">
                                  Text Cleaning
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void onCleanColumn(col.name, 'trim');
                                    setActiveMenuCol(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  <span>Trim whitespace (TRIM)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void onCleanColumn(col.name, 'upper');
                                    setActiveMenuCol(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  <span>Convert to UPPERCASE</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    void onCleanColumn(col.name, 'lower');
                                    setActiveMenuCol(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  <span>Convert to lowercase</span>
                                </button>

                                <div className="border-t border-stone-100 dark:border-stone-700 my-1"></div>

                                {onChangeColumnRole && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void onChangeColumnRole(col.name, col.role === 'dimension' ? 'measure' : 'dimension');
                                      setActiveMenuCol(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                  >
                                    <ArrowRightLeft className="h-3 w-3 text-stone-400" />
                                    <span>{col.role === 'dimension' ? 'Convert to Measure' : 'Convert to Dimension'}</span>
                                  </button>
                                )}

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
                                      <span>Show field</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-3 w-3 text-stone-400" />
                                      <span>Hide field</span>
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
                            title="Double click to rename field"
                          >
                            {col.name}
                            {col.hidden && (
                              <span className="ml-1 text-[10px] font-normal text-stone-400 italic">
                                (hidden)
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

      {/* 4. TABLEAU CUSTOM SPLIT MODAL */}
      {customSplit.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                  <Split className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-sm font-bold text-stone-900 dark:text-stone-100">
                    Custom Split
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Split values from field <strong className="font-semibold text-stone-700 dark:text-stone-300">"{customSplit.columnName}"</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomSplit({ ...customSplit, isOpen: false })}
                className="rounded p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Separator Input */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Use separator:
                </label>
                <input
                  type="text"
                  value={customSplit.delimiter}
                  onChange={(e) => setCustomSplit({ ...customSplit, delimiter: e.target.value })}
                  placeholder="Space, comma, hyphen, etc."
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 shadow-2xs focus:border-sky-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 font-mono"
                  autoFocus
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Enter a space, comma (,), hyphen (-), slash (/), or any custom delimiter text.
                </span>
              </div>

              {/* Split Off Radio Options */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  Split off:
                </label>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 text-xs text-stone-800 dark:text-stone-200 cursor-pointer">
                    <input
                      type="radio"
                      name="splitMode"
                      checked={customSplit.mode === 'first'}
                      onChange={() => setCustomSplit({ ...customSplit, mode: 'first' })}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span className="w-16">First</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={customSplit.mode === 'first' ? customSplit.count : 2}
                      disabled={customSplit.mode !== 'first'}
                      onChange={(e) => setCustomSplit({ ...customSplit, count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-16 rounded border border-stone-300 bg-white px-2 py-0.5 text-xs text-center font-mono disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    />
                    <span className="text-stone-500 dark:text-stone-400 text-xs">columns</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-stone-800 dark:text-stone-200 cursor-pointer">
                    <input
                      type="radio"
                      name="splitMode"
                      checked={customSplit.mode === 'last'}
                      onChange={() => setCustomSplit({ ...customSplit, mode: 'last' })}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span className="w-16">Last</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={customSplit.mode === 'last' ? customSplit.count : 1}
                      disabled={customSplit.mode !== 'last'}
                      onChange={(e) => setCustomSplit({ ...customSplit, count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-16 rounded border border-stone-300 bg-white px-2 py-0.5 text-xs text-center font-mono disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    />
                    <span className="text-stone-500 dark:text-stone-400 text-xs">columns</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-stone-800 dark:text-stone-200 cursor-pointer">
                    <input
                      type="radio"
                      name="splitMode"
                      checked={customSplit.mode === 'all'}
                      onChange={() => setCustomSplit({ ...customSplit, mode: 'all' })}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span className="flex-1">All columns</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setCustomSplit({ ...customSplit, isOpen: false })}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={customSplit.isSubmitting}
                onClick={async () => {
                  try {
                    setCustomSplit((prev) => ({ ...prev, isSubmitting: true }));
                    const delim = customSplit.delimiter === '' ? ' ' : customSplit.delimiter;
                    await onSplitColumn(customSplit.columnName, delim, customSplit.mode, customSplit.count);
                    setCustomSplit((prev) => ({ ...prev, isOpen: false, isSubmitting: false }));
                  } catch (e) {
                    setCustomSplit((prev) => ({ ...prev, isSubmitting: false }));
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 cursor-pointer transition-colors disabled:opacity-50"
              >
                {customSplit.isSubmitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>{customSplit.isSubmitting ? 'Splitting...' : 'Apply'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
