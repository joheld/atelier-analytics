import React, { useState } from 'react';
import { CompiledQuery } from '../../core/compiler/sqlCompiler';
import { QueryExecutionResult } from '../../core/engine/duckdbClient';
import { WorksheetAST } from '../../core/ast/types';
import { Copy, Check, Terminal, Zap, Code2, X } from 'lucide-react';

interface SQLInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  compiledQuery: CompiledQuery | null;
  queryResult: QueryExecutionResult | null;
  ast: WorksheetAST | null;
}

export const SQLInspectorDrawer: React.FC<SQLInspectorDrawerProps> = ({
  isOpen,
  onClose,
  compiledQuery,
  queryResult,
  ast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (compiledQuery?.sql) {
      navigator.clipboard.writeText(compiledQuery.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-stone-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-editorial text-base font-semibold text-stone-900 dark:text-stone-100">
            DuckDB-WASM Query Inspector
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

      {/* Metrics Banner */}
      <div className="grid grid-cols-3 border-b border-stone-200/80 bg-stone-50/50 p-3 text-center dark:border-stone-800 dark:bg-stone-900/50">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stone-400 font-mono">OLAP Latency</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            <Zap className="h-3.5 w-3.5" />
            {queryResult ? `${queryResult.durationMs.toFixed(2)} ms` : '--'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stone-400 font-mono">Aggregated Rows</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
            {queryResult ? queryResult.rowCount.toLocaleString() : '--'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stone-400 font-mono">Memory Mode</div>
          <div className="mt-0.5 font-mono text-xs font-medium text-sky-600 dark:text-sky-400">
            Arrow Zero-Copy
          </div>
        </div>
      </div>

      {/* SQL Code Block */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 font-mono flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" />
              Compiler-Generated SQL
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600 shadow-xs hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>

          <pre className="overflow-x-auto rounded-lg border border-stone-200 bg-stone-900 p-3 text-xs leading-relaxed text-emerald-400 font-mono shadow-inner dark:border-stone-800">
            <code>{compiledQuery?.sql || '-- No active query'}</code>
          </pre>
        </div>

        {/* AST Inspection */}
        {ast && (
          <div className="rounded-lg border border-stone-200/90 bg-stone-50/70 p-3 text-xs dark:border-stone-800 dark:bg-stone-900/40">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
              AST Pipeline → Relational Clauses
            </h4>
            <div className="space-y-1.5 font-mono text-[11px] text-stone-600 dark:text-stone-400">
              <div>
                <strong className="text-sky-600 dark:text-sky-400">GROUP BY: </strong>
                {ast.groupByDimensions.length > 0
                  ? ast.groupByDimensions.map((d) => d.columnName).join(', ')
                  : 'None (Global aggregation)'}
              </div>
              <div>
                <strong className="text-emerald-600 dark:text-emerald-400">SELECT (Measures): </strong>
                {ast.aggregatedMeasures.length > 0
                  ? ast.aggregatedMeasures.map((m) => `${m.aggregation || 'SUM'}(${m.columnName})`).join(', ')
                  : 'All columns'}
              </div>
              {ast.detailChannel.length > 0 && (
                <div>
                  <strong className="text-amber-600 dark:text-amber-400">Active DETAIL Channel: </strong>
                  {ast.detailChannel.map((d) => d.columnName).join(', ')} (Subdivides marks without new axes)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
