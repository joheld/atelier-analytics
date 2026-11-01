import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Database,
  ShieldCheck,
  Download,
  Layers,
  Check,
  Copy,
} from 'lucide-react';
import { getStorageUsageSummary } from '../../core/storage/indexedDBStorage';
import { DatasetMeta } from '../../core/ast/types';

interface StorageInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportProject: () => void;
  currentWorkbookName: string;
  savedWorkbooksCount: number;
  availableDatasets: DatasetMeta[];
  sheetsCount: number;
}

export const StorageInspectorModal: React.FC<StorageInspectorModalProps> = ({
  isOpen,
  onClose,
  onExportProject,
  currentWorkbookName,
  savedWorkbooksCount,
  availableDatasets,
  sheetsCount,
}) => {
  const [metrics, setMetrics] = useState<{
    datasetCount: number;
    datasetBytes: number;
    workbookCount: number;
  }>({
    datasetCount: 0,
    datasetBytes: 0,
    workbookCount: 0,
  });
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void getStorageUsageSummary().then((summary) => {
        setMetrics(summary);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const macPathChrome =
    '~/Library/Application Support/Google/Chrome/Default/IndexedDB/http_localhost_5173_0.indexeddb.leveldb/';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(macPathChrome).then(() => {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="relative flex w-full max-w-2xl flex-col max-h-[90vh] rounded-2xl border border-stone-200/90 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/80 px-6 py-4 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Local Storage Transparency
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Where and how Atelier Analytics protects your data on this machine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-stone-700 dark:text-stone-300">
          {/* Card 1: Storage Breakdown Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-950/40">
              <span className="block text-[11px] font-mono text-stone-500 dark:text-stone-400">
                Local Datasets
              </span>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100 font-mono">
                {metrics.datasetCount || availableDatasets.length}
              </span>
              <span className="text-[10px] text-stone-400">in IndexedDB</span>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-950/40">
              <span className="block text-[11px] font-mono text-stone-500 dark:text-stone-400">
                Disk Space
              </span>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100 font-mono">
                {formatBytes(metrics.datasetBytes)}
              </span>
              <span className="text-[10px] text-stone-400">compressed binaries</span>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-950/40">
              <span className="block text-[11px] font-mono text-stone-500 dark:text-stone-400">
                Active Workbooks
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {Math.max(1, savedWorkbooksCount || metrics.workbookCount)}
              </span>
              <span className="text-[10px] text-stone-400">in local catalog</span>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-950/40">
              <span className="block text-[11px] font-mono text-stone-500 dark:text-stone-400">
                Sheets / Views
              </span>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100 font-mono">
                {sheetsCount}
              </span>
              <span className="text-[10px] text-stone-400">in current workbook</span>
            </div>
          </div>

          {/* Card 2: Exactly Where is Data Stored */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/30 space-y-3">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-semibold text-xs">
              <HardDrive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Where exactly is my data stored on this machine?</span>
            </div>

            <p className="leading-relaxed text-stone-600 dark:text-stone-400">
              Atelier operates under a <strong>100% Client-Side & Zero-Cloud</strong> architecture. The DuckDB-WASM engine and autosave store your files and workbooks across two local machine layers:
            </p>

            <div className="space-y-2">
              <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    1. Browser IndexedDB Store (`atelier_analytics_db_v1`)
                  </span>
                  <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-800 dark:text-emerald-300">
                    Resilient to Refresh / Exit
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                  Saves raw CSV/Parquet binaries (<code className="font-mono text-stone-700 dark:text-stone-300">datasets</code> store) and your complete workbook catalog (<code className="font-mono text-stone-700 dark:text-stone-300">workbooks</code> store). Survives accidental page reloads, tab crashes, or browser restarts.
                </p>
              </div>

              <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    2. Physical Location on macOS
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    className="flex items-center gap-1 text-[11px] font-mono text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                    title="Copy path to clipboard"
                  >
                    {copiedPath ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPath ? 'Copied' : 'Copy path'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-1.5 leading-normal">
                  Physically on macOS, your browser engine stores the IndexedDB database on disk at:
                </p>
                <code className="block rounded bg-stone-100 p-2 font-mono text-[10px] text-stone-800 dark:bg-stone-800/80 dark:text-stone-200 break-all select-all">
                  ~/Library/Application Support/Google/Chrome/Default/IndexedDB/http_localhost_5173_0.indexeddb.leveldb/
                </code>
                <p className="text-[10px] text-stone-400 mt-1">
                  (Or corresponding directory if using Arc, Safari, Brave, or Edge).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2.5 text-[11px] text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Total Privacy:</strong> No byte of your data ever leaves your computer. Zero telemetry, zero external servers.
              </span>
            </div>
          </div>

          {/* Card 3: Multi-Report Strategy Guide */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/30 space-y-2.5">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-semibold text-xs">
              <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>How to create a new workbook without closing or losing current work?</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <span className="font-semibold text-stone-800 dark:text-stone-200 block mb-1">
                  Option A: New Worksheets or Dashboards (Bottom)
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  To perform multiple analyses on the same dataset, click the <strong>+</strong> button in the bottom tab bar to add another Worksheet or an interactive Dashboard.
                </p>
              </div>

              <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <span className="font-semibold text-stone-800 dark:text-stone-200 block mb-1">
                  Option B: Workbook Catalog (Top)
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  Next to the Atelier logo in the top bar, click the workbook switcher and click <strong>+ New Workbook</strong>. Your current workbook is immediately saved and you can toggle between them anytime.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Export to Physical File */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">
                Download Physical File (.atelier) to Disk
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                Export full snapshot of this workbook ({currentWorkbookName}) to your <code className="font-mono text-stone-700 dark:text-stone-300">~/Downloads</code> folder for backup or sharing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onExportProject();
              }}
              className="flex items-center gap-2 shrink-0 rounded-xl bg-stone-900 px-4 py-2 font-medium text-xs text-white shadow-sm hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .atelier</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-stone-200/80 bg-stone-50/60 px-6 py-3 dark:border-stone-800 dark:bg-stone-950/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 bg-white px-4 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
