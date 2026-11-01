import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Table as TableIcon,
  Database,
  Server,
  Plus,
  ArrowRight,
  Clock,
  Trash2,
  Layers,
  Search,
  HardDrive,
  Check,
  Globe,
  ShoppingCart,
  Upload,
} from 'lucide-react';
import { DatasetMeta } from '../../core/ast/types';
import { SavedWorkbookRecord } from '../../core/storage/indexedDBStorage';
import { createSuperstoreSampleFile, createWorldIndicatorsSampleFile } from '../../core/data/sampleDatasets';

interface StartPageProps {
  currentDataset: DatasetMeta | null;
  currentWorkbookId: string;
  currentWorkbookName: string;
  savedWorkbooks: SavedWorkbookRecord[];
  sheetsCount: number;
  onOpenWorkspace: () => void;
  onNewWorkbook: () => void;
  onSwitchWorkbook: (id: string) => void;
  onDeleteWorkbook: (id: string) => void;
  onFileUpload: (file: File) => void;
  onImportProject: (file: File) => void;
  onOpenStorageModal: () => void;
  onOpenRelationalModal?: () => void;
}

export const StartPage: React.FC<StartPageProps> = ({
  currentDataset,
  currentWorkbookId,
  currentWorkbookName,
  savedWorkbooks,
  sheetsCount,
  onOpenWorkspace,
  onNewWorkbook,
  onSwitchWorkbook,
  onDeleteWorkbook,
  onFileUpload,
  onImportProject,
  onOpenStorageModal,
  onOpenRelationalModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const filteredWorkbooks = savedWorkbooks.filter((wb) =>
    wb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wb.snapshot.currentDatasetName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.atelier') || file.name.endsWith('.json')) {
      onImportProject(file);
    } else {
      onFileUpload(file);
    }
  };

  const formatRelativeDate = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just saved';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex h-full w-full select-none overflow-hidden bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100 font-sans transition-colors duration-150 ${
        isDragOver ? 'ring-4 ring-sky-500/50 ring-inset' : ''
      }`}
    >
      {/* Hidden File Pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".parquet,.csv,.tsv,.json,.ndjson,.xlsx,.xls,.sqlite,.db,.sqlite3,.twbx,.tdsx,.twb,.tds"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileUpload(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />
      <input
        ref={projectInputRef}
        type="file"
        accept=".atelier,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportProject(file);
          if (projectInputRef.current) projectInputRef.current.value = '';
        }}
      />

      {/* 1. LEFT SIDEBAR: "Conectar" (Connect to Data) */}
      <aside className="w-72 shrink-0 border-r border-stone-200/90 bg-stone-50/90 p-4 dark:border-stone-800/80 dark:bg-stone-900/60 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          {/* Header Brand */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200/70 dark:border-white/[0.06]">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rim-light-subtle shadow-xs">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h1 className="text-xs font-semibold tracking-[-0.01em] text-stone-950 dark:text-stone-100">
                  Atelier Analytics
                </h1>
                <span className="text-[9px] font-mono uppercase tracking-wider text-stone-400 border border-stone-200 dark:border-stone-800 px-1 py-0.2 rounded">
                  v3.0
                </span>
              </div>
              <p className="text-[10px] font-mono text-stone-400">Workspace Hub</p>
            </div>
          </div>

          {/* Section: Conectar a un Archivo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                Connect to File
              </h2>
              <span className="text-[9px] font-mono text-stone-400">Local I/O</span>
            </div>

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-200/50 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <TableIcon className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
                  <span className="font-medium truncate">Microsoft Excel</span>
                </div>
                <span className="font-mono text-[9px] text-stone-500 bg-stone-200/50 dark:bg-white/[0.06] px-1 py-0.5 rounded">.xlsx</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-200/50 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
                  <span className="font-medium truncate">CSV / Delimited Text</span>
                </div>
                <span className="font-mono text-[9px] text-stone-500 bg-stone-200/50 dark:bg-white/[0.06] px-1 py-0.5 rounded">.csv</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-200/50 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
                  <span className="font-medium truncate">Apache Parquet</span>
                </div>
                <span className="font-mono text-[9px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/40">SIMD</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-200/50 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
                  <span className="font-medium truncate">SQLite Database</span>
                </div>
                <span className="font-mono text-[9px] text-stone-500 bg-stone-200/50 dark:bg-white/[0.06] px-1 py-0.5 rounded">.sqlite</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-200/50 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Layers className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
                  <span className="font-medium truncate">Tableau Workbook</span>
                </div>
                <span className="font-mono text-[9px] text-stone-500 bg-stone-200/50 dark:bg-white/[0.06] px-1 py-0.5 rounded">.twbx</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-200/50 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
                  <span className="font-medium truncate">JSON / NDJSON</span>
                </div>
                <span className="font-mono text-[9px] text-stone-500 bg-stone-200/50 dark:bg-white/[0.06] px-1 py-0.5 rounded">.json</span>
              </button>
            </div>
          </div>

          {/* Section: Conectar a un Servidor */}
          <div className="space-y-1.5 pt-3 border-t border-stone-200/70 dark:border-white/[0.06]">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                Relational Server
              </h2>
              <span className="text-[9px] font-mono text-stone-400">RDBMS</span>
            </div>

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={onOpenRelationalModal}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-200/50 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Server className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
                  <span className="font-medium truncate">PostgreSQL</span>
                </div>
                <span className="font-mono text-[9px] text-stone-500 bg-stone-200/50 dark:bg-white/[0.06] px-1 py-0.5 rounded">pg</span>
              </button>

              <button
                type="button"
                onClick={onOpenRelationalModal}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-200/50 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
                  <span className="font-medium truncate">MySQL / MariaDB</span>
                </div>
                <span className="font-mono text-[9px] text-stone-500 bg-stone-200/50 dark:bg-white/[0.06] px-1 py-0.5 rounded">sql</span>
              </button>
            </div>
          </div>

          {/* Section: Fuentes de Datos de Muestra */}
          <div className="space-y-1.5 pt-3 border-t border-stone-200/70 dark:border-white/[0.06]">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono px-1">
              Sample Datasets
            </h2>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  const file = createSuperstoreSampleFile();
                  onFileUpload(file);
                }}
                className="flex w-full items-center justify-between rounded-md border border-stone-200/80 bg-white p-2 text-left rim-light-subtle shadow-2xs hover:border-stone-400 dark:border-white/[0.08] dark:bg-stone-900 dark:hover:border-white/[0.18] transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors" />
                  <div className="truncate">
                    <span className="block font-medium text-xs text-stone-900 dark:text-stone-100 truncate">
                      Superstore Sales
                    </span>
                    <span className="block text-[10px] font-mono text-stone-400 truncate">
                      600 rows • Sales, Profit
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-stone-300 group-hover:text-stone-700 dark:group-hover:text-stone-200 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const file = createWorldIndicatorsSampleFile();
                  onFileUpload(file);
                }}
                className="flex w-full items-center justify-between rounded-md border border-stone-200/80 bg-white p-2 text-left rim-light-subtle shadow-2xs hover:border-stone-400 dark:border-white/[0.08] dark:bg-stone-900 dark:hover:border-white/[0.18] transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors" />
                  <div className="truncate">
                    <span className="block font-medium text-xs text-stone-900 dark:text-stone-100 truncate">
                      World Indicators
                    </span>
                    <span className="block text-[10px] font-mono text-stone-400 truncate">
                      GDP, Population, Inflation
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-stone-300 group-hover:text-stone-700 dark:group-hover:text-stone-200 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Storage & Open Project */}
        <div className="pt-3 border-t border-stone-200/70 dark:border-white/[0.06] space-y-1">
          <button
            type="button"
            onClick={() => projectInputRef.current?.click()}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-white/[0.04] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Upload className="h-3.5 w-3.5 text-stone-400" />
              <span>Open project...</span>
            </span>
            <kbd className="kbd-shortcut">⌘ O</kbd>
          </button>

          <button
            type="button"
            onClick={onOpenStorageModal}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-mono text-stone-500 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-white/[0.04] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-stone-400" />
              <span>Local Storage</span>
            </span>
            <span className="text-[10px] text-stone-400 font-mono">IndexedDB</span>
          </button>
        </div>
      </aside>

      {/* 2. CENTER PANEL: "Libros de trabajo recientes" (Recent Workbooks) */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col space-y-5">
        {/* Top Header & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-stone-950 dark:text-stone-100">
              Recent Workbooks
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Continue analyzing in-memory sessions or initialize a new workbook
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Filter Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-stone-400" />
              <input
                type="text"
                placeholder="Filter workbooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-7 pr-2.5 text-xs rounded-md border border-stone-200/80 bg-white dark:border-white/[0.08] dark:bg-stone-900 dark:text-stone-100 font-mono text-[11px] focus:outline-none focus:border-stone-400 w-44 shadow-2xs transition-colors"
              />
            </div>

            {/* + Nuevo Libro de Trabajo Button */}
            <button
              type="button"
              onClick={onNewWorkbook}
              className="btn-tactile flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Workbook</span>
              <kbd className="kbd-shortcut ml-1 bg-white/10 dark:bg-black/10 border-white/20 text-inherit">⌘ N</kbd>
            </button>
          </div>
        </div>

        {/* Hero Card: Resume Active Session (if active workspace exists) */}
        {currentDataset && (
          <div className="relative overflow-hidden rounded-lg border border-stone-200/90 dark:border-white/[0.08] bg-white dark:bg-stone-900 p-4 rim-light-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">
                  Active In-Memory Session
                </span>
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-stone-950 dark:text-stone-100 truncate">
                {currentWorkbookName}
              </h3>
              <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <span>Source: <strong className="font-semibold text-stone-800 dark:text-stone-200">{currentDataset.name}</strong></span>
                <span>•</span>
                <span className="tabular-nums font-mono">{currentDataset.rowCount.toLocaleString()} rows</span>
                <span>•</span>
                <span>{sheetsCount} {sheetsCount === 1 ? 'sheet' : 'sheets'}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenWorkspace}
              className="btn-tactile flex items-center gap-2 rounded-md bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white shrink-0 transition-all"
            >
              <span>Return to canvas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Workbooks Catalog Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
              Saved Catalog ({filteredWorkbooks.length})
            </span>
          </div>

          {filteredWorkbooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredWorkbooks.map((wb) => {
                const isActive = wb.id === currentWorkbookId;
                const snap = wb.snapshot;
                const sheets = snap.sheets || [];
                const sheetCount = sheets.length;
                const hasDashboards = sheets.some((s) => s.type === 'dashboard');

                return (
                  <div
                    key={wb.id}
                    onClick={() => onSwitchWorkbook(wb.id)}
                    className={`group relative flex flex-col justify-between rounded-lg border p-3 cursor-pointer rim-light-subtle transition-all ${
                      isActive
                        ? 'border-stone-900 dark:border-white ring-1 ring-stone-900/10 dark:ring-white/20 bg-stone-50/50 dark:bg-stone-900/90 shadow-2xs'
                        : 'border-stone-200/90 bg-white hover:border-stone-400 dark:border-white/[0.08] dark:bg-stone-900 dark:hover:border-white/[0.18]'
                    }`}
                  >
                    {/* Technical Schematic Glyph */}
                    <div className="relative mb-2.5 h-24 w-full overflow-hidden rounded-md bg-stone-100 dark:bg-stone-950/70 border border-stone-200/60 dark:border-white/[0.05] p-2.5 flex flex-col justify-between bg-dot-grid">
                      <div className="flex items-center justify-between text-[9px] font-mono text-stone-400">
                        <span>DS-{wb.id.slice(0, 3)}</span>
                        {isActive ? (
                          <span className="flex items-center gap-1 rounded bg-stone-900 text-white dark:bg-white dark:text-stone-950 px-1 py-0.2 font-mono text-[9px] font-medium">
                            <Check className="h-2.5 w-2.5" />
                            Active
                          </span>
                        ) : (
                          <span className="text-[9px] text-stone-400 font-mono">SQLite</span>
                        )}
                      </div>

                      {/* Technical bar sparkline representation */}
                      <div className="flex items-end gap-1 h-10 w-full pt-2">
                        <div className="w-1/6 bg-stone-300 dark:bg-stone-700 rounded-xs h-[35%]" />
                        <div className="w-1/6 bg-stone-400 dark:bg-stone-600 rounded-xs h-[65%]" />
                        <div className="w-1/6 bg-stone-300 dark:bg-stone-700 rounded-xs h-[45%]" />
                        <div className="w-1/6 bg-stone-800 dark:bg-stone-300 rounded-xs h-[90%]" />
                        <div className="w-1/6 bg-stone-400 dark:bg-stone-600 rounded-xs h-[50%]" />
                        <div className="w-1/6 bg-stone-300 dark:bg-stone-700 rounded-xs h-[70%]" />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="space-y-0.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="font-medium text-xs text-stone-900 dark:text-stone-100 truncate group-hover:text-stone-950 dark:group-hover:text-white transition-colors">
                          {wb.name}
                        </h4>

                        {savedWorkbooks.length > 1 && !isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete workbook "${wb.name}"?`)) {
                                onDeleteWorkbook(wb.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-rose-600 rounded transition-opacity"
                            title="Delete workbook"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] font-mono text-stone-400 truncate">
                        {snap.currentDatasetName || 'No linked data source'}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-white/[0.06] flex items-center justify-between text-[10px] text-stone-400 font-mono">
                      <span>
                        {sheetCount} {sheetCount === 1 ? 'sheet' : 'sheets'}
                        {hasDashboards ? ' • dash' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{formatRelativeDate(wb.updatedAt)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty Recents State */
            <div className="flex flex-col items-center justify-center rounded-lg border border-stone-200/80 dark:border-white/[0.08] bg-dot-grid p-10 text-center">
              <Layers className="h-6 w-6 text-stone-400 mb-2" />
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                No saved workbooks
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-sm mt-0.5">
                Connect a file in the left panel or load a sample dataset to begin your analysis.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 3. RIGHT PANEL: "Especificación Técnica y Diagnóstico" */}
      <aside className="hidden xl:flex w-64 shrink-0 border-l border-stone-200/90 bg-stone-50/60 p-4 dark:border-stone-800/80 dark:bg-stone-900/40 flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono px-0.5">
              Engine Diagnostics
            </h2>
            <p className="text-[10px] font-mono text-stone-400 mt-0.5">Local Architecture</p>
          </div>

          <div className="rounded-md border border-stone-200/80 bg-white p-3 dark:border-white/[0.08] dark:bg-stone-900 rim-light-subtle shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500 dark:text-stone-400">SQL Engine</span>
              <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400 text-[10px]">DuckDB WASM</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500 dark:text-stone-400">Instructions</span>
              <span className="font-mono text-stone-700 dark:text-stone-300 text-[10px]">ARM64 / SIMD</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500 dark:text-stone-400">Persistence</span>
              <span className="font-mono text-stone-700 dark:text-stone-300 text-[10px]">IndexedDB / OPFS</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500 dark:text-stone-400">Visual Kernel</span>
              <span className="font-mono text-stone-700 dark:text-stone-300 text-[10px]">Observable Plot</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono px-0.5">
              Keyboard Shortcuts
            </h3>

            <div className="rounded-md border border-stone-200/80 bg-white p-2.5 dark:border-white/[0.08] dark:bg-stone-900 rim-light-subtle space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span>Open File</span>
                <kbd className="kbd-shortcut">⌘ O</kbd>
              </div>
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span>New Workbook</span>
                <kbd className="kbd-shortcut">⌘ N</kbd>
              </div>
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span>Export Retina 2x</span>
                <kbd className="kbd-shortcut">⌘ E</kbd>
              </div>
              <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                <span>Return to Canvas</span>
                <kbd className="kbd-shortcut">Esc</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-stone-400 font-mono border-t border-stone-200/70 pt-3 dark:border-white/[0.06] flex items-center justify-between">
          <span>Atelier v3.0.0</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">● Local</span>
        </div>
      </aside>
    </div>
  );
};
