import { create } from 'zustand';
import {
  WorksheetState,
  Pill,
  ShelfId,
  MarkType,
  FilterExpression,
  AggregationFunction,
  DatasetMeta,
  WorksheetTab,
  SheetType,
  CalculatedField,
  Parameter,
  WorkbookProject,
  WorksheetAST,
  QuickTableCalcType,
  AnalyticsLine,
  JoinRelationConfig,
  UnionConfig,
} from '../ast/types';
import { buildWorksheetAST } from '../ast/builder';
import { compileASTtoDuckDB, CompiledQuery } from '../compiler/sqlCompiler';
import { duckdbEngine, QueryExecutionResult } from '../engine/duckdbClient';
import {
  saveDatasetBlob,
  getAllDatasetBlobs,
  clearAllDatasets,
  saveActiveSession,
  getActiveSession,
  clearActiveSession,
  ActiveSessionSnapshot,
  SavedWorkbookRecord,
  saveWorkbookRecord,
  getAllWorkbookRecords,
  deleteWorkbookRecord,
} from '../storage/indexedDBStorage';

export interface DashboardSheetExecution {
  queryResult: QueryExecutionResult | null;
  compiledQuery: CompiledQuery | null;
  ast: WorksheetAST | null;
  error?: string | null;
}

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

  // Multi-Tab Workbook State
  sheets: WorksheetTab[];
  activeTabId: string;

  // Calculated Fields & Parameters
  calculatedFields: CalculatedField[];
  parameters: Parameter[];
  isCalculatedFieldModalOpen: boolean;
  editingCalculatedField: CalculatedField | null;
  isParameterModalOpen: boolean;
  editingParameter: Parameter | null;

  // Multi-Visual Dashboard Execution Cache
  dashboardResults: Record<string, DashboardSheetExecution>;

  // Data Modeling Modal (Tableau Relationships & Joins)
  isDataModelModalOpen: boolean;
  openDataModelModal: () => void;
  closeDataModelModal: () => void;
  createJoinModel: (config: JoinRelationConfig) => Promise<DatasetMeta>;
  createUnionModel: (config: UnionConfig) => Promise<DatasetMeta>;

  // Workbooks Management (Catálogo de Reportes & Storage Inspector)
  currentWorkbookId: string;
  currentWorkbookName: string;
  savedWorkbooks: SavedWorkbookRecord[];
  isStorageModalOpen: boolean;
  openStorageModal: () => void;
  closeStorageModal: () => void;
  createNewWorkbook: (name?: string) => Promise<void>;
  switchWorkbook: (id: string) => Promise<void>;
  renameCurrentWorkbook: (name: string) => void;
  deleteWorkbook: (id: string) => Promise<void>;
  refreshSavedWorkbooks: () => Promise<void>;

  // Start Page (Tableau Welcome & Recent Workbooks Hub)
  isStartPageVisible: boolean;
  showStartPage: () => void;
  hideStartPage: () => void;
  toggleStartPage: () => void;

  // Actions - Core Engine & Datasets
  initEngine: () => Promise<void>;
  loadFile: (file: File) => Promise<void>;
  closeDataset: () => void;
  selectDataset: (datasetId: string) => Promise<void>;

  // Actions - Shelves & Pills (apply to active worksheet)
  addPillToShelf: (shelf: ShelfId, pill: Pill) => void;
  removePillFromShelf: (shelf: ShelfId, pillId: string) => void;
  reorderShelfPills: (shelf: ShelfId, startIndex: number, endIndex: number) => void;
  setPillAggregation: (shelf: ShelfId, pillId: string, agg: AggregationFunction) => void;
  setPillQuickTableCalc: (shelf: ShelfId, pillId: string, calcType?: QuickTableCalcType) => void;
  setPillSort: (shelf: ShelfId, pillId: string, sort: 'asc' | 'desc' | 'none') => void;
  setPillDateTruncation: (shelf: ShelfId, pillId: string, trunc: 'year' | 'quarter' | 'month' | 'day') => void;
  setMarkType: (markType: MarkType) => void;
  setOpacity: (opacity: number) => void;
  swapShelves: () => void;
  clearAllShelves: () => void;

  // Actions - Analytics Pane (Reference Lines, Trend Lines)
  addAnalyticsLine: (line: AnalyticsLine) => void;
  removeAnalyticsLine: (lineId: string) => void;

  // Actions - Filters
  activeFilterModal: FilterExpression | null;
  setActiveFilterModal: (filter: FilterExpression | null) => void;
  upsertFilter: (filter: FilterExpression) => void;
  addFilter: (filter: FilterExpression) => void;
  removeFilter: (filterId: string) => void;
  updateFilterValues: (filterId: string, values: (string | number | boolean)[]) => void;

  // Actions - Multi-Tab Workbook
  addSheet: (type?: SheetType) => void;
  switchTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  duplicateTab: (tabId: string) => void;
  deleteTab: (tabId: string) => void;
  setDashboardSheets: (dashboardId: string, sheetIds: string[]) => void;
  addDashboardFilter: (dashboardId: string, filter: FilterExpression) => void;
  updateDashboardFilter: (dashboardId: string, filter: FilterExpression) => void;
  removeDashboardFilter: (dashboardId: string, filterId: string) => void;
  setFilterTargetSheets: (dashboardId: string, filterId: string, scope: 'all' | 'selected', targetSheetIds: string[]) => void;
  setParameterTargetSheets: (paramId: string, scope: 'all' | 'selected', targetSheetIds: string[]) => void;
  setSheetUseAsFilter: (dashboardId: string, sheetId: string, useAsFilter: boolean) => void;
  setDashboardCrossFilter: (dashboardId: string, crossFilter: { sourceSheetId: string; columnName: string; value: string | number | boolean } | null) => void;

  // Actions - Calculated Fields
  openCalculatedFieldModal: (field?: CalculatedField) => void;
  closeCalculatedFieldModal: () => void;
  saveCalculatedField: (field: CalculatedField) => Promise<void>;
  deleteCalculatedField: (fieldId: string) => Promise<void>;

  // Actions - Parameters
  openParameterModal: (param?: Parameter) => void;
  closeParameterModal: () => void;
  saveParameter: (param: Parameter) => void;
  setParameterValue: (paramId: string, value: string | number | boolean) => void;
  toggleParameterControl: (paramId: string) => void;
  duplicateParameter: (paramId: string) => void;
  deleteParameter: (paramId: string) => void;

  // Actions - Project Persistence
  exportProjectFile: () => void;
  importProjectFile: (file: File) => Promise<void>;

  // Actions - UI State & Execution
  toggleSQLDrawer: () => void;
  toggleTheme: () => void;
  executeCurrentState: () => Promise<void>;
}

const defaultSheet: WorksheetTab = {
  id: 'sheet_1',
  name: 'Hoja 1',
  type: 'worksheet',
  columns: [],
  rows: [],
  filters: [],
  marks: {
    markType: 'auto',
    detail: [],
    tooltip: [],
    opacity: 0.85,
  },
};

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
  activeFilterModal: null,

  // Multi-Tab Workbook State
  sheets: [defaultSheet],
  activeTabId: 'sheet_1',

  // Calculated Fields & Parameters State
  calculatedFields: [],
  parameters: [],
  isCalculatedFieldModalOpen: false,
  editingCalculatedField: null,
  isParameterModalOpen: false,
  editingParameter: null,
  dashboardResults: {},
  isDataModelModalOpen: false,

  currentWorkbookId: 'wb_default',
  currentWorkbookName: 'Reporte Principal',
  savedWorkbooks: [],
  isStorageModalOpen: false,

  isStartPageVisible: true,
  showStartPage: () => set({ isStartPageVisible: true }),
  hideStartPage: () => set({ isStartPageVisible: false }),
  toggleStartPage: () => set((state) => ({ isStartPageVisible: !state.isStartPageVisible })),

  openStorageModal: () => set({ isStorageModalOpen: true }),
  closeStorageModal: () => set({ isStorageModalOpen: false }),

  openDataModelModal: () => {
    set({ isDataModelModalOpen: true });
  },

  closeDataModelModal: () => {
    set({ isDataModelModalOpen: false });
  },

  refreshSavedWorkbooks: async () => {
    const list = await getAllWorkbookRecords();
    set({ savedWorkbooks: list });
  },

  createNewWorkbook: async (name?: string) => {
    const state = get();
    // 1. Save current workbook snapshot before switching
    const currentSnapshot: ActiveSessionSnapshot = {
      version: 1,
      updatedAt: Date.now(),
      activeTabId: state.activeTabId,
      sheets: state.sheets,
      calculatedFields: state.calculatedFields,
      parameters: state.parameters,
      theme: state.theme,
      currentDatasetId: state.currentDataset?.id,
      currentDatasetName: state.currentDataset?.name,
      currentWorkbookId: state.currentWorkbookId,
      currentWorkbookName: state.currentWorkbookName,
    };
    await saveWorkbookRecord({
      id: state.currentWorkbookId,
      name: state.currentWorkbookName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      snapshot: currentSnapshot,
    });

    // 2. Initialize new blank workbook
    const newId = `wb_${Date.now()}`;
    const newName = name || `Reporte ${state.savedWorkbooks.length + 2}`;
    const defaultTab = {
      ...defaultSheet,
      datasetId: state.currentDataset?.id,
      tableName: state.currentDataset?.tableName,
    };

    set({
      currentWorkbookId: newId,
      currentWorkbookName: newName,
      sheets: [defaultTab],
      activeTabId: defaultTab.id,
      columns: [],
      rows: [],
      filters: [],
      marks: {
        markType: 'auto',
        detail: [],
        tooltip: [],
        opacity: 0.85,
      },
      dashboardResults: {},
      isStartPageVisible: false,
    });

    await get().refreshSavedWorkbooks();
    await get().executeCurrentState();
  },

  switchWorkbook: async (id: string) => {
    const state = get();
    if (state.currentWorkbookId === id) {
      set({ isStartPageVisible: false });
      return;
    }

    // 1. Save current active workbook
    const currentSnapshot: ActiveSessionSnapshot = {
      version: 1,
      updatedAt: Date.now(),
      activeTabId: state.activeTabId,
      sheets: state.sheets,
      calculatedFields: state.calculatedFields,
      parameters: state.parameters,
      theme: state.theme,
      currentDatasetId: state.currentDataset?.id,
      currentDatasetName: state.currentDataset?.name,
      currentWorkbookId: state.currentWorkbookId,
      currentWorkbookName: state.currentWorkbookName,
    };
    await saveWorkbookRecord({
      id: state.currentWorkbookId,
      name: state.currentWorkbookName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      snapshot: currentSnapshot,
    });

    // 2. Load target workbook
    const target = state.savedWorkbooks.find((wb) => wb.id === id);
    if (!target) return;

    const snap = target.snapshot;
    const activeSheet = snap.sheets.find((s) => s.id === snap.activeTabId) || snap.sheets[0] || defaultSheet;
    const boundDataset = activeSheet.datasetId
      ? state.availableDatasets.find((d) => d.id === activeSheet.datasetId) || state.currentDataset
      : state.currentDataset;

    set({
      currentWorkbookId: target.id,
      currentWorkbookName: target.name,
      sheets: snap.sheets,
      activeTabId: activeSheet.id,
      currentDataset: boundDataset,
      datasetId: boundDataset ? boundDataset.id : state.datasetId,
      tableName: boundDataset ? boundDataset.tableName : state.tableName,
      columns: activeSheet.columns,
      rows: activeSheet.rows,
      filters: activeSheet.filters,
      marks: activeSheet.marks,
      calculatedFields: snap.calculatedFields || [],
      parameters: snap.parameters || [],
      theme: snap.theme || state.theme,
      isStartPageVisible: false,
    });

    await get().refreshSavedWorkbooks();
    await get().executeCurrentState();
  },

  renameCurrentWorkbook: (name: string) => {
    set({ currentWorkbookName: name });
  },

  deleteWorkbook: async (id: string) => {
    await deleteWorkbookRecord(id);
    await get().refreshSavedWorkbooks();
  },

  initEngine: async () => {
    try {
      set({ isExecuting: true, engineError: null });
      await duckdbEngine.getDB();
      set({ isEngineReady: true });

      // 1. Attempt to retrieve active session snapshot from localStorage
      const session = getActiveSession();

      // 2. Retrieve ALL dataset Blobs from IndexedDB
      const allCachedRecords = await getAllDatasetBlobs();

      if (allCachedRecords.length > 0) {
        try {
          let activeMeta: DatasetMeta | null = null;

          for (const record of allCachedRecords) {
            try {
              const file = new File([record.blob], record.fileName, {
                type: record.fileType,
                lastModified: record.updatedAt,
              });
              const loaded = await duckdbEngine.loadUserFile(file);
              if (!activeMeta || (session?.currentDatasetId && session.currentDatasetId === loaded.id)) {
                activeMeta = loaded;
              }
            } catch (err) {
              console.warn('[Storage] Error al rehidratar archivo:', record.fileName, err);
            }
          }

          const allDatasets = duckdbEngine.getAvailableDatasets();
          const primaryMeta =
            (session?.currentDatasetId ? allDatasets.find((d) => d.id === session.currentDatasetId) : null) ||
            activeMeta ||
            allDatasets[0];

          if (session && primaryMeta) {
            // Re-merge calculated fields into dataset columns if present
            if (session.calculatedFields && session.calculatedFields.length > 0) {
              const extraCols = session.calculatedFields.map((cf) => ({
                name: cf.name,
                dataType: cf.dataType,
                role: cf.role,
                isCalculated: true,
                formula: cf.formula,
              }));
              primaryMeta.columns = [...primaryMeta.columns, ...extraCols];
            }

            const activeSheet =
              session.sheets?.find((s) => s.id === session.activeTabId) ||
              session.sheets?.[0] ||
              defaultSheet;

            const sheetMeta = activeSheet.datasetId
              ? allDatasets.find((d) => d.id === activeSheet.datasetId) || primaryMeta
              : primaryMeta;

            set({
              availableDatasets: allDatasets,
              currentDataset: sheetMeta,
              datasetId: sheetMeta.id,
              tableName: sheetMeta.tableName,
              sheets: session.sheets && session.sheets.length > 0 ? session.sheets : [defaultSheet],
              activeTabId: session.activeTabId || 'sheet_1',
              calculatedFields: session.calculatedFields || [],
              parameters: session.parameters || [],
              theme: session.theme || 'light',
              columns: activeSheet.columns || [],
              rows: activeSheet.rows || [],
              filters: activeSheet.filters || [],
              marks: activeSheet.marks || defaultSheet.marks,
              currentWorkbookId: session.currentWorkbookId || 'wb_default',
              currentWorkbookName: session.currentWorkbookName || 'Reporte Principal',
              isExecuting: false,
            });

            // Re-execute query for restored active sheet or dashboard
            await get().executeCurrentState();
          } else if (primaryMeta) {
            set({
              availableDatasets: allDatasets,
              currentDataset: primaryMeta,
              datasetId: primaryMeta.id,
              tableName: primaryMeta.tableName,
              isExecuting: false,
            });
            await get().executeCurrentState();
          }
        } catch (rehydrateErr) {
          console.warn('[Storage] Error al rehidratar datasets desde IndexedDB:', rehydrateErr);
          set({ isExecuting: false });
        }
      } else {
        // No cached dataset, restore non-dataset preferences if any
        if (session) {
          if (session.calculatedFields) set({ calculatedFields: session.calculatedFields });
          if (session.parameters) set({ parameters: session.parameters });
          if (session.theme) set({ theme: session.theme });
          if (session.currentWorkbookId) set({ currentWorkbookId: session.currentWorkbookId });
          if (session.currentWorkbookName) set({ currentWorkbookName: session.currentWorkbookName });
        }
        set({ isExecuting: false });
      }
      await get().refreshSavedWorkbooks();
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

      // Persist the dataset in IndexedDB for resilience against accidental reloads
      await saveDatasetBlob(meta.id, file.name, file, meta);

      // Incorporate any existing calculated fields into dataset metadata
      const { calculatedFields, sheets, activeTabId } = get();
      if (calculatedFields.length > 0) {
        const extraCols = calculatedFields.map((cf) => ({
          name: cf.name,
          dataType: cf.dataType,
          role: cf.role,
          isCalculated: true,
          formula: cf.formula,
        }));
        meta.columns = [...meta.columns, ...extraCols];
      }

      const updatedSheets = sheets.map((s) =>
        s.id === activeTabId ? { ...s, datasetId: meta.id, tableName: meta.tableName } : s
      );
      const activeSheet = updatedSheets.find((s) => s.id === activeTabId) || updatedSheets[0];

      set({
        availableDatasets: allDatasets,
        currentDataset: meta,
        datasetId: meta.id,
        tableName: meta.tableName,
        sheets: updatedSheets,
        columns: activeSheet.columns,
        rows: activeSheet.rows,
        filters: activeSheet.filters,
        marks: activeSheet.marks,
        isStartPageVisible: false,
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
    void clearAllDatasets();
    clearActiveSession();
    set({
      currentDataset: null,
      datasetId: '',
      tableName: '',
      availableDatasets: [],
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
      sheets: [defaultSheet],
      activeTabId: 'sheet_1',
      dashboardResults: {},
      isStartPageVisible: true,
    });
  },

  selectDataset: async (datasetId: string) => {
    const ds = get().availableDatasets.find((d) => d.id === datasetId);
    if (!ds) return;

    const { sheets, activeTabId } = get();
    const updatedSheets = sheets.map((s) =>
      s.id === activeTabId ? { ...s, datasetId: ds.id, tableName: ds.tableName } : s
    );
    const activeSheet = updatedSheets.find((s) => s.id === activeTabId) || updatedSheets[0];

    set({
      datasetId: ds.id,
      tableName: ds.tableName,
      currentDataset: ds,
      sheets: updatedSheets,
      columns: activeSheet.columns,
      rows: activeSheet.rows,
      filters: activeSheet.filters,
      marks: activeSheet.marks,
    });

    await get().executeCurrentState();
  },

  createJoinModel: async (config: JoinRelationConfig) => {
    try {
      set({ isExecuting: true, engineError: null });
      const meta = await duckdbEngine.createRelationalJoinView(
        config.name,
        config.leftTableName,
        config.rightTableName,
        config.joinType,
        config.leftKey,
        config.rightKey
      );

      const allDatasets = duckdbEngine.getAvailableDatasets();
      const { sheets, activeTabId } = get();
      const updatedSheets = sheets.map((s) =>
        s.id === activeTabId ? { ...s, datasetId: meta.id, tableName: meta.tableName } : s
      );
      const activeSheet = updatedSheets.find((s) => s.id === activeTabId) || updatedSheets[0];

      set({
        availableDatasets: allDatasets,
        currentDataset: meta,
        datasetId: meta.id,
        tableName: meta.tableName,
        sheets: updatedSheets,
        columns: activeSheet.columns,
        rows: activeSheet.rows,
        filters: activeSheet.filters,
        marks: activeSheet.marks,
        isDataModelModalOpen: false,
        isExecuting: false,
      });

      await get().executeCurrentState();
      return meta;
    } catch (err: unknown) {
      set({
        isExecuting: false,
        engineError: err instanceof Error ? err.message : 'Error al crear relación (JOIN)',
      });
      throw err;
    }
  },

  createUnionModel: async (config: UnionConfig) => {
    try {
      set({ isExecuting: true, engineError: null });
      const meta = await duckdbEngine.createUnionView(
        config.name,
        config.tableNames
      );

      const allDatasets = duckdbEngine.getAvailableDatasets();
      const { sheets, activeTabId } = get();
      const updatedSheets = sheets.map((s) =>
        s.id === activeTabId ? { ...s, datasetId: meta.id, tableName: meta.tableName } : s
      );
      const activeSheet = updatedSheets.find((s) => s.id === activeTabId) || updatedSheets[0];

      set({
        availableDatasets: allDatasets,
        currentDataset: meta,
        datasetId: meta.id,
        tableName: meta.tableName,
        sheets: updatedSheets,
        columns: activeSheet.columns,
        rows: activeSheet.rows,
        filters: activeSheet.filters,
        marks: activeSheet.marks,
        isDataModelModalOpen: false,
        isExecuting: false,
      });

      await get().executeCurrentState();
      return meta;
    } catch (err: unknown) {
      set({
        isExecuting: false,
        engineError: err instanceof Error ? err.message : 'Error al crear unión (UNION)',
      });
      throw err;
    }
  },

  // Helper to sync changes to active sheet and localStorage
  addPillToShelf: (shelf: ShelfId, pill: Pill) => {
    if (shelf === 'filters') {
      const existing = get().filters.find((f) => f.columnName === pill.columnName);
      if (existing) {
        set({ activeFilterModal: existing });
        return;
      }
      const newFilter: FilterExpression = {
        id: `filter_${pill.columnName}_${Date.now()}`,
        columnName: pill.columnName,
        role: pill.role,
        dataType: pill.dataType,
        operator: pill.role === 'measure' ? 'range' : 'in',
        values: [],
      };
      set((state) => {
        const nextFilters = [...state.filters, newFilter];
        const nextSheets = state.sheets.map((s) =>
          s.id === state.activeTabId ? { ...s, filters: nextFilters } : s
        );
        return {
          filters: nextFilters,
          sheets: nextSheets,
          activeFilterModal: newFilter,
        };
      });
      return;
    }

    const pillWithAgg: Pill = {
      ...pill,
      id: `${pill.columnName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      aggregation: pill.role === 'measure' ? pill.aggregation || 'SUM' : undefined,
    };

    set((state) => {
      let nextColumns = state.columns;
      let nextRows = state.rows;
      let nextMarks = state.marks;

      switch (shelf) {
        case 'columns':
          nextColumns = [...state.columns, pillWithAgg];
          break;
        case 'rows':
          nextRows = [...state.rows, pillWithAgg];
          break;
        case 'color':
          nextMarks = { ...state.marks, color: pillWithAgg };
          break;
        case 'size':
          nextMarks = { ...state.marks, size: pillWithAgg };
          break;
        case 'detail':
          nextMarks = { ...state.marks, detail: [...state.marks.detail, pillWithAgg] };
          break;
        case 'tooltip':
          nextMarks = { ...state.marks, tooltip: [...state.marks.tooltip, pillWithAgg] };
          break;
      }

      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId
          ? {
              ...s,
              columns: nextColumns,
              rows: nextRows,
              marks: nextMarks,
            }
          : s
      );

      return {
        columns: nextColumns,
        rows: nextRows,
        marks: nextMarks,
        sheets: nextSheets,
      };
    });

    void get().executeCurrentState();
  },

  removePillFromShelf: (shelf: ShelfId, pillId: string) => {
    set((state) => {
      let nextColumns = state.columns;
      let nextRows = state.rows;
      let nextMarks = state.marks;

      switch (shelf) {
        case 'columns':
          nextColumns = state.columns.filter((p) => p.id !== pillId);
          break;
        case 'rows':
          nextRows = state.rows.filter((p) => p.id !== pillId);
          break;
        case 'color':
          nextMarks = { ...state.marks, color: undefined };
          break;
        case 'size':
          nextMarks = { ...state.marks, size: undefined };
          break;
        case 'detail':
          nextMarks = { ...state.marks, detail: state.marks.detail.filter((p) => p.id !== pillId) };
          break;
        case 'tooltip':
          nextMarks = { ...state.marks, tooltip: state.marks.tooltip.filter((p) => p.id !== pillId) };
          break;
      }

      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId
          ? {
              ...s,
              columns: nextColumns,
              rows: nextRows,
              marks: nextMarks,
            }
          : s
      );

      return {
        columns: nextColumns,
        rows: nextRows,
        marks: nextMarks,
        sheets: nextSheets,
      };
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

      let nextColumns = state.columns;
      let nextRows = state.rows;
      let nextMarks = state.marks;

      if (shelf === 'columns') nextColumns = reorderList(state.columns);
      if (shelf === 'rows') nextRows = reorderList(state.rows);
      if (shelf === 'detail') nextMarks = { ...state.marks, detail: reorderList(state.marks.detail) };

      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId
          ? {
              ...s,
              columns: nextColumns,
              rows: nextRows,
              marks: nextMarks,
            }
          : s
      );

      return {
        columns: nextColumns,
        rows: nextRows,
        marks: nextMarks,
        sheets: nextSheets,
      };
    });

    void get().executeCurrentState();
  },

  setPillAggregation: (shelf: ShelfId, pillId: string, agg: AggregationFunction) => {
    const updateList = (list: Pill[]) =>
      list.map((p) => (p.id === pillId ? { ...p, aggregation: agg } : p));

    set((state) => {
      const nextColumns = shelf === 'columns' ? updateList(state.columns) : state.columns;
      const nextRows = shelf === 'rows' ? updateList(state.rows) : state.rows;
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, columns: nextColumns, rows: nextRows } : s
      );
      return { columns: nextColumns, rows: nextRows, sheets: nextSheets };
    });

    void get().executeCurrentState();
  },

  setPillQuickTableCalc: (shelf: ShelfId, pillId: string, calcType?: QuickTableCalcType) => {
    const updateList = (list: Pill[]) =>
      list.map((p) =>
        p.id === pillId
          ? { ...p, quickTableCalc: calcType ? { type: calcType } : undefined }
          : p
      );

    set((state) => {
      const nextColumns = shelf === 'columns' ? updateList(state.columns) : state.columns;
      const nextRows = shelf === 'rows' ? updateList(state.rows) : state.rows;
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, columns: nextColumns, rows: nextRows } : s
      );
      return { columns: nextColumns, rows: nextRows, sheets: nextSheets };
    });

    void get().executeCurrentState();
  },

  setPillSort: (shelf: ShelfId, pillId: string, sort: 'asc' | 'desc' | 'none') => {
    const updateList = (list: Pill[]) =>
      list.map((p) => (p.id === pillId ? { ...p, sort } : p));

    set((state) => {
      const nextColumns = shelf === 'columns' ? updateList(state.columns) : state.columns;
      const nextRows = shelf === 'rows' ? updateList(state.rows) : state.rows;
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, columns: nextColumns, rows: nextRows } : s
      );
      return { columns: nextColumns, rows: nextRows, sheets: nextSheets };
    });

    void get().executeCurrentState();
  },

  setPillDateTruncation: (shelf: ShelfId, pillId: string, trunc: 'year' | 'quarter' | 'month' | 'day') => {
    const updateList = (list: Pill[]) =>
      list.map((p) => (p.id === pillId ? { ...p, dateTruncation: trunc } : p));

    set((state) => {
      const nextColumns = shelf === 'columns' ? updateList(state.columns) : state.columns;
      const nextRows = shelf === 'rows' ? updateList(state.rows) : state.rows;
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, columns: nextColumns, rows: nextRows } : s
      );
      return { columns: nextColumns, rows: nextRows, sheets: nextSheets };
    });

    void get().executeCurrentState();
  },

  setMarkType: (markType: MarkType) => {
    set((state) => {
      const nextMarks = { ...state.marks, markType };
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, marks: nextMarks } : s
      );
      return { marks: nextMarks, sheets: nextSheets };
    });
    void get().executeCurrentState();
  },

  setOpacity: (opacity: number) => {
    set((state) => {
      const nextMarks = { ...state.marks, opacity };
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, marks: nextMarks } : s
      );
      return { marks: nextMarks, sheets: nextSheets };
    });
    void get().executeCurrentState();
  },

  swapShelves: () => {
    set((state) => {
      const nextColumns = state.rows;
      const nextRows = state.columns;
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, columns: nextColumns, rows: nextRows } : s
      );
      return {
        columns: nextColumns,
        rows: nextRows,
        sheets: nextSheets,
      };
    });
    void get().executeCurrentState();
  },

  setActiveFilterModal: (filter: FilterExpression | null) => {
    set({ activeFilterModal: filter });
  },

  upsertFilter: (filter: FilterExpression) => {
    set((state) => {
      const exists = state.filters.some((f) => f.id === filter.id);
      const nextFilters = exists
        ? state.filters.map((f) => (f.id === filter.id ? filter : f))
        : [...state.filters, filter];
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, filters: nextFilters } : s
      );
      return {
        filters: nextFilters,
        sheets: nextSheets,
        activeFilterModal: null,
      };
    });
    void get().executeCurrentState();
  },

  addFilter: (filter: FilterExpression) => {
    set((state) => {
      const nextFilters = [...state.filters, filter];
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, filters: nextFilters } : s
      );
      return { filters: nextFilters, sheets: nextSheets };
    });
    void get().executeCurrentState();
  },

  removeFilter: (filterId: string) => {
    set((state) => {
      const nextFilters = state.filters.filter((f) => f.id !== filterId);
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, filters: nextFilters } : s
      );
      return { filters: nextFilters, sheets: nextSheets };
    });
    void get().executeCurrentState();
  },

  updateFilterValues: (filterId: string, values: (string | number | boolean)[]) => {
    set((state) => {
      const nextFilters = state.filters.map((f) => (f.id === filterId ? { ...f, values } : f));
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId ? { ...s, filters: nextFilters } : s
      );
      return { filters: nextFilters, sheets: nextSheets };
    });
    void get().executeCurrentState();
  },

  clearAllShelves: () => {
    set((state) => {
      const clearedMarks = {
        markType: 'auto' as MarkType,
        detail: [],
        tooltip: [],
        opacity: 0.85,
      };
      const nextSheets = state.sheets.map((s) =>
        s.id === state.activeTabId
          ? {
              ...s,
              columns: [],
              rows: [],
              filters: [],
              marks: clearedMarks,
            }
          : s
      );
      return {
        columns: [],
        rows: [],
        filters: [],
        marks: clearedMarks,
        sheets: nextSheets,
      };
    });
    void get().executeCurrentState();
  },

  addAnalyticsLine: (line: AnalyticsLine) => {
    set((state) => {
      const nextSheets = state.sheets.map((s) => {
        if (s.id !== state.activeTabId) return s;
        const currentLines = (s.analyticsLines || []).filter((l) => l.type !== line.type);
        return {
          ...s,
          analyticsLines: [...currentLines, line],
        };
      });
      return { sheets: nextSheets };
    });
    void get().executeCurrentState();
  },

  removeAnalyticsLine: (lineId: string) => {
    set((state) => {
      const nextSheets = state.sheets.map((s) => {
        if (s.id !== state.activeTabId) return s;
        return {
          ...s,
          analyticsLines: (s.analyticsLines || []).filter((l) => l.id !== lineId && l.type !== (lineId as any)),
        };
      });
      return { sheets: nextSheets };
    });
    void get().executeCurrentState();
  },

  // MULTI-TAB WORKBOOK ACTIONS
  addSheet: (type: SheetType = 'worksheet') => {
    const { sheets } = get();
    const count = sheets.filter((s) => s.type === type).length + 1;
    const newName = type === 'worksheet' ? `Hoja ${count}` : `Dashboard ${count}`;
    const newId = `${type}_${Date.now()}`;

    const newTab: WorksheetTab = {
      id: newId,
      name: newName,
      type,
      datasetId: get().datasetId || undefined,
      tableName: get().tableName || undefined,
      columns: [],
      rows: [],
      filters: [],
      marks: {
        markType: 'auto',
        detail: [],
        tooltip: [],
        opacity: 0.85,
      },
      dashboardSheetIds: type === 'dashboard' ? sheets.filter((s) => s.type === 'worksheet').map((s) => s.id) : undefined,
    };

    set((state) => ({
      sheets: [...state.sheets, newTab],
      activeTabId: newId,
      columns: newTab.columns,
      rows: newTab.rows,
      filters: newTab.filters,
      marks: newTab.marks,
    }));

    void get().executeCurrentState();
  },

  switchTab: (tabId: string) => {
    const target = get().sheets.find((s) => s.id === tabId);
    if (!target) return;

    // Switch dataset to the tab's bound dataset if set
    const targetDataset = target.datasetId
      ? get().availableDatasets.find((d) => d.id === target.datasetId)
      : get().currentDataset;

    set({
      activeTabId: tabId,
      currentDataset: targetDataset || get().currentDataset,
      datasetId: targetDataset ? targetDataset.id : get().datasetId,
      tableName: targetDataset ? targetDataset.tableName : get().tableName,
      columns: target.columns,
      rows: target.rows,
      filters: target.filters,
      marks: target.marks,
    });

    void get().executeCurrentState();
  },

  renameTab: (tabId: string, name: string) => {
    set((state) => ({
      sheets: state.sheets.map((s) => (s.id === tabId ? { ...s, name } : s)),
    }));
  },

  duplicateTab: (tabId: string) => {
    const target = get().sheets.find((s) => s.id === tabId);
    if (!target) return;

    const newId = `${target.type}_${Date.now()}`;
    const newTab: WorksheetTab = {
      ...target,
      id: newId,
      name: `${target.name} (Copia)`,
      columns: [...target.columns],
      rows: [...target.rows],
      filters: [...target.filters],
      marks: { ...target.marks, detail: [...target.marks.detail], tooltip: [...target.marks.tooltip] },
    };

    set((state) => ({
      sheets: [...state.sheets, newTab],
      activeTabId: newId,
      columns: newTab.columns,
      rows: newTab.rows,
      filters: newTab.filters,
      marks: newTab.marks,
    }));

    void get().executeCurrentState();
  },

  deleteTab: (tabId: string) => {
    const { sheets, activeTabId } = get();
    if (sheets.length <= 1) return; // Prevent deleting the last remaining sheet

    const remaining = sheets.filter((s) => s.id !== tabId);
    const nextActive = activeTabId === tabId ? remaining[0] : sheets.find((s) => s.id === activeTabId) || remaining[0];

    set({
      sheets: remaining,
      activeTabId: nextActive.id,
      columns: nextActive.columns,
      rows: nextActive.rows,
      filters: nextActive.filters,
      marks: nextActive.marks,
    });

    void get().executeCurrentState();
  },

  setDashboardSheets: (dashboardId: string, sheetIds: string[]) => {
    set((state) => ({
      sheets: state.sheets.map((s) => (s.id === dashboardId ? { ...s, dashboardSheetIds: sheetIds } : s)),
    }));
    void get().executeCurrentState();
  },

  addDashboardFilter: (dashboardId: string, filter: FilterExpression) => {
    set((state) => ({
      sheets: state.sheets.map((s) => {
        if (s.id !== dashboardId) return s;
        const currentFilters = s.dashboardFilters || [];
        return {
          ...s,
          dashboardFilters: [...currentFilters, filter],
        };
      }),
    }));
    void get().executeCurrentState();
  },

  updateDashboardFilter: (dashboardId: string, filter: FilterExpression) => {
    set((state) => ({
      sheets: state.sheets.map((s) => {
        if (s.id !== dashboardId) return s;
        const currentFilters = s.dashboardFilters || [];
        return {
          ...s,
          dashboardFilters: currentFilters.map((f) => (f.id === filter.id ? filter : f)),
        };
      }),
    }));
    void get().executeCurrentState();
  },

  removeDashboardFilter: (dashboardId: string, filterId: string) => {
    set((state) => ({
      sheets: state.sheets.map((s) => {
        if (s.id !== dashboardId) return s;
        return {
          ...s,
          dashboardFilters: (s.dashboardFilters || []).filter((f) => f.id !== filterId),
        };
      }),
    }));
    void get().executeCurrentState();
  },

  setFilterTargetSheets: (dashboardId: string, filterId: string, scope: 'all' | 'selected', targetSheetIds: string[]) => {
    set((state) => ({
      sheets: state.sheets.map((s) => {
        if (s.id !== dashboardId) return s;
        return {
          ...s,
          dashboardFilters: (s.dashboardFilters || []).map((f) =>
            f.id === filterId ? { ...f, applyScope: scope, targetSheetIds } : f
          ),
        };
      }),
    }));
    void get().executeCurrentState();
  },

  setParameterTargetSheets: (paramId: string, scope: 'all' | 'selected', targetSheetIds: string[]) => {
    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === paramId ? { ...p, applyScope: scope, targetSheetIds } : p
      ),
    }));
    void get().executeCurrentState();
  },

  setSheetUseAsFilter: (_dashboardId: string, sheetId: string, useAsFilter: boolean) => {
    set((state) => ({
      sheets: state.sheets.map((s) => {
        if (s.id !== sheetId) return s;
        return { ...s, useAsFilter };
      }),
    }));
    void get().executeCurrentState();
  },

  setDashboardCrossFilter: (dashboardId: string, crossFilter: { sourceSheetId: string; columnName: string; value: string | number | boolean } | null) => {
    set((state) => ({
      sheets: state.sheets.map((s) => {
        if (s.id !== dashboardId) return s;
        return { ...s, dashboardCrossFilter: crossFilter };
      }),
    }));
    void get().executeCurrentState();
  },

  // CALCULATED FIELDS ACTIONS
  openCalculatedFieldModal: (field?: CalculatedField) => {
    set({
      isCalculatedFieldModalOpen: true,
      editingCalculatedField: field || null,
    });
  },

  closeCalculatedFieldModal: () => {
    set({
      isCalculatedFieldModalOpen: false,
      editingCalculatedField: null,
    });
  },

  saveCalculatedField: async (field: CalculatedField) => {
    set((state) => {
      const exists = state.calculatedFields.some((cf) => cf.id === field.id);
      const nextFields = exists
        ? state.calculatedFields.map((cf) => (cf.id === field.id ? field : cf))
        : [...state.calculatedFields, field];

      // Update currentDataset columns if loaded
      let updatedDataset = state.currentDataset;
      if (updatedDataset) {
        const otherCols = updatedDataset.columns.filter((c) => c.name !== field.name);
        updatedDataset = {
          ...updatedDataset,
          columns: [
            ...otherCols,
            {
              name: field.name,
              dataType: field.dataType,
              role: field.role,
              isCalculated: true,
              formula: field.formula,
            },
          ],
        };
      }

      return {
        calculatedFields: nextFields,
        currentDataset: updatedDataset,
        isCalculatedFieldModalOpen: false,
        editingCalculatedField: null,
      };
    });

    void get().executeCurrentState();
  },

  deleteCalculatedField: async (fieldId: string) => {
    set((state) => {
      const target = state.calculatedFields.find((cf) => cf.id === fieldId);
      const nextFields = state.calculatedFields.filter((cf) => cf.id !== fieldId);

      let updatedDataset = state.currentDataset;
      if (updatedDataset && target) {
        updatedDataset = {
          ...updatedDataset,
          columns: updatedDataset.columns.filter((c) => c.name !== target.name),
        };
      }

      return {
        calculatedFields: nextFields,
        currentDataset: updatedDataset,
      };
    });

    void get().executeCurrentState();
  },

  // PARAMETERS ACTIONS
  openParameterModal: (param?: Parameter) => {
    set({
      isParameterModalOpen: true,
      editingParameter: param || null,
    });
  },

  closeParameterModal: () => {
    set({
      isParameterModalOpen: false,
      editingParameter: null,
    });
  },

  saveParameter: (param: Parameter) => {
    set((state) => {
      const exists = state.parameters.some((p) => p.id === param.id);
      const nextParams = exists
        ? state.parameters.map((p) => (p.id === param.id ? param : p))
        : [...state.parameters, param];
      return {
        parameters: nextParams,
        isParameterModalOpen: false,
        editingParameter: null,
      };
    });
    void get().executeCurrentState();
  },

  setParameterValue: (paramId: string, value: string | number | boolean) => {
    set((state) => ({
      parameters: state.parameters.map((p) => (p.id === paramId ? { ...p, currentValue: value } : p)),
    }));
    void get().executeCurrentState();
  },

  toggleParameterControl: (paramId: string) => {
    set((state) => ({
      parameters: state.parameters.map((p) =>
        p.id === paramId ? { ...p, showControl: p.showControl === false ? true : false } : p
      ),
    }));
  },

  duplicateParameter: (paramId: string) => {
    const target = get().parameters.find((p) => p.id === paramId);
    if (!target) return;
    const duplicated: Parameter = {
      ...target,
      id: `param_${Date.now()}`,
      name: `${target.name}_Copia`,
    };
    set((state) => ({
      parameters: [...state.parameters, duplicated],
    }));
    void get().executeCurrentState();
  },

  deleteParameter: (paramId: string) => {
    set((state) => ({
      parameters: state.parameters.filter((p) => p.id !== paramId),
    }));
    void get().executeCurrentState();
  },

  // PROJECT EXPORT & IMPORT
  exportProjectFile: () => {
    const state = get();
    const project: WorkbookProject = {
      version: '1.0.0',
      datasetMeta: state.currentDataset,
      availableDatasets: state.availableDatasets,
      activeTabId: state.activeTabId,
      sheets: state.sheets,
      calculatedFields: state.calculatedFields,
      parameters: state.parameters,
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.currentDataset?.name || 'atelier_analytics'}_dashboard.atelier`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importProjectFile: async (file: File) => {
    try {
      const text = await file.text();
      const project = JSON.parse(text) as WorkbookProject;

      if (!project.sheets || project.sheets.length === 0) {
        throw new Error('El archivo no contiene hojas válidas.');
      }

      const activeSheet = project.sheets.find((s) => s.id === project.activeTabId) || project.sheets[0];

      set({
        sheets: project.sheets,
        activeTabId: activeSheet.id,
        availableDatasets: project.availableDatasets || (project.datasetMeta ? [project.datasetMeta] : []),
        currentDataset: project.datasetMeta,
        datasetId: project.datasetMeta?.id || '',
        tableName: project.datasetMeta?.tableName || '',
        columns: activeSheet.columns,
        rows: activeSheet.rows,
        filters: activeSheet.filters,
        marks: activeSheet.marks,
        calculatedFields: project.calculatedFields || [],
        parameters: project.parameters || [],
        isStartPageVisible: false,
      });

      await get().executeCurrentState();
    } catch (err: unknown) {
      alert(`Error al importar proyecto: ${err instanceof Error ? err.message : String(err)}`);
    }
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

    // Check if active sheet is a dashboard
    const activeSheet = state.sheets.find((s) => s.id === state.activeTabId) || state.sheets[0];

    try {
      set({ isExecuting: true, engineError: null });

      if (activeSheet.type === 'dashboard') {
        // Execute queries for all sheets referenced in this dashboard
        const sheetIdsToRun = activeSheet.dashboardSheetIds && activeSheet.dashboardSheetIds.length > 0
          ? activeSheet.dashboardSheetIds
          : state.sheets.filter((s) => s.type === 'worksheet').map((s) => s.id);

        const newDashboardResults: Record<string, DashboardSheetExecution> = {};

        for (const sId of sheetIdsToRun) {
          const s = state.sheets.find((item) => item.id === sId);
          if (!s) continue;

          try {
            // Effective filters for this worksheet:
            let effectiveFilters = [...s.filters];

            // Merge in Dashboard Filters that target this sheet
            if (activeSheet.dashboardFilters && activeSheet.dashboardFilters.length > 0) {
              for (const dFilter of activeSheet.dashboardFilters) {
                const targetsThisSheet =
                  !dFilter.applyScope ||
                  dFilter.applyScope === 'all' ||
                  (dFilter.targetSheetIds && dFilter.targetSheetIds.includes(s.id));

                if (targetsThisSheet) {
                  // Override worksheet local filter on the same column with dashboard filter
                  effectiveFilters = effectiveFilters.filter((f) => f.columnName !== dFilter.columnName);
                  effectiveFilters.push(dFilter);
                }
              }
            }

            // Effective parameters for this worksheet:
            const effectiveParameters = state.parameters.map((p) => {
              const targetsThisSheet =
                !p.applyScope ||
                p.applyScope === 'all' ||
                (p.targetSheetIds && p.targetSheetIds.includes(s.id));

              if (targetsThisSheet) {
                return p;
              }
              // If parameter does NOT target this sheet, keep initial or neutral value
              return {
                ...p,
                currentValue:
                  p.allowableType === 'range' && p.min !== undefined
                    ? p.min
                    : (p.listItems?.[0]?.value ?? p.currentValue),
              };
            });

            // Inject Dashboard Cross-Filter if active and source is not this sheet
            if (activeSheet.dashboardCrossFilter && s.id !== activeSheet.dashboardCrossFilter.sourceSheetId) {
              const { columnName, value } = activeSheet.dashboardCrossFilter;
              effectiveFilters = effectiveFilters.filter((f) => f.columnName !== columnName);
              effectiveFilters.push({
                id: `cross_filter_${columnName}`,
                columnName,
                role: 'dimension',
                dataType: 'string',
                operator: 'in',
                values: [value],
              });
            }

            const sheetTableName = s.tableName || state.tableName;
            const sheetDatasetId = s.datasetId || state.datasetId;
            const sheetAST = buildWorksheetAST({
              datasetId: sheetDatasetId,
              tableName: sheetTableName,
              columns: s.columns,
              rows: s.rows,
              filters: effectiveFilters,
              marks: s.marks,
              limit: s.limit || state.limit,
              analyticsLines: s.analyticsLines,
            });

            const compiled = compileASTtoDuckDB(sheetAST, effectiveParameters);
            const queryRes = await duckdbEngine.executeQuery(compiled.sql);

            newDashboardResults[sId] = {
              ast: sheetAST,
              compiledQuery: compiled,
              queryResult: queryRes,
            };
          } catch (sheetErr) {
            newDashboardResults[sId] = {
              ast: null,
              compiledQuery: null,
              queryResult: null,
              error: sheetErr instanceof Error ? sheetErr.message : String(sheetErr),
            };
          }
        }

        set({
          isExecuting: false,
          dashboardResults: newDashboardResults,
        });
        return;
      }

      // Worksheet execution
      const sheetTableName = activeSheet.tableName || state.tableName;
      const sheetDatasetId = activeSheet.datasetId || state.datasetId;
      const ast = buildWorksheetAST({
        datasetId: sheetDatasetId,
        tableName: sheetTableName,
        columns: state.columns,
        rows: state.rows,
        filters: state.filters,
        marks: state.marks,
        limit: state.limit,
        analyticsLines: activeSheet.analyticsLines,
      });

      const compiled = compileASTtoDuckDB(ast, state.parameters);
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

      // Immediate session snapshot save on execution
      try {
        const snap: ActiveSessionSnapshot = {
          version: 1,
          updatedAt: Date.now(),
          activeTabId: state.activeTabId,
          sheets: state.sheets,
          calculatedFields: state.calculatedFields,
          parameters: state.parameters,
          theme: state.theme,
          currentDatasetId: state.currentDataset?.id,
          currentDatasetName: state.currentDataset?.name,
          currentWorkbookId: state.currentWorkbookId,
          currentWorkbookName: state.currentWorkbookName,
        };
        saveActiveSession(snap);
      } catch (err) {
        // Ignore quota limits
      }
    } catch (err: unknown) {
      set({
        isExecuting: false,
        engineError: err instanceof Error ? err.message : 'Error ejecutando consulta en DuckDB-WASM',
      });
    }
  },
}));

// Automatic session auto-save on any store state changes (debounced 250ms)
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
useWorksheetStore.subscribe((state) => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (
      state.currentDataset !== null ||
      state.sheets.some((s) => s.columns.length > 0 || s.rows.length > 0) ||
      state.calculatedFields.length > 0 ||
      state.parameters.length > 0
    ) {
      const snap: ActiveSessionSnapshot = {
        version: 1,
        updatedAt: Date.now(),
        activeTabId: state.activeTabId,
        sheets: state.sheets,
        calculatedFields: state.calculatedFields,
        parameters: state.parameters,
        theme: state.theme,
        currentDatasetId: state.currentDataset?.id,
        currentDatasetName: state.currentDataset?.name,
        currentWorkbookId: state.currentWorkbookId,
        currentWorkbookName: state.currentWorkbookName,
      };
      saveActiveSession(snap);
      void saveWorkbookRecord({
        id: state.currentWorkbookId,
        name: state.currentWorkbookName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        snapshot: snap,
      });
    }
  }, 250);
});
