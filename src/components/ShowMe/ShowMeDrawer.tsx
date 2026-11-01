import React from 'react';
import { Pill, MarkType } from '../../core/ast/types';
import {
  BarChart2,
  LineChart,
  AreaChart,
  ScatterChart,
  Table,
  Grid,
  X,
  Sparkles,
  AlignLeft,
  Columns,
  Box,
  BarChart3,
  Flame,
  Hexagon,
  TrendingUp,
  Activity,
  Grid3X3,
} from 'lucide-react';

export interface ShowMeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Pill[];
  rows: Pill[];
  currentMarkType: MarkType;
  onSelectMarkType: (markType: MarkType) => void;
  onSwapShelves: () => void;
}

interface ChartTypeOption {
  id: string;
  name: string;
  markType: MarkType;
  icon: React.ReactNode;
  reqText: string;
  checkEnabled: (dims: number, measures: number, xDims: number, xMeasures: number, yDims: number, yMeasures: number) => boolean;
  recommended: (dims: number, measures: number, hasDate: boolean) => boolean;
  action?: 'swap_if_needed_horizontal' | 'swap_if_needed_vertical';
}

export const ShowMeDrawer: React.FC<ShowMeDrawerProps> = ({
  isOpen,
  onClose,
  columns,
  rows,
  currentMarkType,
  onSelectMarkType,
  onSwapShelves,
}) => {
  if (!isOpen) return null;

  const dims = [...columns, ...rows].filter((p) => p.role === 'dimension').length;
  const measures = [...columns, ...rows].filter((p) => p.role === 'measure').length;
  const xDims = columns.filter((p) => p.role === 'dimension').length;
  const xMeasures = columns.filter((p) => p.role === 'measure').length;
  const yDims = rows.filter((p) => p.role === 'dimension').length;
  const yMeasures = rows.filter((p) => p.role === 'measure').length;
  const hasDate = columns.some((p) => p.dataType === 'date');

  const chartOptions: ChartTypeOption[] = [
    {
      id: 'text_table',
      name: 'Text Table',
      markType: 'text',
      icon: <Table className="h-5 w-5" />,
      reqText: '1+ dimensions or measures',
      checkEnabled: (d, m) => d >= 1 || m >= 1,
      recommended: (d, m) => (d >= 1 && m >= 1) || d >= 2,
    },
    {
      id: 'heatmap',
      name: 'Heatmap Cell',
      markType: 'rect',
      icon: <Grid className="h-5 w-5" />,
      reqText: '1+ dimensions, 1 measure',
      checkEnabled: (d, m) => d >= 1 && m >= 1,
      recommended: (d, m) => d === 2 && m === 1,
    },
    {
      id: 'bar_vertical',
      name: 'Vertical Bars',
      markType: 'bar',
      icon: <BarChart2 className="h-5 w-5" />,
      reqText: '1 dimension on X, 1+ measures on Y',
      checkEnabled: (d, m) => d >= 1 && m >= 1,
      recommended: (d, m, date) => d >= 1 && m >= 1 && !date,
      action: 'swap_if_needed_vertical',
    },
    {
      id: 'bar_horizontal',
      name: 'Horizontal Bars',
      markType: 'bar',
      icon: <AlignLeft className="h-5 w-5" />,
      reqText: '1 measure on X, 1 dimension on Y',
      checkEnabled: (d, m) => d >= 1 && m >= 1,
      recommended: () => false,
      action: 'swap_if_needed_horizontal',
    },
    {
      id: 'line_chart',
      name: 'Continuous Lines',
      markType: 'line',
      icon: <LineChart className="h-5 w-5" />,
      reqText: '1 date/dimension, 1+ measures',
      checkEnabled: (d, m) => d >= 1 && m >= 1,
      recommended: (_d, _m, date) => date,
    },
    {
      id: 'area_chart',
      name: 'Continuous Area',
      markType: 'area',
      icon: <AreaChart className="h-5 w-5" />,
      reqText: '1 date/dimension, 1+ measures',
      checkEnabled: (d, m) => d >= 1 && m >= 1,
      recommended: () => false,
    },
    {
      id: 'scatter_plot',
      name: 'Scatter Plot',
      markType: 'dot',
      icon: <ScatterChart className="h-5 w-5" />,
      reqText: '2 measures (1 on X, 1 on Y)',
      checkEnabled: (_d, m) => m >= 2,
      recommended: (d, m) => d === 0 && m >= 2,
    },
    {
      id: 'boxplot',
      name: 'Box Plot',
      markType: 'box',
      icon: <Box className="h-5 w-5" />,
      reqText: '1 dimension, 1 measure (or 1 measure alone)',
      checkEnabled: (_d, m) => m >= 1,
      recommended: (d, m) => d === 1 && m === 1,
    },
    {
      id: 'histogram',
      name: 'Continuous Histogram',
      markType: 'histogram',
      icon: <BarChart3 className="h-5 w-5" />,
      reqText: '1 quantitative measure (frequencies)',
      checkEnabled: (_d, m) => m >= 1,
      recommended: (d, m) => d === 0 && m === 1,
    },
    {
      id: 'density',
      name: '2D Density Contour',
      markType: 'density',
      icon: <Flame className="h-5 w-5" />,
      reqText: '2 quantitative measures (concentration)',
      checkEnabled: (_d, m) => m >= 2,
      recommended: () => false,
    },
    {
      id: 'hexbin',
      name: 'Hexbin Clustering',
      markType: 'hexbin',
      icon: <Hexagon className="h-5 w-5" />,
      reqText: '2 measures (overplotting reduction)',
      checkEnabled: (_d, m) => m >= 2,
      recommended: () => false,
    },
    {
      id: 'difference',
      name: 'Difference Chart',
      markType: 'difference',
      icon: <TrendingUp className="h-5 w-5" />,
      reqText: '1 date/dimension, 1 measure',
      checkEnabled: (d, m) => d >= 1 && m >= 1,
      recommended: () => false,
    },
    {
      id: 'spike',
      name: 'Spike Chart',
      markType: 'spike',
      icon: <Activity className="h-5 w-5" />,
      reqText: '1 dimension, 1 measure (slender spikes)',
      checkEnabled: (d, m) => d >= 1 && m >= 1,
      recommended: () => false,
    },
    {
      id: 'tick_plot',
      name: 'Tick Mark Plot',
      markType: 'tick',
      icon: <Columns className="h-5 w-5" />,
      reqText: '1 dimension, 1 measure',
      checkEnabled: (d, m) => d >= 1 && m >= 1,
      recommended: () => false,
    },
    {
      id: 'waffle',
      name: 'Waffle Chart',
      markType: 'waffle',
      icon: <Grid3X3 className="h-5 w-5" />,
      reqText: '1 categorical dimension',
      checkEnabled: (d) => d >= 1,
      recommended: () => false,
    },
  ];

  const handleApply = (opt: ChartTypeOption) => {
    if (opt.action === 'swap_if_needed_horizontal' && xDims > 0 && yMeasures > 0) {
      onSwapShelves();
    } else if (opt.action === 'swap_if_needed_vertical' && xMeasures > 0 && yDims > 0) {
      onSwapShelves();
    }
    onSelectMarkType(opt.markType);
    onClose();
  };

  return (
    <div className="absolute right-4 top-14 z-50 flex w-80 max-h-[85vh] flex-col rounded-xl border border-stone-200/90 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5 dark:border-stone-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="font-editorial text-sm font-bold text-stone-900 dark:text-stone-100">
            Show Me ({chartOptions.length} Types)
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary of Shelves */}
      <div className="my-2 flex items-center justify-between rounded bg-stone-100/70 px-2 py-1 text-[10px] font-mono text-stone-600 dark:bg-stone-800/60 dark:text-stone-400 shrink-0">
        <span>Dimensions: {dims}</span>
        <span>•</span>
        <span>Measures: {measures}</span>
      </div>

      {/* Scrollable Grid of Visual Charts */}
      <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 py-1">
        {chartOptions.map((opt) => {
          const isEnabled = opt.checkEnabled(dims, measures, xDims, xMeasures, yDims, yMeasures);
          const isRecommended = isEnabled && opt.recommended(dims, measures, hasDate);
          const isSelected = currentMarkType === opt.markType;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={!isEnabled}
              onClick={() => handleApply(opt)}
              title={opt.reqText}
              className={`relative flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all ${
                !isEnabled
                  ? 'cursor-not-allowed border-dashed border-stone-200 bg-stone-50/50 opacity-40 dark:border-stone-800 dark:bg-stone-900/30'
                  : isSelected
                  ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                  : isRecommended
                  ? 'border-amber-400 bg-amber-50/50 text-stone-900 hover:bg-amber-100/60 dark:border-amber-600/60 dark:bg-amber-950/20 dark:text-stone-100 ring-1 ring-amber-400/40'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-850 text-stone-700 dark:text-stone-300'
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-1.5 right-1 rounded-full bg-amber-500 px-1.5 py-0.2 text-[8px] font-bold text-white shadow-xs">
                  RECOMMENDED
                </span>
              )}
              <div className="mb-1 text-stone-600 dark:text-stone-300">{opt.icon}</div>
              <span className="text-[10.5px] font-medium leading-tight">{opt.name}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-2.5 border-t border-stone-200/80 pt-2 text-[10px] text-stone-500 dark:border-stone-800 dark:text-stone-400 leading-snug shrink-0">
        Visual types enable dynamically based on pills placed on Columns and Rows.
      </div>
    </div>
  );
};
