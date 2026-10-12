import React, { useEffect } from 'react';
import { useWorksheetStore } from './core/store/worksheetStore';
import { Header } from './components/Header/Header';
import { DataSidebar } from './components/DataSidebar/DataSidebar';
import { ShelfDropZone } from './components/Shelves/ShelfDropZone';
import { FilterShelf } from './components/Filters/FilterShelf';
import { FilterModal } from './components/Filters/FilterModal';
import { MarksCard } from './components/Marks/MarksCard';
import { PlotRenderer } from './components/Canvas/PlotRenderer';
import { EmptyWorkspace } from './components/Canvas/EmptyWorkspace';
import { SQLInspectorDrawer } from './components/Canvas/SQLInspectorDrawer';
import { TabBar } from './components/Tabs/TabBar';
import { DashboardGrid } from './components/Dashboard/DashboardGrid';
import { CalculatedFieldModal } from './components/CalculatedFields/CalculatedFieldModal';
import { ParameterModal } from './components/Parameters/ParameterModal';
import { ParameterControlsBar } from './components/Parameters/ParameterControlsBar';
import { Columns, Rows, Loader2 } from 'lucide-react';
import { buildWorksheetAST } from './core/ast/builder';

export const App: React.FC = () => {
  const {
    theme,
    toggleTheme,
    isEngineReady,
    isExecuting,
    engineError,
    currentDataset,
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
    setPillSort,
    setPillDateTruncation,
    setMarkType,
    setOpacity,
    clearAllShelves,
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
          parameters={parameters}
          calculatedFields={calculatedFields}
          onAddPill={(shelf, pill) => addPillToShelf(shelf, pill)}
          onOpenCalculatedFieldModal={openCalculatedFieldModal}
          onDeleteCalculatedField={deleteCalculatedField}
          onOpenParameterModal={openParameterModal}
          onSetParameterValue={setParameterValue}
          onToggleParameterControl={toggleParameterControl}
          onDuplicateParameter={duplicateParameter}
          onDeleteParameter={deleteParameter}
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
                  onSwitchTab={switchTab}
                  onSetDashboardSheets={setDashboardSheets}
                />
              ) : (
                /* Active Worksheet: Shelves + Marks + Canvas */
                <>
              {/* Shelves Zone: Columns, Rows & Filters */}
              <div className="border-b border-stone-200/90 bg-white/70 backdrop-blur-xs dark:border-stone-800 dark:bg-stone-900/70">
                <ShelfDropZone
                  shelfId="columns"
                  label="Columns"
                  icon={<Columns className="h-3.5 w-3.5 text-stone-500" />}
                  pills={columns}
                  onAddPill={addPillToShelf}
                  onRemovePill={removePillFromShelf}
                  onSetAggregation={setPillAggregation}
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
                  onSetSort={setPillSort}
                  onSetDateTrunc={setPillDateTruncation}
                  placeholder="Arrastra dimensiones o métricas para el Eje Y..."
                />
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
                  {/* Engine Loading Indicator */}
                  {(!isEngineReady || isExecuting) && (
                    <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-3 py-1 text-xs font-mono text-stone-600 shadow-sm dark:border-stone-700 dark:bg-stone-800/90 dark:text-stone-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600 dark:text-sky-400" />
                      <span>Procesando consulta OLAP...</span>
                    </div>
                  )}

                  {/* Error Notice */}
                  {engineError && (
                    <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                      {engineError}
                    </div>
                  )}

                  {/* Observable Plot Graphic Container */}
                  <div className="flex-1 w-full h-full min-h-[400px]">
                    <PlotRenderer ast={ast} result={queryResult} theme={theme} />
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
          onSave={(updated) => upsertFilter(updated)}
          onClose={() => setActiveFilterModal(null)}
          onRemove={() => {
            removeFilter(activeFilterModal.id);
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
    </div>
  );
};
