import React, { useEffect, useRef, useState } from 'react';
import * as Plot from '@observablehq/plot';
import { WorksheetAST, Pill } from '../../core/ast/types';
import { getPillSqlIdentifier } from '../../core/ast/builder';
import { QueryExecutionResult } from '../../core/engine/duckdbClient';
import { EDITORIAL_OKLCH_CATEGORICAL, EDITORIAL_SEQUENTIAL_BLUE } from '../../utils/oklchColors';
import { TextTableRenderer } from './TextTableRenderer';

interface PlotRendererProps {
  ast: WorksheetAST | null;
  result: QueryExecutionResult | null;
  theme: 'light' | 'dark';
}

function getPillDisplayLabel(pill?: Pill, defaultVal = ''): string {
  if (!pill) return defaultVal;
  if (pill.alias) return pill.alias;
  if (pill.role === 'measure' && pill.aggregation) {
    return `${pill.aggregation}(${pill.columnName})`;
  }
  if (pill.dateTruncation) {
    return `${pill.dateTruncation.toUpperCase()}(${pill.columnName})`;
  }
  return pill.columnName;
}

export const PlotRenderer: React.FC<PlotRendererProps> = ({ ast, result, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 500,
  });

  // Track container size reactively
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // If Text Table mark is active, TextTableRenderer renders in JSX
    if (ast?.markType === 'text') {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    if (!containerRef.current || !result || !ast || result.rows.length === 0) {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    const container = containerRef.current;
    const { width, height } = dimensions;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#f5f5f4' : '#1c1917';
    const mutedColor = isDark ? '#a8a29e' : '#78716c';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';

    // Classify spatial pills for single vs multi-measure layouts
    const xDims = ast.spatialX.filter((p) => p.role === 'dimension');
    const xMeasures = ast.spatialX.filter((p) => p.role === 'measure');
    const yDims = ast.spatialY.filter((p) => p.role === 'dimension');
    const yMeasures = ast.spatialY.filter((p) => p.role === 'measure');

    const isMultiMeasureVertical = xDims.length > 0 && yMeasures.length > 1;
    const isMultiMeasureHorizontal = yDims.length > 0 && xMeasures.length > 1;
    const isMultiMeasureStandalone =
      xDims.length === 0 && yDims.length === 0 && (yMeasures.length > 1 || xMeasures.length > 1);
    const isMultiMeasure = isMultiMeasureVertical || isMultiMeasureHorizontal || isMultiMeasureStandalone;

    // Resolve primary axis pill accessors
    const xPill = isMultiMeasureVertical ? xDims[0] : ast.spatialX[0];
    const yPill = isMultiMeasureHorizontal ? yDims[0] : ast.spatialY[0];
    const xField = xPill ? getPillSqlIdentifier(xPill) : undefined;
    const yField = yPill ? getPillSqlIdentifier(yPill) : undefined;

    // Unpivot data rows for multiple measures (Grouped / Clustered Bars / Multi-lines)
    let multiMeasureRows: Record<string, unknown>[] = [];
    if (isMultiMeasureVertical) {
      multiMeasureRows = result.rows.flatMap((r) =>
        yMeasures.map((m) => {
          const k = getPillSqlIdentifier(m);
          const val = r[k];
          return {
            ...r,
            _measureName: getPillDisplayLabel(m),
            _measureValue: typeof val === 'number' ? val : 0,
          };
        })
      );
    } else if (isMultiMeasureHorizontal) {
      multiMeasureRows = result.rows.flatMap((r) =>
        xMeasures.map((m) => {
          const k = getPillSqlIdentifier(m);
          const val = r[k];
          return {
            ...r,
            _measureName: getPillDisplayLabel(m),
            _measureValue: typeof val === 'number' ? val : 0,
          };
        })
      );
    } else if (isMultiMeasureStandalone) {
      const mList = yMeasures.length > 1 ? yMeasures : xMeasures;
      multiMeasureRows = mList.map((m) => {
        const k = getPillSqlIdentifier(m);
        const val = result.rows[0]?.[k];
        return {
          _measureName: getPillDisplayLabel(m),
          _measureValue: typeof val === 'number' ? val : 0,
        };
      });
    }

    const colorPill = ast.colorChannel;
    const colorField = colorPill ? getPillSqlIdentifier(colorPill) : undefined;

    const sizePill = ast.sizeChannel;
    const sizeField = sizePill ? getPillSqlIdentifier(sizePill) : undefined;

    const detailPills = ast.detailChannel;

    // Detect if X-axis has long categorical strings that require rotation
    const hasLongXTicks = result.rows.some((row) => {
      const val = row[xField || ''];
      return typeof val === 'string' && val.length > 8;
    });

    const isXContinuous = xPill?.role === 'measure';
    const shouldRotateX = !isXContinuous && hasLongXTicks;

    // Margins with dynamic padding for rotated labels and color legend
    const marginTop = colorPill || isMultiMeasure ? 56 : 32;
    const marginBottom = shouldRotateX ? 80 : 45;
    const marginLeft = 65;
    const marginRight = 35;

    // Rich Tooltip Formatter
    const makeTooltipTitle = (d: Record<string, unknown>) => {
      const lines: string[] = [];
      if (xField && d[xField] !== undefined) {
        lines.push(`${getPillDisplayLabel(xPill, xField)}: ${formatVal(d[xField])}`);
      }
      if (yField && d[yField] !== undefined) {
        lines.push(`${getPillDisplayLabel(yPill, yField)}: ${formatVal(d[yField])}`);
      }
      if (colorField && colorField !== xField && colorField !== yField && d[colorField] !== undefined) {
        lines.push(`Color (${colorPill?.columnName}): ${formatVal(d[colorField])}`);
      }
      if (sizeField && sizeField !== xField && sizeField !== yField && d[sizeField] !== undefined) {
        lines.push(`Tamaño (${sizePill?.columnName}): ${formatVal(d[sizeField])}`);
      }
      for (const det of detailPills) {
        const detField = getPillSqlIdentifier(det);
        if (d[detField] !== undefined) {
          lines.push(`Detalle (${det.columnName}): ${formatVal(d[detField])}`);
        }
      }
      return lines.join('\n');
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

    // Format tick label if too long
    const formatXTick = (d: unknown) => {
      const s = String(d ?? '');
      if (s.length > 24) {
        return `${s.substring(0, 22)}…`;
      }
      return s;
    };

    const marks: Plot.Markish[] = [];

    // Background grid lines
    if (isMultiMeasureHorizontal) {
      marks.push(Plot.gridX({ stroke: gridColor, strokeDasharray: '2,2' }));
    } else if (yField || isMultiMeasure) {
      marks.push(Plot.gridY({ stroke: gridColor, strokeDasharray: '2,2' }));
    }

    const markType = ast.markType;

    // 1. BAR CHART
    if (markType === 'bar') {
      if (isMultiMeasureVertical) {
        // Clustered / Grouped Vertical Bars (Dimensions on Columns, 2+ Measures on Rows)
        marks.push(
          Plot.barY(multiMeasureRows, {
            fx: xField,
            x: '_measureName',
            y: '_measureValue',
            fill: '_measureName',
            title: (d: Record<string, unknown>) =>
              `${d[xField as string]} · ${d._measureName}: ${typeof d._measureValue === 'number' ? Number(d._measureValue).toLocaleString() : d._measureValue}`,
            tip: true,
            insetLeft: 1,
            insetRight: 1,
            rx: 2,
          })
        );
      } else if (isMultiMeasureHorizontal) {
        // Clustered / Grouped Horizontal Bars (Dimensions on Rows, 2+ Measures on Columns)
        marks.push(
          Plot.barX(multiMeasureRows, {
            fy: yField,
            y: '_measureName',
            x: '_measureValue',
            fill: '_measureName',
            title: (d: Record<string, unknown>) =>
              `${d[yField as string]} · ${d._measureName}: ${typeof d._measureValue === 'number' ? Number(d._measureValue).toLocaleString() : d._measureValue}`,
            tip: true,
            insetTop: 1,
            insetBottom: 1,
            rx: 2,
          })
        );
      } else if (isMultiMeasureStandalone) {
        // Standalone comparison of 2+ measures without dimensions
        marks.push(
          Plot.barY(multiMeasureRows, {
            x: '_measureName',
            y: '_measureValue',
            fill: '_measureName',
            title: (d: Record<string, unknown>) =>
              `${d._measureName}: ${typeof d._measureValue === 'number' ? Number(d._measureValue).toLocaleString() : d._measureValue}`,
            tip: true,
            insetLeft: 6,
            insetRight: 6,
            rx: 3,
          })
        );
      } else if (xPill?.role === 'measure' && yPill?.role === 'dimension') {
        // Horizontal Bar
        marks.push(
          Plot.barX(result.rows, {
            y: yField,
            x: xField,
            fill: colorField || 'oklch(0.55 0.18 245)',
            title: makeTooltipTitle,
            tip: true,
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
            fill: colorField || 'oklch(0.55 0.18 245)',
            title: makeTooltipTitle,
            tip: true,
            insetLeft: 3,
            insetRight: 3,
            rx: 3,
          })
        );
      }
    }
    // 2. LINE CHART
    else if (markType === 'line') {
      if (isMultiMeasureVertical) {
        marks.push(
          Plot.lineY(multiMeasureRows, {
            x: xField,
            y: '_measureValue',
            stroke: '_measureName',
            strokeWidth: 2.2,
            curve: 'monotone-x',
            title: (d: Record<string, unknown>) =>
              `${d[xField as string]} · ${d._measureName}: ${typeof d._measureValue === 'number' ? Number(d._measureValue).toLocaleString() : d._measureValue}`,
            tip: true,
          })
        );
        marks.push(
          Plot.dot(multiMeasureRows, {
            x: xField,
            y: '_measureValue',
            fill: '_measureName',
            r: 3.5,
            title: (d: Record<string, unknown>) =>
              `${d[xField as string]} · ${d._measureName}: ${typeof d._measureValue === 'number' ? Number(d._measureValue).toLocaleString() : d._measureValue}`,
            tip: true,
          })
        );
      } else {
        marks.push(
          Plot.lineY(result.rows, {
            x: xField,
            y: yField,
            stroke: colorField || 'oklch(0.55 0.18 245)',
            strokeWidth: 2.2,
            curve: 'monotone-x',
            title: makeTooltipTitle,
            tip: true,
          })
        );
        marks.push(
          Plot.dot(result.rows, {
            x: xField,
            y: yField,
            fill: colorField || 'oklch(0.55 0.18 245)',
            r: 3.5,
            title: makeTooltipTitle,
            tip: true,
          })
        );
      }
    }
    // 3. AREA CHART
    else if (markType === 'area') {
      if (isMultiMeasureVertical) {
        marks.push(
          Plot.areaY(multiMeasureRows, {
            x: xField,
            y: '_measureValue',
            fill: '_measureName',
            fillOpacity: 0.35,
            curve: 'monotone-x',
          })
        );
        marks.push(
          Plot.lineY(multiMeasureRows, {
            x: xField,
            y: '_measureValue',
            stroke: '_measureName',
            strokeWidth: 2,
            curve: 'monotone-x',
            title: (d: Record<string, unknown>) =>
              `${d[xField as string]} · ${d._measureName}: ${typeof d._measureValue === 'number' ? Number(d._measureValue).toLocaleString() : d._measureValue}`,
            tip: true,
          })
        );
      } else {
        marks.push(
          Plot.areaY(result.rows, {
            x: xField,
            y: yField,
            fill: colorField || 'oklch(0.55 0.18 245)',
            fillOpacity: 0.35,
            curve: 'monotone-x',
          })
        );
        marks.push(
          Plot.lineY(result.rows, {
            x: xField,
            y: yField,
            stroke: colorField || 'oklch(0.55 0.18 245)',
            strokeWidth: 2,
            curve: 'monotone-x',
            title: makeTooltipTitle,
            tip: true,
          })
        );
      }
    }
    // 4. SCATTER / DOT PLOT
    else if (markType === 'dot') {
      marks.push(
        Plot.dot(result.rows, {
          x: xField,
          y: yField,
          fill: colorField || 'oklch(0.55 0.18 245)',
          r: sizeField || 6,
          fillOpacity: 0.85,
          stroke: isDark ? '#1c1917' : '#ffffff',
          strokeWidth: 1,
          title: makeTooltipTitle,
          tip: true,
        })
      );
    }
    // 5. CELL / HEATMAP MATRIX
    else if (markType === 'rect') {
      marks.push(
        Plot.cell(result.rows, {
          x: xField,
          y: yField,
          fill: colorField || 'oklch(0.55 0.18 245)',
          inset: 1.5,
          rx: 2,
          title: makeTooltipTitle,
          tip: true,
        })
      );
    }
    // 6. TICK PLOT
    else if (markType === 'tick') {
      marks.push(
        Plot.tickX(result.rows, {
          x: xField,
          y: yField,
          stroke: colorField || 'oklch(0.55 0.18 245)',
          strokeWidth: 2,
          title: makeTooltipTitle,
          tip: true,
        })
      );
    }
    // 7. BOXPLOT (CAJA Y BIGOTES)
    else if (markType === 'box') {
      if (xPill?.role === 'measure' && yPill?.role === 'dimension') {
        marks.push(
          Plot.boxX(result.rows, {
            x: xField,
            y: yField,
            fill: colorField || 'oklch(0.55 0.18 245)',
            title: makeTooltipTitle,
            tip: true,
          })
        );
      } else if (xPill?.role === 'dimension' && yPill?.role === 'measure') {
        marks.push(
          Plot.boxY(result.rows, {
            x: xField,
            y: yField,
            fill: colorField || 'oklch(0.55 0.18 245)',
            title: makeTooltipTitle,
            tip: true,
          })
        );
      } else if (yField) {
        marks.push(
          Plot.boxY(result.rows, {
            y: yField,
            fill: colorField || 'oklch(0.55 0.18 245)',
            title: makeTooltipTitle,
            tip: true,
          })
        );
      } else if (xField) {
        marks.push(
          Plot.boxX(result.rows, {
            x: xField,
            fill: colorField || 'oklch(0.55 0.18 245)',
            title: makeTooltipTitle,
            tip: true,
          })
        );
      }
    }
    // 8. CONTINUOUS HISTOGRAM
    else if (markType === 'histogram') {
      const histField = (xPill?.role === 'measure' ? xField : yField) || xField || yField;
      if (histField) {
        marks.push(
          Plot.rectY(result.rows, {
            ...Plot.binX({ y: 'count' }, { x: histField, insetLeft: 1, insetRight: 1 }),
            fill: colorField || 'oklch(0.55 0.18 245)',
            rx: 2,
            tip: true,
          } as Plot.RectYOptions)
        );
      }
    }
    // 9. 2D DENSITY / CONTOUR PLOT
    else if (markType === 'density') {
      if (xField && yField) {
        marks.push(
          Plot.density(result.rows, {
            x: xField,
            y: yField,
            stroke: colorField || 'oklch(0.55 0.18 245)',
            strokeWidth: 1.5,
            bandwidth: 12,
          })
        );
        marks.push(
          Plot.dot(result.rows, {
            x: xField,
            y: yField,
            fill: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            r: 1.8,
            tip: true,
            title: makeTooltipTitle,
          })
        );
      }
    }
    // 10. HEXBIN (HEXAGONAL AGGREGATION)
    else if (markType === 'hexbin') {
      if (xField && yField) {
        marks.push(
          Plot.hexagon(
            result.rows,
            Plot.hexbin(
              { fill: 'count' },
              {
                x: xField,
                y: yField,
                stroke: isDark ? '#292524' : '#f5f5f4',
                strokeWidth: 0.5,
                tip: true,
              }
            )
          )
        );
      }
    }
    // 11. SPIKE PLOT
    else if (markType === 'spike') {
      if (xField && yField) {
        marks.push(
          Plot.spike(result.rows, {
            x: xField,
            length: yField,
            stroke: colorField || 'oklch(0.55 0.18 245)',
            fill: colorField || 'oklch(0.55 0.18 245)',
            fillOpacity: 0.35,
            strokeWidth: 1.5,
            tip: true,
            title: makeTooltipTitle,
          })
        );
      }
    }
    // 12. DIFFERENCE CHART (SURPLUS / DEFICIT)
    else if (markType === 'difference') {
      if (xField && yField) {
        marks.push(
          Plot.differenceY(result.rows, {
            x: xField,
            y: yField,
            positiveFill: 'oklch(0.65 0.18 145)',
            negativeFill: 'oklch(0.60 0.20 25)',
            tip: true,
            title: makeTooltipTitle,
          })
        );
        marks.push(
          Plot.lineY(result.rows, {
            x: xField,
            y: yField,
            stroke: isDark ? '#a8a29e' : '#57534e',
            strokeWidth: 1.5,
          })
        );
      }
    }
    // 13. WAFFLE CHART
    else if (markType === 'waffle') {
      if (xField) {
        marks.push(
          Plot.waffleY(result.rows, {
            x: xField,
            fill: colorField || xField,
            rx: 2,
            gap: 1.5,
            tip: true,
          })
        );
      }
    }

    // 7. Tableau Analytics Lines (Reference Lines, Average, Median, Linear Regression)
    if (ast.analyticsLines && ast.analyticsLines.length > 0 && yField && !isMultiMeasure) {
      const yValues = result.rows
        .map((r) => r[yField])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));

      if (yValues.length > 0) {
        for (const line of ast.analyticsLines) {
          if (line.type === 'average') {
            const avg = yValues.reduce((a, b) => a + b, 0) / yValues.length;
            marks.push(
              Plot.ruleY([avg], {
                stroke: '#ef4444',
                strokeWidth: 1.5,
                strokeDasharray: '4 4',
                title: () => `Promedio: ${avg.toFixed(2)}`,
              })
            );
          } else if (line.type === 'median') {
            const sorted = [...yValues].sort((a, b) => a - b);
            const med = sorted[Math.floor(sorted.length / 2)];
            marks.push(
              Plot.ruleY([med], {
                stroke: '#f59e0b',
                strokeWidth: 1.5,
                strokeDasharray: '4 4',
                title: () => `Mediana: ${med.toFixed(2)}`,
              })
            );
          } else if (line.type === 'constant' && line.value !== undefined) {
            marks.push(
              Plot.ruleY([line.value], {
                stroke: '#06b6d4',
                strokeWidth: 1.5,
                strokeDasharray: '4 4',
                title: () => `Constante: ${line.value}`,
              })
            );
          } else if (line.type === 'trend_line' && xField) {
            marks.push(
              Plot.linearRegressionY(result.rows, {
                x: xField,
                y: yField,
                stroke: '#6366f1',
                strokeWidth: 2,
              })
            );
          }
        }
      }
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
    } else if (isMultiMeasure) {
      colorScaleConfig = {
        type: 'categorical',
        range: EDITORIAL_OKLCH_CATEGORICAL,
        legend: true,
      };
    }

    // Build the Plot specification
    const plot = Plot.plot({
      width: Math.max(width - 20, 400),
      height: Math.max(height - 20, 360),
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      style: {
        background: 'transparent',
        color: textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        fontVariantNumeric: 'tabular-nums',
      },
      fx: isMultiMeasureVertical
        ? {
            label: getPillDisplayLabel(xPill, xField || 'X'),
            padding: 0.2,
            tickRotate: shouldRotateX ? -35 : 0,
          }
        : undefined,
      fy: isMultiMeasureHorizontal
        ? {
            label: getPillDisplayLabel(yPill, yField || 'Y'),
            padding: 0.2,
          }
        : undefined,
      x: isMultiMeasureVertical
        ? {
            axis: null,
          }
        : isMultiMeasureHorizontal
        ? {
            label: 'Valor de Métricas',
            grid: false,
            line: true,
            tickFormat: (d) =>
              typeof d === 'number' && d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d,
          }
        : {
            label: isMultiMeasureStandalone ? 'Métricas' : getPillDisplayLabel(xPill, xField || 'X'),
            grid: false,
            line: true,
            tickRotate: shouldRotateX ? -35 : 0,
            tickFormat: formatXTick,
          },
      y: isMultiMeasureHorizontal
        ? {
            axis: null,
          }
        : {
            label:
              isMultiMeasureVertical || isMultiMeasureStandalone
                ? 'Valor de Métricas'
                : markType === 'histogram'
                ? 'Frecuencia (Count)'
                : getPillDisplayLabel(yPill, yField || 'Y'),
            grid: false,
            line: true,
            tickFormat: (d) =>
              typeof d === 'number' && d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d,
          },
      color: colorScaleConfig,
      marks,
    });

    container.innerHTML = '';
    container.appendChild(plot);

    // Style the native Plot legend if rendered to match editorial palette
    const legendEl = container.querySelector('.plot-legend') as HTMLElement | null;
    if (legendEl) {
      legendEl.style.fontSize = '11px';
      legendEl.style.fontFamily = 'Inter, system-ui, sans-serif';
      legendEl.style.marginBottom = '8px';
      legendEl.style.color = mutedColor;
      legendEl.style.overflowX = 'auto';
    }

    return () => {
      container.innerHTML = '';
    };
  }, [ast, result, theme, dimensions]);

  if (!result || result.rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-stone-400 dark:text-stone-500 select-none">
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

  // If markType === 'text', render rich interactive HTML table
  if (ast?.markType === 'text') {
    return <TextTableRenderer ast={ast} result={result} theme={theme} />;
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden flex flex-col items-center justify-center"
    />
  );
};
