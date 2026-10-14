import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Table as TableIcon,
  Database,
  Plus,
  ArrowRight,
  Clock,
  Trash2,
  Sparkles,
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

    if (diffMins < 1) return 'Recién guardado';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
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
        accept=".parquet,.csv,.tsv,.json,.xlsx,.xls"
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
      <aside className="w-72 shrink-0 border-r border-stone-200/90 bg-stone-50/80 p-5 dark:border-stone-800 dark:bg-stone-900/60 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Header Brand */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-stone-200/70 dark:border-stone-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
            </div>
            <div>
              <h1 className="font-editorial text-base font-bold text-stone-900 dark:text-stone-100">
                Atelier Analytics
              </h1>
              <p className="text-[10px] font-mono text-stone-400">Página de Inicio</p>
            </div>
          </div>

          {/* Section: Conectar a un Archivo */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono">
              Conectar a datos
            </h2>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-white hover:shadow-xs dark:text-stone-300 dark:hover:bg-stone-800/80 transition-all text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <span className="block font-semibold">Archivo de Texto / CSV</span>
                  <span className="block text-[10px] text-stone-400">.csv, .tsv, .txt</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-white hover:shadow-xs dark:text-stone-300 dark:hover:bg-stone-800/80 transition-all text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <span className="block font-semibold">Apache Parquet</span>
                  <span className="block text-[10px] text-stone-400">.parquet columnar</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-white hover:shadow-xs dark:text-stone-300 dark:hover:bg-stone-800/80 transition-all text-left"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <TableIcon className="h-4 w-4" />
                </div>
                <div>
                  <span className="block font-semibold">Microsoft Excel / JSON</span>
                  <span className="block text-[10px] text-stone-400">.xlsx, .json</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section: Fuentes de Datos de Muestra (Tableau Desktop Samples) */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono">
              Fuentes de Muestra
            </h2>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  const file = createSuperstoreSampleFile();
                  onFileUpload(file);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl border border-stone-200/70 bg-white p-2.5 text-xs text-left shadow-2xs hover:border-amber-400 hover:shadow-xs dark:border-stone-800 dark:bg-stone-900/80 transition-all"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="flex-1 truncate">
                  <span className="block font-semibold text-stone-900 dark:text-stone-100 truncate">
                    Superstore Sales
                  </span>
                  <span className="block text-[10px] text-stone-400 truncate">
                    600 pedidos • Ventas, Margen
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const file = createWorldIndicatorsSampleFile();
                  onFileUpload(file);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl border border-stone-200/70 bg-white p-2.5 text-xs text-left shadow-2xs hover:border-cyan-400 hover:shadow-xs dark:border-stone-800 dark:bg-stone-900/80 transition-all"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="flex-1 truncate">
                  <span className="block font-semibold text-stone-900 dark:text-stone-100 truncate">
                    Indicadores Mundiales
                  </span>
                  <span className="block text-[10px] text-stone-400 truncate">
                    PIB, Población, Inflación
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Storage & Open Project */}
        <div className="pt-4 border-t border-stone-200/70 dark:border-stone-800 space-y-2">
          <button
            type="button"
            onClick={() => projectInputRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Abrir proyecto (.atelier)...</span>
          </button>

          <button
            type="button"
            onClick={onOpenStorageModal}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-stone-500 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Almacenamiento en Mac</span>
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">IndexedDB</span>
          </button>
        </div>
      </aside>

      {/* 2. CENTER PANEL: "Libros de trabajo recientes" (Recent Workbooks) */}
      <main className="flex-1 overflow-y-auto p-8 flex flex-col space-y-6">
        {/* Top Header & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-editorial text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Libros de trabajo recientes
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-sans">
              Continúa trabajando en tus análisis guardados o crea un nuevo reporte independiente
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Filter Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar reporte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-400 w-44"
              />
            </div>

            {/* + Nuevo Libro de Trabajo Button */}
            <button
              type="button"
              onClick={onNewWorkbook}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo Libro de Trabajo</span>
            </button>
          </div>
        </div>

        {/* Hero Card: Resume Active Session (if active workspace exists) */}
        {currentDataset && (
          <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                  Sesión activa en memoria
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {currentWorkbookName}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <span>Fuente: <strong>{currentDataset.name}</strong></span>
                <span>•</span>
                <span>{currentDataset.rowCount.toLocaleString()} filas</span>
                <span>•</span>
                <span>{sheetsCount} {sheetsCount === 1 ? 'vista' : 'vistas'}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenWorkspace}
              className="flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition-all shrink-0"
            >
              <span>Volver al espacio de trabajo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Workbooks Catalog Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono">
              Catálogo Guardado en este Mac ({filteredWorkbooks.length})
            </span>
          </div>

          {filteredWorkbooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                    className={`group relative flex flex-col justify-between rounded-2xl border p-4 cursor-pointer transition-all duration-150 ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/20 dark:border-emerald-500/60 dark:bg-emerald-950/10 shadow-xs'
                        : 'border-stone-200/90 bg-white hover:border-stone-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700'
                    }`}
                  >
                    {/* Thumbnail Graphic Glyph */}
                    <div className="relative mb-3 h-28 w-full overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800/60 p-3 flex flex-col justify-end">
                      {/* Stylized Visual Representation */}
                      <div className="flex items-end gap-1.5 h-16 w-full opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="w-1/6 bg-sky-500 rounded-t-sm h-[40%]" />
                        <div className="w-1/6 bg-emerald-500 rounded-t-sm h-[75%]" />
                        <div className="w-1/6 bg-amber-500 rounded-t-sm h-[55%]" />
                        <div className="w-1/6 bg-sky-500 rounded-t-sm h-[90%]" />
                        <div className="w-1/6 bg-rose-500 rounded-t-sm h-[30%]" />
                        <div className="w-1/6 bg-indigo-500 rounded-t-sm h-[65%]" />
                      </div>

                      {/* Active Tag */}
                      {isActive && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-white shadow-xs">
                          <Check className="h-2.5 w-2.5" />
                          <span>Activo</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {wb.name}
                        </h4>

                        {savedWorkbooks.length > 1 && !isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Eliminar reporte "${wb.name}"?`)) {
                                onDeleteWorkbook(wb.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 rounded transition-opacity"
                            title="Eliminar reporte de recientes"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-stone-400 truncate">
                        {snap.currentDatasetName || 'Sin fuente vinculada'}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                      <span>
                        {sheetCount} {sheetCount === 1 ? 'hoja' : 'hojas'}
                        {hasDashboards ? ' • 1 dash' : ''}
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
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 p-12 text-center dark:border-stone-800">
              <Layers className="h-8 w-8 text-stone-400 mb-2" />
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                No hay libros de trabajo guardados aún
              </p>
              <p className="text-[11px] text-stone-400 max-w-sm mt-1">
                Conecta un archivo CSV o Parquet en el panel izquierdo o carga una muestra para comenzar tu primer análisis visual.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 3. RIGHT PANEL: "Descubrir" (Discover & Resources) */}
      <aside className="hidden xl:flex w-64 shrink-0 border-l border-stone-200/90 bg-stone-50/40 p-5 dark:border-stone-800 dark:bg-stone-900/40 flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-mono">
            Descubrir Atelier
          </h2>

          <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 dark:border-stone-800 dark:bg-stone-900 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Modelo Tableau Auténtico</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
              Pastillas <span className="font-semibold text-sky-600">azules</span> para Dimensiones (GROUP BY) y <span className="font-semibold text-emerald-600">verdes</span> para Métricas continuas agregadas en tiempo real.
            </p>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 dark:border-stone-800 dark:bg-stone-900 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span>Motor Columnar Local</span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
              DuckDB-WASM procesa cientos de miles de filas directamente en la memoria de tu Mac a velocidad nativa sin enviar datos a la nube.
            </p>
          </div>
        </div>

        <div className="text-[10px] text-stone-400 font-mono border-t border-stone-200/70 pt-3 dark:border-stone-800">
          Atelier Analytics v2.2.0 • Zero-Cloud
        </div>
      </aside>
    </div>
  );
};
