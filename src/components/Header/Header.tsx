import React from 'react';
import {
  Code,
  RotateCcw,
  Sun,
  Moon,
  Sparkles,
  Zap,
  BarChart,
  ScatterChart,
  Cpu,
} from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleSQLDrawer: () => void;
  onClearShelves: () => void;
  onLoadPreset: (preset: 'sales_by_category' | 'profit_vs_sales_detail' | 'telemetry_100k_clusters') => void;
  latencyMs?: number;
  rowCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onToggleSQLDrawer,
  onClearShelves,
  onLoadPreset,
  latencyMs,
  rowCount,
}) => {
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
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-editorial text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Atelier
            </h1>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-mono font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
              Visual Analytics Studio
            </span>
          </div>
        </div>
      </div>

      {/* Editorial Presets */}
      <div className="flex items-center gap-1.5 rounded-lg border border-stone-200/80 bg-stone-50/80 p-1 dark:border-stone-800 dark:bg-stone-950/60">
        <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Presets:
        </span>
        <button
          type="button"
          onClick={() => onLoadPreset('sales_by_category')}
          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-white hover:shadow-xs dark:text-stone-300 dark:hover:bg-stone-800 transition-all"
        >
          <BarChart className="h-3 w-3 text-sky-600 dark:text-sky-400" />
          <span>Ventas Categoría</span>
        </button>
        <button
          type="button"
          onClick={() => onLoadPreset('profit_vs_sales_detail')}
          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-white hover:shadow-xs dark:text-stone-300 dark:hover:bg-stone-800 transition-all"
        >
          <ScatterChart className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>Dispersión + Detail</span>
        </button>
        <button
          type="button"
          onClick={() => onLoadPreset('telemetry_100k_clusters')}
          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-white hover:shadow-xs dark:text-stone-300 dark:hover:bg-stone-800 transition-all"
        >
          <Cpu className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span>Estrés 100k Filas</span>
        </button>
      </div>

      {/* Actions & Metrics */}
      <div className="flex items-center gap-2">
        {latencyMs !== undefined && (
          <div className="flex items-center gap-1.5 rounded-md border border-stone-200/80 bg-stone-50 px-2.5 py-1 font-mono text-xs dark:border-stone-800 dark:bg-stone-950">
            <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {latencyMs.toFixed(2)} ms
            </span>
            {rowCount !== undefined && (
              <span className="text-stone-400 dark:text-stone-600">
                ({rowCount.toLocaleString()} filas)
              </span>
            )}
          </div>
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

        <button
          type="button"
          onClick={onClearShelves}
          className="rounded-md border border-stone-200/80 bg-white p-1.5 text-stone-500 shadow-xs hover:bg-stone-50 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          title="Limpiar estantes"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

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
