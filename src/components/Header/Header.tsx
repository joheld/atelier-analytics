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
} from 'lucide-react';
import React, { useRef } from 'react';
import { DatasetMeta } from '../../core/ast/types';

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-stone-200/90 bg-white px-4 dark:border-stone-800 dark:bg-stone-900 select-none">
      {/* Brand & Editorial Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
          </svg>
        </div>
        <div className="flex items-center gap-2.5">
          <h1 className="font-editorial text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Atelier
          </h1>
          <span className="text-stone-300 dark:text-stone-700">/</span>
          <span className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400">
            Visual Analytics
          </span>
        </div>
      </div>

      {/* Center Dataset Info Badge */}
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
            <div
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1 text-2xs font-mono text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 select-none shadow-2xs"
              title="Sesión auto-guardada en IndexedDB. Tu trabajo está protegido contra recargas accidentales."
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto-guardado activo</span>
            </div>
          </>
        ) : (
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-mono text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            DuckDB-WASM Motor Columnar Listo
          </span>
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

        {onExportProject && (
          <button
            type="button"
            onClick={onExportProject}
            className="flex items-center gap-1 rounded-md border border-stone-200/80 bg-white px-2 py-1 text-xs font-mono text-stone-700 shadow-xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            title="Guardar / Exportar proyecto a archivo (.atelier)"
          >
            <Download className="h-3 w-3 text-stone-500" />
            <span>Guardar</span>
          </button>
        )}

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
