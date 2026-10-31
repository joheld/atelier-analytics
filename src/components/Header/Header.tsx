import {
  Code,
  RotateCcw,
  Sun,
  Moon,
  Zap,
  Table,
  X,
  Download,
  Upload,
  Check,
  ChevronDown,
  Plus,
  Folder,
  Trash2,
  Database,
  Info,
  FileSpreadsheet,
  Image,
  Printer,
} from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';
import { DatasetMeta } from '../../core/ast/types';
import { SavedWorkbookRecord } from '../../core/storage/indexedDBStorage';
import { exportPlotAsPng, exportPlotAsSvg, printExecutiveReport } from '../../utils/exportVisual';

interface HeaderProps {
  theme: 'light' | 'dark';
  currentDataset: DatasetMeta | null;
  onToggleTheme: () => void;
  onToggleSQLDrawer: () => void;
  onClearShelves: () => void;
  onCloseDataset?: () => void;
  onExportProject?: () => void;
  onImportProject?: (file: File) => void;
  latencyMs?: number;
  rowCount?: number;
  hasPillsOnShelves: boolean;

  // Workbook / Report Management Props
  currentWorkbookId?: string;
  currentWorkbookName?: string;
  savedWorkbooks?: SavedWorkbookRecord[];
  onNewWorkbook?: () => void;
  onSwitchWorkbook?: (id: string) => void;
  onRenameWorkbook?: (name: string) => void;
  onDeleteWorkbook?: (id: string) => void;
  onOpenStorageModal?: () => void;

  // Tableau Start Page Hub
  isStartPageVisible?: boolean;
  onToggleStartPage?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  currentDataset,
  onToggleTheme,
  onToggleSQLDrawer,
  onClearShelves,
  onCloseDataset,
  onExportProject,
  onImportProject,
  latencyMs,
  rowCount,
  hasPillsOnShelves,
  currentWorkbookId,
  currentWorkbookName,
  savedWorkbooks,
  onNewWorkbook,
  onSwitchWorkbook,
  onRenameWorkbook,
  onDeleteWorkbook,
  onOpenStorageModal,
  isStartPageVisible,
  onToggleStartPage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [renameInput, setRenameInput] = useState(currentWorkbookName || 'Reporte Principal');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRenameInput(currentWorkbookName || 'Reporte Principal');
  }, [currentWorkbookName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsReportDropdownOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    if (isReportDropdownOpen || isExportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isReportDropdownOpen, isExportDropdownOpen]);

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-stone-200/90 bg-white px-4 dark:border-stone-800 dark:bg-stone-900 select-none">
      {/* Brand & Editorial Title & Report Switcher */}
      <div className="flex items-center gap-3">
        {/* Tableau Iconic Start Page Toggle Logo */}
        <button
          type="button"
          onClick={onToggleStartPage}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm hover:scale-105 active:scale-95 transition-all"
          title={isStartPageVisible ? 'Ir al espacio de trabajo (Lienzo)' : 'Página de inicio (Tableau Start Page)'}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleStartPage}
            className="font-editorial text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 hover:opacity-80 transition-opacity"
            title={isStartPageVisible ? 'Ir al espacio de trabajo' : 'Ver página de inicio y archivos recientes'}
          >
            Atelier
          </button>
          <span className="text-stone-300 dark:text-stone-700">/</span>

          {isStartPageVisible ? (
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-mono font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              Inicio
            </span>
          ) : (
            /* Report Switcher Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200/90 bg-stone-50/80 px-2.5 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-100 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-950/70 dark:text-stone-200 transition-colors"
                title="Catálogo de reportes: cambia de reporte o crea uno nuevo"
              >
                <Folder className="h-3.5 w-3.5 text-amber-500" />
                <span className="max-w-[130px] truncate">{currentWorkbookName || 'Reporte Principal'}</span>
                <ChevronDown className="h-3 w-3 text-stone-400" />
              </button>

            {/* Dropdown Menu */}
            {isReportDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-72 rounded-xl border border-stone-200/90 bg-white p-2 shadow-xl dark:border-stone-800 dark:bg-stone-900 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* Header with Rename input */}
                <div className="px-2 py-1 mb-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                    Nombre del Reporte
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={renameInput}
                      onChange={(e) => {
                        setRenameInput(e.target.value);
                        onRenameWorkbook?.(e.target.value);
                      }}
                      className="w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-400"
                      placeholder="Nombre del reporte..."
                    />
                  </div>
                </div>

                <div className="my-1.5 border-t border-stone-100 dark:border-stone-800" />

                {/* + Nuevo Reporte Action */}
                <button
                  type="button"
                  onClick={() => {
                    setIsReportDropdownOpen(false);
                    onNewWorkbook?.();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Nuevo Reporte en Blanco</span>
                </button>

                <div className="my-1.5 border-t border-stone-100 dark:border-stone-800" />

                {/* Saved Workbooks List */}
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono px-2 py-1">
                  Catálogo Guardado ({savedWorkbooks?.length || 1})
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {savedWorkbooks && savedWorkbooks.length > 0 ? (
                    savedWorkbooks.map((wb) => {
                      const isActive = wb.id === currentWorkbookId;
                      return (
                        <div
                          key={wb.id}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                            isActive
                              ? 'bg-stone-100 font-semibold text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                              : 'text-stone-600 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800/60'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (!isActive) {
                                onSwitchWorkbook?.(wb.id);
                              }
                              setIsReportDropdownOpen(false);
                            }}
                            className="flex flex-1 items-center gap-2 text-left truncate mr-2"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                            <div className="truncate">
                              <span className="block truncate">{wb.name}</span>
                              <span className="block text-[10px] text-stone-400 font-mono font-normal">
                                {new Date(wb.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            {isActive && (
                              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1 py-0.5 text-[9px] font-mono text-emerald-700 dark:text-emerald-300">
                                Activo
                              </span>
                            )}
                            {savedWorkbooks.length > 1 && !isActive && onDeleteWorkbook && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`¿Eliminar reporte "${wb.name}"?`)) {
                                    onDeleteWorkbook(wb.id);
                                  }
                                }}
                                className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                                title="Eliminar reporte del catálogo"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-2 py-2 text-center text-[11px] text-stone-400">
                      Reporte actual activo
                    </div>
                  )}
                </div>

                <div className="my-1.5 border-t border-stone-100 dark:border-stone-800" />

                {/* Storage Transparency link inside dropdown */}
                <button
                  type="button"
                  onClick={() => {
                    setIsReportDropdownOpen(false);
                    onOpenStorageModal?.();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-[11px] font-mono text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3 w-3 text-stone-400" />
                    <span>Ver Almacenamiento Local</span>
                  </span>
                  <Info className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Center Dataset Info Badge & Storage Indicator */}
      <div className="flex items-center gap-2">
        {currentDataset ? (
          <>
            <div className="flex items-center gap-2 rounded-full border border-stone-200/80 bg-stone-50 px-3 py-1 font-mono text-xs dark:border-stone-800 dark:bg-stone-950">
              <Table className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-stone-800 dark:text-stone-200 truncate max-w-[200px]">
                {currentDataset.name}
              </span>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <span className="text-stone-500 dark:text-stone-400 tabular-nums">
                {currentDataset.rowCount.toLocaleString()} filas
              </span>
              {onCloseDataset && (
                <button
                  type="button"
                  onClick={onCloseDataset}
                  className="ml-1 rounded-full p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                  title="Cerrar dataset"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Clickable Storage Badge */}
            <button
              type="button"
              onClick={onOpenStorageModal}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-stone-50 px-2.5 py-1 text-[11px] font-mono text-stone-600 hover:text-stone-900 hover:bg-stone-100 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
              title="Guardado automáticamente en Mac (IndexedDB). Clic para ver detalles."
            >
              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>Guardado en Mac</span>
              <Info className="h-2.5 w-2.5 text-stone-400 ml-0.5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-mono text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              DuckDB-WASM Motor Columnar Listo
            </span>
            <button
              type="button"
              onClick={onOpenStorageModal}
              className="hidden sm:flex items-center gap-1 rounded-full border border-stone-200/80 bg-stone-50 px-2 py-0.5 text-[10px] font-mono text-stone-500 hover:text-stone-800 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400 dark:hover:text-stone-200"
              title="Ver estado de almacenamiento local en Mac"
            >
              <Database className="h-3 w-3 text-stone-400" />
              <span>Almacenamiento</span>
            </button>
          </div>
        )}
      </div>

      {/* Actions & Metrics */}
      <div className="flex items-center gap-2">
        {latencyMs !== undefined && currentDataset && (
          <div className="flex items-center gap-1.5 rounded-md border border-stone-200/80 bg-stone-50 px-2.5 py-1 font-mono text-xs dark:border-stone-800 dark:bg-stone-950">
            <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {latencyMs.toFixed(2)} ms
            </span>
            {rowCount !== undefined && (
              <span className="text-stone-400 dark:text-stone-600">
                ({rowCount.toLocaleString()} marcas)
              </span>
            )}
          </div>
        )}

        {/* Hidden File Input for .atelier Project */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".atelier,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onImportProject) {
              onImportProject(file);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />

        {/* Project Persistence Buttons */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 rounded-md border border-stone-200/80 bg-white px-2 py-1 text-xs font-mono text-stone-700 shadow-xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
          title="Abrir archivo de proyecto (.atelier)"
        >
          <Upload className="h-3 w-3 text-stone-500" />
          <span>Abrir</span>
        </button>

        {/* Executive Visual Export Dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            className="flex items-center gap-1.5 rounded-md border border-stone-200/80 bg-white px-2.5 py-1 text-xs font-mono text-stone-700 shadow-xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            title="Exportar gráfico o informe ejecutivo"
          >
            <Download className="h-3 w-3 text-stone-500" />
            <span>Exportar</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {isExportDropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-stone-200 bg-white py-1.5 shadow-xl dark:border-stone-800 dark:bg-stone-900 text-stone-900 dark:text-stone-100">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Gráficos & Visuales
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExportDropdownOpen(false);
                  const el = document.querySelector('svg')?.parentElement || document.body;
                  void exportPlotAsPng(el as HTMLElement, `${currentWorkbookName || 'atelier'}-grafico`);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
              >
                <Image className="h-3.5 w-3.5 text-sky-500" />
                <span>Imagen PNG (Retina 2x)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExportDropdownOpen(false);
                  const el = document.querySelector('svg')?.parentElement || document.body;
                  exportPlotAsSvg(el as HTMLElement, `${currentWorkbookName || 'atelier'}-grafico`);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
              >
                <Code className="h-3.5 w-3.5 text-emerald-500" />
                <span>Gráfico Vectorial SVG (.svg)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExportDropdownOpen(false);
                  printExecutiveReport();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
              >
                <Printer className="h-3.5 w-3.5 text-amber-500" />
                <span>Informe PDF / Imprimir</span>
              </button>

              <div className="my-1 border-t border-stone-100 dark:border-stone-800" />

              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Proyecto & Datos
              </div>
              {onExportProject && (
                <button
                  type="button"
                  onClick={() => {
                    setIsExportDropdownOpen(false);
                    onExportProject();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Libro Completo (.atelier)</span>
                </button>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleSQLDrawer}
          className="flex items-center gap-1.5 rounded-md border border-stone-200/80 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
          title="Ver SQL DuckDB"
        >
          <Code className="h-3.5 w-3.5 text-stone-500" />
          <span>SQL</span>
        </button>

        {hasPillsOnShelves && (
          <button
            type="button"
            onClick={onClearShelves}
            className="rounded-md border border-stone-200/80 bg-white p-1.5 text-stone-500 shadow-xs hover:bg-stone-50 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            title="Limpiar estantes"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-md border border-stone-200/80 bg-white p-1.5 text-stone-500 shadow-xs hover:bg-stone-50 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          title="Cambiar tema claro/oscuro"
        >
          {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>
      </div>
    </header>
  );
};
