import React, { useState } from 'react';
import { WorksheetTab } from '../../core/ast/types';
import { DashboardSheetExecution } from '../../core/store/worksheetStore';
import { PlotRenderer } from '../Canvas/PlotRenderer';
import {
  LayoutGrid,
  ExternalLink,
  CheckSquare,
  Square,
  BarChart2,
  Columns2,
  Grid,
} from 'lucide-react';

interface DashboardGridProps {
  sheets: WorksheetTab[];
  activeDashboard: WorksheetTab;
  dashboardResults: Record<string, DashboardSheetExecution>;
  theme: 'light' | 'dark';
  onSwitchTab: (tabId: string) => void;
  onSetDashboardSheets: (dashboardId: string, sheetIds: string[]) => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  sheets,
  activeDashboard,
  dashboardResults,
  theme,
  onSwitchTab,
  onSetDashboardSheets,
}) => {
  const [columnsCount, setColumnsCount] = useState<1 | 2>(2);

  const availableWorksheets = sheets.filter((s) => s.type === 'worksheet');
  const selectedSheetIds = activeDashboard.dashboardSheetIds && activeDashboard.dashboardSheetIds.length > 0
    ? activeDashboard.dashboardSheetIds
    : availableWorksheets.map((s) => s.id);

  const toggleSheet = (sheetId: string) => {
    let next: string[];
    if (selectedSheetIds.includes(sheetId)) {
      if (selectedSheetIds.length === 1) return; // Keep at least one
      next = selectedSheetIds.filter((id) => id !== sheetId);
    } else {
      next = [...selectedSheetIds, sheetId];
    }
    onSetDashboardSheets(activeDashboard.id, next);
  };

  const selectedWorksheets = availableWorksheets.filter((s) => selectedSheetIds.includes(s.id));

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* Dashboard Toolbar Header */}
      <div className="flex items-center justify-between border-b border-stone-200/90 bg-white px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900 select-none">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h2 className="font-editorial text-sm font-bold text-stone-900 dark:text-stone-100">
            {activeDashboard.name}
          </h2>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span className="font-mono text-xs text-stone-500">
            {selectedWorksheets.length} visuales activos
          </span>
        </div>

        {/* Worksheets Selector & Grid Density */}
        <div className="flex items-center gap-3">
          {/* Worksheets inclusion pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {availableWorksheets.map((ws) => {
              const isIncluded = selectedSheetIds.includes(ws.id);
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => toggleSheet(ws.id)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono transition-colors ${
                    isIncluded
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
                      : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
                  }`}
                >
                  {isIncluded ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                  <span>{ws.name}</span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-800" />

          {/* Grid Layout Toggle */}
          <div className="flex items-center gap-1 rounded-md border border-stone-200 bg-stone-100 p-0.5 dark:border-stone-800 dark:bg-stone-900">
            <button
              type="button"
              onClick={() => setColumnsCount(1)}
              className={`rounded p-1 text-xs transition-colors ${
                columnsCount === 1 ? 'bg-white shadow-2xs text-stone-900 dark:bg-stone-800 dark:text-stone-100' : 'text-stone-500'
              }`}
              title="1 Columna (Vertical)"
            >
              <Columns2 className="h-3.5 w-3.5 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => setColumnsCount(2)}
              className={`rounded p-1 text-xs transition-colors ${
                columnsCount === 2 ? 'bg-white shadow-2xs text-stone-900 dark:bg-stone-800 dark:text-stone-100' : 'text-stone-500'
              }`}
              title="2 Columnas (Grid)"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedWorksheets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-stone-400">
            <LayoutGrid className="h-10 w-10 text-stone-300 mb-2 dark:text-stone-700" />
            <p className="text-sm font-medium">No hay hojas seleccionadas para este Dashboard.</p>
            <p className="text-xs text-stone-500 mt-1">Activa las hojas arriba para combinarlas en el lienzo.</p>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              columnsCount === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {selectedWorksheets.map((sheet) => {
              const exec = dashboardResults[sheet.id];
              const hasPills = sheet.columns.length > 0 || sheet.rows.length > 0;

              return (
                <div
                  key={sheet.id}
                  className="flex flex-col rounded-xl border border-stone-200/90 bg-white shadow-editorial dark:border-stone-800 dark:bg-stone-900/90 overflow-hidden min-h-[380px]"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-2.5 bg-stone-50/50 dark:border-stone-800 dark:bg-stone-900/50">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      <span className="font-editorial text-xs font-bold text-stone-800 dark:text-stone-200">
                        {sheet.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSwitchTab(sheet.id)}
                      className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono text-stone-500 hover:bg-stone-200/70 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-colors"
                      title="Abrir y editar estantes de esta hoja"
                    >
                      <span>Editar Hoja</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Visual Render Canvas */}
                  <div className="flex-1 p-3">
                    {!hasPills ? (
                      <div className="flex h-full flex-col items-center justify-center text-center text-stone-400 p-6">
                        <p className="text-xs">Esta hoja aún no tiene pastillas en Columns o Rows.</p>
                        <button
                          type="button"
                          onClick={() => onSwitchTab(sheet.id)}
                          className="mt-2 text-xs font-mono text-sky-600 hover:underline dark:text-sky-400"
                        >
                          Ir a configurar {sheet.name} &rarr;
                        </button>
                      </div>
                    ) : exec?.error ? (
                      <div className="flex h-full items-center justify-center text-rose-600 text-xs p-4 text-center">
                        {exec.error}
                      </div>
                    ) : (
                      <div className="h-full w-full min-h-[320px]">
                        <PlotRenderer
                          ast={exec?.ast || null}
                          result={exec?.queryResult || null}
                          theme={theme}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
