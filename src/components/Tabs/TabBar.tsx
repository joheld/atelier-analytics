import React, { useState } from 'react';
import { WorksheetTab, SheetType } from '../../core/ast/types';
import {
  BarChart2,
  LayoutGrid,
  Plus,
  Copy,
  X,
  Edit2,
  Check,
  Database,
} from 'lucide-react';

interface TabBarProps {
  sheets: WorksheetTab[];
  activeTabId: string;
  isDataSourceActive?: boolean;
  onSelectDataSource?: () => void;
  onSwitchTab: (tabId: string) => void;
  onAddSheet: (type?: SheetType) => void;
  onRenameTab: (tabId: string, newName: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onDeleteTab: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  sheets,
  activeTabId,
  isDataSourceActive = false,
  onSelectDataSource,
  onSwitchTab,
  onAddSheet,
  onRenameTab,
  onDuplicateTab,
  onDeleteTab,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const startRename = (tab: WorksheetTab) => {
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const commitRename = (tabId: string) => {
    if (editingName.trim()) {
      onRenameTab(tabId, editingName.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      commitRename(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <footer className="flex h-10 w-full items-center justify-between border-t border-stone-200/90 bg-stone-100/90 px-3 select-none dark:border-stone-800 dark:bg-stone-900/90">
      {/* Scrollable Tabs Container */}
      <div className="flex h-full items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {/* Tableau Data Source Tab */}
        <button
          type="button"
          onClick={() => onSelectDataSource?.()}
          className={`flex h-full items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer shrink-0 mr-1.5 ${
            isDataSourceActive
              ? 'bg-white border-stone-300 text-sky-700 shadow-xs dark:bg-stone-800 dark:border-stone-700 dark:text-sky-300 font-bold'
              : 'border-transparent text-stone-600 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-800/60'
          }`}
          title="Fuente de datos: Intérprete de datos, filtros de fuente y preparación"
        >
          <Database
            className={`h-3.5 w-3.5 ${
              isDataSourceActive ? 'text-sky-600 dark:text-sky-400' : 'text-stone-500 dark:text-stone-400'
            }`}
          />
          <span>Fuente de datos</span>
        </button>

        {sheets.map((tab) => {
          const isActive = !isDataSourceActive && tab.id === activeTabId;
          const isDashboard = tab.type === 'dashboard';

          return (
            <div
              key={tab.id}
              onClick={() => onSwitchTab(tab.id)}
              className={`group relative flex h-8 items-center gap-2 rounded-t-md px-3 text-xs font-medium transition-all duration-150 cursor-pointer border-t border-x ${
                isActive
                  ? 'bg-white text-stone-900 border-stone-200/90 shadow-2xs font-semibold dark:bg-stone-950 dark:text-stone-100 dark:border-stone-700'
                  : 'bg-stone-200/50 text-stone-600 border-transparent hover:bg-stone-200/90 hover:text-stone-900 dark:bg-stone-800/40 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200'
              }`}
            >
              {/* Tab Type Icon */}
              {isDashboard ? (
                <LayoutGrid className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500'}`} />
              ) : (
                <BarChart2 className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-stone-500'}`} />
              )}

              {/* Title / Inline Rename */}
              {editingTabId === tab.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitRename(tab.id)}
                    onKeyDown={(e) => handleKeyDown(e, tab.id)}
                    className="h-5 w-24 rounded border border-sky-400 bg-white px-1 text-xs text-stone-900 focus:outline-none dark:bg-stone-900 dark:text-stone-100"
                  />
                  <button
                    type="button"
                    onClick={() => commitRename(tab.id)}
                    className="rounded p-0.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(tab);
                  }}
                  className="truncate max-w-[140px]"
                  title="Doble clic para renombrar"
                >
                  {tab.name}
                </span>
              )}

              {/* Hover Actions: Rename, Duplicate, Delete */}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 ml-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(tab);
                  }}
                  className="rounded p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                  title="Renombrar hoja"
                >
                  <Edit2 className="h-2.5 w-2.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateTab(tab.id);
                  }}
                  className="rounded p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                  title="Duplicar hoja"
                >
                  <Copy className="h-2.5 w-2.5" />
                </button>

                {sheets.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTab(tab.id);
                    }}
                    className="rounded p-0.5 text-stone-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    title="Eliminar hoja"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons to Add New Sheets/Dashboards */}
      <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-stone-200 dark:border-stone-800">
        <button
          type="button"
          onClick={() => onAddSheet('worksheet')}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono font-medium text-stone-600 hover:bg-stone-200/80 hover:text-stone-900 transition-colors dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          title="Crear nueva hoja analítica (Worksheet)"
        >
          <Plus className="h-3 w-3 text-sky-600 dark:text-sky-400" />
          <span>Nueva Hoja</span>
        </button>

        <button
          type="button"
          onClick={() => onAddSheet('dashboard')}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono font-medium text-stone-600 hover:bg-stone-200/80 hover:text-stone-900 transition-colors dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          title="Crear nuevo panel compuesto (Dashboard)"
        >
          <LayoutGrid className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span>Nuevo Dashboard</span>
        </button>
      </div>
    </footer>
  );
};
