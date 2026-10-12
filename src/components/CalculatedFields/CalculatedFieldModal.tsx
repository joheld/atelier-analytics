import React, { useState, useEffect } from 'react';
import { CalculatedField, DatasetColumn, Parameter, FieldRole, DataType } from '../../core/ast/types';
import { duckdbEngine } from '../../core/engine/duckdbClient';
import { substituteParameters } from '../../core/compiler/sqlCompiler';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  X,
  Table,
  Sliders,
  Sparkles,
  Loader2,
  Search,
  BookOpen,
  ArrowRight,
  Info,
  Wand2,
  Hash,
  Type,
  Settings2,
} from 'lucide-react';

interface FunctionDoc {
  name: string;
  category: 'logic' | 'numeric' | 'string' | 'date' | 'conversion' | 'stats' | 'advanced';
  syntax: string;
  description: string;
  example: string;
  snippet: string;
}

const FUNCTION_LIBRARY: FunctionDoc[] = [
  // LÓGICAS & CONDICIONALES
  {
    name: 'CASE WHEN',
    category: 'logic',
    syntax: 'CASE WHEN condición THEN valor1 ELSE valor2 END',
    description: 'Evalúa una condición lógica y devuelve un resultado específico. Ideal para segmentar y clasificar categorías.',
    example: "CASE WHEN \"age\" >= 50 THEN 'Senior' ELSE 'Junior' END",
    snippet: "CASE WHEN condition THEN 'A' ELSE 'B' END",
  },
  {
    name: 'COALESCE',
    category: 'logic',
    syntax: 'COALESCE(expresión, valor_por_defecto)',
    description: 'Devuelve el primer valor no nulo. Clave para evitar valores vacíos o nulos en tablas y gráficos.',
    example: 'COALESCE("bonus", 0)',
    snippet: 'COALESCE(col, 0)',
  },
  {
    name: 'NULLIF',
    category: 'logic',
    syntax: 'NULLIF(valor1, valor2)',
    description: 'Devuelve NULL si valor1 es igual a valor2. Es la mejor forma de evitar errores de división por cero.',
    example: '"sales" / NULLIF("units", 0)',
    snippet: 'NULLIF(col, 0)',
  },
  {
    name: 'IFNULL',
    category: 'logic',
    syntax: 'IFNULL(expresión, reemplazo)',
    description: 'Si la expresión es NULL, devuelve el reemplazo indicado.',
    example: "IFNULL(\"country\", 'Desconocido')",
    snippet: 'IFNULL(col, default_val)',
  },

  // NUMÉRICAS & MATEMÁTICAS
  {
    name: 'ROUND',
    category: 'numeric',
    syntax: 'ROUND(número, decimales)',
    description: 'Redondea un número al número indicado de posiciones decimales.',
    example: 'ROUND("sales" * 0.16, 2)',
    snippet: 'ROUND(expr, 2)',
  },
  {
    name: 'ABS',
    category: 'numeric',
    syntax: 'ABS(número)',
    description: 'Devuelve el valor absoluto (siempre positivo) de un número.',
    example: 'ABS("profit")',
    snippet: 'ABS(col)',
  },
  {
    name: 'CEIL',
    category: 'numeric',
    syntax: 'CEIL(número)',
    description: 'Redondea hacia arriba al número entero más cercano.',
    example: 'CEIL("duration_minutes")',
    snippet: 'CEIL(col)',
  },
  {
    name: 'FLOOR',
    category: 'numeric',
    syntax: 'FLOOR(número)',
    description: 'Redondea hacia abajo al número entero más cercano.',
    example: 'FLOOR("score")',
    snippet: 'FLOOR(col)',
  },
  {
    name: 'POWER',
    category: 'numeric',
    syntax: 'POWER(base, exponente)',
    description: 'Eleva la base a la potencia indicada.',
    example: 'POWER("radius", 2)',
    snippet: 'POWER(col, 2)',
  },
  {
    name: 'SQRT',
    category: 'numeric',
    syntax: 'SQRT(número)',
    description: 'Calcula la raíz cuadrada de un valor positivo.',
    example: 'SQRT("variance")',
    snippet: 'SQRT(col)',
  },

  // TEXTO & CADENAS
  {
    name: 'CONCAT',
    category: 'string',
    syntax: "CONCAT(texto1, ' ', texto2)",
    description: 'Concatena dos o más cadenas de texto en una sola.',
    example: "CONCAT(\"first_name\", ' ', \"last_name\")",
    snippet: "CONCAT(col1, ' ', col2)",
  },
  {
    name: 'UPPER',
    category: 'string',
    syntax: 'UPPER(texto)',
    description: 'Convierte todos los caracteres de la cadena a mayúsculas.',
    example: 'UPPER("city")',
    snippet: 'UPPER(col)',
  },
  {
    name: 'LOWER',
    category: 'string',
    syntax: 'LOWER(texto)',
    description: 'Convierte todos los caracteres de la cadena a minúsculas.',
    example: 'LOWER("email")',
    snippet: 'LOWER(col)',
  },
  {
    name: 'LENGTH',
    category: 'string',
    syntax: 'LENGTH(texto)',
    description: 'Calcula la longitud en número de caracteres del texto.',
    example: 'LENGTH("product_name")',
    snippet: 'LENGTH(col)',
  },
  {
    name: 'SUBSTRING',
    category: 'string',
    syntax: 'SUBSTRING(texto, inicio, longitud)',
    description: 'Extrae un fragmento de texto a partir de la posición especificada.',
    example: 'SUBSTRING("postal_code", 1, 3)',
    snippet: 'SUBSTRING(col, 1, 3)',
  },
  {
    name: 'TRIM',
    category: 'string',
    syntax: 'TRIM(texto)',
    description: 'Elimina los espacios en blanco iniciales y finales de la cadena.',
    example: 'TRIM("company_name")',
    snippet: 'TRIM(col)',
  },
  {
    name: 'REPLACE',
    category: 'string',
    syntax: "REPLACE(texto, 'antiguo', 'nuevo')",
    description: 'Reemplaza todas las coincidencias de un texto por otro.',
    example: "REPLACE(\"phone\", '-', '')",
    snippet: "REPLACE(col, 'old', 'new')",
  },

  // FECHA Y TIEMPO
  {
    name: 'DATE_TRUNC',
    category: 'date',
    syntax: "DATE_TRUNC('unidad', fecha)",
    description: "Trunca una fecha al inicio del período ('year', 'quarter', 'month', 'week', 'day').",
    example: "DATE_TRUNC('month', \"order_date\")",
    snippet: "DATE_TRUNC('month', col)",
  },
  {
    name: 'EXTRACT',
    category: 'date',
    syntax: 'EXTRACT(parte FROM fecha)',
    description: 'Extrae una porción numérica de la fecha (year, month, day, dow).',
    example: 'EXTRACT(year FROM "order_date")',
    snippet: 'EXTRACT(year FROM col)',
  },
  {
    name: 'CURRENT_DATE',
    category: 'date',
    syntax: 'CURRENT_DATE()',
    description: 'Devuelve la fecha actual del sistema en formato DATE.',
    example: 'CURRENT_DATE()',
    snippet: 'CURRENT_DATE()',
  },
  {
    name: 'DATE_DIFF',
    category: 'date',
    syntax: "DATE_DIFF('day', fecha_inicio, fecha_fin)",
    description: "Calcula la diferencia numérica entre dos fechas ('day', 'month', 'year').",
    example: "DATE_DIFF('day', \"order_date\", \"ship_date\")",
    snippet: "DATE_DIFF('day', col1, col2)",
  },

  // CONVERSIÓN DE TIPO
  {
    name: 'CAST',
    category: 'conversion',
    syntax: 'CAST(expresión AS tipo)',
    description: 'Convierte un dato a otro tipo: VARCHAR, DOUBLE, BIGINT, DATE o BOOLEAN.',
    example: 'CAST("zip_code" AS VARCHAR)',
    snippet: 'CAST(col AS VARCHAR)',
  },
  {
    name: 'TRY_CAST',
    category: 'conversion',
    syntax: 'TRY_CAST(expresión AS tipo)',
    description: 'Convierte el tipo de forma segura. Si el formato es erróneo, devuelve NULL sin romper la consulta.',
    example: 'TRY_CAST("raw_number" AS DOUBLE)',
    snippet: 'TRY_CAST(col AS DOUBLE)',
  },

  // ESTADÍSTICA AVANZADA & MACHINE LEARNING (SUPERPODERES DUCKDB)
  {
    name: 'CORR',
    category: 'stats',
    syntax: 'CORR(métrica1, métrica2)',
    description: 'Calcula el coeficiente de correlación de Pearson (-1 a 1) entre dos variables. Tableau requiere complejas fórmulas de ventana o plugins externos.',
    example: 'ROUND(CORR("sales", "profit"), 4)',
    snippet: 'CORR(col1, col2)',
  },
  {
    name: 'REGR_SLOPE',
    category: 'stats',
    syntax: 'REGR_SLOPE(y, x)',
    description: 'Calcula la pendiente de la recta de regresión lineal (mínimos cuadrados OLS). Permite modelar tendencias matemáticas directamente en SQL.',
    example: 'REGR_SLOPE("profit", "sales")',
    snippet: 'REGR_SLOPE(y, x)',
  },
  {
    name: 'REGR_R2',
    category: 'stats',
    syntax: 'REGR_R2(y, x)',
    description: 'Calcula el coeficiente de determinación R² (0 a 1) de la regresión lineal para evaluar la calidad del ajuste.',
    example: 'ROUND(REGR_R2("profit", "sales"), 4)',
    snippet: 'REGR_R2(y, x)',
  },
  {
    name: 'QUANTILE_CONT',
    category: 'stats',
    syntax: 'QUANTILE_CONT(métrica, percentil)',
    description: 'Calcula el percentil continuo exacto (ej. 0.50 para mediana, 0.95 para P95, 0.99 para P99). Clave para SLAs, tiempos de respuesta y análisis salarial.',
    example: 'QUANTILE_CONT("salary", 0.95)',
    snippet: 'QUANTILE_CONT(col, 0.95)',
  },
  {
    name: 'APPROX_COUNT_DISTINCT',
    category: 'stats',
    syntax: 'APPROX_COUNT_DISTINCT(col)',
    description: 'Conteo único ultrarrápido basado en HyperLogLog. Procesa millones de filas a velocidad absurda con error <1%.',
    example: 'APPROX_COUNT_DISTINCT("user_id")',
    snippet: 'APPROX_COUNT_DISTINCT(col)',
  },

  // EXPRESIONES REGULARES, JSON & ARRAYS NATIVOS
  {
    name: 'REGEXP_EXTRACT',
    category: 'advanced',
    syntax: "REGEXP_EXTRACT(col, 'patrón_regex', grupo)",
    description: 'Extrae texto con expresiones regulares PCRE completas. Tableau carece de soporte nativo completo para regex complejas en muchas fuentes.',
    example: "REGEXP_EXTRACT(\"email\", '@(.+)$', 1)",
    snippet: "REGEXP_EXTRACT(col, 'pattern', 1)",
  },
  {
    name: 'REGEXP_MATCHES',
    category: 'advanced',
    syntax: "REGEXP_MATCHES(col, 'patrón_regex')",
    description: 'Verifica si el texto coincide con una expresión regular (devuelve TRUE/FALSE).',
    example: "REGEXP_MATCHES(\"code\", '^[A-Z]{3}-\\d{4}$')",
    snippet: "REGEXP_MATCHES(col, 'pattern')",
  },
  {
    name: 'JSON_EXTRACT_TEXT (->>)',
    category: 'advanced',
    syntax: "columna->>'$.propiedad'",
    description: 'Extrae propiedades directamente de datos JSON sin necesidad de esquemas rígidos ni preprocesamiento ETL.',
    example: "\"raw_metadata\"->>'$.device.model'",
    snippet: "col->>'$.path'",
  },
  {
    name: 'STRING_SPLIT',
    category: 'advanced',
    syntax: "STRING_SPLIT(texto, delimitador)",
    description: 'Divide una cadena en un array nativo en memoria sin duplicar filas.',
    example: "STRING_SPLIT(\"tags\", ',')",
    snippet: "STRING_SPLIT(col, ',')",
  },
  {
    name: 'MD5 / HASH',
    category: 'advanced',
    syntax: 'MD5(texto)',
    description: 'Genera un hash criptográfico para anonimizar datos sensibles o crear claves sintéticas únicas.',
    example: 'MD5("customer_email")',
    snippet: 'MD5(col)',
  },
];

const QUICK_RECIPES = [
  {
    title: 'Margen Porcentual (%)',
    desc: 'Ratio entre beneficio y ventas en base 100',
    formula: 'ROUND(("profit" / NULLIF("sales", 0)) * 100, 2)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Correlación de Pearson (ML / Stats)',
    desc: 'Relación lineal entre 2 variables (-1 a +1) imposible en VizQL simple',
    formula: 'ROUND(CORR("sales", "profit"), 4)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Percentil P95 (SLA / Latencia)',
    desc: 'Calcula el percentil 95 exacto sin agregaciones complejas',
    formula: 'QUANTILE_CONT("salary", 0.95)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Extracción Regex de Dominio',
    desc: 'Extrae partes de texto complejas con expresiones regulares',
    formula: "REGEXP_EXTRACT(\"email\", '@(.+)$', 1)",
    role: 'dimension' as FieldRole,
    type: 'string' as DataType,
  },
  {
    title: 'Extracción de JSON Anidado',
    desc: 'Accede a propiedades dentro de columnas JSON directamente',
    formula: "\"payload\"->>'$.user.role'",
    role: 'dimension' as FieldRole,
    type: 'string' as DataType,
  },
  {
    title: 'Clasificación Condicional (IF / CASE)',
    desc: 'Segmenta registros en rangos usando condiciones',
    formula: "CASE WHEN \"sales\" >= 1000 THEN 'Alto' ELSE 'Estándar' END",
    role: 'dimension' as FieldRole,
    type: 'string' as DataType,
  },
  {
    title: 'Año de la Fecha',
    desc: 'Extrae el año como dimensión numérica o de agrupación',
    formula: 'EXTRACT(year FROM "order_date")',
    role: 'dimension' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Métrica con Multiplicador o IVA',
    desc: 'Calcula montos ajustados o impuestos (+16%)',
    formula: 'ROUND("sales" * 1.16, 2)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Limpieza de Nulos (Reemplazo con 0)',
    desc: 'Evita espacios en blanco reemplazando nulos',
    formula: 'COALESCE("discount", 0)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
];

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
  const [autoInferred, setAutoInferred] = useState<{
    role: FieldRole;
    dataType: DataType;
    rawType: string;
  } | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(Boolean(initialField));

  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    tested: boolean;
    valid: boolean;
    error?: string;
  } | null>(null);

  // Automatic Debounced Type & Role Inference (Tableau Style)
  useEffect(() => {
    if (!formula.trim() || !tableName) {
      setAutoInferred(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const evaluated = substituteParameters(formula, parameters);
        const res = await duckdbEngine.validateCalculatedFormula(tableName, evaluated);
        if (res.valid && res.inferredRole && res.inferredDataType) {
          setAutoInferred({
            role: res.inferredRole,
            dataType: res.inferredDataType,
            rawType: res.rawType || '',
          });
          if (!isManualOverride) {
            setRole(res.inferredRole);
            setDataType(res.inferredDataType);
          }
        }
      } catch {
        // Ignore typing intermediate errors
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formula, tableName, parameters, isManualOverride]);

  // Reference Library State
  const [activeTab, setActiveTab] = useState<'functions' | 'fields' | 'recipes'>('functions');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [funcSearch, setFuncSearch] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<FunctionDoc>(FUNCTION_LIBRARY[0]);

  const filteredFunctions = FUNCTION_LIBRARY.filter((f) => {
    const matchCat = selectedCategory === 'all' || f.category === selectedCategory;
    const matchSearch =
      f.name.toLowerCase().includes(funcSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(funcSearch.toLowerCase()) ||
      f.syntax.toLowerCase().includes(funcSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleValidate = async () => {
    if (!formula.trim() || !tableName) return;
    try {
      setIsValidating(true);
      const evaluated = substituteParameters(formula, parameters);
      const res = await duckdbEngine.validateCalculatedFormula(tableName, evaluated);
      setValidationResult({
        tested: true,
        valid: res.valid,
        error: res.error,
      });
      if (res.valid && res.inferredRole && res.inferredDataType) {
        setAutoInferred({
          role: res.inferredRole,
          dataType: res.inferredDataType,
          rawType: res.rawType || '',
        });
        if (!isManualOverride) {
          setRole(res.inferredRole);
          setDataType(res.inferredDataType);
        }
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !formula.trim()) return;

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

  const insertSnippet = (snippet: string) => {
    setFormula((prev) => (prev ? `${prev} ${snippet}` : snippet));
    setValidationResult(null);
  };

  const applyRecipe = (recipe: typeof QUICK_RECIPES[0]) => {
    setName((prev) => (prev ? prev : recipe.title));
    setFormula(recipe.formula);
    setRole(recipe.role);
    setDataType(recipe.type);
    setValidationResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="flex h-[660px] w-full max-w-5xl flex-col rounded-2xl border border-stone-200/90 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/90 px-6 py-3.5 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-editorial text-sm font-bold text-stone-900 dark:text-stone-100">
                {initialField ? 'Editar Campo Calculado' : 'Crear Campo Calculado'}
              </h3>
              <p className="text-[11px] text-stone-500">
                Motor columnar DuckDB-WASM • Expresiones vectorizadas a cero latencia
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

        {/* Modal Main Content (2-Column Grid) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Form & Formula Editor (60%) */}
          <div className="flex flex-[1.2] flex-col border-r border-stone-200/90 p-5 overflow-y-auto space-y-4 dark:border-stone-800">
            {/* Field Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Nombre del Campo
              </label>
              <input
                type="text"
                placeholder="ej. Margen de Ganancia, Salario Neto, Grupo de Edad..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-900 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </div>

            {/* Role & DataType: Inferencia Automática (Tableau Style) o Manual Override */}
            <div className="rounded-xl border border-stone-200/90 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-900/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                    Inferencia de Tipo y Rol
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    (Estilo Tableau • DuckDB AST)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isManualOverride;
                    setIsManualOverride(next);
                    if (!next && autoInferred) {
                      setRole(autoInferred.role);
                      setDataType(autoInferred.dataType);
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
                >
                  <Settings2 className="h-3 w-3" />
                  <span>{isManualOverride ? 'Reactivar auto-inferencia' : 'Personalizar'}</span>
                </button>
              </div>

              {!isManualOverride ? (
                <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-800 dark:bg-stone-950">
                  <div className="flex items-center gap-2">
                    {role === 'measure' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Métrica (Verde • Agregable)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                        Dimensión (Azul • Discreta)
                      </span>
                    )}

                    <span className="text-stone-300 dark:text-stone-700">•</span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 dark:text-stone-300">
                      {dataType === 'number' && <Hash className="h-3 w-3 text-stone-400" />}
                      {dataType === 'string' && <Type className="h-3 w-3 text-stone-400" />}
                      <span className="font-semibold capitalize">{dataType}</span>
                      {autoInferred?.rawType && (
                        <span className="text-[10px] text-stone-400">({autoInferred.rawType})</span>
                      )}
                    </span>
                  </div>

                  <span className="text-[10px] text-emerald-600 font-mono dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Auto-detectado por DuckDB
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                      Rol Analítico
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as FieldRole)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                    >
                      <option value="measure">Métrica (Verde • Agregación SUM/AVG)</option>
                      <option value="dimension">Dimensión (Azul • Agrupación GROUP BY)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                      Tipo de Dato
                    </label>
                    <select
                      value={dataType}
                      onChange={(e) => setDataType(e.target.value as DataType)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                    >
                      <option value="number">Número (Float / Int)</option>
                      <option value="string">Cadena de Texto (String)</option>
                      <option value="boolean">Booleano (True / False)</option>
                      <option value="date">Fecha (Date / Timestamp)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Formula Editor */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Editor de Fórmula SQL
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">
                    DuckDB Vectorial
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating || !formula.trim()}
                  className="flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-[11px] font-mono font-medium text-sky-700 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-40 transition-colors dark:bg-stone-800 dark:text-sky-300 dark:hover:bg-stone-700"
                  title="Ejecutar prueba de validación en DuckDB-WASM"
                >
                  {isValidating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                  )}
                  <span>Probar sintaxis</span>
                </button>
              </div>

              <textarea
                value={formula}
                onChange={(e) => {
                  setFormula(e.target.value);
                  setValidationResult(null);
                }}
                placeholder={`Escribe o inserta tu fórmula aquí. Ejemplos:
"sales" - "cost"
ROUND(("profit" / NULLIF("sales", 0)) * 100, 2)
CASE WHEN "age" >= 50 THEN 'Senior' ELSE 'Junior' END`}
                className="flex-1 w-full rounded-lg border border-stone-200 bg-stone-50/60 p-3 font-mono text-xs text-stone-900 focus:border-stone-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 resize-none leading-relaxed shadow-inner"
              />

              {/* Validation Feedback Banner */}
              {validationResult?.tested && (
                <div
                  className={`mt-2.5 flex items-start gap-2 rounded-lg p-2.5 text-xs font-mono transition-all ${
                    validationResult.valid
                      ? 'border border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                  }`}
                >
                  {validationResult.valid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <div>
                        <span className="font-bold">¡Fórmula válida!</span>
                        <p className="text-[11px] opacity-80">
                          DuckDB-WASM compiló y validó la expresión correctamente.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-bold">Error de sintaxis:</span>
                        <p className="text-[11px] opacity-90 break-words mt-0.5">
                          {validationResult.error}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Reference Library (40%) */}
          <div className="flex flex-1 flex-col bg-stone-50/70 dark:bg-stone-950/70 overflow-hidden">
            {/* Reference Mode Tabs */}
            <div className="flex border-b border-stone-200 dark:border-stone-800 px-3 pt-2 gap-1 bg-stone-100/50 dark:bg-stone-900/50">
              <button
                type="button"
                onClick={() => setActiveTab('functions')}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'functions'
                    ? 'border-sky-600 text-sky-700 font-semibold dark:border-sky-400 dark:text-sky-300'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Biblioteca de Funciones</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fields')}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'fields'
                    ? 'border-sky-600 text-sky-700 font-semibold dark:border-sky-400 dark:text-sky-300'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Campos & Parámetros</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recipes')}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'recipes'
                    ? 'border-sky-600 text-sky-700 font-semibold dark:border-sky-400 dark:text-sky-300'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Plantillas</span>
              </button>
            </div>

            {/* TAB CONTENT: FUNCTIONS */}
            {activeTab === 'functions' && (
              <div className="flex flex-1 flex-col overflow-hidden p-3.5 space-y-3">
                {/* Category Dropdown & Search Bar */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-40 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                  >
                    <option value="all">Todas las categorías</option>
                    <option value="stats">Estadística & ML (DuckDB)</option>
                    <option value="advanced">Regex, JSON & Arrays</option>
                    <option value="logic">Lógicas / Condicionales</option>
                    <option value="numeric">Numéricas</option>
                    <option value="string">Texto / Cadenas</option>
                    <option value="date">Fecha y Tiempo</option>
                    <option value="conversion">Conversión de Tipo</option>
                  </select>

                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Buscar función..."
                      value={funcSearch}
                      onChange={(e) => setFuncSearch(e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white py-1 pl-7 pr-2 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>

                {/* List of Functions + Detail Card */}
                <div className="flex flex-1 gap-2.5 overflow-hidden">
                  {/* Scrollable Function List */}
                  <div className="w-44 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 space-y-0.5 dark:border-stone-800 dark:bg-stone-900">
                    {filteredFunctions.map((func) => (
                      <button
                        key={func.name}
                        type="button"
                        onClick={() => setSelectedFunction(func)}
                        onDoubleClick={() => insertSnippet(func.snippet)}
                        className={`w-full text-left truncate rounded px-2 py-1 font-mono text-[11px] transition-colors ${
                          selectedFunction.name === func.name
                            ? 'bg-sky-100 text-sky-900 font-bold dark:bg-sky-950 dark:text-sky-200'
                            : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                        }`}
                        title="Clic para ver detalle • Doble clic para insertar"
                      >
                        {func.name}
                      </button>
                    ))}
                  </div>

                  {/* Function Documentation & Example Card */}
                  <div className="flex-1 flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900 overflow-y-auto">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2 dark:border-stone-800">
                        <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-300">
                          {selectedFunction.name}
                        </span>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-600 dark:bg-stone-800 dark:text-stone-400 uppercase">
                          {selectedFunction.category}
                        </span>
                      </div>

                      {/* Syntax */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                          Sintaxis
                        </span>
                        <p className="font-mono text-xs text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-950 p-1.5 rounded border border-stone-200/80 dark:border-stone-800 mt-0.5">
                          {selectedFunction.syntax}
                        </p>
                      </div>

                      {/* Description */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                          Descripción
                        </span>
                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mt-0.5">
                          {selectedFunction.description}
                        </p>
                      </div>

                      {/* Example */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                          Ejemplo
                        </span>
                        <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 p-1.5 rounded border border-emerald-200/50 dark:border-emerald-900/50 mt-0.5 break-all">
                          {selectedFunction.example}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => insertSnippet(selectedFunction.snippet)}
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-md bg-sky-50 px-3 py-1.5 text-xs font-mono font-medium text-sky-700 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-900 transition-colors"
                    >
                      <span>Insertar en fórmula</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FIELDS & PARAMETERS */}
            {activeTab === 'fields' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Available Dataset Columns */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 font-mono flex items-center gap-1.5 mb-2">
                    <Table className="h-3.5 w-3.5 text-sky-600" />
                    <span>Campos del Dataset (Doble clic para insertar)</span>
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {columns.map((col) => (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => insertSnippet(`"${col.name}"`)}
                        className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-2 py-1.5 text-left text-xs font-mono text-stone-800 hover:border-sky-400 hover:bg-sky-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
                        title={`Insertar "${col.name}"`}
                      >
                        <span className="truncate">"{col.name}"</span>
                        <span className="text-[9px] uppercase text-stone-400 ml-1">
                          {col.dataType}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available Parameters */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono flex items-center gap-1.5 mb-2">
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Parámetros Globales (Doble clic para insertar)</span>
                  </span>
                  {parameters.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No hay parámetros definidos aún.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {parameters.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => insertSnippet(`[${p.name}]`)}
                          className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/60 px-2 py-1.5 text-left text-xs font-mono text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                          title={`Insertar [${p.name}]`}
                        >
                          <span className="truncate">[{p.name}]</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400">
                            {p.currentValue}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: RECIPES */}
            {activeTab === 'recipes' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                <p className="text-xs text-stone-500 mb-2">
                  Selecciona una plantilla predefinida para cargar la fórmula y configuración recomendada:
                </p>

                {QUICK_RECIPES.map((recipe) => (
                  <div
                    key={recipe.title}
                    className="flex flex-col rounded-lg border border-stone-200 bg-white p-3 hover:border-sky-300 dark:border-stone-800 dark:bg-stone-900 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-editorial text-xs font-bold text-stone-900 dark:text-stone-100">
                        {recipe.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => applyRecipe(recipe)}
                        className="rounded bg-sky-50 px-2 py-0.5 text-xs font-mono text-sky-700 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300"
                      >
                        Usar Plantilla
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-1.5">{recipe.desc}</p>
                    <code className="rounded bg-stone-50 px-2 py-1 font-mono text-[10.5px] text-stone-700 dark:bg-stone-950 dark:text-stone-300 border border-stone-100 dark:border-stone-800 break-all">
                      {recipe.formula}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-stone-200/90 px-6 py-3.5 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Info className="h-3.5 w-3.5 text-stone-400" />
            <span>Haz clic en cualquier campo o función para insertarlo en la fórmula.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !formula.trim()}
              className="rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white transition-colors"
            >
              Guardar Campo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
