import React, { useState } from 'react';
import { DatasetMeta, Pill, Parameter, CalculatedField, DataType, FieldRole } from '../../core/ast/types';
import {
  Search,
  Type,
  Calendar,
  Hash,
  Plus,
  Table,
  CheckCircle2,
  FileCode,
  Calculator,
  Sliders,
  Edit2,
  Trash2,
} from 'lucide-react';

interface DataSidebarProps {
  currentDataset: DatasetMeta | null;
  parameters: Parameter[];
  calculatedFields: CalculatedField[];
  onAddPill: (shelf: 'columns' | 'rows', pill: Pill) => void;
  onOpenCalculatedFieldModal: (field?: CalculatedField) => void;
  onDeleteCalculatedField: (fieldId: string) => void;
  onOpenParameterModal: (param?: Parameter) => void;
  onSetParameterValue: (paramId: string, val: string | number | boolean) => void;
  onDeleteParameter: (paramId: string) => void;
}

export const DataSidebar: React.FC<DataSidebarProps> = ({
  currentDataset,
  parameters,
  calculatedFields,
  onAddPill,
  onOpenCalculatedFieldModal,
  onDeleteCalculatedField,
  onOpenParameterModal,
  onSetParameterValue,
  onDeleteParameter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const columns = currentDataset?.columns || [];
  const filteredColumns = columns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dimensions = filteredColumns.filter((c) => c.role === 'dimension');
  const measures = filteredColumns.filter((c) => c.role === 'measure');

  const makePill = (
    colName: string,
    role: FieldRole,
    dataType: DataType,
    isCalculated?: boolean,
    formula?: string
  ): Pill => ({
    id: `${colName}_${Date.now()}`,
    columnName: colName,
    role,
    dataType,
    aggregation: role === 'measure' ? 'SUM' : undefined,
    isCalculated,
    formula,
  });

  const handleDragStart = (e: React.DragEvent, col: typeof columns[0]) => {
    const pill = makePill(col.name, col.role, col.dataType, col.isCalculated, col.formula);
    e.dataTransfer.setData('application/json', JSON.stringify(pill));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-stone-200/90 bg-stone-50/70 dark:border-stone-800 dark:bg-stone-950/80 select-none">
      {/* Dataset Header */}
      <div className="p-3 border-b border-stone-200/80 dark:border-stone-800">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
          <span className="font-mono uppercase tracking-wider text-[11px]">
            Campos del Dataset
          </span>
          {currentDataset && (
            <button
              type="button"
              onClick={() => onOpenCalculatedFieldModal()}
              className="flex items-center gap-1 rounded bg-stone-200/80 px-1.5 py-0.5 text-[10.5px] font-mono text-stone-700 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              title="Crear un nuevo campo calculado con DuckDB"
            >
              <Calculator className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>+ Cálculo</span>
            </button>
          )}
        </div>

        {currentDataset ? (
          <div className="mt-2 rounded-md border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-medium text-stone-900 dark:text-stone-100">
              <Table className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{currentDataset.name}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-500 font-mono">
              <span className="tabular-nums font-semibold">{currentDataset.rowCount.toLocaleString()} filas</span>
              <span>•</span>
              <span>{columns.length} campos</span>
            </div>
          </div>
        ) : (
          <div className="mt-2 rounded-md border border-dashed border-stone-300 p-2.5 text-center dark:border-stone-700">
            <FileCode className="mx-auto h-4 w-4 text-stone-400" />
            <p className="mt-1 text-[11px] text-stone-500">Esperando archivo...</p>
          </div>
        )}
      </div>

      {currentDataset ? (
        <>
          {/* Field Search Input */}
          <div className="p-2.5 border-b border-stone-200/80 dark:border-stone-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-stone-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Field Lists (Dimensions & Measures) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* DIMENSIONS SECTION (BLUE) */}
            <div>
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 font-mono">
                  Dimensiones ({dimensions.length})
                </span>
                <span className="text-[10px] text-stone-400 italic font-serif">Group By</span>
              </div>

              <div className="space-y-1">
                {dimensions.map((col) => {
                  const calcObj = calculatedFields.find((cf) => cf.name === col.name);

                  return (
                    <div
                      key={col.name}
                      draggable
                      onDragStart={(e) => handleDragStart(e, col)}
                      className="group flex items-center justify-between rounded-md border border-transparent px-2 py-1 text-xs text-stone-700 hover:border-sky-300 hover:bg-sky-50/70 hover:text-sky-900 cursor-grab active:cursor-grabbing transition-all dark:text-stone-300 dark:hover:border-sky-800 dark:hover:bg-sky-950/40 dark:hover:text-sky-200"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {col.isCalculated ? (
                          <span className="font-mono font-bold text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">
                            =Abc
                          </span>
                        ) : col.dataType === 'date' ? (
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                        ) : (
                          <Type className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                        )}
                        <span className="truncate font-mono text-[11.5px]">{col.name}</span>
                      </div>

                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                        {calcObj && (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenCalculatedFieldModal(calcObj)}
                              className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                              title="Editar fórmula"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCalculatedField(calcObj.id)}
                              className="rounded p-0.5 text-stone-400 hover:text-rose-600"
                              title="Eliminar campo calculado"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onAddPill('columns', makePill(col.name, col.role, col.dataType, col.isCalculated, col.formula))}
                          className="rounded p-0.5 text-sky-600 hover:bg-sky-200/50 dark:hover:bg-sky-900/60"
                          title="Añadir a Columns (X)"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MEASURES SECTION (GREEN) */}
            <div>
              <div className="flex items-center justify-between pb-1.5 pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">
                  Métricas ({measures.length})
                </span>
                <span className="text-[10px] text-stone-400 italic font-serif">Agregación</span>
              </div>

              <div className="space-y-1">
                {measures.map((col) => {
                  const calcObj = calculatedFields.find((cf) => cf.name === col.name);

                  return (
                    <div
                      key={col.name}
                      draggable
                      onDragStart={(e) => handleDragStart(e, col)}
                      className="group flex items-center justify-between rounded-md border border-transparent px-2 py-1 text-xs text-stone-700 hover:border-emerald-300 hover:bg-emerald-50/70 hover:text-emerald-900 cursor-grab active:cursor-grabbing transition-all dark:text-stone-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {col.isCalculated ? (
                          <span className="font-mono font-bold text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">
                            =#
                          </span>
                        ) : (
                          <Hash className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span className="truncate font-mono text-[11.5px]">{col.name}</span>
                      </div>

                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                        {calcObj && (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenCalculatedFieldModal(calcObj)}
                              className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                              title="Editar fórmula"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCalculatedField(calcObj.id)}
                              className="rounded p-0.5 text-stone-400 hover:text-rose-600"
                              title="Eliminar campo calculado"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onAddPill('rows', makePill(col.name, col.role, col.dataType, col.isCalculated, col.formula))}
                          className="rounded p-0.5 text-emerald-600 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/60"
                          title="Añadir a Rows (Y)"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PARAMETERS SECTION (AMBER) */}
            <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
              <div className="flex items-center justify-between pb-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono">
                  <Sliders className="h-3 w-3" />
                  <span>Parámetros ({parameters.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenParameterModal()}
                  className="flex items-center gap-1 rounded bg-stone-200/80 px-1.5 py-0.5 text-[10px] font-mono text-stone-700 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  title="Crear un nuevo parámetro dinámico"
                >
                  <Plus className="h-2.5 w-2.5" />
                  <span>Nuevo</span>
                </button>
              </div>

              {parameters.length === 0 ? (
                <p className="text-[11px] text-stone-400 italic">No hay parámetros definidos.</p>
              ) : (
                <div className="space-y-2 mt-1">
                  {parameters.map((param) => (
                    <div
                      key={param.id}
                      className="rounded-md border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900/90 shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-300 truncate">
                          [{param.name}]
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenParameterModal(param)}
                            className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                            title="Editar parámetro"
                          >
                            <Edit2 className="h-2.5 w-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteParameter(param.id)}
                            className="rounded p-0.5 text-stone-400 hover:text-rose-600"
                            title="Eliminar parámetro"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Interactive Control */}
                      {param.min !== undefined && param.max !== undefined && param.dataType === 'number' ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
                            <span>{param.min}</span>
                            <span className="font-bold text-stone-900 dark:text-stone-100">{param.currentValue}</span>
                            <span>{param.max}</span>
                          </div>
                          <input
                            type="range"
                            min={param.min}
                            max={param.max}
                            step={param.step || 1}
                            value={Number(param.currentValue)}
                            onChange={(e) => onSetParameterValue(param.id, Number(e.target.value))}
                            className="w-full accent-amber-600 h-1 cursor-pointer"
                          />
                        </div>
                      ) : (
                        <input
                          type={param.dataType === 'number' ? 'number' : 'text'}
                          value={String(param.currentValue)}
                          onChange={(e) =>
                            onSetParameterValue(
                              param.id,
                              param.dataType === 'number' ? Number(e.target.value) : e.target.value
                            )
                          }
                          className="w-full rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center text-stone-400">
          <p className="text-xs leading-relaxed">
            Los campos aparecerán aquí una vez cargues un archivo.
          </p>
        </div>
      )}

      {/* Engine Status Footer */}
      <div className="p-2.5 border-t border-stone-200/80 bg-stone-100/40 dark:border-stone-800 dark:bg-stone-900/40">
        <div className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">DuckDB-WASM OLAP</span>
          <span className="text-[10px] text-stone-400 ml-auto font-mono">Zero-Copy</span>
        </div>
      </div>
    </aside>
  );
};
