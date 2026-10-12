import React, { useState } from 'react';
import { Parameter, DataType, DatasetColumn, ParameterAllowableType, ParameterListItem } from '../../core/ast/types';
import { duckdbEngine } from '../../core/engine/duckdbClient';
import {
  Sliders,
  X,
  Plus,
  Trash2,
  Loader2,
  Check,
} from 'lucide-react';

interface ParameterModalProps {
  initialParam?: Parameter | null;
  tableName?: string;
  columns?: DatasetColumn[];
  onSave: (param: Parameter) => void;
  onClose: () => void;
}

export const ParameterModal: React.FC<ParameterModalProps> = ({
  initialParam,
  tableName,
  columns = [],
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialParam?.name || '');
  const [comment, setComment] = useState(initialParam?.comment || '');
  const [dataType, setDataType] = useState<DataType>(initialParam?.dataType || 'number');
  const [numberSubtype, setNumberSubtype] = useState<'float' | 'integer'>(
    initialParam?.numberSubtype || 'float'
  );
  const [displayFormat, setDisplayFormat] = useState<
    'automatic' | 'currency' | 'percentage' | 'number' | 'date'
  >(initialParam?.displayFormat || 'automatic');

  // Allowable values: All | List | Range (Tableau mental model)
  const [allowableType, setAllowableType] = useState<ParameterAllowableType>(
    initialParam?.allowableType ||
      (initialParam?.min !== undefined ? 'range' : initialParam?.listItems?.length ? 'list' : 'all')
  );

  const [currentValue, setCurrentValue] = useState<string>(
    initialParam?.currentValue !== undefined ? String(initialParam.currentValue) : '10'
  );

  // List allowable items
  const [listItems, setListItems] = useState<ParameterListItem[]>(
    initialParam?.listItems && initialParam.listItems.length > 0
      ? initialParam.listItems
      : initialParam?.options && initialParam.options.length > 0
      ? initialParam.options.map((opt) => ({ value: opt, label: opt }))
      : [
          { value: '10', label: 'Top 10' },
          { value: '25', label: 'Top 25' },
          { value: '50', label: 'Top 50' },
        ]
  );

  // Range allowable properties
  const [min, setMin] = useState(initialParam?.min !== undefined ? String(initialParam.min) : '0');
  const [max, setMax] = useState(initialParam?.max !== undefined ? String(initialParam.max) : '100');
  const [step, setStep] = useState(initialParam?.step !== undefined ? String(initialParam.step) : '5');

  const [showControl, setShowControl] = useState(initialParam?.showControl ?? true);

  // Async field loading state
  const [isLoadingField, setIsLoadingField] = useState(false);
  const [selectedFieldSource, setSelectedFieldSource] = useState<string>('');

  // Add a new row to list
  const handleAddListItem = () => {
    const nextVal = String(listItems.length + 1);
    setListItems((prev) => [...prev, { value: nextVal, label: nextVal }]);
  };

  const handleUpdateListItem = (
    index: number,
    field: 'value' | 'label',
    newValue: string
  ) => {
    setListItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'value') {
          // If label was matching old value or empty, auto-sync with new value (Tableau style)
          const shouldSyncLabel = item.label === item.value || !item.label;
          return {
            ...item,
            value: newValue,
            label: shouldSyncLabel ? newValue : item.label,
          };
        }
        return { ...item, [field]: newValue };
      })
    );
  };

  const handleDeleteListItem = (index: number) => {
    setListItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearList = () => {
    setListItems([]);
  };

  // Populate list from dataset column (Tableau: "Añadir valores desde campo")
  const handleAddValuesFromField = async (colName: string) => {
    if (!tableName || !colName) return;
    try {
      setIsLoadingField(true);
      const distinctVals = await duckdbEngine.getDistinctColumnValues(tableName, colName, 40);
      if (distinctVals.length > 0) {
        const newItems: ParameterListItem[] = distinctVals.map((v: string) => ({
          value: v,
          label: v,
        }));
        setListItems(newItems);
        setCurrentValue(newItems[0].value as string);
      }
    } catch (err) {
      console.error('Error al cargar valores desde campo:', err);
    } finally {
      setIsLoadingField(false);
      setSelectedFieldSource('');
    }
  };

  // Populate range min/max from dataset column (Tableau: "Establecer desde campo")
  const handleSetRangeFromField = async (colName: string) => {
    if (!tableName || !colName) return;
    try {
      setIsLoadingField(true);
      const bounds = await duckdbEngine.getColumnMinMax(tableName, colName);
      setMin(String(bounds.min));
      setMax(String(bounds.max));
      const range = bounds.max - bounds.min;
      const suggestedStep = range > 1000 ? Math.round(range / 100) : range > 10 ? 1 : 0.1;
      setStep(String(suggestedStep));
      setCurrentValue(String(bounds.min));
    } catch (err) {
      console.error('Error al cargar rango desde campo:', err);
    } finally {
      setIsLoadingField(false);
      setSelectedFieldSource('');
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    let parsedVal: string | number | boolean = currentValue;
    if (dataType === 'number') {
      const num = Number(currentValue) || 0;
      parsedVal = numberSubtype === 'integer' ? Math.round(num) : num;
    } else if (dataType === 'boolean') {
      parsedVal = currentValue === 'true' || currentValue === '1';
    }

    const param: Parameter = {
      id: initialParam?.id || `param_${Date.now()}`,
      name: name.trim(),
      comment: comment.trim() || undefined,
      dataType,
      numberSubtype: dataType === 'number' ? numberSubtype : undefined,
      displayFormat,
      currentValue: parsedVal,
      allowableType,
      listItems: allowableType === 'list' ? listItems : undefined,
      min: allowableType === 'range' && dataType === 'number' ? Number(min) : undefined,
      max: allowableType === 'range' && dataType === 'number' ? Number(max) : undefined,
      step: allowableType === 'range' && dataType === 'number' ? Number(step) : undefined,
      showControl,
    };

    onSave(param);
  };

  const numericColumns = columns.filter((c) => c.dataType === 'number');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="flex h-[640px] w-full max-w-2xl flex-col rounded-2xl border border-stone-200/90 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden">
        {/* Header (Tableau Studio Header) */}
        <div className="flex items-center justify-between border-b border-stone-200/90 px-6 py-3.5 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-editorial text-sm font-bold text-stone-900 dark:text-stone-100">
                {initialParam ? 'Editar Parámetro' : 'Crear Parámetro'}
              </h3>
              <p className="text-[11px] text-stone-500">
                Variable global interactiva (Estilo Tableau Desktop) • Referenciable como{' '}
                <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">
                  [{name.trim() || 'Nombre'}]
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Row: Name & Description */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Nombre
              </label>
              <input
                type="text"
                placeholder="ej. Top N Clientes, Descuento Objetivo, Métrica Dinámica..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-900 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Token en Fórmulas
              </label>
              <div className="flex h-9 items-center rounded-lg border border-stone-200 bg-stone-50 px-3 font-mono text-xs text-amber-700 dark:border-stone-800 dark:bg-stone-950/80 dark:text-amber-400 truncate">
                [{name.trim() || 'Nombre'}]
              </div>
            </div>
          </div>

          {/* Comment / Description (Tableau Comment Box) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Comentario / Propósito (Opcional)
            </label>
            <input
              type="text"
              placeholder="ej. Variable de corte dinámico para análisis de Top N o filtrado condicional..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>

          {/* Properties Section (Tableau Properties Box) */}
          <div className="rounded-xl border border-stone-200/90 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-900/40 space-y-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 font-mono">
              Propiedades del Parámetro
            </span>

            <div className="grid grid-cols-3 gap-3">
              {/* Data Type */}
              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Tipo de Datos
                </label>
                <select
                  value={dataType === 'number' ? numberSubtype : dataType}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'float' || val === 'integer') {
                      setDataType('number');
                      setNumberSubtype(val as 'float' | 'integer');
                    } else {
                      setDataType(val as DataType);
                    }
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  <option value="float">Flotante (Decimal)</option>
                  <option value="integer">Entero (Integer)</option>
                  <option value="string">Cadena de Texto (String)</option>
                  <option value="boolean">Booleano (True/False)</option>
                  <option value="date">Fecha (Date)</option>
                </select>
              </div>

              {/* Display Format */}
              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Formato de Visualización
                </label>
                <select
                  value={displayFormat}
                  onChange={(e) =>
                    setDisplayFormat(
                      e.target.value as 'automatic' | 'currency' | 'percentage' | 'number' | 'date'
                    )
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  <option value="automatic">Automático</option>
                  <option value="number">Número estándar (1,234.56)</option>
                  <option value="currency">Moneda ($ 1,234)</option>
                  <option value="percentage">Porcentaje (12.5 %)</option>
                  <option value="date">Fecha (YYYY-MM-DD)</option>
                </select>
              </div>

              {/* Current Value */}
              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Valor Actual
                </label>
                {allowableType === 'list' && listItems.length > 0 ? (
                  <select
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
                  >
                    {listItems.map((item, idx) => (
                      <option key={`${item.value}-${idx}`} value={String(item.value)}>
                        {item.label} ({String(item.value)})
                      </option>
                    ))}
                  </select>
                ) : dataType === 'boolean' ? (
                  <select
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  >
                    <option value="true">True (Verdadero)</option>
                    <option value="false">False (Falso)</option>
                  </select>
                ) : (
                  <input
                    type={dataType === 'number' ? 'number' : dataType === 'date' ? 'date' : 'text'}
                    step={numberSubtype === 'integer' ? '1' : 'any'}
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Allowable Values (Tableau Iconic 3 Radio Buttons) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Valores Permisibles (Allowable Values)
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                Modo de Entrada
              </span>
            </div>

            {/* Radio Selector */}
            <div className="flex items-center gap-6 rounded-xl border border-stone-200/90 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
              <label className="flex items-center gap-2 text-xs font-medium text-stone-800 dark:text-stone-200 cursor-pointer">
                <input
                  type="radio"
                  name="allowableType"
                  value="all"
                  checked={allowableType === 'all'}
                  onChange={() => setAllowableType('all')}
                  className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                />
                <span>Todos (All)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-stone-800 dark:text-stone-200 cursor-pointer">
                <input
                  type="radio"
                  name="allowableType"
                  value="list"
                  checked={allowableType === 'list'}
                  onChange={() => setAllowableType('list')}
                  className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                />
                <span>Lista (List)</span>
              </label>

              <label
                className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${
                  dataType !== 'number' && dataType !== 'date'
                    ? 'opacity-40 cursor-not-allowed text-stone-400'
                    : 'text-stone-800 dark:text-stone-200'
                }`}
              >
                <input
                  type="radio"
                  name="allowableType"
                  value="range"
                  disabled={dataType !== 'number' && dataType !== 'date'}
                  checked={allowableType === 'range'}
                  onChange={() => setAllowableType('range')}
                  className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500"
                />
                <span>Rango (Range)</span>
              </label>
            </div>

            {/* 1. ALL CONFIGURATION */}
            {allowableType === 'all' && (
              <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center dark:border-stone-800">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Cualquier valor del tipo{' '}
                  <span className="font-semibold text-stone-800 dark:text-stone-200 font-mono">
                    {dataType}
                  </span>{' '}
                  puede ser ingresado directamente en el control del libro de trabajo.
                </p>
              </div>
            )}

            {/* 2. LIST CONFIGURATION (Tableau List Table + Add From Field) */}
            {allowableType === 'list' && (
              <div className="rounded-xl border border-stone-200 bg-white p-3.5 dark:border-stone-800 dark:bg-stone-950 space-y-3">
                {/* List Action Bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddListItem}
                      className="flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Añadir fila</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearList}
                      className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-500 hover:text-rose-600 hover:bg-rose-50 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      Limpiar lista
                    </button>
                  </div>

                  {/* Add from field dropdown (Tableau iconic feature) */}
                  {columns.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-400">Añadir de campo:</span>
                      <select
                        value={selectedFieldSource}
                        onChange={(e) => {
                          const col = e.target.value;
                          if (col) {
                            setSelectedFieldSource(col);
                            void handleAddValuesFromField(col);
                          }
                        }}
                        disabled={isLoadingField}
                        className="rounded-md border border-amber-300 bg-amber-50/50 px-2 py-1 text-xs font-medium text-amber-900 focus:border-amber-500 focus:outline-none dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        <option value="">Seleccionar columna...</option>
                        {columns.map((c) => (
                          <option key={c.name} value={c.name}>
                            "{c.name}" ({c.dataType})
                          </option>
                        ))}
                      </select>
                      {isLoadingField && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                      )}
                    </div>
                  )}
                </div>

                {/* Editable List Items Table */}
                <div className="max-h-[170px] overflow-y-auto border border-stone-200 rounded-lg dark:border-stone-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-mono text-[10px] uppercase dark:bg-stone-900 dark:border-stone-800">
                      <tr>
                        <th className="py-1.5 px-3 w-1/2">Valor (Valor Interno)</th>
                        <th className="py-1.5 px-3 w-1/2">Mostrar como (Etiqueta UI)</th>
                        <th className="py-1.5 px-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-mono">
                      {listItems.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-xs text-stone-400 italic">
                            No hay elementos en la lista. Añade filas o importa valores desde una columna.
                          </td>
                        </tr>
                      ) : (
                        listItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/80 dark:hover:bg-stone-900/50">
                            <td className="p-1 px-3">
                              <input
                                type="text"
                                value={String(item.value)}
                                onChange={(e) =>
                                  handleUpdateListItem(idx, 'value', e.target.value)
                                }
                                placeholder="Valor"
                                className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-stone-900 focus:border-stone-300 focus:bg-white focus:outline-none dark:text-stone-100 dark:focus:bg-stone-900"
                              />
                            </td>
                            <td className="p-1 px-3 font-sans">
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) =>
                                  handleUpdateListItem(idx, 'label', e.target.value)
                                }
                                placeholder="Mostrar como"
                                className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-stone-900 focus:border-stone-300 focus:bg-white focus:outline-none dark:text-stone-100 dark:focus:bg-stone-900"
                              />
                            </td>
                            <td className="p-1 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteListItem(idx)}
                                className="rounded p-0.5 text-stone-400 hover:text-rose-600 transition-colors"
                                title="Eliminar fila"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. RANGE CONFIGURATION (Tableau Slider Range + Set From Field) */}
            {allowableType === 'range' && (
              <div className="rounded-xl border border-stone-200 bg-white p-3.5 dark:border-stone-800 dark:bg-stone-950 space-y-3">
                {/* Range Action Bar */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                    Definición de Rango Numérico
                  </span>

                  {numericColumns.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-400">Establecer desde campo:</span>
                      <select
                        value={selectedFieldSource}
                        onChange={(e) => {
                          const col = e.target.value;
                          if (col) {
                            setSelectedFieldSource(col);
                            void handleSetRangeFromField(col);
                          }
                        }}
                        disabled={isLoadingField}
                        className="rounded-md border border-amber-300 bg-amber-50/50 px-2 py-1 text-xs font-medium text-amber-900 focus:border-amber-500 focus:outline-none dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        <option value="">Seleccionar columna...</option>
                        {numericColumns.map((c) => (
                          <option key={c.name} value={c.name}>
                            "{c.name}"
                          </option>
                        ))}
                      </select>
                      {isLoadingField && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                      )}
                    </div>
                  )}
                </div>

                {/* Range Inputs */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 mb-1">
                      Mínimo
                    </label>
                    <input
                      type="number"
                      step={numberSubtype === 'integer' ? '1' : 'any'}
                      value={min}
                      onChange={(e) => setMin(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 mb-1">
                      Máximo
                    </label>
                    <input
                      type="number"
                      step={numberSubtype === 'integer' ? '1' : 'any'}
                      value={max}
                      onChange={(e) => setMax(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 mb-1">
                      Tamaño del Paso (Step)
                    </label>
                    <input
                      type="number"
                      step={numberSubtype === 'integer' ? '1' : 'any'}
                      value={step}
                      onChange={(e) => setStep(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer (Tableau Actions + Show Control Checkbox) */}
        <div className="flex items-center justify-between border-t border-stone-200/90 px-6 py-3.5 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70">
          <label className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showControl}
              onChange={(e) => setShowControl(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>Mostrar control de parámetro en el libro de trabajo</span>
          </label>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-stone-800 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Guardar Parámetro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
