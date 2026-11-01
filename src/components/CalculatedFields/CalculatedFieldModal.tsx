import React, { useState, useEffect, useRef } from 'react';
import { CalculatedField, DatasetColumn, Parameter, FieldRole, DataType } from '../../core/ast/types';
import { duckdbEngine } from '../../core/engine/duckdbClient';
import { compileLodExpressions, normalizeTableauFormula } from '../../core/compiler/sqlCompiler';
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
  category: 'logic' | 'numeric' | 'string' | 'date' | 'conversion' | 'stats' | 'advanced' | 'lod' | 'table_calc';
  syntax: string;
  description: string;
  example: string;
  snippet: string;
}

const FUNCTION_LIBRARY: FunctionDoc[] = [
  // TABLEAU TABLE CALCULATIONS (WINDOW FUNCTIONS)
  {
    name: 'RUNNING_SUM',
    category: 'table_calc',
    syntax: 'RUNNING_SUM(AGG([Field]))',
    description: 'Calculates the running sum of a measure from the first row to the current row.',
    example: 'RUNNING_SUM(SUM([sales]))',
    snippet: 'RUNNING_SUM(SUM([measure]))',
  },
  {
    name: 'RUNNING_AVG',
    category: 'table_calc',
    syntax: 'RUNNING_AVG(AGG([Field]))',
    description: 'Calculates the running average of a measure from the first row to the current row.',
    example: 'RUNNING_AVG(AVG([profit]))',
    snippet: 'RUNNING_AVG(AVG([measure]))',
  },
  {
    name: 'WINDOW_AVG',
    category: 'table_calc',
    syntax: 'WINDOW_AVG(AGG([Field]))',
    description: 'Calculates the average of the expression across the window partition.',
    example: 'WINDOW_AVG(SUM([sales]))',
    snippet: 'WINDOW_AVG(SUM([measure]))',
  },
  {
    name: 'WINDOW_SUM',
    category: 'table_calc',
    syntax: 'WINDOW_SUM(AGG([Field]))',
    description: 'Calculates the sum of the expression across the window partition.',
    example: 'WINDOW_SUM(SUM([profit]))',
    snippet: 'WINDOW_SUM(SUM([measure]))',
  },
  {
    name: 'RANK',
    category: 'table_calc',
    syntax: 'RANK(AGG([Field]))',
    description: 'Assigns standard rank (with gaps for ties) based on the specified measure in descending order.',
    example: 'RANK(SUM([sales]))',
    snippet: 'RANK(SUM([measure]))',
  },
  {
    name: 'RANK_DENSE',
    category: 'table_calc',
    syntax: 'RANK_DENSE(AGG([Field]))',
    description: 'Assigns dense rank (no gaps for ties) based on the specified measure in descending order.',
    example: 'RANK_DENSE(SUM([sales]))',
    snippet: 'RANK_DENSE(SUM([measure]))',
  },
  {
    name: 'INDEX',
    category: 'table_calc',
    syntax: 'INDEX()',
    description: 'Returns the index of the current row in the partition (starting at 1).',
    example: 'INDEX()',
    snippet: 'INDEX()',
  },
  {
    name: 'FIRST',
    category: 'table_calc',
    syntax: 'FIRST()',
    description: 'Returns the relative distance from the current row to the first row (0 for first, -1 for second, etc.).',
    example: 'FIRST()',
    snippet: 'FIRST()',
  },
  {
    name: 'LAST',
    category: 'table_calc',
    syntax: 'LAST()',
    description: 'Returns the number of rows from the current row to the last row in the partition.',
    example: 'LAST()',
    snippet: 'LAST()',
  },
  {
    name: 'LOOKUP',
    category: 'table_calc',
    syntax: 'LOOKUP(AGG([Field]), [offset])',
    description: 'Returns the value of the measure in a target row specified by relative offset (e.g. -1 for previous period).',
    example: 'LOOKUP(SUM([sales]), -1)',
    snippet: 'LOOKUP(SUM([measure]), -1)',
  },

  // TABLEAU LEVEL OF DETAIL (LOD)
  {
    name: 'FIXED',
    category: 'lod',
    syntax: '{FIXED [Dim1], [Dim2] : AGG([Field])}',
    description: 'Computes a measure at the exact specified dimensions, ignoring dimensions present in the view.',
    example: '{FIXED [region] : SUM([sales])}',
    snippet: '{FIXED [dim] : SUM([measure])}',
  },
  {
    name: 'FIXED (Without dimensions)',
    category: 'lod',
    syntax: '{FIXED : AGG([Field])}',
    description: 'Computes the grand total for the entire table regardless of filters or view dimensions.',
    example: '{FIXED : SUM([sales])}',
    snippet: '{FIXED : SUM([measure])}',
  },
  {
    name: 'INCLUDE',
    category: 'lod',
    syntax: '{INCLUDE [Dim] : AGG([Field])}',
    description: 'Computes at a more granular level than the view (adds the specified dimension to active view dimensions).',
    example: '{INCLUDE [customer_id] : AVG([sales])}',
    snippet: '{INCLUDE [dim] : AVG([measure])}',
  },
  {
    name: 'EXCLUDE',
    category: 'lod',
    syntax: '{EXCLUDE [Dim] : AGG([Field])}',
    description: 'Computes omitting a dimension present in the view, enabling comparison against parent total.',
    example: '{EXCLUDE [category] : SUM([sales])}',
    snippet: '{EXCLUDE [dim] : SUM([measure])}',
  },

  // LOGICAL & CONDITIONAL
  {
    name: 'CASE WHEN',
    category: 'logic',
    syntax: 'CASE WHEN condition THEN val1 ELSE val2 END',
    description: 'Evaluates logical conditions and returns a specific value. Ideal for categorizing data.',
    example: "CASE WHEN \"age\" >= 50 THEN 'Senior' ELSE 'Junior' END",
    snippet: "CASE WHEN condition THEN 'A' ELSE 'B' END",
  },
  {
    name: 'COALESCE',
    category: 'logic',
    syntax: 'COALESCE(expr, default_val)',
    description: 'Returns the first non-null value. Essential for replacing nulls in calculations and charts.',
    example: 'COALESCE("bonus", 0)',
    snippet: 'COALESCE(col, 0)',
  },
  {
    name: 'NULLIF',
    category: 'logic',
    syntax: 'NULLIF(val1, val2)',
    description: 'Returns NULL if val1 equals val2. Essential for preventing division by zero errors.',
    example: '"sales" / NULLIF("units", 0)',
    snippet: 'NULLIF(col, 0)',
  },
  {
    name: 'IFNULL',
    category: 'logic',
    syntax: 'IFNULL(expr, replacement)',
    description: 'Returns the replacement value if the expression is NULL.',
    example: "IFNULL(\"country\", 'Unknown')",
    snippet: 'IFNULL(col, default_val)',
  },

  // NUMERIC & MATH
  {
    name: 'ROUND',
    category: 'numeric',
    syntax: 'ROUND(number, decimals)',
    description: 'Rounds a numeric expression to the specified number of decimal places.',
    example: 'ROUND("sales" * 0.16, 2)',
    snippet: 'ROUND(expr, 2)',
  },
  {
    name: 'ABS',
    category: 'numeric',
    syntax: 'ABS(number)',
    description: 'Returns the absolute (positive) value of a number.',
    example: 'ABS("profit")',
    snippet: 'ABS(col)',
  },
  {
    name: 'CEIL',
    category: 'numeric',
    syntax: 'CEIL(number)',
    description: 'Rounds a number up to the nearest integer.',
    example: 'CEIL("duration_minutes")',
    snippet: 'CEIL(col)',
  },
  {
    name: 'FLOOR',
    category: 'numeric',
    syntax: 'FLOOR(number)',
    description: 'Rounds a number down to the nearest integer.',
    example: 'FLOOR("score")',
    snippet: 'FLOOR(col)',
  },
  {
    name: 'POWER',
    category: 'numeric',
    syntax: 'POWER(base, exponent)',
    description: 'Raises a base number to the specified power.',
    example: 'POWER("radius", 2)',
    snippet: 'POWER(col, 2)',
  },
  {
    name: 'SQRT',
    category: 'numeric',
    syntax: 'SQRT(number)',
    description: 'Calculates the square root of a positive number.',
    example: 'SQRT("variance")',
    snippet: 'SQRT(col)',
  },

  // TEXT & STRINGS
  {
    name: 'CONCAT',
    category: 'string',
    syntax: "CONCAT(text1, ' ', text2)",
    description: 'Concatenates two or more strings into a single string.',
    example: "CONCAT(\"first_name\", ' ', \"last_name\")",
    snippet: "CONCAT(col1, ' ', col2)",
  },
  {
    name: 'UPPER',
    category: 'string',
    syntax: 'UPPER(text)',
    description: 'Converts all characters in the string to uppercase.',
    example: 'UPPER("city")',
    snippet: 'UPPER(col)',
  },
  {
    name: 'LOWER',
    category: 'string',
    syntax: 'LOWER(text)',
    description: 'Converts all characters in the string to lowercase.',
    example: 'LOWER("email")',
    snippet: 'LOWER(col)',
  },
  {
    name: 'LENGTH',
    category: 'string',
    syntax: 'LENGTH(text)',
    description: 'Returns the character length of the text string.',
    example: 'LENGTH("product_name")',
    snippet: 'LENGTH(col)',
  },
  {
    name: 'SUBSTRING',
    category: 'string',
    syntax: 'SUBSTRING(text, start, length)',
    description: 'Extracts a substring starting at the specified position.',
    example: 'SUBSTRING("postal_code", 1, 3)',
    snippet: 'SUBSTRING(col, 1, 3)',
  },
  {
    name: 'TRIM',
    category: 'string',
    syntax: 'TRIM(text)',
    description: 'Removes leading and trailing whitespace from the string.',
    example: 'TRIM("company_name")',
    snippet: 'TRIM(col)',
  },
  {
    name: 'REPLACE',
    category: 'string',
    syntax: "REPLACE(text, 'old', 'new')",
    description: 'Replaces all occurrences of a search string with a new string.',
    example: "REPLACE(\"phone\", '-', '')",
    snippet: "REPLACE(col, 'old', 'new')",
  },

  // DATE & TIME
  {
    name: 'DATE_TRUNC',
    category: 'date',
    syntax: "DATE_TRUNC('unit', date)",
    description: "Truncates a date/timestamp to the specified period ('year', 'quarter', 'month', 'week', 'day').",
    example: "DATE_TRUNC('month', \"order_date\")",
    snippet: "DATE_TRUNC('month', col)",
  },
  {
    name: 'EXTRACT',
    category: 'date',
    syntax: 'EXTRACT(part FROM date)',
    description: 'Extracts a specific date part (year, month, day, dow) as a number.',
    example: 'EXTRACT(year FROM "order_date")',
    snippet: 'EXTRACT(year FROM col)',
  },
  {
    name: 'CURRENT_DATE',
    category: 'date',
    syntax: 'CURRENT_DATE()',
    description: 'Returns the current system date as a DATE value.',
    example: 'CURRENT_DATE()',
    snippet: 'CURRENT_DATE()',
  },
  {
    name: 'DATE_DIFF',
    category: 'date',
    syntax: "DATE_DIFF('day', start_date, end_date)",
    description: "Calculates the numeric difference between two dates in specified units ('day', 'month', 'year').",
    example: "DATE_DIFF('day', \"order_date\", \"ship_date\")",
    snippet: "DATE_DIFF('day', col1, col2)",
  },

  // TYPE CONVERSION
  {
    name: 'CAST',
    category: 'conversion',
    syntax: 'CAST(expr AS type)',
    description: 'Converts data to another type: VARCHAR, DOUBLE, BIGINT, DATE, or BOOLEAN.',
    example: 'CAST("zip_code" AS VARCHAR)',
    snippet: 'CAST(col AS VARCHAR)',
  },
  {
    name: 'TRY_CAST',
    category: 'conversion',
    syntax: 'TRY_CAST(expr AS type)',
    description: 'Safely converts data type, returning NULL without failing if format is invalid.',
    example: 'TRY_CAST("raw_number" AS DOUBLE)',
    snippet: 'TRY_CAST(col AS DOUBLE)',
  },

  // ADVANCED STATISTICS & MACHINE LEARNING (DUCKDB SUPERPOWERS)
  {
    name: 'CORR',
    category: 'stats',
    syntax: 'CORR(measure1, measure2)',
    description: 'Calculates the Pearson correlation coefficient (-1 to 1) between two variables.',
    example: 'ROUND(CORR("sales", "profit"), 4)',
    snippet: 'CORR(col1, col2)',
  },
  {
    name: 'REGR_SLOPE',
    category: 'stats',
    syntax: 'REGR_SLOPE(y, x)',
    description: 'Calculates the slope of the linear regression line (OLS).',
    example: 'REGR_SLOPE("profit", "sales")',
    snippet: 'REGR_SLOPE(y, x)',
  },
  {
    name: 'REGR_R2',
    category: 'stats',
    syntax: 'REGR_R2(y, x)',
    description: 'Calculates the coefficient of determination (R²) for linear regression.',
    example: 'ROUND(REGR_R2("profit", "sales"), 4)',
    snippet: 'REGR_R2(y, x)',
  },
  {
    name: 'QUANTILE_CONT',
    category: 'stats',
    syntax: 'QUANTILE_CONT(measure, percentile)',
    description: 'Calculates the exact continuous percentile (e.g. 0.50 for median, 0.95 for P95). Essential for SLAs and latency.',
    example: 'QUANTILE_CONT("salary", 0.95)',
    snippet: 'QUANTILE_CONT(col, 0.95)',
  },
  {
    name: 'APPROX_COUNT_DISTINCT',
    category: 'stats',
    syntax: 'APPROX_COUNT_DISTINCT(col)',
    description: 'Ultra-fast approximate distinct count based on HyperLogLog (<1% error across millions of rows).',
    example: 'APPROX_COUNT_DISTINCT("user_id")',
    snippet: 'APPROX_COUNT_DISTINCT(col)',
  },

  // REGULAR EXPRESSIONS, JSON & NATIVE ARRAYS
  {
    name: 'REGEXP_EXTRACT',
    category: 'advanced',
    syntax: "REGEXP_EXTRACT(col, 'regex_pattern', group)",
    description: 'Extracts substring using PCRE regular expressions.',
    example: "REGEXP_EXTRACT(\"email\", '@(.+)$', 1)",
    snippet: "REGEXP_EXTRACT(col, 'pattern', 1)",
  },
  {
    name: 'REGEXP_MATCHES',
    category: 'advanced',
    syntax: "REGEXP_MATCHES(col, 'regex_pattern')",
    description: 'Tests whether text matches a regular expression (returns TRUE/FALSE).',
    example: "REGEXP_MATCHES(\"code\", '^[A-Z]{3}-\\d{4}$')",
    snippet: "REGEXP_MATCHES(col, 'pattern')",
  },
  {
    name: 'JSON_EXTRACT_TEXT (->>)',
    category: 'advanced',
    syntax: "column->>'$.property'",
    description: 'Extracts properties directly from JSON text without rigid schemas or ETL.',
    example: "\"raw_metadata\"->>'$.device.model'",
    snippet: "col->>'$.path'",
  },
  {
    name: 'STRING_SPLIT',
    category: 'advanced',
    syntax: "STRING_SPLIT(text, delimiter)",
    description: 'Splits a delimited string into an in-memory native array.',
    example: "STRING_SPLIT(\"tags\", ',')",
    snippet: "STRING_SPLIT(col, ',')",
  },
  {
    name: 'MD5 / HASH',
    category: 'advanced',
    syntax: 'MD5(text)',
    description: 'Generates an MD5 cryptographic hash for anonymizing sensitive data or creating surrogate keys.',
    example: 'MD5("customer_email")',
    snippet: 'MD5(col)',
  },
];

const QUICK_RECIPES = [
  {
    title: 'Regional Benchmark ({FIXED})',
    desc: 'Total sales by region to compare any subsegment',
    formula: '{FIXED [region] : SUM([sales])}',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: '% of Total Global ({FIXED})',
    desc: 'Percentage relative to entire table grand total',
    formula: 'ROUND(100.0 * "sales" / NULLIF({FIXED : SUM([sales])}, 0), 2)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Profit Margin (%)',
    desc: 'Ratio between profit and sales on 100 base',
    formula: 'ROUND(("profit" / NULLIF("sales", 0)) * 100, 2)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Pearson Correlation (ML / Stats)',
    desc: 'Linear correlation between 2 variables (-1 to +1)',
    formula: 'ROUND(CORR("sales", "profit"), 4)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'P95 Percentile (SLA / Latency)',
    desc: 'Computes exact 95th percentile without complex subqueries',
    formula: 'QUANTILE_CONT("salary", 0.95)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Regex Domain Extraction',
    desc: 'Extracts parts of text using regular expressions',
    formula: "REGEXP_EXTRACT(\"email\", '@(.+)$', 1)",
    role: 'dimension' as FieldRole,
    type: 'string' as DataType,
  },
  {
    title: 'Nested JSON Extraction',
    desc: 'Directly accesses properties within JSON columns',
    formula: "\"payload\"->>'$.user.role'",
    role: 'dimension' as FieldRole,
    type: 'string' as DataType,
  },
  {
    title: 'Conditional Classification (IF / CASE)',
    desc: 'Segments records into ranges using conditions',
    formula: "CASE WHEN \"sales\" >= 1000 THEN 'High' ELSE 'Standard' END",
    role: 'dimension' as FieldRole,
    type: 'string' as DataType,
  },
  {
    title: 'Year of Date',
    desc: 'Extracts the year as a numeric grouping dimension',
    formula: 'EXTRACT(year FROM "order_date")',
    role: 'dimension' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Metric with Markup or Tax',
    desc: 'Calculates adjusted amounts (+16% tax)',
    formula: 'ROUND("sales" * 1.16, 2)',
    role: 'measure' as FieldRole,
    type: 'number' as DataType,
  },
  {
    title: 'Null Imputation (Coalesce to 0)',
    desc: 'Replaces null values with zero to prevent gaps',
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    sampleValue?: string | number | boolean | null;
  } | null>(null);

  // Automatic Debounced Type & Role Inference (Tableau Style)
  useEffect(() => {
    if (!formula.trim() || !tableName) {
      setAutoInferred(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const availableCols = columns.map((c) => c.name);
        const evaluated = normalizeTableauFormula(
          compileLodExpressions(formula, tableName),
          parameters,
          availableCols
        );
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
  }, [formula, tableName, parameters, isManualOverride, columns]);

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
      const availableCols = columns.map((c) => c.name);
      const evaluated = normalizeTableauFormula(
        compileLodExpressions(formula, tableName),
        parameters,
        availableCols
      );
      const res = await duckdbEngine.validateCalculatedFormula(tableName, evaluated);
      setValidationResult({
        tested: true,
        valid: res.valid,
        error: res.error,
        sampleValue: res.sampleValue,
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
      const availableCols = columns.map((c) => c.name);
      const evaluated = normalizeTableauFormula(
        compileLodExpressions(formula, tableName),
        parameters,
        availableCols
      );
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
    if (!textareaRef.current) {
      setFormula((prev) => (prev ? `${prev} ${snippet}` : snippet));
      setValidationResult(null);
      return;
    }
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = formula.substring(0, start);
    const after = formula.substring(end);
    const newFormula = `${before}${snippet}${after}`;
    setFormula(newFormula);
    setValidationResult(null);
    setTimeout(() => {
      ta.focus();
      const newCursor = start + snippet.length;
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);
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
                {initialField ? 'Edit Calculated Field' : 'Create Calculated Field'}
              </h3>
              <p className="text-[11px] text-stone-500">
                DuckDB-WASM columnar engine • Zero-latency vectorized expressions
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
                Field Name
              </label>
              <input
                type="text"
                placeholder="e.g. Profit Margin, Net Salary, Age Group..."
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
                    Type & Role Inference
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    (Tableau Style • DuckDB AST)
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
                  <span>{isManualOverride ? 'Re-enable auto inference' : 'Customize'}</span>
                </button>
              </div>

              {!isManualOverride ? (
                <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-800 dark:bg-stone-950">
                  <div className="flex items-center gap-2">
                    {role === 'measure' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Measure (Green • Aggregable)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                        Dimension (Blue • Discrete)
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
                    Auto-detected by DuckDB
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                      Analytical Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as FieldRole)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                    >
                      <option value="measure">Measure (Green • SUM/AVG aggregation)</option>
                      <option value="dimension">Dimension (Blue • GROUP BY grouping)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                      Data Type
                    </label>
                    <select
                      value={dataType}
                      onChange={(e) => setDataType(e.target.value as DataType)}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                    >
                      <option value="number">Number (Float / Int)</option>
                      <option value="string">String</option>
                      <option value="boolean">Boolean (True / False)</option>
                      <option value="date">Date (Date / Timestamp)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Formula Editor */}
            <div className="flex-1 flex flex-col min-h-[240px]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Formula Editor
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Tableau or DuckDB SQL syntax
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating || !formula.trim()}
                  className="btn-tactile flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-[11px] font-mono font-medium text-sky-700 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-40 transition-colors dark:bg-stone-800 dark:text-sky-300 dark:hover:bg-stone-700 shadow-2xs"
                  title="Run syntax validation in DuckDB-WASM"
                >
                  {isValidating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                  )}
                  <span>Validate</span>
                </button>
              </div>

              {/* Quick Interactive Operators & Functions Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-1.5 bg-stone-100/70 dark:bg-stone-900/60 rounded-md border border-stone-200/80 dark:border-white/[0.06] mb-2">
                <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-white/[0.08] pr-1.5 mr-1">
                  {(['+', '-', '*', '/', '(', ')', '=', '!=', '>', '<'] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => insertSnippet(` ${op} `)}
                      className="btn-tactile h-6 min-w-[20px] px-1 rounded bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950 font-mono text-xs font-semibold dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 shadow-2xs border border-stone-200/60 dark:border-white/[0.06]"
                      title={`Insert ${op}`}
                    >
                      {op}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 border-r border-stone-200 dark:border-white/[0.08] pr-1.5 mr-1">
                  <button
                    type="button"
                    onClick={() => insertSnippet('SUM([measure])')}
                    className="btn-tactile h-6 px-1.5 rounded bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950 font-mono text-[10px] font-medium dark:bg-stone-800 dark:text-stone-300 shadow-2xs border border-stone-200/60 dark:border-white/[0.06]"
                  >
                    SUM
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('AVG([measure])')}
                    className="btn-tactile h-6 px-1.5 rounded bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950 font-mono text-[10px] font-medium dark:bg-stone-800 dark:text-stone-300 shadow-2xs border border-stone-200/60 dark:border-white/[0.06]"
                  >
                    AVG
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('ROUND([measure], 2)')}
                    className="btn-tactile h-6 px-1.5 rounded bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950 font-mono text-[10px] font-medium dark:bg-stone-800 dark:text-stone-300 shadow-2xs border border-stone-200/60 dark:border-white/[0.06]"
                  >
                    ROUND
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("IF [condition] THEN 'A' ELSE 'B' END")}
                    className="btn-tactile h-6 px-1.5 rounded bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950 font-mono text-[10px] font-medium dark:bg-stone-800 dark:text-stone-300 shadow-2xs border border-stone-200/60 dark:border-white/[0.06]"
                  >
                    IF..THEN
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet('ZN([measure])')}
                    className="btn-tactile h-6 px-1.5 rounded bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950 font-mono text-[10px] font-medium dark:bg-stone-800 dark:text-stone-300 shadow-2xs border border-stone-200/60 dark:border-white/[0.06]"
                    title="Returns 0 if the field is NULL"
                  >
                    ZN
                  </button>
                </div>

                {/* Quick Insert Field Dropdown */}
                <div className="ml-auto flex items-center gap-1.5">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        insertSnippet(`[${e.target.value}]`);
                        e.target.value = '';
                      }
                    }}
                    className="h-6 text-[10.5px] font-mono rounded border border-stone-200/80 bg-white px-1.5 text-stone-700 dark:border-white/[0.08] dark:bg-stone-800 dark:text-stone-300 focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>+ Insert Field...</option>
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        [{c.name}] ({c.role === 'measure' ? '#' : 'Abc'})
                      </option>
                    ))}
                  </select>

                  {parameters.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          insertSnippet(`[${e.target.value}]`);
                          e.target.value = '';
                        }
                      }}
                      className="h-6 text-[10.5px] font-mono rounded border border-amber-300 bg-amber-50 px-1.5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 focus:outline-none cursor-pointer"
                    >
                      <option value="" disabled>+ Parameter...</option>
                      {parameters.map((p) => (
                        <option key={p.name} value={p.name}>
                          [{p.name}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={formula}
                onChange={(e) => {
                  setFormula(e.target.value);
                  setValidationResult(null);
                }}
                placeholder={`Write your formula here using Tableau or SQL syntax. Examples:
[Sales] - [Cost]
ROUND(([Profit] / NULLIF([Sales], 0)) * 100, 2)
IF [Sales] > 1000 THEN 'High Volume' ELSE 'Standard' END
{FIXED [Region] : SUM([Sales])}`}
                className="flex-1 w-full rounded-lg border border-stone-200 bg-stone-50/60 p-3 font-mono text-xs text-stone-900 focus:border-stone-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 resize-none leading-relaxed shadow-inner"
              />

              {/* Validation Feedback Banner with Live Sample Preview */}
              {validationResult?.tested && (
                <div
                  className={`mt-2.5 flex items-start justify-between gap-2 rounded-lg p-2.5 text-xs font-mono transition-all ${
                    validationResult.valid
                      ? 'border border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                  }`}
                >
                  {validationResult.valid ? (
                    <>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                        <div>
                          <span className="font-bold">Valid formula!</span>
                          <p className="text-[11px] opacity-80">
                            DuckDB-WASM compiled and validated the expression successfully.
                          </p>
                        </div>
                      </div>
                      {validationResult.sampleValue !== undefined && validationResult.sampleValue !== null && (
                        <div className="shrink-0 rounded bg-white/80 dark:bg-stone-900 px-2 py-1 text-[11px] font-mono border border-emerald-300/80 dark:border-emerald-700 shadow-2xs">
                          <span className="text-[10px] text-stone-400 block uppercase">Sample Row 1:</span>
                          <strong className="text-emerald-800 dark:text-emerald-300 text-xs">
                            {String(validationResult.sampleValue)}
                          </strong>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-bold">Syntax error:</span>
                        <p className="text-[11px] opacity-90 break-words mt-0.5">
                          {validationResult.error}
                        </p>
                      </div>
                    </div>
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
                <span>Function Library</span>
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
                <span>Fields & Parameters</span>
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
                <span>Templates</span>
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
                    <option value="all">All Categories</option>
                    <option value="table_calc">Table Calculations (RUNNING, WINDOW, RANK)</option>
                    <option value="lod">Tableau LOD ({'{FIXED}'}, {'{EXCLUDE}'})</option>
                    <option value="stats">Statistical & ML (DuckDB)</option>
                    <option value="advanced">Regex, JSON & Arrays</option>
                    <option value="logic">Logical / Conditional</option>
                    <option value="numeric">Number</option>
                    <option value="string">String / Text</option>
                    <option value="date">Date & Time</option>
                    <option value="conversion">Type Conversion</option>
                  </select>

                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search function..."
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
                        title="Click for details • Double-click to insert"
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
                          Syntax
                        </span>
                        <p className="font-mono text-xs text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-950 p-1.5 rounded border border-stone-200/80 dark:border-stone-800 mt-0.5">
                          {selectedFunction.syntax}
                        </p>
                      </div>

                      {/* Description */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                          Description
                        </span>
                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mt-0.5">
                          {selectedFunction.description}
                        </p>
                      </div>

                      {/* Example */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                          Example
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
                      <span>Insert into formula</span>
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
                    <span>Dataset Fields (Click to insert)</span>
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {columns.map((col) => (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => insertSnippet(`[${col.name}]`)}
                        className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-2 py-1.5 text-left text-xs font-mono text-stone-800 hover:border-sky-400 hover:bg-sky-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
                        title={`Insert [${col.name}]`}
                      >
                        <span className="truncate">[{col.name}]</span>
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
                    <span>Global Parameters (Click to insert)</span>
                  </span>
                  {parameters.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No parameters defined yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {parameters.map((p) => {
                        const isNumber = p.dataType === 'number';
                        const isDate = p.dataType === 'date';
                        const isBoolean = p.dataType === 'boolean';
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => insertSnippet(`[${p.name}]`)}
                            className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 text-left text-xs font-mono text-amber-900 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 transition-colors"
                            title={`Insert token [${p.name}]`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-[10px] text-amber-600 dark:text-amber-400">
                                {isNumber ? '#' : isDate ? '📅' : isBoolean ? 'T/F' : 'Abc'}
                              </span>
                              <span className="truncate font-semibold">[{p.name}]</span>
                            </div>
                            <span className="text-[10px] text-amber-700/70 dark:text-amber-300/70 shrink-0 ml-1">
                              = {String(p.currentValue)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: RECIPES */}
            {activeTab === 'recipes' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                <p className="text-xs text-stone-500 mb-2">
                  Select a preset template to load the formula and recommended configuration:
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
                        Use Template
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
            <span>Click any field or function to insert it into the formula.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !formula.trim()}
              className="rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white transition-colors"
            >
              Save Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
