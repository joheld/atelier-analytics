import React, { useState } from 'react';
import { Parameter, DataType } from '../../core/ast/types';
import { Sliders, X } from 'lucide-react';

interface ParameterModalProps {
  initialParam?: Parameter | null;
  onSave: (param: Parameter) => void;
  onClose: () => void;
}

export const ParameterModal: React.FC<ParameterModalProps> = ({
  initialParam,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialParam?.name || '');
  const [dataType, setDataType] = useState<DataType>(initialParam?.dataType || 'number');
  const [currentValue, setCurrentValue] = useState<string>(
    initialParam?.currentValue !== undefined ? String(initialParam.currentValue) : '50000'
  );
  const [hasRange, setHasRange] = useState(
    initialParam?.min !== undefined && initialParam?.max !== undefined
  );
  const [min, setMin] = useState(initialParam?.min !== undefined ? String(initialParam.min) : '0');
  const [max, setMax] = useState(initialParam?.max !== undefined ? String(initialParam.max) : '100000');
  const [step, setStep] = useState(initialParam?.step !== undefined ? String(initialParam.step) : '1000');

  const handleSave = () => {
    if (!name.trim()) return;

    let parsedVal: string | number | boolean = currentValue;
    if (dataType === 'number') {
      parsedVal = Number(currentValue) || 0;
    } else if (dataType === 'boolean') {
      parsedVal = currentValue === 'true';
    }

    const param: Parameter = {
      id: initialParam?.id || `param_${Date.now()}`,
      name: name.trim().replace(/\s+/g, '_'),
      dataType,
      currentValue: parsedVal,
      min: hasRange && dataType === 'number' ? Number(min) : undefined,
      max: hasRange && dataType === 'number' ? Number(max) : undefined,
      step: hasRange && dataType === 'number' ? Number(step) : undefined,
    };

    onSave(param);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex w-full max-w-md flex-col rounded-xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-editorial text-sm font-bold text-stone-900 dark:text-stone-100">
              {initialParam ? 'Editar Parámetro' : 'Crear Parámetro'}
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

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Nombre del Parámetro (referenciable como [Nombre])
            </label>
            <input
              type="text"
              placeholder="ej. Umbral_Ventas, Meta_Anual"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
            />
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
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              Valor Actual
            </label>
            {dataType === 'boolean' ? (
              <select
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : (
              <input
                type={dataType === 'number' ? 'number' : 'text'}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
              />
            )}
          </div>

          {dataType === 'number' && (
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-3">
              <label className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRange}
                  onChange={(e) => setHasRange(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Habilitar control deslizante (Slider Range)</span>
              </label>

              {hasRange && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-stone-500 font-mono">Mínimo</label>
                    <input
                      type="number"
                      value={min}
                      onChange={(e) => setMin(e.target.value)}
                      className="w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-500 font-mono">Máximo</label>
                    <input
                      type="number"
                      value={max}
                      onChange={(e) => setMax(e.target.value)}
                      className="w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-500 font-mono">Paso</label>
                    <input
                      type="number"
                      value={step}
                      onChange={(e) => setStep(e.target.value)}
                      className="w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
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
            disabled={!name.trim()}
            className="rounded-md bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            Guardar Parámetro
          </button>
        </div>
      </div>
    </div>
  );
};
