import React, { useState } from 'react';
import { WorksheetTab } from '../../core/ast/types';
import { CheckSquare, Square, X, Filter, Sliders, Check, Layers } from 'lucide-react';

interface TargetSheetsModalProps {
  title: string;
  targetName: string;
  type: 'filter' | 'parameter';
  availableSheets: WorksheetTab[];
  currentScope?: 'all' | 'selected';
  currentTargetSheetIds?: string[];
  onSave: (scope: 'all' | 'selected', targetSheetIds: string[]) => void;
  onClose: () => void;
}

export const TargetSheetsModal: React.FC<TargetSheetsModalProps> = ({
  title,
  targetName,
  type,
  availableSheets,
  currentScope = 'all',
  currentTargetSheetIds,
  onSave,
  onClose,
}) => {
  const [scope, setScope] = useState<'all' | 'selected'>(currentScope);
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>(
    currentTargetSheetIds && currentTargetSheetIds.length > 0
      ? currentTargetSheetIds
      : availableSheets.map((s) => s.id)
  );

  const toggleSheet = (sheetId: string) => {
    setSelectedSheetIds((prev) =>
      prev.includes(sheetId) ? prev.filter((id) => id !== sheetId) : [...prev, sheetId]
    );
  };

  const selectAll = () => {
    setSelectedSheetIds(availableSheets.map((s) => s.id));
  };

  const clearAll = () => {
    setSelectedSheetIds([]);
  };

  const handleApply = () => {
    onSave(scope, selectedSheetIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-stone-200/90 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden">
        {/* Header (Tableau Apply to Worksheets Dialog) */}
        <div className="flex items-center justify-between border-b border-stone-200/90 px-5 py-3.5 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              {type === 'filter' ? <Filter className="h-4 w-4" /> : <Sliders className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="font-editorial text-sm font-bold text-stone-900 dark:text-stone-100">
                {title}
              </h3>
              <p className="text-[11px] text-stone-500">
                Tableau Desktop Scope • {targetName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Apply to Worksheets (Scope)
            </label>

            {/* Radio Options */}
            <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/50 p-3 dark:border-stone-800 dark:bg-stone-950/40">
              <label className="flex items-center gap-2.5 text-xs font-medium text-stone-800 dark:text-stone-200 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="h-3.5 w-3.5 text-sky-600 focus:ring-sky-500"
                />
                <span>All worksheets on dashboard</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-medium text-stone-800 dark:text-stone-200 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="selected"
                  checked={scope === 'selected'}
                  onChange={() => setScope('selected')}
                  className="h-3.5 w-3.5 text-sky-600 focus:ring-sky-500"
                />
                <span>Selected worksheets...</span>
              </label>
            </div>
          </div>

          {/* Worksheets Checklist (Tableau Checklist Box) */}
          <div className={`space-y-2 transition-opacity ${scope === 'all' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-stone-500" />
                <span>Select Target Worksheets</span>
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sky-600 hover:underline dark:text-sky-400"
                >
                  All
                </button>
                <span className="text-stone-300 dark:text-stone-700">•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-stone-500 hover:underline dark:text-stone-400"
                >
                  None
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-950 divide-y divide-stone-100 dark:divide-stone-800/60">
              {availableSheets.map((ws) => {
                const isChecked = selectedSheetIds.includes(ws.id);
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => toggleSheet(ws.id)}
                    className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs font-medium text-stone-800 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-900/60 rounded-md transition-colors"
                  >
                    <span className="truncate">{ws.name}</span>
                    {isChecked ? (
                      <CheckSquare className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-stone-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 italic">
              Unchecked worksheets will keep their data intact without being affected by this control.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-stone-200/90 px-5 py-3 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
