import React, { useState } from 'react';
import { Pill, ShelfId, AggregationFunction, QuickTableCalcType, NumberFormatConfig } from '../../core/ast/types';
import { PillBadge } from './PillBadge';

interface ShelfDropZoneProps {
  shelfId: ShelfId;
  label: string;
  icon?: React.ReactNode;
  pills: Pill[];
  onAddPill: (shelf: ShelfId, pill: Pill) => void;
  onRemovePill: (shelf: ShelfId, pillId: string) => void;
  onSetAggregation?: (shelf: ShelfId, pillId: string, agg: AggregationFunction) => void;
  onSetQuickTableCalc?: (shelf: ShelfId, pillId: string, calcType?: QuickTableCalcType) => void;
  onSetSort?: (shelf: ShelfId, pillId: string, sort: 'asc' | 'desc' | 'none') => void;
  onSetDateTrunc?: (shelf: ShelfId, pillId: string, trunc: 'year' | 'quarter' | 'month' | 'day') => void;
  onDrillDown?: (shelf: 'columns' | 'rows', pillId: string) => void;
  onDrillUp?: (shelf: 'columns' | 'rows', pillId: string) => void;
  onSetFormat?: (shelf: ShelfId, pillId: string, format: NumberFormatConfig) => void;
  placeholder?: string;
}

export const ShelfDropZone: React.FC<ShelfDropZoneProps> = ({
  shelfId,
  label,
  icon,
  pills,
  onAddPill,
  onRemovePill,
  onSetAggregation,
  onSetQuickTableCalc,
  onSetSort,
  onSetDateTrunc,
  onDrillDown,
  onDrillUp,
  onSetFormat,
  placeholder = 'Arrastra un campo aquí...',
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
        onAddPill(shelfId, droppedPill);
      }
    } catch (err) {
      console.error('Error procesando pastilla arrastrada:', err);
    }
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
        {icon}
        <span className="uppercase tracking-wider text-[11px] font-mono">{label}</span>
      </div>

      {/* Pill Container */}
      <div className="flex flex-1 flex-wrap items-center gap-1.5 min-h-[28px]">
        {pills.length === 0 ? (
          <span className="text-xs italic text-stone-400 select-none dark:text-stone-600 font-sans">
            {placeholder}
          </span>
        ) : (
          pills.map((p) => (
            <PillBadge
              key={p.id}
              pill={p}
              shelf={shelfId}
              onRemove={() => onRemovePill(shelfId, p.id)}
              onSetAggregation={
                onSetAggregation ? (agg) => onSetAggregation(shelfId, p.id, agg) : undefined
              }
              onSetQuickTableCalc={
                onSetQuickTableCalc ? (calc) => onSetQuickTableCalc(shelfId, p.id, calc) : undefined
              }
              onSetSort={onSetSort ? (s) => onSetSort(shelfId, p.id, s) : undefined}
              onSetDateTrunc={
                onSetDateTrunc ? (t) => onSetDateTrunc(shelfId, p.id, t) : undefined
              }
              onDrillDown={
                onDrillDown && (shelfId === 'columns' || shelfId === 'rows')
                  ? () => onDrillDown(shelfId, p.id)
                  : undefined
              }
              onDrillUp={
                onDrillUp && (shelfId === 'columns' || shelfId === 'rows')
                  ? () => onDrillUp(shelfId, p.id)
                  : undefined
              }
              onSetFormat={
                onSetFormat ? (fmt) => onSetFormat(shelfId, p.id, fmt) : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
};
