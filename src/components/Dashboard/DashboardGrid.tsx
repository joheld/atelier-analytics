import React, { useState } from 'react';
import {
  WorksheetTab,
  DatasetColumn,
  Parameter,
  FilterExpression,
} from '../../core/ast/types';
import { DashboardSheetExecution } from '../../core/store/worksheetStore';
import { PlotRenderer } from '../Canvas/PlotRenderer';
import { CanvasErrorBoundary } from '../Canvas/CanvasErrorBoundary';
import { TargetSheetsModal } from './TargetSheetsModal';
import {
  LayoutGrid,
  ExternalLink,
  CheckSquare,
  Square,
  BarChart2,
  Columns2,
  Grid,
  Filter,
  Plus,
  Trash2,
  Sliders,
  Minus,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface DashboardGridProps {
  sheets: WorksheetTab[];
  activeDashboard: WorksheetTab;
  dashboardResults: Record<string, DashboardSheetExecution>;
  theme: 'light' | 'dark';
  datasetColumns?: DatasetColumn[];
  parameters: Parameter[];
  onSwitchTab: (tabId: string) => void;
  onSetDashboardSheets: (dashboardId: string, sheetIds: string[]) => void;
  onAddDashboardFilter: (dashboardId: string, filter: FilterExpression) => void;
  onUpdateDashboardFilter: (dashboardId: string, filter: FilterExpression) => void;
  onRemoveDashboardFilter: (dashboardId: string, filterId: string) => void;
  onSetFilterTargetSheets: (
    dashboardId: string,
    filterId: string,
    scope: 'all' | 'selected',
    targetSheetIds: string[]
  ) => void;
  onSetParameterValue: (paramId: string, value: string | number | boolean) => void;
  onSetParameterTargetSheets: (
    paramId: string,
    scope: 'all' | 'selected',
    targetSheetIds: string[]
  ) => void;
  onOpenFilterModal: (filter: FilterExpression) => void;
  onOpenParameterModal: (param: Parameter) => void;
  onToggleUseAsFilter?: (dashboardId: string, sheetId: string, useAsFilter: boolean) => void;
  onSetCrossFilter?: (
    dashboardId: string,
    crossFilter: { sourceSheetId: string; columnName: string; value: string | number | boolean } | null
  ) => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  sheets,
  activeDashboard,
  dashboardResults,
  theme,
  datasetColumns = [],
  parameters,
  onSwitchTab,
  onSetDashboardSheets,
  onAddDashboardFilter,
  onRemoveDashboardFilter,
  onSetFilterTargetSheets,
  onSetParameterValue,
  onSetParameterTargetSheets,
  onOpenFilterModal,
  onOpenParameterModal,
  onToggleUseAsFilter,
  onSetCrossFilter,
}) => {
  const [columnsCount, setColumnsCount] = useState<1 | 2>(2);
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);

  // Modal State for Scoping Target Sheets (Tableau "Apply to Worksheets")
  const [scopingTarget, setScopingTarget] = useState<{
    type: 'filter' | 'parameter';
    id: string;
    title: string;
    name: string;
    currentScope?: 'all' | 'selected';
    currentTargetSheetIds?: string[];
  } | null>(null);

  const availableWorksheets = sheets.filter((s) => s.type === 'worksheet');
  const selectedSheetIds =
    activeDashboard.dashboardSheetIds && activeDashboard.dashboardSheetIds.length > 0
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

  const selectedWorksheets = availableWorksheets.filter((s) =>
    selectedSheetIds.includes(s.id)
  );

  const dashboardFilters = activeDashboard.dashboardFilters || [];
  const visibleParams = parameters.filter((p) => p.showControl !== false);

  const handleCreateFilterForColumn = (col: DatasetColumn) => {
    setIsAddFilterOpen(false);
    const newFilter: FilterExpression = {
      id: `dash_filter_${Date.now()}`,
      columnName: col.name,
      role: col.role,
      dataType: col.dataType,
      operator: col.dataType === 'number' ? 'range' : 'in',
      values: [],
      applyScope: 'all',
      targetSheetIds: selectedWorksheets.map((s) => s.id),
    };
    onAddDashboardFilter(activeDashboard.id, newFilter);
    onOpenFilterModal(newFilter);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* 1. Dashboard Toolbar Header */}
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
                columnsCount === 1
                  ? 'bg-white shadow-2xs text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                  : 'text-stone-500'
              }`}
              title="1 Columna (Vertical)"
            >
              <Columns2 className="h-3.5 w-3.5 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => setColumnsCount(2)}
              className={`rounded p-1 text-xs transition-colors ${
                columnsCount === 2
                  ? 'bg-white shadow-2xs text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                  : 'text-stone-500'
              }`}
              title="2 Columnas (Grid)"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Dashboard Controls Dock (Filters & Parameters with Sheet Scope) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-stone-200/80 bg-stone-100/70 px-4 py-2 dark:border-stone-800 dark:bg-stone-900/60 transition-all select-none">
        {/* DASHBOARD FILTERS SECTION */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 font-mono pr-2 border-r border-stone-200 dark:border-stone-800">
            <Filter className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Filtros ({dashboardFilters.length})</span>
          </div>

          {/* Filter Cards */}
          <div className="flex flex-wrap items-center gap-2">
            {dashboardFilters.map((df) => {
              const scopeLabel =
                df.applyScope === 'selected'
                  ? `${df.targetSheetIds?.length || 0} hojas`
                  : 'Todas';

              const filterSummary =
                df.operator === 'range'
                  ? `${df.rangeMin ?? 'min'} - ${df.rangeMax ?? 'max'}`
                  : df.values && df.values.length > 0
                  ? df.values.slice(0, 2).join(', ') + (df.values.length > 2 ? ` (+${df.values.length - 2})` : '')
                  : 'Todos';

              return (
                <div
                  key={df.id}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-300/80 bg-white px-2.5 py-1 text-xs shadow-2xs dark:border-sky-800 dark:bg-stone-950"
                >
                  {/* Click to edit filter values */}
                  <div
                    onClick={() => onOpenFilterModal(df)}
                    className="flex items-center gap-1 cursor-pointer hover:opacity-80"
                    title="Editar valores de este filtro"
                  >
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {df.columnName}:
                    </span>
                    <span className="font-mono text-[11px] text-sky-700 dark:text-sky-300 max-w-[120px] truncate">
                      {filterSummary}
                    </span>
                  </div>

                  {/* Apply to Worksheets Scope Button (Tableau Desktop) */}
                  <button
                    type="button"
                    onClick={() =>
                      setScopingTarget({
                        type: 'filter',
                        id: df.id,
                        title: 'Aplicar Filtro a Hojas de Trabajo',
                        name: `Filtro: ${df.columnName}`,
                        currentScope: df.applyScope,
                        currentTargetSheetIds: df.targetSheetIds,
                      })
                    }
                    className="flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-600 hover:bg-sky-100 hover:text-sky-900 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-sky-950 transition-colors"
                    title="Configurar a qué hojas aplica este filtro"
                  >
                    <Layers className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400" />
                    <span>{scopeLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveDashboardFilter(activeDashboard.id, df.id)}
                    className="rounded p-0.5 text-stone-400 hover:text-rose-600 transition-colors"
                    title="Eliminar filtro del dashboard"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}

            {/* Add Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAddFilterOpen((prev) => !prev)}
                className="flex items-center gap-1 rounded-md border border-dashed border-sky-300 bg-sky-50/50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Añadir Filtro</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {isAddFilterOpen && (
                <div className="absolute left-0 top-full mt-1 z-30 w-52 rounded-xl border border-stone-200 bg-white py-1 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-60 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                    Selecciona Columna
                  </div>
                  {datasetColumns.length === 0 ? (
                    <div className="p-2 text-xs text-stone-400 italic text-center">
                      No hay columnas
                    </div>
                  ) : (
                    datasetColumns.map((col) => (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => handleCreateFilterForColumn(col)}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-stone-800 hover:bg-sky-50 dark:text-stone-200 dark:hover:bg-sky-950/60"
                      >
                        <span className="truncate">{col.name}</span>
                        <span className="text-[10px] uppercase font-mono text-stone-400">
                          {col.dataType}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-stone-300 dark:bg-stone-800" />

        {/* DASHBOARD PARAMETERS SECTION WITH SCOPE */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 font-mono pr-2 border-r border-stone-200 dark:border-stone-800">
            <Sliders className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Parámetros ({visibleParams.length})</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {visibleParams.map((param) => {
              const isNumber = param.dataType === 'number';
              const isBoolean = param.dataType === 'boolean';
              const scopeLabel =
                param.applyScope === 'selected'
                  ? `${param.targetSheetIds?.length || 0} hojas`
                  : 'Todas';

              return (
                <div
                  key={param.id}
                  className="flex items-center gap-2 rounded-lg border border-amber-300/80 bg-white px-2.5 py-1 text-xs shadow-2xs dark:border-amber-800 dark:bg-stone-950"
                >
                  <div
                    onClick={() => onOpenParameterModal(param)}
                    className="flex items-center gap-1 cursor-pointer font-semibold text-stone-800 dark:text-stone-200 hover:text-amber-700"
                    title="Editar parámetro"
                  >
                    <span className="font-mono text-amber-600">[{param.name}]</span>:
                  </div>

                  {/* Interactive Control */}
                  {param.allowableType === 'list' && param.listItems && param.listItems.length > 0 ? (
                    <select
                      value={String(param.currentValue)}
                      onChange={(e) =>
                        onSetParameterValue(
                          param.id,
                          isNumber ? Number(e.target.value) : e.target.value
                        )
                      }
                      className="rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-900 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 cursor-pointer"
                    >
                      {param.listItems.map((item, idx) => (
                        <option key={`${item.value}-${idx}`} value={String(item.value)}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  ) : param.allowableType === 'range' && isNumber && param.min !== undefined && param.max !== undefined ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = Number(param.currentValue) || 0;
                          const step = param.step || 1;
                          const next = Math.max(param.min!, cur - step);
                          onSetParameterValue(
                            param.id,
                            param.numberSubtype === 'integer' ? Math.round(next) : next
                          );
                        }}
                        className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <input
                        type="number"
                        step={param.step || 1}
                        min={param.min}
                        max={param.max}
                        value={Number(param.currentValue)}
                        onChange={(e) => onSetParameterValue(param.id, Number(e.target.value))}
                        className="w-16 rounded border border-stone-200 bg-stone-50 px-1 py-0.5 text-center font-mono text-xs font-bold text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const cur = Number(param.currentValue) || 0;
                          const step = param.step || 1;
                          const next = Math.min(param.max!, cur + step);
                          onSetParameterValue(
                            param.id,
                            param.numberSubtype === 'integer' ? Math.round(next) : next
                          );
                        }}
                        className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ) : isBoolean ? (
                    <select
                      value={String(param.currentValue)}
                      onChange={(e) => onSetParameterValue(param.id, e.target.value === 'true')}
                      className="rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-900 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 cursor-pointer"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input
                      type={isNumber ? 'number' : 'text'}
                      value={String(param.currentValue)}
                      onChange={(e) =>
                        onSetParameterValue(
                          param.id,
                          isNumber ? Number(e.target.value) : e.target.value
                        )
                      }
                      className="w-20 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-xs text-stone-900 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    />
                  )}

                  {/* Parameter Target Sheets Scope Button (Tableau Desktop) */}
                  <button
                    type="button"
                    onClick={() =>
                      setScopingTarget({
                        type: 'parameter',
                        id: param.id,
                        title: 'Alcance del Parámetro',
                        name: `Parámetro: [${param.name}]`,
                        currentScope: param.applyScope,
                        currentTargetSheetIds: param.targetSheetIds,
                      })
                    }
                    className="flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-600 hover:bg-amber-100 hover:text-amber-900 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-amber-950 transition-colors"
                    title="Configurar a qué hojas afecta este parámetro"
                  >
                    <Layers className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                    <span>{scopeLabel}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Cross-Filter Banner (Tableau Dashboard Actions) */}
      {activeDashboard.dashboardCrossFilter && (
        <div className="flex items-center justify-between bg-amber-500/10 px-4 py-2 border-b border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Acción de Filtro Activa: <strong className="font-mono">{activeDashboard.dashboardCrossFilter.columnName}</strong> = <span className="font-bold underline">{String(activeDashboard.dashboardCrossFilter.value)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSetCrossFilter?.(activeDashboard.id, null)}
            className="rounded bg-amber-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900 hover:bg-amber-300 dark:bg-amber-900/60 dark:text-amber-200 transition-colors"
          >
            × Limpiar Filtro Cruzado
          </button>
        </div>
      )}

      {/* 3. Grid Canvas with Visuals */}
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

              // Discover which dashboard filters target this specific worksheet
              const appliedDashboardFilters = dashboardFilters.filter(
                (df) =>
                  !df.applyScope ||
                  df.applyScope === 'all' ||
                  (df.targetSheetIds && df.targetSheetIds.includes(sheet.id))
              );

              return (
                <div
                  key={sheet.id}
                  className="flex flex-col rounded-xl border border-stone-200/90 bg-white shadow-editorial dark:border-stone-800 dark:bg-stone-900/90 overflow-hidden min-h-[380px]"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-2.5 bg-stone-50/50 dark:border-stone-800 dark:bg-stone-900/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <BarChart2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="font-editorial text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                        {sheet.name}
                      </span>

                      {/* Applied Filters Badge (Tableau Transparency) */}
                      {appliedDashboardFilters.length > 0 ? (
                        <div className="flex items-center gap-1 overflow-hidden">
                          {appliedDashboardFilters.map((f) => (
                            <span
                              key={f.id}
                              className="inline-flex items-center gap-1 rounded bg-sky-100/80 px-1.5 py-0.5 text-[9.5px] font-mono font-medium text-sky-800 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 shrink-0"
                            >
                              <Filter className="h-2 w-2" />
                              {f.columnName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">
                          (Sin filtros de dashboard)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleUseAsFilter?.(activeDashboard.id, sheet.id, !sheet.useAsFilter)}
                        className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono transition-colors ${
                          sheet.useAsFilter
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 font-bold'
                            : 'text-stone-400 hover:bg-stone-200/70 dark:hover:bg-stone-800 hover:text-stone-700'
                        }`}
                        title="Usar esta hoja como filtro interactivo (Tableau Dashboard Action)"
                      >
                        <Filter className="h-3 w-3" />
                        <span>{sheet.useAsFilter ? 'Filtro Activo' : 'Usar como filtro'}</span>
                      </button>

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
                  </div>

                  {/* Visual Render Canvas */}
                  <div className="flex-1 p-3 flex flex-col">
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
                      <div className="h-full w-full min-h-[300px] flex-1 flex flex-col">
                        <CanvasErrorBoundary fallbackTitle={`Error en ${sheet.name}`}>
                          <PlotRenderer
                            ast={exec?.ast || null}
                            result={exec?.queryResult || null}
                            theme={theme}
                          />
                        </CanvasErrorBoundary>

                        {/* Interactive Cross-Filter Chips when Use As Filter is active */}
                        {sheet.useAsFilter && exec?.queryResult?.rows && exec.queryResult.rows.length > 0 && (
                          <div className="mt-2 border-t border-stone-100 pt-2 dark:border-stone-800">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] font-mono text-stone-400 mr-1">Filtrar por:</span>
                              {exec.queryResult.rows.slice(0, 8).map((row, idx) => {
                                const dimCol =
                                  sheet.columns.find((c) => c.role === 'dimension') ||
                                  sheet.rows.find((c) => c.role === 'dimension');
                                if (!dimCol) return null;
                                const val = row[dimCol.columnName] ?? Object.values(row)[0];
                                const isSelected =
                                  activeDashboard.dashboardCrossFilter?.value === val;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        onSetCrossFilter?.(activeDashboard.id, null);
                                      } else {
                                        onSetCrossFilter?.(activeDashboard.id, {
                                          sourceSheetId: sheet.id,
                                          columnName: dimCol.columnName,
                                          value: val as any,
                                        });
                                      }
                                    }}
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-all ${
                                      isSelected
                                        ? 'bg-amber-600 text-white font-bold ring-2 ring-amber-400 shadow-xs'
                                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300'
                                    }`}
                                  >
                                    {String(val)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Target Sheets Scoping Modal (Tableau Apply to Worksheets Dialog) */}
      {scopingTarget && (
        <TargetSheetsModal
          title={scopingTarget.title}
          targetName={scopingTarget.name}
          type={scopingTarget.type}
          availableSheets={availableWorksheets}
          currentScope={scopingTarget.currentScope}
          currentTargetSheetIds={scopingTarget.currentTargetSheetIds}
          onSave={(scope, sheetIds) => {
            if (scopingTarget.type === 'filter') {
              onSetFilterTargetSheets(activeDashboard.id, scopingTarget.id, scope, sheetIds);
            } else {
              onSetParameterTargetSheets(scopingTarget.id, scope, sheetIds);
            }
          }}
          onClose={() => setScopingTarget(null)}
        />
      )}
    </div>
  );
};
