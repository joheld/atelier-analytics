import React, { useState } from 'react';
import { CalculatedField, DatasetColumn, Parameter, FieldRole, DataType } from '../../core/ast/types';
import { duckdbEngine } from '../../core/engine/duckdbClient';
import { substituteParameters } from '../../core/compiler/sqlCompiler';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  X,
  Code2,
  Table,
  Sliders,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface CalculatedFieldModalProps {
  tableName: string;
  columns: DatasetColumn[];
  parameters: Parameter[];
  initialField?: CalculatedField | null;
  onSave: (field: CalculatedField) => void;
  onClose: () => void;
}

export const CalculatedFieldModal: React.FC<CalculatedFieldModalProps> = ({
  tableName,
  columns,
  parameters,
  initialField,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialField?.name || '');
  const [role, setRole] = useState<FieldRole>(initialField?.role || 'measure');
  const [dataType, setDataType] = useState<DataType>(initialField?.dataType || 'number');
  const [formula, setFormula] = useState(initialField?.formula || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    tested: boolean;
    valid: boolean;
    error?: string;
  } | null>(null);

  const handleValidate = async () => {
    if (!formula.trim() || !tableName) return;
    try {
      setIsValidating(true);
      // Substitute parameters before testing in DuckDB
      const evaluated = substituteParameters(formula, parameters);
      const res = await duckdbEngine.validateCalculatedFormula(tableName, evaluated);
      setValidationResult({
        tested: true,
        valid: res.valid,
        error: res.error,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !formula.trim()) return;

    // Optional quick auto-validation if not tested yet
    if (!validationResult?.tested) {
      const evaluated = substituteParameters(formula, parameters);
      const res = await duckdbEngine.validateCalculatedFormula(tableName, evaluated);
      if (!res.valid) {
        setValidationResult({ tested: true, valid: false, error: res.error });
        return;
      }
    }

    const field: CalculatedField = {
      id: initialField?.id || `calc_${Date.now()}`,
      name: name.trim(),
      role,
      dataType,
      formula: formula.trim(),
    };

    onSave(field);
  };

  const insertTextAtCursor = (text: string) => {
    setFormula((prev) => (prev ? `${prev} ${text}` : text));
    setValidationResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex h-[560px] w-full max-w-2xl flex-col rounded-xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-editorial text-sm font-bold text-stone-900 dark:text-stone-100">
              {initialField ? 'Editar Campo Calculado' : 'Crear Campo Calculado'}
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

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Form (Left) */}
          <div className="flex flex-1 flex-col p-5 overflow-y-auto space-y-4">
            {/* Field Name */}
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                Nombre del Campo
              </label>
              <input
                type="text"
                placeholder="ej. Margen de Beneficio, Salario Neto..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </div>

            {/* Role & DataType Selector */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Rol Analítico
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as FieldRole)}
                  className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  <option value="measure">Métrica (Verde - Agregación)</option>
                  <option value="dimension">Dimensión (Azul - Agrupación)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Tipo de Dato
                </label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value as DataType)}
                  className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  <option value="number">Número (Float / Int)</option>
                  <option value="string">Cadena de Texto (String)</option>
                  <option value="boolean">Booleano (True / False)</option>
                  <option value="date">Fecha (Date)</option>
                </select>
              </div>
            </div>

            {/* Formula Editor */}
            <div className="flex-1 flex flex-col min-h-[140px]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Fórmula SQL (DuckDB)
                </label>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating || !formula.trim()}
                  className="flex items-center gap-1 text-[11px] font-mono text-sky-600 hover:text-sky-700 disabled:opacity-50 dark:text-sky-400"
                >
                  {isValidating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  <span>Validar sintaxis</span>
                </button>
              </div>

              <textarea
                value={formula}
                onChange={(e) => {
                  setFormula(e.target.value);
                  setValidationResult(null);
                }}
                placeholder='ej. "sales" - "cost"  ó  CASE WHEN "age" > 50 THEN 1 ELSE 0 END'
                className="flex-1 w-full rounded-md border border-stone-200 bg-stone-50/50 p-2.5 font-mono text-xs text-stone-900 focus:border-stone-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 resize-none leading-relaxed"
              />

              {/* Validation Status Notice */}
              {validationResult?.tested && (
                <div
                  className={`mt-2 flex items-start gap-1.5 rounded-md p-2 text-xs font-mono ${
                    validationResult.valid
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}
                >
                  {validationResult.valid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <span>Sintaxis DuckDB verificada correctamente.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <span className="break-all">{validationResult.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reference Sidebar (Right) */}
          <div className="w-56 border-l border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/40 flex flex-col overflow-y-auto space-y-4 select-none">
            {/* Columns helper */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono flex items-center gap-1 mb-1.5">
                <Table className="h-3 w-3" />
                <span>Campos</span>
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {columns.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => insertTextAtCursor(`"${col.name}"`)}
                    className="w-full text-left truncate rounded px-1.5 py-0.5 font-mono text-[11px] text-stone-700 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    title={`Insertar "${col.name}"`}
                  >
                    "{col.name}"
                  </button>
                ))}
              </div>
            </div>

            {/* Parameters helper */}
            {parameters.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1 mb-1.5">
                  <Sliders className="h-3 w-3" />
                  <span>Parámetros</span>
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {parameters.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => insertTextAtCursor(`[${p.name}]`)}
                      className="w-full text-left truncate rounded px-1.5 py-0.5 font-mono text-[11px] text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950"
                      title={`Insertar [${p.name}]`}
                    >
                      [{p.name}]
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Snippets helper */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono flex items-center gap-1 mb-1.5">
                <Code2 className="h-3 w-3" />
                <span>Funciones SQL</span>
              </span>
              <div className="space-y-1">
                {[
                  { label: 'CASE WHEN', snippet: 'CASE WHEN condition THEN val1 ELSE val2 END' },
                  { label: 'ROUND', snippet: 'ROUND(expr, 2)' },
                  { label: 'COALESCE', snippet: 'COALESCE(col, 0)' },
                  { label: 'CONCAT', snippet: "CONCAT(col1, ' ', col2)" },
                  { label: 'EXTRACT', snippet: "EXTRACT(year FROM col)" },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => insertTextAtCursor(s.snippet)}
                    className="w-full text-left rounded px-1.5 py-0.5 font-mono text-[10.5px] text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-3 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || !formula.trim()}
            className="rounded-md bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            Guardar Campo
          </button>
        </div>
      </div>
    </div>
  );
};
