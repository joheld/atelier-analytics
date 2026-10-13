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
                Transparencia de Almacenamiento Local
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Dónde y cómo Atelier Analytics resguarda tus datos en este Mac
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
                Datasets Locales
              </span>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100 font-mono">
                {metrics.datasetCount || availableDatasets.length}
              </span>
              <span className="text-[10px] text-stone-400">en IndexedDB</span>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-950/40">
              <span className="block text-[11px] font-mono text-stone-500 dark:text-stone-400">
                Espacio en Disco
              </span>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100 font-mono">
                {formatBytes(metrics.datasetBytes)}
              </span>
              <span className="text-[10px] text-stone-400">binarios comprimidos</span>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-950/40">
              <span className="block text-[11px] font-mono text-stone-500 dark:text-stone-400">
                Reportes Activos
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {Math.max(1, savedWorkbooksCount || metrics.workbookCount)}
              </span>
              <span className="text-[10px] text-stone-400">en catálogo local</span>
            </div>

            <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 dark:border-stone-800 dark:bg-stone-950/40">
              <span className="block text-[11px] font-mono text-stone-500 dark:text-stone-400">
                Hojas / Vistas
              </span>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100 font-mono">
                {sheetsCount}
              </span>
              <span className="text-[10px] text-stone-400">en reporte actual</span>
            </div>
          </div>

          {/* Card 2: Exactly Where is Data Stored */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/30 space-y-3">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-semibold text-xs">
              <HardDrive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>¿Dónde están guardados mis datos exactamente en este Mac?</span>
            </div>

            <p className="leading-relaxed text-stone-600 dark:text-stone-400">
              Atelier opera bajo una arquitectura <strong>100% Client-Side & Zero-Cloud</strong>. El motor DuckDB-WASM y el autoguardado almacenan tus archivos y reportes en dos capas locales de tu máquina:
            </p>

            <div className="space-y-2">
              <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    1. Almacén IndexedDB del Navegador (`atelier_analytics_db_v1`)
                  </span>
                  <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-800 dark:text-emerald-300">
                    Resiliente a F5 / Cierre
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                  Guarda los archivos binarios CSV/Parquet (tienda <code className="font-mono text-stone-700 dark:text-stone-300">datasets</code>) y el catálogo de todos tus reportes (tienda <code className="font-mono text-stone-700 dark:text-stone-300">workbooks</code>). Sobrevive a recargas accidentales, reinicios de pestañas o del navegador.
                </p>
              </div>

              <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    2. Ubicación Física en macOS
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    className="flex items-center gap-1 text-[11px] font-mono text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                    title="Copiar ruta al portapapeles"
                  >
                    {copiedPath ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPath ? 'Copiado' : 'Copiar ruta'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-1.5 leading-normal">
                  Físicamente en macOS, el motor de tu navegador guarda la base de datos IndexedDB en tu disco en:
                </p>
                <code className="block rounded bg-stone-100 p-2 font-mono text-[10px] text-stone-800 dark:bg-stone-800/80 dark:text-stone-200 break-all select-all">
                  ~/Library/Application Support/Google/Chrome/Default/IndexedDB/http_localhost_5173_0.indexeddb.leveldb/
                </code>
                <p className="text-[10px] text-stone-400 mt-1">
                  (O la carpeta correspondiente si usas Arc, Safari, Brave o Edge).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2.5 text-[11px] text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Privacidad Total:</strong> Ningún byte de tus datos sale jamás de tu Mac. No hay telemetría ni servidores remotos.
              </span>
            </div>
          </div>

          {/* Card 3: Multi-Report Strategy Guide */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/30 space-y-2.5">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-semibold text-xs">
              <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>¿Cómo crear un nuevo reporte sin cerrar o perder el que estás haciendo?</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <span className="font-semibold text-stone-800 dark:text-stone-200 block mb-1">
                  Opción A: Nuevas Hojas o Dashboards (Abajo)
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  Si deseas hacer múltiples análisis sobre el mismo proyecto, pulsa el botón <strong>+</strong> en la barra inferior para agregar otra Hoja o un Dashboard interactivo que combine visualizaciones.
                </p>
              </div>

              <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <span className="font-semibold text-stone-800 dark:text-stone-200 block mb-1">
                  Opción B: Catálogo de Reportes (Arriba)
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  Junto al logo de Atelier en la barra superior, haz clic en el selector de reporte y pulsa <strong>+ Nuevo Reporte</strong>. Tu reporte actual se resguarda de inmediato y puedes alternar entre ellos cuando quieras.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Export to Physical File */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">
                Descargar Archivo Físico (.atelier) a tu Disco
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                Exporta el estado completo de este reporte ({currentWorkbookName}) a tu carpeta <code className="font-mono text-stone-700 dark:text-stone-300">~/Downloads</code> para compartirlo o respaldarlo.
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
              <span>Descargar .atelier</span>
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
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
