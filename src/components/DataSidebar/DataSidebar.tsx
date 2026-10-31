import React, { useState, useRef, useEffect } from 'react';
import { DatasetMeta, Pill, Parameter, CalculatedField, DataType, FieldRole, AnalyticsLine, DatasetColumn } from '../../core/ast/types';
import {
  Search,
  Type,
  Calendar,
  Hash,
  Plus,
  Table,
  CheckCircle2,
  FileCode,
  Calculator,
  Sliders,
  Edit2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  TrendingUp,
  Activity,
  Layers,
  GitMerge,
  Database,
  Server,
  Check,
  ArrowRightLeft,
  MoreVertical,
  Split,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpToLine,
  LineChart,
} from 'lucide-react';

interface DataSidebarProps {
  currentDataset: DatasetMeta | null;
  availableDatasets?: DatasetMeta[];
  onSelectDataset?: (datasetId: string) => void;
  onLoadAdditionalFile?: (file: File) => void;
  onOpenDataModelModal?: () => void;
  onOpenDataSource?: () => void;
  onOpenRelationalModal?: () => void;
  parameters: Parameter[];
  calculatedFields: CalculatedField[];
  analyticsLines?: AnalyticsLine[];
  onAddPill: (shelf: 'columns' | 'rows', pill: Pill) => void;
  onOpenCalculatedFieldModal: (field?: CalculatedField) => void;
  onDeleteCalculatedField: (fieldId: string) => void;
  onOpenParameterModal: (param?: Parameter) => void;
  onSetParameterValue: (paramId: string, val: string | number | boolean) => void;
  onToggleParameterControl?: (paramId: string) => void;
  onDuplicateParameter?: (paramId: string) => void;
  onDeleteParameter: (paramId: string) => void;
  onAddAnalyticsLine?: (line: AnalyticsLine) => void;
  onRemoveAnalyticsLine?: (lineId: string) => void;
  onChangeColumnType?: (columnName: string, newType: DataType) => Promise<void>;
  onChangeColumnRole?: (columnName: string, newRole: FieldRole) => Promise<void>;
  onSplitColumn?: (
    columnName: string,
    delimiter?: string,
    mode?: 'first' | 'last' | 'all',
    count?: number
  ) => Promise<void>;
  onCleanColumn?: (columnName: string, cleanType: 'trim' | 'upper' | 'lower') => Promise<void>;
  onToggleHideColumn?: (columnName: string) => void;
}

export const DataSidebar: React.FC<DataSidebarProps> = ({
  currentDataset,
  availableDatasets = [],
  onSelectDataset,
  onLoadAdditionalFile,
  onOpenDataModelModal,
  onOpenDataSource,
  onOpenRelationalModal,
  parameters,
  calculatedFields,
  analyticsLines = [],
  onAddPill,
  onOpenCalculatedFieldModal,
  onDeleteCalculatedField,
  onOpenParameterModal,
  onSetParameterValue,
  onToggleParameterControl,
  onDuplicateParameter,
  onDeleteParameter,
  onAddAnalyticsLine,
  onRemoveAnalyticsLine,
  onChangeColumnType,
  onChangeColumnRole,
  onSplitColumn,
  onCleanColumn,
  onToggleHideColumn,
}) => {
  const [sidebarTab, setSidebarTab] = useState<'data' | 'analytics'>('data');
  const [searchTerm, setSearchTerm] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveColumnMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const columns = currentDataset?.columns || [];
  const filteredColumns = columns.filter(
    (c) => (showHidden || !c.hidden) && c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dimensions = filteredColumns.filter((c) => c.role === 'dimension');
  const measures = filteredColumns.filter((c) => c.role === 'measure');

  const makePill = (
    colName: string,
    role: FieldRole,
    dataType: DataType,
    isCalculated?: boolean,
    formula?: string
  ): Pill => ({
    id: `${colName}_${Date.now()}`,
    columnName: colName,
    role,
    dataType,
    aggregation: role === 'measure' ? 'SUM' : undefined,
    dateTruncation: dataType === 'date' ? 'year' : undefined,
    isCalculated,
    formula,
  });

  const handleDragStart = (e: React.DragEvent, col: typeof columns[0]) => {
    const pill = makePill(col.name, col.role, col.dataType, col.isCalculated, col.formula);
    e.dataTransfer.setData('application/json', JSON.stringify(pill));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const isLineActive = (type: string) => analyticsLines.some((l) => l.type === type);

  const toggleLine = (type: 'average' | 'median' | 'trend_line' | 'min' | 'max' | 'moving_average', label: string) => {
    if (isLineActive(type)) {
      onRemoveAnalyticsLine?.(type);
    } else {
      onAddAnalyticsLine?.({
        id: `line_${type}_${Date.now()}`,
        type,
        label,
      });
    }
  };

  const renderColumnItem = (col: DatasetColumn, defaultShelf: 'columns' | 'rows') => {
    const calcObj = calculatedFields.find((cf) => cf.name === col.name);
    const isMenuOpen = activeColumnMenu === col.name;
    const isMeasure = col.role === 'measure';

    return (
      <div
        key={col.name}
        draggable
        onDragStart={(e) => handleDragStart(e, col)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setActiveColumnMenu(isMenuOpen ? null : col.name);
        }}
        className={`group relative flex items-center justify-between rounded-md border border-transparent px-2 py-1 text-xs transition-all cursor-grab active:cursor-grabbing ${
          isMeasure
            ? 'text-stone-700 hover:border-emerald-300 hover:bg-emerald-50/70 hover:text-emerald-900 dark:text-stone-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200'
            : 'text-stone-700 hover:border-sky-300 hover:bg-sky-50/70 hover:text-sky-900 dark:text-stone-300 dark:hover:border-sky-800 dark:hover:bg-sky-950/40 dark:hover:text-sky-200'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Interactive Tableau Type Micro-Badge with Click Popover */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveColumnMenu(isMenuOpen ? null : col.name);
            }}
            className={`group/type flex items-center gap-0.5 rounded px-1 py-0.5 border text-[10px] font-mono transition-all cursor-pointer ${
              isMeasure
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-sky-50 text-sky-700 border-sky-200/90 hover:bg-sky-100 hover:border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
            }`}
            title={`Tipo: ${col.dataType === 'string' ? 'Texto' : col.dataType === 'number' ? 'Número' : col.dataType === 'date' ? 'Fecha' : 'Booleano'}. Haz clic para cambiar el tipo de dato.`}
          >
            {col.isCalculated ? (
              <span className="font-mono font-bold text-[9.5px] shrink-0">
                {isMeasure ? '=#' : '=Abc'}
              </span>
            ) : col.dataType === 'date' ? (
              <Calendar className="h-3 w-3 shrink-0" />
            ) : col.dataType === 'number' ? (
              <Hash className="h-3 w-3 shrink-0" />
            ) : col.dataType === 'boolean' ? (
              <span className="font-mono text-[9px] font-bold shrink-0">T/F</span>
            ) : (
              <Type className="h-3 w-3 shrink-0" />
            )}
            <ChevronDown className="h-2 w-2 opacity-60 group-hover/type:opacity-100 transition-opacity" />
          </button>

          <span className="truncate font-mono text-[11.5px]">{col.name}</span>
        </div>

        {/* Hover Action Buttons */}
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
          {calcObj && (
            <>
              <button
                type="button"
                onClick={() => onOpenCalculatedFieldModal(calcObj)}
                className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                title="Editar fórmula"
              >
                <Edit2 className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteCalculatedField(calcObj.id)}
                className="rounded p-0.5 text-stone-400 hover:text-rose-600 cursor-pointer"
                title="Eliminar campo calculado"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveColumnMenu(isMenuOpen ? null : col.name);
            }}
            className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
            title="Opciones de campo y tipo de dato"
          >
            <MoreVertical className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => onAddPill(defaultShelf, makePill(col.name, col.role, col.dataType, col.isCalculated, col.formula))}
            className={`rounded p-0.5 cursor-pointer ${
              isMeasure
                ? 'text-emerald-600 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/60'
                : 'text-sky-600 hover:bg-sky-200/50 dark:hover:bg-sky-900/60'
            }`}
            title={`Añadir a ${defaultShelf === 'columns' ? 'Columns (X)' : 'Rows (Y)'}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Tableau Context Menu for Field: Type & Role */}
        {isMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1 top-full mt-1 w-56 rounded-lg border border-stone-200 bg-white py-1.5 shadow-2xl dark:border-stone-700 dark:bg-stone-900 z-50 text-left rim-light-subtle"
          >
            <div className="flex items-center justify-between px-3 py-1 border-b border-stone-100 dark:border-stone-800">
              <span className="font-mono text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Tipo de Dato
              </span>
              <span className={`text-[9.5px] font-mono font-semibold px-1 py-0.2 rounded ${
                isMeasure ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
              }`}>
                {col.dataType}
              </span>
            </div>

            {/* Type Casting Options */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  void onChangeColumnType?.(col.name, 'string');
                  setActiveColumnMenu(null);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors ${
                  col.dataType === 'string' ? 'font-bold text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20' : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Type className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <span>Cadena (Texto)</span>
                </div>
                {col.dataType === 'string' && <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  void onChangeColumnType?.(col.name, 'number');
                  setActiveColumnMenu(null);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors ${
                  col.dataType === 'number' ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Número (Decimal / Entero)</span>
                </div>
                {col.dataType === 'number' && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  void onChangeColumnType?.(col.name, 'date');
                  setActiveColumnMenu(null);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors ${
                  col.dataType === 'date' ? 'font-bold text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20' : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <span>Fecha</span>
                </div>
                {col.dataType === 'date' && <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  void onChangeColumnType?.(col.name, 'boolean');
                  setActiveColumnMenu(null);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors ${
                  col.dataType === 'boolean' ? 'font-bold text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20' : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-sky-600 shrink-0">T/F</span>
                  <span>Booleano (Verdadero/Falso)</span>
                </div>
                {col.dataType === 'boolean' && <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
              </button>
            </div>

            {/* Role Conversion */}
            {onChangeColumnRole && (
              <>
                <div className="border-t border-stone-100 dark:border-stone-800 my-1"></div>
                <div className="px-3 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                  Rol Analítico
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void onChangeColumnRole(col.name, isMeasure ? 'dimension' : 'measure');
                    setActiveColumnMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span>{isMeasure ? 'Convertir a Dimensión (azul)' : 'Convertir a Métrica (verde)'}</span>
                </button>
              </>
            )}

            {/* Quick Prep Tools */}
            {(onSplitColumn || onCleanColumn || onToggleHideColumn) && (
              <>
                <div className="border-t border-stone-100 dark:border-stone-800 my-1"></div>
                <div className="px-3 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                  Transformaciones
                </div>
                {onSplitColumn && (
                  <button
                    type="button"
                    onClick={() => {
                      void onSplitColumn(col.name, ' ', 'first', 2);
                      setActiveColumnMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    <Split className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <span>Dividir por espacio</span>
                  </button>
                )}
                {onCleanColumn && (
                  <button
                    type="button"
                    onClick={() => {
                      void onCleanColumn(col.name, 'trim');
                      setActiveColumnMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    <Type className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <span>Recortar espacios (TRIM)</span>
                  </button>
                )}
                {onToggleHideColumn && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleHideColumn(col.name);
                      setActiveColumnMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    <EyeOff className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <span>Ocultar campo</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-stone-200/90 bg-stone-50/80 dark:border-white/[0.06] dark:bg-stone-950/80 select-none">
      {/* Top Tab Switcher: Datos vs Análisis (Segmented Control) */}
      <div className="p-2 border-b border-stone-200/90 dark:border-white/[0.06] bg-stone-100/60 dark:bg-stone-900/60">
        <div className="flex rounded-md bg-stone-200/60 p-0.5 dark:bg-white/[0.05]">
          <button
            type="button"
            onClick={() => setSidebarTab('data')}
            className={`btn-tactile flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-xs font-medium transition-all ${
              sidebarTab === 'data'
                ? 'bg-white text-stone-950 shadow-2xs dark:bg-stone-800 dark:text-stone-100 rim-light-subtle font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <Layers className="h-3 w-3 text-stone-500 dark:text-stone-400" />
            <span>Datos</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('analytics')}
            className={`btn-tactile flex flex-1 items-center justify-center gap-1.5 rounded py-1 text-xs font-medium transition-all ${
              sidebarTab === 'analytics'
                ? 'bg-white text-stone-950 shadow-2xs dark:bg-stone-800 dark:text-stone-100 rim-light-subtle font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <TrendingUp className="h-3 w-3 text-stone-500 dark:text-stone-400" />
            <span>Análisis</span>
          </button>
        </div>
      </div>

      {sidebarTab === 'analytics' ? (
        /* TABLEAU ANALYTICS PANE */
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <span className="font-mono uppercase tracking-wider text-[11px] text-stone-400">
              Líneas de Resumen
            </span>
            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={() => toggleLine('average', 'Promedio')}
                className={`flex w-full items-center justify-between rounded-md border p-2.5 text-left text-xs transition-all ${
                  isLineActive('average')
                    ? 'border-rose-400 bg-rose-50/70 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
                    : 'border-stone-200 bg-white hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/80 text-stone-800 dark:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-500" />
                  <div>
                    <div className="font-semibold">Línea de Promedio</div>
                    <div className="text-[10px] text-stone-500">Muestra media aritmética en Y</div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold ${isLineActive('average') ? 'text-rose-600' : 'text-stone-400'}`}>
                  {isLineActive('average') ? 'ACTIVA' : '+'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleLine('median', 'Mediana')}
                className={`flex w-full items-center justify-between rounded-md border p-2.5 text-left text-xs transition-all ${
                  isLineActive('median')
                    ? 'border-amber-400 bg-amber-50/70 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
                    : 'border-stone-200 bg-white hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/80 text-stone-800 dark:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-500" />
                  <div>
                    <div className="font-semibold">Línea de Mediana</div>
                    <div className="text-[10px] text-stone-500">Muestra percentil 50 en Y</div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold ${isLineActive('median') ? 'text-amber-600' : 'text-stone-400'}`}>
                  {isLineActive('median') ? 'ACTIVA' : '+'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleLine('min', 'Mínimo')}
                className={`flex w-full items-center justify-between rounded-md border p-2.5 text-left text-xs transition-all ${
                  isLineActive('min')
                    ? 'border-cyan-400 bg-cyan-50/70 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200'
                    : 'border-stone-200 bg-white hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/80 text-stone-800 dark:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-cyan-500" />
                  <div>
                    <div className="font-semibold">Línea de Mínimo</div>
                    <div className="text-[10px] text-stone-500">Límite inferior absoluto en Y</div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold ${isLineActive('min') ? 'text-cyan-600' : 'text-stone-400'}`}>
                  {isLineActive('min') ? 'ACTIVA' : '+'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleLine('max', 'Máximo')}
                className={`flex w-full items-center justify-between rounded-md border p-2.5 text-left text-xs transition-all ${
                  isLineActive('max')
                    ? 'border-pink-400 bg-pink-50/70 text-pink-900 dark:border-pink-800 dark:bg-pink-950/30 dark:text-pink-200'
                    : 'border-stone-200 bg-white hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/80 text-stone-800 dark:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowUpToLine className="h-4 w-4 text-pink-500" />
                  <div>
                    <div className="font-semibold">Línea de Máximo</div>
                    <div className="text-[10px] text-stone-500">Límite superior absoluto en Y</div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold ${isLineActive('max') ? 'text-pink-600' : 'text-stone-400'}`}>
                  {isLineActive('max') ? 'ACTIVA' : '+'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <span className="font-mono uppercase tracking-wider text-[11px] text-stone-400">
              Modelos
            </span>
            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={() => toggleLine('trend_line', 'Regresión Lineal')}
                className={`flex w-full items-center justify-between rounded-md border p-2.5 text-left text-xs transition-all ${
                  isLineActive('trend_line')
                    ? 'border-indigo-400 bg-indigo-50/70 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200'
                    : 'border-stone-200 bg-white hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/80 text-stone-800 dark:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  <div>
                    <div className="font-semibold">Línea de Tendencia</div>
                    <div className="text-[10px] text-stone-500">Regresión lineal de mínimos cuadrados</div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold ${isLineActive('trend_line') ? 'text-indigo-600' : 'text-stone-400'}`}>
                  {isLineActive('trend_line') ? 'ACTIVA' : '+'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleLine('moving_average', 'Media Móvil')}
                className={`flex w-full items-center justify-between rounded-md border p-2.5 text-left text-xs transition-all ${
                  isLineActive('moving_average')
                    ? 'border-emerald-400 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-stone-200 bg-white hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/80 text-stone-800 dark:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-emerald-500" />
                  <div>
                    <div className="font-semibold">Media Móvil (k=5)</div>
                    <div className="text-[10px] text-stone-500">Alisado dinámico temporal sobre X</div>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold ${isLineActive('moving_average') ? 'text-emerald-600' : 'text-stone-400'}`}>
                  {isLineActive('moving_average') ? 'ACTIVA' : '+'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Dataset Header & Multi-Source Management */}
      <div className="p-3 border-b border-stone-200/80 dark:border-stone-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
          <span className="font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Fuentes de Datos</span>
            {availableDatasets.length > 1 && (
              <span className="rounded-full bg-sky-100 px-1.5 py-0.2 text-[9.5px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                {availableDatasets.length}
              </span>
            )}
          </span>

          <div className="flex items-center gap-1">
            {/* Hidden Input for Additional File Loading */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.parquet,.tsv,.json,.ndjson,.xlsx,.xls,.sqlite,.db,.sqlite3,.twbx,.tdsx,.twb,.tds"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onLoadAdditionalFile) {
                  onLoadAdditionalFile(file);
                }
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 cursor-pointer"
              title="Cargar archivo adicional (Excel, SQLite, Tableau .twbx, CSV, Parquet) en DuckDB-WASM"
            >
              <Plus className="h-2.5 w-2.5" />
              <span>Fuente</span>
            </button>

            {onOpenRelationalModal && (
              <button
                type="button"
                onClick={onOpenRelationalModal}
                className="flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 cursor-pointer"
                title="Conectar a Servidor Relacional (PostgreSQL, MySQL)..."
              >
                <Server className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400" />
                <span>Servidor</span>
              </button>
            )}

            {onOpenDataSource && (
              <button
                type="button"
                onClick={onOpenDataSource}
                className="flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 cursor-pointer"
                title="Abrir página de fuente de datos: Intérprete de datos, filtros de fuente y preparación"
              >
                <span>Preparar</span>
              </button>
            )}

            {availableDatasets.length >= 2 && onOpenDataModelModal && (
              <button
                type="button"
                onClick={onOpenDataModelModal}
                className="flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900 cursor-pointer"
                title="Abrir asistente de modelado de datos (JOIN relacional o UNION apilado)"
              >
                <GitMerge className="h-2.5 w-2.5" />
                <span>Modelar</span>
              </button>
            )}
          </div>
        </div>

        {currentDataset ? (
          <div className="rounded-md border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900 shadow-2xs">
            {availableDatasets.length > 1 && onSelectDataset ? (
              <div className="mb-1.5">
                <select
                  value={currentDataset.id}
                  onChange={(e) => onSelectDataset(e.target.value)}
                  className="w-full rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 cursor-pointer"
                  title="Cambiar la fuente de datos activa para esta hoja de trabajo"
                >
                  {availableDatasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.rowCount.toLocaleString()} f.)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-medium text-stone-900 dark:text-stone-100">
                <Table className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{currentDataset.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono mt-1">
              <span className="tabular-nums font-semibold">{currentDataset.rowCount.toLocaleString()} filas</span>
              <span>•</span>
              <span>{columns.length} campos</span>
              {onOpenCalculatedFieldModal && (
                <button
                  type="button"
                  onClick={() => onOpenCalculatedFieldModal()}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="Crear un nuevo campo calculado con DuckDB"
                >
                  <Calculator className="h-2.5 w-2.5" />
                  <span>+ Cálculo</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-stone-300 p-2.5 text-center dark:border-stone-700">
            <FileCode className="mx-auto h-4 w-4 text-stone-400" />
            <p className="mt-1 text-[11px] text-stone-500">Esperando archivo...</p>
          </div>
        )}
      </div>

      {currentDataset ? (
        <>
          {/* Field Search Input & Show Hidden Toggle */}
          <div className="p-2.5 border-b border-stone-200/80 dark:border-stone-800 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-stone-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>
            {columns.some((c) => c.hidden) && (
              <button
                type="button"
                onClick={() => setShowHidden(!showHidden)}
                className={`p-1.5 rounded border text-xs cursor-pointer transition-colors ${
                  showHidden
                    ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-stone-200 bg-white text-stone-400 hover:text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400'
                }`}
                title={showHidden ? 'Ocultar campos marcados como ocultos' : 'Mostrar campos ocultos'}
              >
                {showHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          {/* Field Lists (Dimensions & Measures) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* DIMENSIONS SECTION (BLUE) */}
            <div>
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 font-mono">
                  Dimensiones ({dimensions.length})
                </span>
                <span className="text-[9px] font-mono text-stone-400">DISCRETAS</span>
              </div>

              <div className="space-y-0.5">
                {dimensions.map((col) => renderColumnItem(col, 'columns'))}
              </div>
            </div>

            {/* MEASURES SECTION (GREEN) */}
            <div>
              <div className="flex items-center justify-between pb-1.5 pt-2.5 border-t border-stone-200/60 dark:border-white/[0.06]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 font-mono">
                  Métricas ({measures.length})
                </span>
                <span className="text-[9px] font-mono text-stone-400">CONTINUAS</span>
              </div>

              <div className="space-y-0.5">
                {measures.map((col) => renderColumnItem(col, 'rows'))}
              </div>
            </div>

            {/* PARAMETERS SECTION (AMBER) */}
            <div className="pt-2.5 border-t border-stone-200/60 dark:border-white/[0.06]">
              <div className="flex items-center justify-between pb-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 font-mono">
                  <Sliders className="h-3 w-3 text-stone-400" />
                  <span>Parámetros ({parameters.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenParameterModal()}
                  className="btn-tactile flex items-center gap-1 rounded bg-stone-200/70 px-1.5 py-0.5 text-[10px] font-mono text-stone-700 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  title="Crear un nuevo parámetro dinámico"
                >
                  <Plus className="h-2.5 w-2.5" />
                  <span>Nuevo</span>
                </button>
              </div>

              {parameters.length === 0 ? (
                <p className="text-[10px] font-mono text-stone-400 py-1">Sin parámetros activos</p>
              ) : (
                <div className="space-y-2 mt-1">
                  {parameters.map((param) => {
                    const isControlVisible = param.showControl !== false;
                    const isNumber = param.dataType === 'number';
                    const isDate = param.dataType === 'date';
                    const isBoolean = param.dataType === 'boolean';

                    return (
                      <div
                        key={param.id}
                        className="rounded-md border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900/90 shadow-2xs hover:border-amber-300 dark:hover:border-amber-800 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isNumber ? (
                              <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                #
                              </span>
                            ) : param.dataType === 'string' ? (
                              <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                Abc
                              </span>
                            ) : isDate ? (
                              <Calendar className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                T/F
                              </span>
                            )}
                            <span
                              className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-300 truncate cursor-pointer hover:underline"
                              onClick={() => onOpenParameterModal(param)}
                              title={`Editar [${param.name}]`}
                            >
                              [{param.name}]
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5">
                            {onToggleParameterControl && (
                              <button
                                type="button"
                                onClick={() => onToggleParameterControl(param.id)}
                                className={`rounded p-0.5 transition-colors ${
                                  isControlVisible
                                    ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400'
                                    : 'text-stone-300 hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400'
                                }`}
                                title={
                                  isControlVisible
                                    ? 'Ocultar control en la hoja'
                                    : 'Mostrar control de parámetro'
                                }
                              >
                                {isControlVisible ? (
                                  <Eye className="h-2.5 w-2.5" />
                                ) : (
                                  <EyeOff className="h-2.5 w-2.5" />
                                )}
                              </button>
                            )}
                            {onDuplicateParameter && (
                              <button
                                type="button"
                                onClick={() => onDuplicateParameter(param.id)}
                                className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                                title="Duplicar parámetro"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenParameterModal(param)}
                              className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                              title="Editar parámetro"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteParameter(param.id)}
                              className="rounded p-0.5 text-stone-400 hover:text-rose-600"
                              title="Eliminar parámetro"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Inline Control */}
                        {param.allowableType === 'list' && param.listItems && param.listItems.length > 0 ? (
                          <select
                            value={String(param.currentValue)}
                            onChange={(e) =>
                              onSetParameterValue(
                                param.id,
                                isNumber ? Number(e.target.value) : e.target.value
                              )
                            }
                            className="w-full rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-900 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 cursor-pointer"
                          >
                            {param.listItems.map((item, idx) => (
                              <option key={`${item.value}-${idx}`} value={String(item.value)}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        ) : param.allowableType === 'range' && isNumber && param.min !== undefined && param.max !== undefined ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
                              <span>{param.min}</span>
                              <span className="font-bold text-stone-900 dark:text-stone-100">
                                {param.currentValue}
                              </span>
                              <span>{param.max}</span>
                            </div>
                            <input
                              type="range"
                              min={param.min}
                              max={param.max}
                              step={param.step || 1}
                              value={Number(param.currentValue)}
                              onChange={(e) => onSetParameterValue(param.id, Number(e.target.value))}
                              className="w-full accent-amber-600 h-1 cursor-pointer"
                            />
                          </div>
                        ) : isBoolean ? (
                          <select
                            value={String(param.currentValue)}
                            onChange={(e) => onSetParameterValue(param.id, e.target.value === 'true')}
                            className="w-full rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-900 focus:border-amber-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 cursor-pointer"
                          >
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        ) : (
                          <input
                            type={isNumber ? 'number' : isDate ? 'date' : 'text'}
                            step={param.numberSubtype === 'integer' ? '1' : 'any'}
                            value={String(param.currentValue)}
                            onChange={(e) =>
                              onSetParameterValue(
                                param.id,
                                isNumber ? Number(e.target.value) : e.target.value
                              )
                            }
                            className="w-full rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center text-stone-400">
          <p className="text-xs leading-relaxed">
            Los campos aparecerán aquí una vez cargues un archivo.
          </p>
        </div>
      )}
      </>
      )}

      {/* Engine Status Footer */}
      <div className="p-2.5 border-t border-stone-200/80 bg-stone-100/40 dark:border-stone-800 dark:bg-stone-900/40">
        <div className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">DuckDB-WASM OLAP</span>
          <span className="text-[10px] text-stone-400 ml-auto font-mono">Zero-Copy</span>
        </div>
      </div>
    </aside>
  );
};
