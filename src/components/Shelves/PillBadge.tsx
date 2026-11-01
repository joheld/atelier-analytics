import React, { useState, useRef, useEffect } from 'react';
import {
  Pill,
  AggregationFunction,
  ShelfId,
  QuickTableCalcType,
  NumberFormatConfig,
  DataType,
  FieldRole,
} from '../../core/ast/types';
import { ChevronDown, X, Hash, Calendar, Type } from 'lucide-react';

interface PillBadgeProps {
  pill: Pill;
  shelf: ShelfId;
  compact?: boolean;
  onRemove: () => void;
  onSetAggregation?: (agg: AggregationFunction) => void;
  onSetQuickTableCalc?: (calcType?: QuickTableCalcType) => void;
  onSetSort?: (sort: 'asc' | 'desc' | 'none') => void;
  onSetDateTrunc?: (trunc: 'year' | 'quarter' | 'month' | 'day') => void;
  onDrillDown?: () => void;
  onDrillUp?: () => void;
  onSetFormat?: (config: NumberFormatConfig) => void;
  onChangeDataType?: (newType: DataType) => void;
  onChangeRole?: (newRole: FieldRole) => void;
}

export const PillBadge: React.FC<PillBadgeProps> = ({
  pill,
  shelf: _shelf,
  compact = false,
  onRemove,
  onSetAggregation,
  onSetQuickTableCalc,
  onSetSort,
  onSetDateTrunc,
  onDrillDown,
  onDrillUp,
  onSetFormat,
  onChangeDataType,
  onChangeRole,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDimension = pill.role === 'dimension';
  const isMeasure = pill.role === 'measure';

  const canDrillDown =
    (pill.dataType === 'date' && pill.dateTruncation !== 'day') || Boolean(pill.hierarchyId);
  const canDrillUp =
    (pill.dataType === 'date' && Boolean(pill.dateTruncation) && pill.dateTruncation !== 'year') ||
    (Boolean(pill.hierarchyId) && (pill.hierarchyLevelIndex ?? 0) > 0);

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
    let base = pill.columnName;
    if (isMeasure && pill.aggregation) {
      base = `${pill.aggregation}(${pill.columnName})`;
    } else if (pill.dateTruncation) {
      base = `${pill.dateTruncation.toUpperCase()}(${pill.columnName})`;
    }
    if (pill.quickTableCalc) {
      return `${base} Δ`;
    }
    return base;
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
      className={`group relative inline-flex items-center gap-1 rounded-[5px] text-xs font-medium transition-all duration-150 cursor-grab active:cursor-grabbing select-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_1px_2px_0_rgba(0,0,0,0.12)] ${
        compact ? 'w-full max-w-full justify-between px-1.5 py-0.5' : 'max-w-full px-2 py-0.5'
      } ${
        isDimension
          ? 'bg-sky-600 text-white border border-sky-500/80 hover:bg-sky-500 dark:bg-sky-700 dark:border-sky-600 dark:hover:bg-sky-600'
          : 'bg-emerald-600 text-white border border-emerald-500/80 hover:bg-emerald-500 dark:bg-emerald-700 dark:border-emerald-600 dark:hover:bg-emerald-600'
      }`}
    >
      <span className="flex items-center min-w-0 flex-1 overflow-hidden">
        {renderIcon()}
        <span
          className={`truncate font-mono tracking-tight ${
            compact ? 'text-[10px] max-w-[85px]' : 'text-[11px] max-w-[140px]'
          }`}
          title={getLabel()}
        >
          {getLabel()}
        </span>
        {pill.quickTableCalc && (
          <span className="ml-1 rounded bg-black/25 px-1 py-0.2 text-[9px] font-mono font-bold text-amber-200 shrink-0">
            Δ
          </span>
        )}
        {pill.formatConfig && pill.formatConfig.type !== 'auto' && (
          <span className="ml-1 rounded bg-black/25 px-1 py-0.2 text-[9px] font-mono font-bold text-emerald-200 shrink-0" title={`Format: ${pill.formatConfig.type}`}>
            {pill.formatConfig.type === 'currency'
              ? pill.formatConfig.currencySymbol || '$'
              : pill.formatConfig.type === 'percent'
              ? '%'
              : pill.formatConfig.type === 'compact'
              ? 'K'
              : '#'}
          </span>
        )}
      </span>

      <div className="flex items-center gap-0.5 shrink-0 ml-auto">
        {/* Drill-Up button (-) */}
        {!compact && onDrillUp && canDrillUp && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDrillUp();
            }}
            className="h-3.5 w-3.5 flex items-center justify-center rounded bg-black/20 hover:bg-black/35 font-mono font-bold text-[10px] leading-none active:scale-95 transition-all"
            title="Contraer nivel jerárquico (-)"
          >
            -
          </button>
        )}

        {/* Drill-Down button (+) */}
        {!compact && onDrillDown && canDrillDown && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDrillDown();
            }}
            className="h-3.5 w-3.5 flex items-center justify-center rounded bg-black/20 hover:bg-black/35 font-mono font-bold text-[10px] leading-none active:scale-95 transition-all"
            title="Desglosar nivel jerárquico (+)"
          >
            +
          </button>
        )}

        {/* Pill Dropdown Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="rounded p-0.5 hover:bg-black/20 active:scale-95 focus:outline-none transition-all shrink-0"
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
          className="rounded p-0.5 hover:bg-black/30 active:scale-90 focus:outline-none transition-all shrink-0 text-white/90 hover:text-white"
          title="Eliminar pastilla"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Context Menu Dropdown */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-stone-200/90 bg-white py-1 shadow-xl dark:border-white/[0.08] dark:bg-stone-950 text-stone-900 dark:text-stone-100 max-h-[360px] overflow-y-auto rim-light-subtle"
        >
          {/* Change Data Type Section */}
          {onChangeDataType && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Tipo de dato (Tableau)
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeDataType('string');
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  pill.dataType === 'string' ? 'font-bold text-sky-600 dark:text-sky-400' : ''
                }`}
              >
                <span>Cadena (Texto)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeDataType('number');
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  pill.dataType === 'number' ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''
                }`}
              >
                <span>Número (Decimal)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeDataType('date');
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  pill.dataType === 'date' ? 'font-bold text-sky-600 dark:text-sky-400' : ''
                }`}
              >
                <span>Fecha</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeDataType('boolean');
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                  pill.dataType === 'boolean' ? 'font-bold text-sky-600 dark:text-sky-400' : ''
                }`}
              >
                <span>Booleano (T/F)</span>
              </button>
              <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
            </>
          )}

          {/* Change Role Section */}
          {onChangeRole && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Rol analítico
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeRole(isMeasure ? 'dimension' : 'measure');
                  setMenuOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <span>{isMeasure ? 'Convert to Dimension' : 'Convert to Measure'}</span>
              </button>
              <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
            </>
          )}
          {isMeasure && onSetAggregation && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Aggregation
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

              {/* Tableau Quick Table Calculations */}
              {onSetQuickTableCalc && (
                <>
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500 flex items-center justify-between">
                    <span>Quick Table Calculation</span>
                    <span className="font-mono text-xs">Δ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSetQuickTableCalc(undefined);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                      !pill.quickTableCalc ? 'font-bold text-stone-900 dark:text-stone-100' : 'text-stone-500'
                    }`}
                  >
                    None
                  </button>
                  {(
                    [
                      { type: 'percent_of_total', label: 'Percent of Total' },
                      { type: 'running_total', label: 'Running Total' },
                      { type: 'difference_from_previous', label: 'Difference from Previous' },
                      { type: 'percent_difference_from_previous', label: '% Difference from Previous' },
                      { type: 'rank', label: 'Rank' },
                      { type: 'moving_average', label: 'Moving Average (3)' },
                    ] as const
                  ).map((q) => (
                    <button
                      key={q.type}
                      type="button"
                      onClick={() => {
                        onSetQuickTableCalc(q.type);
                        setMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                        pill.quickTableCalc?.type === q.type
                          ? 'font-bold text-emerald-600 dark:text-emerald-400'
                          : ''
                      }`}
                    >
                      <span>{q.label}</span>
                      <span className="text-[10px] text-amber-500 font-mono">Δ</span>
                    </button>
                  ))}
                  <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                </>
              )}

              {/* Number Formatting (Tableau Format Dialog) */}
              {onSetFormat && (
                <>
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Number Format
                  </div>
                  {(
                    [
                      { type: 'auto', label: 'Automatic' },
                      { type: 'currency', label: 'Currency ($)', symbol: '$', decimals: 2 },
                      { type: 'currency', label: 'Currency (€)', symbol: '€', decimals: 2 },
                      { type: 'percent', label: 'Percentage (%)', decimals: 1 },
                      { type: 'compact', label: 'Compact (K, M, B)', decimals: 1 },
                      { type: 'number', label: 'Standard (2 dec)', decimals: 2 },
                    ] as const
                  ).map((fmt) => (
                    <button
                      key={fmt.label}
                      type="button"
                      onClick={() => {
                        onSetFormat({
                          type: fmt.type as any,
                          currencySymbol: (fmt as any).symbol,
                          decimals: (fmt as any).decimals,
                        });
                        setMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-1 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 ${
                        pill.formatConfig?.type === fmt.type &&
                        (!('symbol' in fmt) || pill.formatConfig?.currencySymbol === (fmt as any).symbol)
                          ? 'font-bold text-emerald-600 dark:text-emerald-400'
                          : ''
                      }`}
                    >
                      <span>{fmt.label}</span>
                    </button>
                  ))}
                  <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                </>
              )}
            </>
          )}

          {isDimension && onSetSort && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Sort
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
                Ascending
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
                Descending
              </button>
              <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
            </>
          )}

          {pill.dataType === 'date' && onSetDateTrunc && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Date Truncation
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
            Remove Pill
          </button>
        </div>
      )}
    </div>
  );
};
