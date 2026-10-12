import React, { useEffect, useRef } from 'react';
import * as Plot from '@observablehq/plot';
import { WorksheetAST } from '../../core/ast/types';
import { getPillSqlIdentifier } from '../../core/ast/builder';
import { QueryExecutionResult } from '../../core/engine/duckdbClient';
import { EDITORIAL_OKLCH_CATEGORICAL, EDITORIAL_SEQUENTIAL_BLUE } from '../../utils/oklchColors';

interface PlotRendererProps {
  ast: WorksheetAST | null;
  result: QueryExecutionResult | null;
  theme: 'light' | 'dark';
}

export const PlotRenderer: React.FC<PlotRendererProps> = ({ ast, result, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !result || !ast || result.rows.length === 0) {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = Math.max(container.clientHeight || 500, 420);

    const isDark = theme === 'dark';
    const textColor = isDark ? '#e7e5e4' : '#1c1917';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    // Resolve column accessors from AST
    const xPill = ast.spatialX[0];
    const yPill = ast.spatialY[0];
    const xField = xPill ? getPillSqlIdentifier(xPill) : undefined;
    const yField = yPill ? getPillSqlIdentifier(yPill) : undefined;

    const colorPill = ast.colorChannel;
    const colorField = colorPill ? getPillSqlIdentifier(colorPill) : undefined;

    const sizePill = ast.sizeChannel;
    const sizeField = sizePill ? getPillSqlIdentifier(sizePill) : undefined;

    const detailPills = ast.detailChannel;

    // Helper to format values in tooltip
    const makeTooltipTitle = (d: Record<string, unknown>) => {
      const parts: string[] = [];
      if (xField && d[xField] !== undefined) {
        parts.push(`${xPill?.columnName || xField}: ${formatVal(d[xField])}`);
      }
      if (yField && d[yField] !== undefined) {
        parts.push(`${yPill?.columnName || yField}: ${formatVal(d[yField])}`);
      }
      if (colorField && colorField !== xField && colorField !== yField && d[colorField] !== undefined) {
        parts.push(`${colorPill?.columnName || colorField}: ${formatVal(d[colorField])}`);
      }
      if (sizeField && sizeField !== xField && sizeField !== yField && d[sizeField] !== undefined) {
        parts.push(`${sizePill?.columnName || sizeField}: ${formatVal(d[sizeField])}`);
      }
      // CRITICAL: Detail fields included in hover tooltip!
      for (const det of detailPills) {
        const detField = getPillSqlIdentifier(det);
        if (d[detField] !== undefined) {
          parts.push(`Detail (${det.columnName}): ${formatVal(d[detField])}`);
        }
      }
      return parts.join('\n');
    };

    const formatVal = (v: unknown): string => {
      if (typeof v === 'number') {
        return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
      if (v instanceof Date) {
        return v.toLocaleDateString();
      }
      return String(v);
    };

    // Determine Plot Mark
    const marks: Plot.Markish[] = [];

    // Subtle background rules
    if (yField && xField) {
      marks.push(Plot.gridX({ stroke: gridColor }));
      marks.push(Plot.gridY({ stroke: gridColor }));
    }

    const markType = ast.markType;

    // 1. BAR CHART
    if (markType === 'bar') {
      if (xPill?.role === 'measure' && yPill?.role === 'dimension') {
        // Horizontal Bar
        marks.push(
          Plot.barX(result.rows, {
            y: yField,
            x: xField,
            fill: colorField ? colorField : 'oklch(0.55 0.18 245)',
            tip: false,
            title: makeTooltipTitle,
            sort: { y: '-x' },
            insetTop: 2,
            insetBottom: 2,
            rx: 3,
          })
        );
      } else {
        // Vertical Bar (default)
        marks.push(
          Plot.barY(result.rows, {
            x: xField,
            y: yField,
            fill: colorField ? colorField : 'oklch(0.55 0.18 245)',
            tip: false,
            title: makeTooltipTitle,
            insetLeft: 3,
            insetRight: 3,
            rx: 3,
          })
        );
      }
    }
    // 2. LINE CHART
    else if (markType === 'line') {
      marks.push(
        Plot.lineY(result.rows, {
          x: xField,
          y: yField,
          stroke: colorField ? colorField : 'oklch(0.55 0.18 245)',
          strokeWidth: 2.2,
          curve: 'monotone-x',
          title: makeTooltipTitle,
        })
      );
      marks.push(
        Plot.dot(result.rows, {
          x: xField,
          y: yField,
          fill: colorField ? colorField : 'oklch(0.55 0.18 245)',
          r: 3.5,
          title: makeTooltipTitle,
        })
      );
    }
    // 3. AREA CHART
    else if (markType === 'area') {
      marks.push(
        Plot.areaY(result.rows, {
          x: xField,
          y: yField,
          fill: colorField ? colorField : 'oklch(0.55 0.18 245)',
          fillOpacity: 0.35,
          curve: 'monotone-x',
        })
      );
      marks.push(
        Plot.lineY(result.rows, {
          x: xField,
          y: yField,
          stroke: colorField ? colorField : 'oklch(0.55 0.18 245)',
          strokeWidth: 2,
          curve: 'monotone-x',
          title: makeTooltipTitle,
        })
      );
    }
    // 4. SCATTER / DOT PLOT
    else if (markType === 'dot') {
      marks.push(
        Plot.dot(result.rows, {
          x: xField,
          y: yField,
          fill: colorField ? colorField : 'oklch(0.55 0.18 245)',
          r: sizeField ? sizeField : 6,
          fillOpacity: 0.82,
          stroke: isDark ? '#1c1917' : '#ffffff',
          strokeWidth: 1,
          title: makeTooltipTitle,
        })
      );
    }
    // 5. CELL / HEATMAP MATRIX
    else if (markType === 'rect') {
      marks.push(
        Plot.cell(result.rows, {
          x: xField,
          y: yField,
          fill: colorField ? colorField : 'oklch(0.55 0.18 245)',
          inset: 1.5,
          rx: 2,
          title: makeTooltipTitle,
        })
      );
    }
    // 6. TICK PLOT
    else if (markType === 'tick') {
      marks.push(
        Plot.tickX(result.rows, {
          x: xField,
          y: yField,
          stroke: colorField ? colorField : 'oklch(0.55 0.18 245)',
          strokeWidth: 2,
          title: makeTooltipTitle,
        })
      );
    }

    // Configure Color Scale
    let colorScaleConfig: Plot.PlotOptions['color'] = undefined;
    if (colorPill) {
      if (colorPill.role === 'dimension') {
        colorScaleConfig = {
          type: 'categorical',
          range: EDITORIAL_OKLCH_CATEGORICAL,
          legend: true,
        };
      } else {
        colorScaleConfig = {
          type: 'linear',
          range: EDITORIAL_SEQUENTIAL_BLUE,
          legend: true,
        };
      }
    }

    // Build the Plot specification
    const plot = Plot.plot({
      width,
      height,
      marginTop: 25,
      marginRight: 40,
      marginBottom: 45,
      marginLeft: 65,
      style: {
        background: 'transparent',
        color: textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11.5px',
        fontVariantNumeric: 'tabular-nums',
      },
      x: {
        label: xPill?.alias || xPill?.columnName || xField || 'X',
        grid: false,
        line: true,
        tickFormat: (d) => (typeof d === 'number' && d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d),
      },
      y: {
        label: yPill?.alias || yPill?.columnName || yField || 'Y',
        grid: false,
        line: true,
        tickFormat: (d) => (typeof d === 'number' && d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d),
      },
      color: colorScaleConfig,
      marks,
    });

    container.innerHTML = '';
    container.appendChild(plot);

    return () => {
      container.innerHTML = '';
    };
  }, [ast, result, theme]);

  if (!result || result.rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-stone-400 dark:text-stone-500">
        <div className="mb-3 rounded-full border border-dashed border-stone-300 p-4 dark:border-stone-700">
          <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="font-editorial text-xl font-medium text-stone-700 dark:text-stone-300">
          Lienzo Analítico Vacío
        </h3>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          Arrastra dimensiones (azules) y métricas (verdes) a los estantes de <strong>Columns</strong> y <strong>Rows</strong> para generar una visualización.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden flex items-center justify-center"
    />
  );
};
