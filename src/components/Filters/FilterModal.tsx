import React, { useState, useEffect } from 'react';
import { FilterExpression } from '../../core/ast/types';
import { duckdbEngine } from '../../core/engine/duckdbClient';
import { Filter, Check, X, Search, CheckSquare, Square, Sliders, Loader2 } from 'lucide-react';

interface FilterModalProps {
  filter: FilterExpression;
  tableName: string;
  onSave: (updated: FilterExpression) => void;
  onClose: () => void;
  onRemove: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  filter,
  tableName,
  onSave,
  onClose,
  onRemove,
}) => {
  const isDimension = filter.role === 'dimension';

  // Dimension filter state
  const [distinctValues, setDistinctValues] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Measure range state
  const [minBound, setMinBound] = useState(0);
  const [maxBound, setMaxBound] = useState(100);
  const [rangeMin, setRangeMin] = useState<number>(filter.rangeMin ?? 0);
  const [rangeMax, setRangeMax] = useState<number>(filter.rangeMax ?? 100);

  useEffect(() => {
    let isCancelled = false;
    const fetchBoundsOrValues = async () => {
      try {
        setIsLoading(true);
        if (isDimension) {
          const vals = await duckdbEngine.getDistinctColumnValues(tableName, filter.columnName, 200);
          if (!isCancelled) {
            setDistinctValues(vals);
            if (filter.values && filter.values.length > 0) {
              setSelectedValues(new Set(filter.values.map(String)));
            } else {
              // Default to all selected if new filter
              setSelectedValues(new Set(vals));
            }
          }
        } else {
          const bounds = await duckdbEngine.getColumnMinMax(tableName, filter.columnName);
          if (!isCancelled) {
            setMinBound(bounds.min);
            setMaxBound(bounds.max);
            setRangeMin(filter.rangeMin ?? bounds.min);
            setRangeMax(filter.rangeMax ?? bounds.max);
          }
        }
      } catch (err) {
        console.error('Error cargando valores de filtro:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void fetchBoundsOrValues();
    return () => {
      isCancelled = true;
    };
  }, [tableName, filter.columnName, isDimension]);

  const handleToggleValue = (val: string) => {
    const next = new Set(selectedValues);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    setSelectedValues(next);
  };

  const handleSelectAll = () => {
    setSelectedValues(new Set(distinctValues));
  };

  const handleDeselectAll = () => {
    setSelectedValues(new Set());
  };

  const handleApply = () => {
    if (isDimension) {
      onSave({
        ...filter,
        operator: 'in',
        values: Array.from(selectedValues),
      });
    } else {
      onSave({
        ...filter,
        operator: 'range',
        rangeMin,
        rangeMax,
      });
    }
  };

  const filteredDistinctValues = distinctValues.filter((v) =>
    v.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <div>
              <h3 className="font-editorial text-base font-bold text-stone-900 dark:text-stone-100">
                Filter: {filter.columnName}
              </h3>
              <p className="text-[11px] font-mono text-stone-500">
                {isDimension ? 'Categorical Selection (IN)' : 'Quantitative Range (BETWEEN)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[380px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <Loader2 className="h-6 w-6 animate-spin text-sky-600 mb-2" />
              <span className="text-xs font-mono">Querying DuckDB-WASM...</span>
            </div>
          ) : isDimension ? (
            /* Categorical Filter List */
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search values..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-stone-200 bg-stone-50 py-1.5 pl-8 pr-2.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  None
                </button>
              </div>

              <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-1.5 max-h-[220px] overflow-y-auto space-y-0.5 dark:border-stone-800 dark:bg-stone-950/40">
                {filteredDistinctValues.length === 0 ? (
                  <div className="py-4 text-center text-xs text-stone-400 italic">
                    No matching values found
                  </div>
                ) : (
                  filteredDistinctValues.map((val) => {
                    const isChecked = selectedValues.has(val);
                    return (
                      <div
                        key={val}
                        onClick={() => handleToggleValue(val)}
                        className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-sky-50 text-sky-900 font-medium dark:bg-sky-950/50 dark:text-sky-200'
                            : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        )}
                        <span className="truncate font-mono text-[11.5px]">{val}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="text-[11px] text-stone-500 font-mono text-right">
                {selectedValues.size} of {distinctValues.length} selected
              </div>
            </div>
          ) : (
            /* Measure Range Filter */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 font-medium">
                <Sliders className="h-4 w-4 text-emerald-600" />
                <span>Allowed quantitative range:</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-stone-400">Minimum</label>
                  <input
                    type="number"
                    value={rangeMin}
                    min={minBound}
                    max={rangeMax}
                    onChange={(e) => setRangeMin(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-mono text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                  <div className="mt-1 text-[10px] text-stone-400 font-mono">Min bound: {minBound}</div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-stone-400">Maximum</label>
                  <input
                    type="number"
                    value={rangeMax}
                    min={rangeMin}
                    max={maxBound}
                    onChange={(e) => setRangeMax(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-mono text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                  <div className="mt-1 text-[10px] text-stone-400 font-mono">Max bound: {maxBound}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200/80 bg-stone-50/80 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/60">
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            Remove Filter
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1 rounded-lg bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
