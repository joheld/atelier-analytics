import React from 'react';
import { Parameter } from '../../core/ast/types';
import { Sliders, X, Calendar, Minus, Plus } from 'lucide-react';

interface ParameterControlsBarProps {
  parameters: Parameter[];
  onSetParameterValue: (paramId: string, value: string | number | boolean) => void;
  onToggleParameterControl: (paramId: string) => void;
  onOpenParameterModal: (param: Parameter) => void;
}

export const ParameterControlsBar: React.FC<ParameterControlsBarProps> = ({
  parameters,
  onSetParameterValue,
  onToggleParameterControl,
  onOpenParameterModal,
}) => {
  // Only show parameters that have showControl enabled (or default true)
  const visibleParams = parameters.filter((p) => p.showControl !== false);

  if (visibleParams.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-stone-200/80 bg-white/60 px-4 py-2 backdrop-blur-xs dark:border-stone-800/80 dark:bg-stone-900/60 transition-all select-none">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono pr-2 border-r border-stone-200 dark:border-stone-800">
        <Sliders className="h-3.5 w-3.5" />
        <span>Parameters</span>
      </div>

      {visibleParams.map((param) => {
        const isNumber = param.dataType === 'number';
        const isString = param.dataType === 'string';
        const isDate = param.dataType === 'date';
        const isBoolean = param.dataType === 'boolean';

        return (
          <div
            key={param.id}
            className="group flex flex-col rounded-lg border border-stone-200 bg-white px-3 py-1.5 shadow-2xs dark:border-stone-800 dark:bg-stone-950 min-w-[190px] max-w-[260px] transition-all hover:border-amber-300 dark:hover:border-amber-800"
          >
            {/* Header: Parameter Name + Tableau Badge + Actions */}
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div
                className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                onClick={() => onOpenParameterModal(param)}
                title="Click to edit parameter"
              >
                {isNumber ? (
                  <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    #
                  </span>
                ) : isString ? (
                  <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    Abc
                  </span>
                ) : isDate ? (
                  <Calendar className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                ) : (
                  <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    T/F
                  </span>
                )}
                <span className="truncate text-xs font-semibold text-stone-800 dark:text-stone-200 hover:text-amber-700 dark:hover:text-amber-300">
                  {param.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onToggleParameterControl(param.id)}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-opacity"
                title="Hide parameter card"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Interactive Control according to Allowable Values (Tableau Spec) */}
            {param.allowableType === 'list' && param.listItems && param.listItems.length > 0 ? (
              <select
                value={String(param.currentValue)}
                onChange={(e) =>
                  onSetParameterValue(
                    param.id,
                    isNumber ? Number(e.target.value) : e.target.value
                  )
                }
                className="w-full rounded border border-stone-200 bg-stone-50/70 px-2 py-1 text-xs text-stone-900 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 font-sans cursor-pointer"
              >
                {param.listItems.map((item, idx) => (
                  <option key={`${item.value}-${idx}`} value={String(item.value)}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : param.allowableType === 'range' && isNumber && param.min !== undefined && param.max !== undefined ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(param.currentValue) || 0;
                      const step = param.step || 1;
                      const next = Math.max(param.min!, cur - step);
                      onSetParameterValue(param.id, param.numberSubtype === 'integer' ? Math.round(next) : next);
                    }}
                    className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    title="Decrease step"
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
                    className="w-20 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-center font-mono text-xs font-bold text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const cur = Number(param.currentValue) || 0;
                      const step = param.step || 1;
                      const next = Math.min(param.max!, cur + step);
                      onSetParameterValue(param.id, param.numberSubtype === 'integer' ? Math.round(next) : next);
                    }}
                    className="rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    title="Increase step"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
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
            ) : isBoolean ? (
              <select
                value={String(param.currentValue)}
                onChange={(e) => onSetParameterValue(param.id, e.target.value === 'true')}
                className="w-full rounded border border-stone-200 bg-stone-50/70 px-2 py-1 text-xs text-stone-900 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 cursor-pointer"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : (
              <input
                type={isNumber ? 'number' : isDate ? 'date' : 'text'}
                step={param.numberSubtype === 'integer' ? '1' : 'any'}
                value={String(param.currentValue)}
                onChange={(e) =>
                  onSetParameterValue(
                    param.id,
                    isNumber ? Number(e.target.value) : e.target.value
                  )
                }
                className="w-full rounded border border-stone-200 bg-stone-50/70 px-2 py-1 font-mono text-xs text-stone-900 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
