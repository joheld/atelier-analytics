import React, { useEffect, useState } from 'react';
import { useWorksheetStore } from './core/store/worksheetStore';
import { Header } from './components/Header/Header';
import { DataSidebar } from './components/DataSidebar/DataSidebar';
import { ShelfDropZone } from './components/Shelves/ShelfDropZone';
import { FilterShelf } from './components/Filters/FilterShelf';
import { FilterModal } from './components/Filters/FilterModal';
import { MarksCard } from './components/Marks/MarksCard';
import { PlotRenderer } from './components/Canvas/PlotRenderer';
import { CanvasErrorBoundary } from './components/Canvas/CanvasErrorBoundary';
import { EmptyWorkspace } from './components/Canvas/EmptyWorkspace';
import { SQLInspectorDrawer } from './components/Canvas/SQLInspectorDrawer';
import { TabBar } from './components/Tabs/TabBar';
import { DashboardGrid } from './components/Dashboard/DashboardGrid';
import { CalculatedFieldModal } from './components/CalculatedFields/CalculatedFieldModal';
import { ParameterModal } from './components/Parameters/ParameterModal';
import { ParameterControlsBar } from './components/Parameters/ParameterControlsBar';
import { ShowMeDrawer } from './components/ShowMe/ShowMeDrawer';
import { DataModelModal } from './components/DataModel/DataModelModal';
import { Columns, Rows, Loader2, Sparkles, ArrowUpDown } from 'lucide-react';
import { buildWorksheetAST } from './core/ast/builder';

export const App: React.FC = () => {
  const [isShowMeOpen, setIsShowMeOpen] = useState(false);
  const {
    theme,
    toggleTheme,
    isEngineReady,
    isExecuting,
    engineError,
    currentDataset,
    availableDatasets,
    selectDataset,
    isDataModelModalOpen,
    openDataModelModal,
    closeDataModelModal,
    createJoinModel,
    createUnionModel,
    columns,
    rows,
    marks,
    filters,
    activeFilterModal,
    setActiveFilterModal,
    upsertFilter,
    removeFilter,
    compiledQuery,
    queryResult,
    showSQLDrawer,
    initEngine,
    loadFile,
    closeDataset,
    addPillToShelf,
    removePillFromShelf,
    setPillAggregation,
    setPillQuickTableCalc,
    setPillSort,
    setPillDateTruncation,
    setMarkType,
    setOpacity,
    swapShelves,
    clearAllShelves,
    addAnalyticsLine,
    removeAnalyticsLine,
    toggleSQLDrawer,

    // Multi-Tab Sheets & Dashboards
    sheets,
    activeTabId,
    addSheet,
    switchTab,
    renameTab,
    duplicateTab,
    deleteTab,
    setDashboardSheets,
    addDashboardFilter,
    updateDashboardFilter,
    removeDashboardFilter,
    setFilterTargetSheets,
    setParameterTargetSheets,
    setSheetUseAsFilter,
    setDashboardCrossFilter,
    dashboardResults,

    // Calculated Fields & Parameters
    calculatedFields,
    parameters,
    isCalculatedFieldModalOpen,
    editingCalculatedField,
    openCalculatedFieldModal,
    closeCalculatedFieldModal,
    saveCalculatedField,
    deleteCalculatedField,

    isParameterModalOpen,
    editingParameter,
    openParameterModal,
    closeParameterModal,
    saveParameter,
    setParameterValue,
    toggleParameterControl,
    duplicateParameter,
    deleteParameter,

    // Project Persistence
    exportProjectFile,
    importProjectFile,
  } = useWorksheetStore();

  useEffect(() => {
    void initEngine();
  }, [initEngine]);

  // Accidental reload and tab close protection (Tableau Desktop UX)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const state = useWorksheetStore.getState();
      const hasActiveWork =
        state.currentDataset !== null &&
        (state.columns.length > 0 || state.rows.length > 0 || state.sheets.length > 1);
      if (hasActiveWork) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const activeSheet = sheets.find((s) => s.id === activeTabId) || sheets[0];
  const isDashboardTab = activeSheet?.type === 'dashboard';

  const ast = currentDataset && !isDashboardTab
    ? buildWorksheetAST({
        datasetId: currentDataset.id,
        tableName: currentDataset.tableName,
        columns,
        rows,
        filters,
        marks,
        analyticsLines: activeSheet?.analyticsLines,
      })
    : null;

  const hasPillsOnShelves = columns.length > 0 || rows.length > 0 || marks.detail.length > 0;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100 font-sans">
      {/* Top Header */}
      <Header
        theme={theme}
        currentDataset={currentDataset}
        onToggleTheme={toggleTheme}
        onToggleSQLDrawer={toggleSQLDrawer}
        onClearShelves={clearAllShelves}
        onCloseDataset={closeDataset}
        onExportProject={exportProjectFile}
        onImportProject={importProjectFile}
        latencyMs={queryResult?.durationMs}
        rowCount={queryResult?.rowCount}
        hasPillsOnShelves={hasPillsOnShelves}
      />

      {/* Main Studio Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Data Sidebar */}
        <DataSidebar
          currentDataset={currentDataset}
          availableDatasets={availableDatasets}
          onSelectDataset={selectDataset}
          onLoadAdditionalFile={(file) => void loadFile(file)}
          onOpenDataModelModal={openDataModelModal}
          parameters={parameters}
          calculatedFields={calculatedFields}
          analyticsLines={activeSheet?.analyticsLines}
          onAddPill={(shelf, pill) => addPillToShelf(shelf, pill)}
          onOpenCalculatedFieldModal={openCalculatedFieldModal}
          onDeleteCalculatedField={deleteCalculatedField}
          onOpenParameterModal={openParameterModal}
          onSetParameterValue={setParameterValue}
          onToggleParameterControl={toggleParameterControl}
          onDuplicateParameter={duplicateParameter}
          onDeleteParameter={deleteParameter}
          onAddAnalyticsLine={addAnalyticsLine}
          onRemoveAnalyticsLine={removeAnalyticsLine}
        />

        {/* Center Analytical Workbench */}
        <main className="flex flex-1 flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
          {!currentDataset ? (
            /* El ÚNICO lugar para cargar archivos en toda la app */
            <EmptyWorkspace
              onFileUpload={(file) => void loadFile(file)}
              isUploading={isExecuting}
            />
          ) : (
            <>
              {/* Tableau Interactive Parameter Controls Bar */}
              <ParameterControlsBar
                parameters={parameters}
                onSetParameterValue={setParameterValue}
                onToggleParameterControl={toggleParameterControl}
                onOpenParameterModal={openParameterModal}
              />

              {isDashboardTab ? (
                /* Multi-Visual Composite Dashboard View */
                <DashboardGrid
                  sheets={sheets}
                  activeDashboard={activeSheet}
                  dashboardResults={dashboardResults}
                  theme={theme}
                  datasetColumns={currentDataset?.columns}
                  parameters={parameters}
                  onSwitchTab={switchTab}
                  onSetDashboardSheets={setDashboardSheets}
                  onAddDashboardFilter={addDashboardFilter}
                  onUpdateDashboardFilter={updateDashboardFilter}
                  onRemoveDashboardFilter={removeDashboardFilter}
                  onSetFilterTargetSheets={setFilterTargetSheets}
                  onSetParameterValue={setParameterValue}
                  onSetParameterTargetSheets={setParameterTargetSheets}
                  onOpenFilterModal={(filter) => setActiveFilterModal(filter)}
                  onOpenParameterModal={openParameterModal}
                  onToggleUseAsFilter={setSheetUseAsFilter}
                  onSetCrossFilter={setDashboardCrossFilter}
                />
              ) : (
                /* Active Worksheet: Shelves + Marks + Canvas */
                <>
              {/* Shelves Zone: Columns, Rows & Filters */}
              <div className="relative border-b border-stone-200/90 bg-white/70 backdrop-blur-xs dark:border-stone-800 dark:bg-stone-900/70">
                <div className="flex items-center">
                  <div className="flex-1">
                    <ShelfDropZone
                      shelfId="columns"
                      label="Columns"
                      icon={<Columns className="h-3.5 w-3.5 text-stone-500" />}
                      pills={columns}
                      onAddPill={addPillToShelf}
                      onRemovePill={removePillFromShelf}
                      onSetAggregation={setPillAggregation}
                      onSetQuickTableCalc={setPillQuickTableCalc}
                      onSetSort={setPillSort}
                      onSetDateTrunc={setPillDateTruncation}
                      placeholder="Arrastra dimensiones o métricas para el Eje X..."
                    />
                    <ShelfDropZone
                      shelfId="rows"
                      label="Rows"
                      icon={<Rows className="h-3.5 w-3.5 text-stone-500" />}
                      pills={rows}
                      onAddPill={addPillToShelf}
                      onRemovePill={removePillFromShelf}
                      onSetAggregation={setPillAggregation}
                      onSetQuickTableCalc={setPillQuickTableCalc}
                      onSetSort={setPillSort}
                      onSetDateTrunc={setPillDateTruncation}
                      placeholder="Arrastra dimensiones o métricas para el Eje Y..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={swapShelves}
                    title="Intercambiar Ejes (Swap Rows and Columns - Tableau)"
                    className="mr-3 flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5 text-2xs font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 text-stone-500" />
                    <span className="hidden sm:inline">Swap</span>
                  </button>
                </div>
                <FilterShelf
                  filters={filters}
                  onAddFilterPill={(pill) => addPillToShelf('filters', pill)}
                  onEditFilter={(f) => setActiveFilterModal(f)}
                  onRemoveFilter={(id) => removeFilter(id)}
                />
              </div>

              {/* Workbench Body: Marks Card + Plot Canvas */}
              <div className="flex flex-1 overflow-hidden p-3 gap-3">
                {/* Marks Card Sidebar */}
                <div className="w-64 shrink-0 overflow-y-auto">
                  <MarksCard
                    markType={marks.markType}
                    color={marks.color}
                    size={marks.size}
                    detail={marks.detail}
                    tooltip={marks.tooltip}
                    opacity={marks.opacity}
                    onSetMarkType={setMarkType}
                    onSetOpacity={setOpacity}
                    onAddPillToChannel={addPillToShelf}
                    onRemovePillFromChannel={removePillFromShelf}
                  />
                </div>

                {/* Visualization Canvas */}
                <div className="relative flex flex-1 flex-col overflow-hidden rounded-xl border border-stone-200/90 bg-white p-4 shadow-editorial dark:border-stone-800 dark:bg-stone-900/90">
                  {/* Top Canvas Controls: Loading & Show Me */}
                  <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                    {/* Engine Loading Indicator */}
                    {(!isEngineReady || isExecuting) && (
                      <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-3 py-1 text-xs font-mono text-stone-600 shadow-sm dark:border-stone-700 dark:bg-stone-800/90 dark:text-stone-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600 dark:text-sky-400" />
                        <span>Procesando consulta OLAP...</span>
                      </div>
                    )}

                    {/* Tableau Show Me Button */}
                    <button
                      type="button"
                      onClick={() => setIsShowMeOpen(!isShowMeOpen)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all shadow-2xs ${
                        isShowMeOpen
                          ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 font-bold'
                          : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                      title="Abrir galería inteligente Show Me (Tableau)"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Show Me</span>
                    </button>
                  </div>

                  {/* Tableau Show Me Smart Drawer */}
                  <ShowMeDrawer
                    isOpen={isShowMeOpen}
                    onClose={() => setIsShowMeOpen(false)}
                    columns={columns}
                    rows={rows}
                    currentMarkType={marks.markType}
                    onSelectMarkType={setMarkType}
                    onSwapShelves={swapShelves}
                  />

                  {/* Error Notice */}
                  {engineError && (
                    <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                      {engineError}
                    </div>
                  )}

                  {/* Observable Plot Graphic Container */}
                  <div className="flex-1 w-full h-full min-h-[400px]">
                    <CanvasErrorBoundary fallbackTitle="Error al renderizar el lienzo de la hoja">
                      <PlotRenderer ast={ast} result={queryResult} theme={theme} />
                    </CanvasErrorBoundary>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

          {/* Tableau-style Bottom Tab Bar */}
          {currentDataset && (
            <TabBar
              sheets={sheets}
              activeTabId={activeTabId}
              onSwitchTab={switchTab}
              onAddSheet={addSheet}
              onRenameTab={renameTab}
              onDuplicateTab={duplicateTab}
              onDeleteTab={deleteTab}
            />
          )}
        </main>
      </div>

      {/* SQL & Arrow Inspector Drawer */}
      <SQLInspectorDrawer
        isOpen={showSQLDrawer}
        onClose={toggleSQLDrawer}
        compiledQuery={compiledQuery}
        queryResult={queryResult}
        ast={ast}
      />

      {/* Interactive Filter Configuration Modal */}
      {activeFilterModal && currentDataset && (
        <FilterModal
          filter={activeFilterModal}
          tableName={currentDataset.tableName}
          onSave={(updated) => {
            if (isDashboardTab) {
              updateDashboardFilter(activeSheet.id, updated);
            } else {
              upsertFilter(updated);
            }
            setActiveFilterModal(null);
          }}
          onClose={() => setActiveFilterModal(null)}
          onRemove={() => {
            if (isDashboardTab) {
              removeDashboardFilter(activeSheet.id, activeFilterModal.id);
            } else {
              removeFilter(activeFilterModal.id);
            }
            setActiveFilterModal(null);
          }}
        />
      )}

      {/* Calculated Field Creation & Editing Modal */}
      {isCalculatedFieldModalOpen && currentDataset && (
        <CalculatedFieldModal
          tableName={currentDataset.tableName}
          columns={currentDataset.columns}
          parameters={parameters}
          initialField={editingCalculatedField}
          onSave={saveCalculatedField}
          onClose={closeCalculatedFieldModal}
        />
      )}

      {/* Parameter Creation & Editing Modal */}
      {isParameterModalOpen && (
        <ParameterModal
          initialParam={editingParameter}
          tableName={currentDataset?.tableName}
          columns={currentDataset?.columns}
          onSave={saveParameter}
          onClose={closeParameterModal}
        />
      )}

      {/* Relational Data Model Modal (JOIN & UNION) */}
      {isDataModelModalOpen && (
        <DataModelModal
          isOpen={isDataModelModalOpen}
          availableDatasets={availableDatasets}
          onClose={closeDataModelModal}
          onCreateJoin={createJoinModel}
          onCreateUnion={createUnionModel}
        />
      )}
    </div>
  );
};
