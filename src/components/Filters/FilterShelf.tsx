import React, { useState } from 'react';
import { FilterExpression, Pill } from '../../core/ast/types';
import { Filter as FilterIcon, X, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface FilterShelfProps {
  filters: FilterExpression[];
  onAddFilterPill: (pill: Pill) => void;
  onEditFilter: (filter: FilterExpression) => void;
  onRemoveFilter: (filterId: string) => void;
  placeholder?: string;
}

export const FilterShelf: React.FC<FilterShelfProps> = ({
  filters,
  onAddFilterPill,
  onEditFilter,
  onRemoveFilter,
  placeholder = 'Drop fields here to filter the view...',
}) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const droppedPill = JSON.parse(dataStr) as Pill;
        onAddFilterPill(droppedPill);
      }
    } catch (err) {
      console.error('Error processing pill in Filters:', err);
    }
  };

  const getFilterBadgeSummary = (f: FilterExpression) => {
    if (f.role === 'measure') {
      if (f.rangeMin !== undefined && f.rangeMax !== undefined) {
        return `${f.columnName} (${f.rangeMin}..${f.rangeMax})`;
      }
      return `${f.columnName}`;
    }
    if (f.values && f.values.length > 0) {
      if (f.values.length <= 2) {
        return `${f.columnName}: ${f.values.join(', ')}`;
      }
      return `${f.columnName} (${f.values.length} sel.)`;
    }
    return `${f.columnName} (All)`;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex items-center gap-2 border-b border-stone-200/80 px-3 py-1.5 transition-colors duration-150 dark:border-stone-800 ${
        isOver
          ? 'bg-amber-50/70 dark:bg-amber-950/20 ring-1 ring-amber-400/50'
          : 'bg-stone-50/50 hover:bg-stone-100/50 dark:bg-stone-900/40 dark:hover:bg-stone-900/60'
      }`}
    >
      {/* Shelf Header Label */}
      <div className="flex w-24 shrink-0 items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400">
        <FilterIcon className="h-3.5 w-3.5 text-stone-500" />
        <span className="uppercase tracking-wider text-[11px] font-mono">Filters</span>
      </div>

      {/* Filter Badges Container */}
      <div className="flex flex-1 flex-wrap items-center gap-1.5 min-h-[28px]">
        {filters.length === 0 ? (
          <span className="text-xs italic text-stone-400 select-none dark:text-stone-600 font-sans">
            {placeholder}
          </span>
        ) : (
          filters.map((f) => (
            <div
              key={f.id}
              onClick={() => onEditFilter(f)}
              className="group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm transition-all duration-150 cursor-pointer select-none bg-stone-800 text-stone-100 hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 border border-stone-700"
              title="Click to configure filter"
            >
              <SlidersHorizontal className="h-3 w-3 text-amber-400 opacity-90" />
              <span className="truncate max-w-[170px] font-mono tracking-tight text-[11px]">
                {getFilterBadgeSummary(f)}
              </span>

              <ChevronDown className="h-3 w-3 opacity-60" />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFilter(f.id);
                }}
                className="rounded p-0.5 hover:bg-black/30 focus:outline-none"
                title="Eliminar filtro"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
