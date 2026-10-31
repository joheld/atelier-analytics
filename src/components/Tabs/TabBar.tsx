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
    <footer className="flex h-9 w-full items-center justify-between border-t border-stone-200/90 bg-stone-100/90 px-2.5 select-none dark:border-white/[0.06] dark:bg-stone-950/90 rim-light-subtle">
      {/* Scrollable Tabs Container */}
      <div className="flex h-full items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {/* Tableau Data Source Tab */}
        <button
          type="button"
          onClick={() => onSelectDataSource?.()}
          className={`btn-tactile flex h-7 items-center gap-1.5 px-2.5 rounded-md text-xs font-medium border transition-all cursor-pointer shrink-0 mr-1 ${
            isDataSourceActive
              ? 'bg-white border-stone-300 text-stone-900 shadow-2xs dark:bg-stone-900 dark:border-white/[0.1] dark:text-stone-100 rim-light-subtle'
              : 'border-transparent text-stone-600 hover:bg-stone-200/50 dark:text-stone-400 dark:hover:bg-white/[0.04]'
          }`}
          title="Fuente de datos: Intérprete de datos, filtros de fuente y preparación"
        >
          <Database
            className={`h-3.5 w-3.5 ${
              isDataSourceActive ? 'text-stone-700 dark:text-stone-200' : 'text-stone-400'
            }`}
          />
          <span className="font-mono text-[11px]">Fuente de datos</span>
        </button>

        {sheets.map((tab) => {
          const isActive = !isDataSourceActive && tab.id === activeTabId;
          const isDashboard = tab.type === 'dashboard';

          return (
            <div
              key={tab.id}
              onClick={() => onSwitchTab(tab.id)}
              className={`group relative flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-150 cursor-pointer border ${
                isActive
                  ? 'bg-white text-stone-950 border-stone-300/90 shadow-2xs font-semibold dark:bg-stone-900 dark:text-stone-100 dark:border-white/[0.1] rim-light-subtle'
                  : 'bg-transparent text-stone-500 border-transparent hover:bg-stone-200/50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-white/[0.04] dark:hover:text-stone-200'
              }`}
            >
              {/* Tab Type Icon */}
              {isDashboard ? (
                <LayoutGrid className={`h-3 w-3 shrink-0 ${isActive ? 'text-stone-700 dark:text-stone-200' : 'text-stone-400'}`} />
              ) : (
                <BarChart2 className={`h-3 w-3 shrink-0 ${isActive ? 'text-stone-700 dark:text-stone-200' : 'text-stone-400'}`} />
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
                    className="h-5 w-24 rounded border border-stone-300 bg-white px-1 text-xs text-stone-900 focus:outline-none dark:bg-stone-900 dark:text-stone-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => commitRename(tab.id)}
                    className="rounded p-0.5 text-stone-600 hover:bg-stone-200 dark:hover:bg-stone-800"
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
                  className="truncate max-w-[140px] font-mono text-[11px]"
                  title="Doble clic para renombrar"
                >
                  {tab.name}
                </span>
              )}

              {/* Hover Actions: Rename, Duplicate, Delete */}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 ml-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(tab);
                  }}
                  className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
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
                  className="rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
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
                    className="rounded p-0.5 text-stone-400 hover:text-rose-600"
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
      <div className="flex items-center gap-1 shrink-0 pl-2.5 border-l border-stone-200/80 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => onAddSheet('worksheet')}
          className="btn-tactile flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono font-medium text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 transition-colors dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100"
          title="Crear nueva hoja analítica (Worksheet)"
        >
          <Plus className="h-3 w-3 text-stone-400" />
          <span>Hoja</span>
        </button>

        <button
          type="button"
          onClick={() => onAddSheet('dashboard')}
          className="btn-tactile flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono font-medium text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 transition-colors dark:text-stone-300 dark:hover:bg-white/[0.04] dark:hover:text-stone-100"
          title="Crear nuevo panel compuesto (Dashboard)"
        >
          <LayoutGrid className="h-3 w-3 text-stone-400" />
          <span>Dashboard</span>
        </button>
      </div>
    </footer>
  );
};
