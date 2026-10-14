import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, ShieldCheck, Cpu } from 'lucide-react';

interface EmptyWorkspaceProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
}

export const EmptyWorkspace: React.FC<EmptyWorkspaceProps> = ({
  onFileUpload,
  isUploading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

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
    <div className="flex h-full w-full flex-col items-center justify-center p-8 select-none">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex max-w-xl w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 scale-[1.01]'
            : 'border-stone-300/80 bg-white dark:border-stone-800 dark:bg-stone-900 shadow-editorial'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 mb-4 shadow-xs">
          <UploadCloud className="h-7 w-7 text-sky-600 dark:text-sky-400" />
        </div>

        <h2 className="font-editorial text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Conecta tus Datos
        </h2>

        <p className="mt-2 max-w-md text-xs leading-relaxed text-stone-500 dark:text-stone-400 font-sans">
          Arrastra y suelta tu archivo <strong className="text-stone-800 dark:text-stone-200">.xlsx / .xls</strong>,{' '}
          <strong className="text-stone-800 dark:text-stone-200">.parquet</strong>,{' '}
          <strong className="text-stone-800 dark:text-stone-200">.csv</strong> o{' '}
          <strong className="text-stone-800 dark:text-stone-200">.json</strong> aquí para analizarlo en memoria a cero latencia.
        </p>

        <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-stone-800 focus:outline-none dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white transition-all">
          <FileSpreadsheet className="h-4 w-4" />
          <span>{isUploading ? 'Procesando en DuckDB...' : 'Explorar Archivo Local'}</span>
          <input
            type="file"
            accept=".parquet,.csv,.tsv,.json,.xlsx,.xls"
            onChange={handleFileInputChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>

        {/* Value Prop Badges */}
        <div className="mt-8 grid grid-cols-2 gap-3 w-full border-t border-stone-100 pt-6 dark:border-stone-800">
          <div className="flex items-center gap-2 text-left">
            <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-[11px] leading-tight text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">Motor Columnar WASM</span>
              <br />Procesamiento 100% en navegador
            </div>
          </div>
          <div className="flex items-center gap-2 text-left">
            <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <div className="text-[11px] leading-tight text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">Privacidad Absoluta</span>
              <br />Los datos nunca salen de tu Mac
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
