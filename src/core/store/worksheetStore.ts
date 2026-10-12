import { create } from 'zustand';
import {
  WorksheetState,
  Pill,
  ShelfId,
  MarkType,
  FilterExpression,
  AggregationFunction,
  DatasetMeta,
} from '../ast/types';
import { buildWorksheetAST } from '../ast/builder';
import { compileASTtoDuckDB, CompiledQuery } from '../compiler/sqlCompiler';
import { duckdbEngine, QueryExecutionResult } from '../engine/duckdbClient';

export interface WorksheetStore extends WorksheetState {
  // Analytical Engine State
  availableDatasets: DatasetMeta[];
  currentDataset: DatasetMeta | null;
  isEngineReady: boolean;
  isExecuting: boolean;
  engineError: string | null;
  compiledQuery: CompiledQuery | null;
  queryResult: QueryExecutionResult | null;
  executionHistory: { sql: string; durationMs: number; timestamp: string }[];
  showSQLDrawer: boolean;
  theme: 'light' | 'dark';

  // Actions
  initEngine: () => Promise<void>;
  loadFile: (file: File) => Promise<void>;
  closeDataset: () => void;
  selectDataset: (datasetId: string) => Promise<void>;
  addPillToShelf: (shelf: ShelfId, pill: Pill) => void;
  removePillFromShelf: (shelf: ShelfId, pillId: string) => void;
  reorderShelfPills: (shelf: ShelfId, startIndex: number, endIndex: number) => void;
  setPillAggregation: (shelf: ShelfId, pillId: string, agg: AggregationFunction) => void;
  setPillSort: (shelf: ShelfId, pillId: string, sort: 'asc' | 'desc' | 'none') => void;
  setPillDateTruncation: (shelf: ShelfId, pillId: string, trunc: 'year' | 'quarter' | 'month' | 'day') => void;
  setMarkType: (markType: MarkType) => void;
  setOpacity: (opacity: number) => void;
  addFilter: (filter: FilterExpression) => void;
  removeFilter: (filterId: string) => void;
  updateFilterValues: (filterId: string, values: (string | number | boolean)[]) => void;
  clearAllShelves: () => void;
  toggleSQLDrawer: () => void;
  toggleTheme: () => void;
  executeCurrentState: () => Promise<void>;
}

export const useWorksheetStore = create<WorksheetStore>((set, get) => ({
  datasetId: '',
  tableName: '',
  columns: [],
  rows: [],
  filters: [],
  marks: {
    markType: 'auto',
    detail: [],
    tooltip: [],
    opacity: 0.85,
  },
  limit: 50000,

  availableDatasets: [],
  currentDataset: null,
  isEngineReady: false,
  isExecuting: false,
  engineError: null,
  compiledQuery: null,
  queryResult: null,
  executionHistory: [],
  showSQLDrawer: false,
  theme: 'light',

  initEngine: async () => {
    try {
      set({ isExecuting: true, engineError: null });
      await duckdbEngine.getDB();
      set({
        isEngineReady: true,
        isExecuting: false,
      });
    } catch (err: unknown) {
      set({
        engineError: err instanceof Error ? err.message : 'Error al inicializar DuckDB-WASM',
        isExecuting: false,
      });
    }
  },

  loadFile: async (file: File) => {
    try {
      set({ isExecuting: true, engineError: null });
      const meta = await duckdbEngine.loadUserFile(file);
      const allDatasets = duckdbEngine.getAvailableDatasets();

      set({
        availableDatasets: allDatasets,
        currentDataset: meta,
        datasetId: meta.id,
        tableName: meta.tableName,
        columns: [],
        rows: [],
        filters: [],
        marks: {
          markType: 'auto',
          detail: [],
          tooltip: [],
          opacity: 0.85,
        },
      });

      await get().executeCurrentState();
    } catch (err: unknown) {
      set({
        isExecuting: false,
        engineError: err instanceof Error ? err.message : 'Error al cargar archivo en memoria',
      });
    }
  },

  closeDataset: () => {
    set({
      currentDataset: null,
      datasetId: '',
      tableName: '',
      columns: [],
      rows: [],
      filters: [],
      compiledQuery: null,
      queryResult: null,
      marks: {
        markType: 'auto',
        detail: [],
        tooltip: [],
        opacity: 0.85,
      },
    });
  },

  selectDataset: async (datasetId: string) => {
    const ds = get().availableDatasets.find((d) => d.id === datasetId);
    if (!ds) return;

    set({
      datasetId: ds.id,
      tableName: ds.tableName,
      currentDataset: ds,
      columns: [],
      rows: [],
      filters: [],
      marks: {
        markType: 'auto',
        detail: [],
        tooltip: [],
        opacity: 0.85,
      },
    });

    await get().executeCurrentState();
  },

  addPillToShelf: (shelf: ShelfId, pill: Pill) => {
    const pillWithAgg: Pill = {
      ...pill,
      id: `${pill.columnName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      aggregation: pill.role === 'measure' ? pill.aggregation || 'SUM' : undefined,
    };

    set((state) => {
      switch (shelf) {
        case 'columns':
          return { columns: [...state.columns, pillWithAgg] };
        case 'rows':
          return { rows: [...state.rows, pillWithAgg] };
        case 'color':
          return { marks: { ...state.marks, color: pillWithAgg } };
        case 'size':
          return { marks: { ...state.marks, size: pillWithAgg } };
        case 'detail':
          return { marks: { ...state.marks, detail: [...state.marks.detail, pillWithAgg] } };
        case 'tooltip':
          return { marks: { ...state.marks, tooltip: [...state.marks.tooltip, pillWithAgg] } };
        default:
          return state;
      }
    });

    void get().executeCurrentState();
  },

  removePillFromShelf: (shelf: ShelfId, pillId: string) => {
    set((state) => {
      switch (shelf) {
        case 'columns':
          return { columns: state.columns.filter((p) => p.id !== pillId) };
        case 'rows':
          return { rows: state.rows.filter((p) => p.id !== pillId) };
        case 'color':
          return { marks: { ...state.marks, color: undefined } };
        case 'size':
          return { marks: { ...state.marks, size: undefined } };
        case 'detail':
          return { marks: { ...state.marks, detail: state.marks.detail.filter((p) => p.id !== pillId) } };
        case 'tooltip':
          return { marks: { ...state.marks, tooltip: state.marks.tooltip.filter((p) => p.id !== pillId) } };
        default:
          return state;
      }
    });

    void get().executeCurrentState();
  },

  reorderShelfPills: (shelf: ShelfId, startIndex: number, endIndex: number) => {
    set((state) => {
      const reorderList = <T,>(list: T[]): T[] => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
      };

      if (shelf === 'columns') return { columns: reorderList(state.columns) };
      if (shelf === 'rows') return { rows: reorderList(state.rows) };
      if (shelf === 'detail') return { marks: { ...state.marks, detail: reorderList(state.marks.detail) } };
      return state;
    });

    void get().executeCurrentState();
  },

  setPillAggregation: (shelf: ShelfId, pillId: string, agg: AggregationFunction) => {
    const updateList = (list: Pill[]) =>
      list.map((p) => (p.id === pillId ? { ...p, aggregation: agg } : p));

    set((state) => {
      if (shelf === 'columns') return { columns: updateList(state.columns) };
      if (shelf === 'rows') return { rows: updateList(state.rows) };
      if (shelf === 'color' && state.marks.color?.id === pillId) {
        return { marks: { ...state.marks, color: { ...state.marks.color, aggregation: agg } } };
      }
      if (shelf === 'size' && state.marks.size?.id === pillId) {
        return { marks: { ...state.marks, size: { ...state.marks.size, aggregation: agg } } };
      }
      return state;
    });

    void get().executeCurrentState();
  },

  setPillSort: (shelf: ShelfId, pillId: string, sort: 'asc' | 'desc' | 'none') => {
    const updateList = (list: Pill[]) =>
      list.map((p) => (p.id === pillId ? { ...p, sort } : p));

    set((state) => {
      if (shelf === 'columns') return { columns: updateList(state.columns) };
      if (shelf === 'rows') return { rows: updateList(state.rows) };
      return state;
    });

    void get().executeCurrentState();
  },

  setPillDateTruncation: (shelf: ShelfId, pillId: string, trunc: 'year' | 'quarter' | 'month' | 'day') => {
    const updateList = (list: Pill[]) =>
      list.map((p) => (p.id === pillId ? { ...p, dateTruncation: trunc } : p));

    set((state) => {
      if (shelf === 'columns') return { columns: updateList(state.columns) };
      if (shelf === 'rows') return { rows: updateList(state.rows) };
      return state;
    });

    void get().executeCurrentState();
  },

  setMarkType: (markType: MarkType) => {
    set((state) => ({ marks: { ...state.marks, markType } }));
    void get().executeCurrentState();
  },

  setOpacity: (opacity: number) => {
    set((state) => ({ marks: { ...state.marks, opacity } }));
  },

  addFilter: (filter: FilterExpression) => {
    set((state) => ({ filters: [...state.filters, filter] }));
    void get().executeCurrentState();
  },

  removeFilter: (filterId: string) => {
    set((state) => ({ filters: state.filters.filter((f) => f.id !== filterId) }));
    void get().executeCurrentState();
  },

  updateFilterValues: (filterId: string, values: (string | number | boolean)[]) => {
    set((state) => ({
      filters: state.filters.map((f) => (f.id === filterId ? { ...f, values } : f)),
    }));
    void get().executeCurrentState();
  },

  clearAllShelves: () => {
    set({
      columns: [],
      rows: [],
      filters: [],
      marks: {
        markType: 'auto',
        detail: [],
        tooltip: [],
        opacity: 0.85,
      },
    });
    void get().executeCurrentState();
  },

  toggleSQLDrawer: () => {
    set((state) => ({ showSQLDrawer: !state.showSQLDrawer }));
  },

  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: nextTheme };
    });
  },

  executeCurrentState: async () => {
    const state = get();
    if (!state.isEngineReady || !state.tableName) return;

    try {
      set({ isExecuting: true, engineError: null });

      const ast = buildWorksheetAST({
        datasetId: state.datasetId,
        tableName: state.tableName,
        columns: state.columns,
        rows: state.rows,
        filters: state.filters,
        marks: state.marks,
        limit: state.limit,
      });

      const compiled = compileASTtoDuckDB(ast);
      const result = await duckdbEngine.executeQuery(compiled.sql);

      set((prev) => ({
        isExecuting: false,
        compiledQuery: compiled,
        queryResult: result,
        executionHistory: [
          {
            sql: compiled.sql,
            durationMs: result.durationMs,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev.executionHistory.slice(0, 9),
        ],
      }));
    } catch (err: unknown) {
      set({
        isExecuting: false,
        engineError: err instanceof Error ? err.message : 'Error ejecutando consulta en DuckDB-WASM',
      });
    }
  },
}));
