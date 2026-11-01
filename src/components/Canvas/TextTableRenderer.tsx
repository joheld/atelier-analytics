import React, { useState, useMemo } from 'react';
import { WorksheetAST, Pill } from '../../core/ast/types';
import { QueryExecutionResult } from '../../core/engine/duckdbClient';
import { getPillSqlIdentifier } from '../../core/ast/builder';
import { formatMetricValue } from '../../utils/numberFormatter';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  Check,
  Table as TableIcon,
} from 'lucide-react';

interface TextTableRendererProps {
  ast: WorksheetAST;
  result: QueryExecutionResult;
  theme: 'light' | 'dark';
}

interface TableColumnDef {
  key: string;
  label: string;
  role: 'dimension' | 'measure';
  dataType: string;
  pill?: Pill;
}

export const TextTableRenderer: React.FC<TextTableRendererProps> = ({
  ast,
  result,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [copied, setCopied] = useState(false);

  // Discover Table Columns based on AST or result projections
  const columns: TableColumnDef[] = useMemo(() => {
    const cols: TableColumnDef[] = [];
    const seen = new Set<string>();

    const allSpatialPills = [...(ast.spatialX || []), ...(ast.spatialY || [])];
    const dimensions = [
      ...allSpatialPills.filter((p) => p.role === 'dimension'),
      ...(ast.groupByDimensions || []).filter((p) => !allSpatialPills.some((sp) => sp.id === p.id)),
    ];
    const measures = [
      ...allSpatialPills.filter((p) => p.role === 'measure'),
      ...(ast.aggregatedMeasures || []).filter((p) => !allSpatialPills.some((sp) => sp.id === p.id)),
    ];

    // 1. Add all dimensions first (Row / Column headers)
    for (const d of dimensions) {
      const key = getPillSqlIdentifier(d);
      if (!seen.has(key)) {
        seen.add(key);
        cols.push({
          key,
          label: d.alias || d.columnName,
          role: 'dimension',
          dataType: d.dataType,
          pill: d,
        });
      }
    }

    // 2. Add all measures (Metric cells)
    for (const m of measures) {
      const key = getPillSqlIdentifier(m);
      if (!seen.has(key)) {
        seen.add(key);
        const aggLabel = m.aggregation ? `${m.aggregation}(${m.columnName})` : m.columnName;
        cols.push({
          key,
          label: m.alias || aggLabel,
          role: 'measure',
          dataType: m.dataType,
          pill: m,
        });
      }
    }

    // 3. Fallback: if no spatial pills, use raw result columns
    if (cols.length === 0 && result.columnNames && result.columnNames.length > 0) {
      for (const colName of result.columnNames) {
        const sampleVal = result.rows[0]?.[colName];
        const isNum = typeof sampleVal === 'number' || typeof sampleVal === 'bigint';
        cols.push({
          key: colName,
          label: colName,
          role: isNum ? 'measure' : 'dimension',
          dataType: isNum ? 'number' : 'string',
        });
      }
    }

    return cols;
  }, [ast, result]);

  // Filter and sort rows
  const processedRows = useMemo(() => {
    let rows = [...result.rows];

    // Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortCol) {
      rows.sort((a, b) => {
        const va = a[sortCol];
        const vb = b[sortCol];
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        const numA = typeof va === 'bigint' ? Number(va) : typeof va === 'number' ? va : NaN;
        const numB = typeof vb === 'bigint' ? Number(vb) : typeof vb === 'number' ? vb : NaN;
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDir === 'asc' ? numA - numB : numB - numA;
        }
        return sortDir === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }

    return rows;
  }, [result.rows, searchQuery, sortCol, sortDir]);

  // Grand Totals Calculation for measures
  const totals = useMemo(() => {
    const res: Record<string, number> = {};
    for (const col of columns) {
      if (col.role === 'measure') {
        let sum = 0;
        for (const row of processedRows) {
          const v = row[col.key];
          const num = typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : Number(v);
          if (!isNaN(num)) {
            sum += num;
          }
        }
        res[col.key] = sum;
      }
    }
    return res;
  }, [columns, processedRows]);

  const toggleSort = (colKey: string) => {
    if (sortCol === colKey) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortCol(null);
      }
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  const formatCell = (val: unknown, _role?: 'dimension' | 'measure', pill?: Pill): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'bigint') {
      return formatMetricValue(Number(val), pill?.formatConfig);
    }
    if (typeof val === 'number') {
      return formatMetricValue(val, pill?.formatConfig);
    }
    if (val instanceof Date) {
      return val.toLocaleDateString();
    }
    return String(val);
  };

  const handleCopyTSV = () => {
    try {
      const header = columns.map((c) => c.label).join('\t');
      const body = processedRows
        .map((r) => columns.map((c) => String(r[c.key] ?? '')).join('\t'))
        .join('\n');
      const full = `${header}\n${body}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).catch(() => {});
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadCSV = () => {
    const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const body = processedRows
      .map((r) =>
        columns
          .map((c) => {
            const v = r[c.key];
            if (v === null || v === undefined) return '""';
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelier-table-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-stone-900 rounded-xl">
      {/* Table Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 px-4 py-2.5 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 select-none">
        <div className="flex items-center gap-2">
          <TableIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span className="font-editorial text-xs font-bold text-stone-800 dark:text-stone-200">
            Tabla de Texto (Cross-Tab)
          </span>
          <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-[10px] font-mono text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            {processedRows.length} {processedRows.length === 1 ? 'fila' : 'filas'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en celdas..."
              className="h-7 w-44 rounded-md border border-stone-200 bg-white pl-8 pr-2.5 text-xs font-mono text-stone-800 placeholder-stone-400 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            />
          </div>

          {/* Copy TSV button */}
          <button
            type="button"
            onClick={handleCopyTSV}
            title="Copiar tabla para Excel o Google Sheets"
            className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-2xs font-mono text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-750"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copiado' : 'Copiar TSV'}</span>
          </button>

          {/* Download CSV button */}
          <button
            type="button"
            onClick={handleDownloadCSV}
            title="Descargar datos en formato CSV"
            className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-2xs font-mono text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-750"
          >
            <Download className="h-3 w-3" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Cross-Tab Scrollable Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-10 border-b border-stone-200 bg-stone-100/95 backdrop-blur-xs dark:border-stone-800 dark:bg-stone-800/95">
            <tr>
              {columns.map((col) => {
                const isSorted = sortCol === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`cursor-pointer select-none px-3.5 py-2 font-mono text-[11px] font-semibold transition-colors hover:bg-stone-200/50 dark:hover:bg-stone-700/50 ${
                      col.role === 'measure' ? 'text-right' : 'text-left'
                    } text-stone-700 dark:text-stone-300`}
                  >
                    <div
                      className={`flex items-center gap-1.5 ${
                        col.role === 'measure' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Pill Role Indicator */}
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          col.role === 'dimension'
                            ? 'bg-sky-500 ring-2 ring-sky-500/20'
                            : 'bg-emerald-500 ring-2 ring-emerald-500/20'
                        }`}
                        title={col.role === 'dimension' ? 'Dimensión (Azul)' : 'Métrica (Verde)'}
                      />
                      <span className="truncate">{col.label}</span>
                      {/* Sort direction indicator */}
                      <span className="text-stone-400">
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                          )
                        ) : (
                          <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-stone-100 dark:divide-stone-850">
            {processedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-stone-400 dark:text-stone-500 font-mono"
                >
                  No se encontraron filas que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              processedRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-950/20 even:bg-stone-50/40 dark:even:bg-stone-850/20"
                >
                  {columns.map((col) => {
                    const rawVal = row[col.key];
                    const isNeg = typeof rawVal === 'number' && rawVal < 0;
                    return (
                      <td
                        key={col.key}
                        className={`px-3.5 py-2 ${
                          col.role === 'measure'
                            ? `text-right font-mono font-medium ${
                                isNeg
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-stone-900 dark:text-stone-100'
                              }`
                            : 'text-left text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {formatCell(rawVal, col.role, col.pill)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>

          {/* Grand Totals Footer Row (Tableau Style) */}
          {processedRows.length > 0 && Object.keys(totals).length > 0 && (
            <tfoot className="sticky bottom-0 z-10 border-t-2 border-stone-300 bg-stone-100/95 font-mono text-xs font-bold dark:border-stone-700 dark:bg-stone-800/95 shadow-md">
              <tr>
                {columns.map((col, idx) => {
                  if (col.role === 'dimension') {
                    return (
                      <td key={col.key} className="px-3.5 py-2.5 text-stone-800 dark:text-stone-200">
                        {idx === 0 ? 'Grand Total' : ''}
                      </td>
                    );
                  }
                  const totalVal = totals[col.key];
                  return (
                    <td
                      key={col.key}
                      className="px-3.5 py-2.5 text-right font-bold text-stone-900 dark:text-stone-100"
                    >
                      {totalVal !== undefined ? formatMetricValue(totalVal, col.pill?.formatConfig) : ''}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
