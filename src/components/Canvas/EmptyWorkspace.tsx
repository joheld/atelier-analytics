import React, { useState } from 'react';
import { FileSpreadsheet, Server, ArrowDownToLine, Cpu, Lock, Sparkles } from 'lucide-react';

interface EmptyWorkspaceProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  onOpenRelationalModal?: () => void;
}

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({
  onFileUpload,
  isUploading,
  onOpenRelationalModal,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    try {
      const response = await fetch('./superstore-sample.csv');
      if (!response.ok) throw new Error('Failed to load sample dataset');
      const blob = await response.blob();
      const file = new File([blob], 'superstore-sample.csv', { type: 'text/csv' });
      onFileUpload(file);
    } catch (err) {
      console.error('Failed to load sample dataset:', err);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 select-none bg-dot-grid">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex max-w-xl w-full flex-col items-center justify-center rounded-lg border p-8 text-center transition-colors duration-150 rim-light ${
          isDragOver
            ? 'border-sky-500 bg-sky-50/40 dark:border-sky-400 dark:bg-sky-950/20'
            : 'border-stone-200/90 bg-white/95 dark:border-white/[0.08] dark:bg-stone-900/90'
        }`}
      >
        {/* Technical Droppable Reticle */}
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-850 dark:text-stone-300 mb-3.5 shadow-xs">
          <ArrowDownToLine className="h-5 w-5 text-stone-600 dark:text-stone-400" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Connect Data Source
          </h2>
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Drop any local file or select a connection to run analytical queries in-memory.
          </p>
        </div>

        {/* Supported Format Badges */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[10px] text-stone-500 dark:text-stone-400">
          <span className="rounded border border-stone-200/80 bg-stone-100/70 px-1.5 py-0.5 dark:border-stone-800 dark:bg-stone-800/60">.xlsx / .xls</span>
          <span className="rounded border border-stone-200/80 bg-stone-100/70 px-1.5 py-0.5 dark:border-stone-800 dark:bg-stone-800/60">.csv / .tsv</span>
          <span className="rounded border border-stone-200/80 bg-stone-100/70 px-1.5 py-0.5 dark:border-stone-800 dark:bg-stone-800/60">.parquet</span>
          <span className="rounded border border-stone-200/80 bg-stone-100/70 px-1.5 py-0.5 dark:border-stone-800 dark:bg-stone-800/60">.sqlite / .db</span>
          <span className="rounded border border-stone-200/80 bg-stone-100/70 px-1.5 py-0.5 dark:border-stone-800 dark:bg-stone-800/60">.twbx / .twb</span>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isUploading || isLoadingSample}
            className="btn-tactile inline-flex items-center gap-2 rounded-md border border-amber-300/80 bg-amber-50/80 px-3.5 py-2 text-xs font-medium text-amber-900 shadow-2xs hover:bg-amber-100 hover:border-amber-400 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/60 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>{isLoadingSample ? 'Loading Demo...' : 'Load Sample Dataset (Superstore)'}</span>
          </button>

          <label className="btn-tactile inline-flex cursor-pointer items-center gap-2 rounded-md bg-stone-900 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-stone-800 focus:outline-none dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white rim-light">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>{isUploading ? 'Loading into memory...' : 'Select File'}</span>
            <span className="kbd-shortcut ml-1 text-stone-300 dark:text-stone-700">⌘O</span>
            <input
              type="file"
              accept=".parquet,.csv,.tsv,.json,.ndjson,.xlsx,.xls,.sqlite,.db,.sqlite3,.twbx,.tdsx,.twb,.tds"
              onChange={handleFileInputChange}
              disabled={isUploading || isLoadingSample}
              className="hidden"
            />
          </label>

          {onOpenRelationalModal && (
            <button
              type="button"
              onClick={onOpenRelationalModal}
              className="btn-tactile inline-flex items-center gap-2 rounded-md border border-stone-200/90 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-850 dark:text-stone-200 dark:hover:bg-stone-800 cursor-pointer"
            >
              <Server className="h-3.5 w-3.5 text-stone-500" />
              <span>SQL Server (Postgres / MySQL)</span>
            </button>
          )}
        </div>

        {/* Technical Architecture Specs */}
        <div className="mt-7 flex items-center justify-between gap-4 w-full border-t border-stone-100 pt-4 dark:border-stone-800/80 font-mono text-[10.5px] text-stone-400 dark:text-stone-500">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>DuckDB-WASM Columnar Engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-sky-600 dark:text-sky-400" />
            <span>In-Browser Zero-Cloud Execution</span>
          </div>
        </div>
      </div>
    </div>
  );
};
