import React, { useState, useRef, useEffect } from 'react';
import { Pill, AggregationFunction, ShelfId } from '../../core/ast/types';
import { ChevronDown, X, Hash, Calendar, Type } from 'lucide-react';

interface PillBadgeProps {
  pill: Pill;
  shelf: ShelfId;
  onRemove: () => void;
  onSetAggregation?: (agg: AggregationFunction) => void;
  onSetSort?: (sort: 'asc' | 'desc' | 'none') => void;
  onSetDateTrunc?: (trunc: 'year' | 'quarter' | 'month' | 'day') => void;
}

export const PillBadge: React.FC<PillBadgeProps> = ({
  pill,
  shelf: _shelf,
  onRemove,
  onSetAggregation,
  onSetSort,
  onSetDateTrunc,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDimension = pill.role === 'dimension';
  const isMeasure = pill.role === 'measure';

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(pill));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const getLabel = () => {
    if (isMeasure && pill.aggregation) {
      return `${pill.aggregation}(${pill.columnName})`;
    }
    if (pill.dateTruncation) {
      return `${pill.dateTruncation.toUpperCase()}(${pill.columnName})`;
    }
    return pill.columnName;
  };

  const renderIcon = () => {
    if (pill.dataType === 'date') return <Calendar className="h-3 w-3 mr-1 opacity-80" />;
    if (pill.dataType === 'number') return <Hash className="h-3 w-3 mr-1 opacity-80" />;
    return <Type className="h-3 w-3 mr-1 opacity-80" />;
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
        isDimension
          ? 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600'
          : 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600'
      }`}
    >
      <span className="flex items-center">
        {renderIcon()}
        <span className="truncate max-w-[140px] font-mono tracking-tight">{getLabel()}</span>
      </span>

      {/* Pill Dropdown Toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className="rounded p-0.5 hover:bg-black/20 focus:outline-none"
        title="Opciones de campo"
      >
        <ChevronDown className="h-3 w-3" />
      </button>

      {/* Pill Remove */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="rounded p-0.5 hover:bg-black/20 focus:outline-none"
        title="Eliminar pastilla"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Context Menu Dropdown */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-stone-200 bg-white py-1.5 shadow-xl dark:border-stone-800 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
        >
          {isMeasure && onSetAggregation && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Agregación
              </div>
              {(['SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'COUNT_DISTINCT', 'MEDIAN'] as AggregationFunction[]).map((agg) => (
                <button
                  key={agg}
                  type="button"
                  onClick={() => {
                    onSetAggregation(agg);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                    pill.aggregation === agg ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                >
                  {agg}
                </button>
              ))}
              <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
            </>
          )}

          {isDimension && onSetSort && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Orden
              </div>
              <button
                type="button"
                onClick={() => {
                  onSetSort('asc');
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  pill.sort === 'asc' ? 'font-bold text-sky-600 dark:text-sky-400' : ''
                }`}
              >
                Ascendente
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetSort('desc');
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  pill.sort === 'desc' ? 'font-bold text-sky-600 dark:text-sky-400' : ''
                }`}
              >
                Descendente
              </button>
              <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
            </>
          )}

          {pill.dataType === 'date' && onSetDateTrunc && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Truncamiento Fecha
              </div>
              {(['year', 'quarter', 'month', 'day'] as const).map((trunc) => (
                <button
                  key={trunc}
                  type="button"
                  onClick={() => {
                    onSetDateTrunc(trunc);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                    pill.dateTruncation === trunc ? 'font-bold text-sky-600 dark:text-sky-400' : ''
                  }`}
                >
                  {trunc.toUpperCase()}
                </button>
              ))}
              <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
            </>
          )}

          <button
            type="button"
            onClick={() => {
              onRemove();
              setMenuOpen(false);
            }}
            className="flex w-full items-center px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
          >
            Quitar pastilla
          </button>
        </div>
      )}
    </div>
  );
};
