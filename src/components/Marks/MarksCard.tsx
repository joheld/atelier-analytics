import React, { useState } from 'react';
import { MarkType, Pill, ShelfId, DataType, FieldRole } from '../../core/ast/types';
import { PillBadge } from '../Shelves/PillBadge';
import {
  Palette,
  Maximize2,
  Layers,
  HelpCircle,
  Sliders,
  X,
} from 'lucide-react';

interface MarksCardProps {
  markType: MarkType;
  color?: Pill;
  size?: Pill;
  detail: Pill[];
  tooltip: Pill[];
  opacity: number;
  onSetMarkType: (type: MarkType) => void;
  onSetOpacity: (opacity: number) => void;
  onAddPillToChannel: (shelf: ShelfId, pill: Pill) => void;
  onRemovePillFromChannel: (shelf: ShelfId, pillId: string) => void;
  onChangeColumnType?: (columnName: string, newType: DataType) => Promise<void>;
  onChangeColumnRole?: (columnName: string, newRole: FieldRole) => Promise<void>;
}

export const MarksCard: React.FC<MarksCardProps> = ({
  markType,
  color,
  size,
  detail,
  tooltip,
  opacity,
  onSetMarkType,
  onSetOpacity,
  onAddPillToChannel,
  onRemovePillFromChannel,
  onChangeColumnType,
  onChangeColumnRole,
}) => {
  const [activeDropChannel, setActiveDropChannel] = useState<ShelfId | null>(null);

  const handleDragOver = (e: React.DragEvent, channel: ShelfId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setActiveDropChannel(channel);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveDropChannel(null);
  };

  const handleDrop = (e: React.DragEvent, channel: ShelfId) => {
    e.preventDefault();
    setActiveDropChannel(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const droppedPill = JSON.parse(dataStr) as Pill;
        onAddPillToChannel(channel, droppedPill);
      }
    } catch (err) {
      console.error('Error soltando pastilla en marca:', err);
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-stone-200/90 bg-white p-3 shadow-subtle dark:border-stone-800 dark:bg-stone-900">
      {/* Marks Card Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 font-mono">
          Marcas (Marks)
        </span>
        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
          Geometría
        </span>
      </div>

      {/* Mark Type Selector */}
      <div className="mt-2.5">
        <label className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Tipo de Marca</label>
        <select
          value={markType}
          onChange={(e) => onSetMarkType(e.target.value as MarkType)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs font-medium text-stone-800 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
        >
          <option value="auto">Automático (Show Me)</option>
          <option value="bar">Barras (Bar)</option>
          <option value="line">Líneas Continuas (Line)</option>
          <option value="area">Área Continua (Area)</option>
          <option value="dot">Puntos / Dispersión (Dot)</option>
          <option value="box">Diagrama de Caja (Boxplot)</option>
          <option value="histogram">Histograma Continuo (Histogram)</option>
          <option value="rect">Mapa de Calor / Matriz (Cell)</option>
          <option value="density">Densidad 2D / Contornos (Density)</option>
          <option value="hexbin">Agrupamiento Hexagonal (Hexbin)</option>
          <option value="spike">Gráfico de Picos (Spike)</option>
          <option value="difference">Gráfico de Diferencia (Difference)</option>
          <option value="tick">Líneas de Marca (Tick)</option>
          <option value="waffle">Gráfico Waffle (Waffle)</option>
          <option value="geo">Mapa Cartográfico (Geo / Map)</option>
          <option value="text">Texto / Métrica (Text)</option>
        </select>
      </div>

      {/* Visual Channels - Dedicated Full-Width Rows */}
      <div className="mt-3 space-y-2">
        {/* COLOR CHANNEL */}
        <div
          onDragOver={(e) => handleDragOver(e, 'color')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'color')}
          className={`flex flex-col rounded-md border p-2 transition-all ${
            activeDropChannel === 'color'
              ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20'
              : 'border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/50 dark:border-stone-800 dark:bg-stone-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-stone-500" />
              Color
            </span>
            {color && (
              <button
                type="button"
                onClick={() => onRemovePillFromChannel('color', color.id)}
                className="text-[10px] font-mono flex items-center gap-0.5 text-stone-400 hover:text-rose-600 cursor-pointer transition-colors"
                title="Quitar marca de Color"
              >
                <X className="h-2.5 w-2.5" />
                <span>Quitar</span>
              </button>
            )}
          </div>
          <div className="mt-1.5 min-h-[26px] flex items-center">
            {color ? (
              <PillBadge
                pill={color}
                shelf="color"
                compact={true}
                onRemove={() => onRemovePillFromChannel('color', color.id)}
                onChangeDataType={onChangeColumnType ? (t) => void onChangeColumnType(color.columnName, t) : undefined}
                onChangeRole={onChangeColumnRole ? (r) => void onChangeColumnRole(color.columnName, r) : undefined}
              />
            ) : (
              <span className="text-[10px] italic text-stone-400 select-none">Soltar dimensión o métrica</span>
            )}
          </div>
        </div>

        {/* SIZE CHANNEL */}
        <div
          onDragOver={(e) => handleDragOver(e, 'size')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'size')}
          className={`flex flex-col rounded-md border p-2 transition-all ${
            activeDropChannel === 'size'
              ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20'
              : 'border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/50 dark:border-stone-800 dark:bg-stone-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <Maximize2 className="h-3.5 w-3.5 text-stone-500" />
              Tamaño (Size)
            </span>
            {size && (
              <button
                type="button"
                onClick={() => onRemovePillFromChannel('size', size.id)}
                className="text-[10px] font-mono flex items-center gap-0.5 text-stone-400 hover:text-rose-600 cursor-pointer transition-colors"
                title="Quitar marca de Tamaño"
              >
                <X className="h-2.5 w-2.5" />
                <span>Quitar</span>
              </button>
            )}
          </div>
          <div className="mt-1.5 min-h-[26px] flex items-center">
            {size ? (
              <PillBadge
                pill={size}
                shelf="size"
                compact={true}
                onRemove={() => onRemovePillFromChannel('size', size.id)}
                onChangeDataType={onChangeColumnType ? (t) => void onChangeColumnType(size.columnName, t) : undefined}
                onChangeRole={onChangeColumnRole ? (r) => void onChangeColumnRole(size.columnName, r) : undefined}
              />
            ) : (
              <span className="text-[10px] italic text-stone-400 select-none">Soltar métrica continua</span>
            )}
          </div>
        </div>

        {/* DETAIL CHANNEL (CRITICAL REQUIREMENT) */}
        <div
          onDragOver={(e) => handleDragOver(e, 'detail')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'detail')}
          className={`flex flex-col rounded-md border p-2 transition-all ${
            activeDropChannel === 'detail'
              ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20'
              : 'border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/50 dark:border-stone-800 dark:bg-stone-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-stone-500" />
              Detalle (Detail)
            </span>
            <span
              className="cursor-help text-stone-400 hover:text-stone-600"
              title="Altera la granularidad del GROUP BY de la consulta sin añadir ejes visuales en X o Y"
            >
              <HelpCircle className="h-3 w-3" />
            </span>
          </div>
          <div className="mt-1.5 flex flex-col gap-1 min-h-[26px]">
            {detail.length === 0 ? (
              <span className="text-[10px] italic text-stone-400 select-none">
                Añade dimensiones para subdividir marcas
              </span>
            ) : (
              detail.map((p) => (
                <PillBadge
                  key={p.id}
                  pill={p}
                  shelf="detail"
                  compact={true}
                  onRemove={() => onRemovePillFromChannel('detail', p.id)}
                  onChangeDataType={onChangeColumnType ? (t) => void onChangeColumnType(p.columnName, t) : undefined}
                  onChangeRole={onChangeColumnRole ? (r) => void onChangeColumnRole(p.columnName, r) : undefined}
                />
              ))
            )}
          </div>
        </div>

        {/* TOOLTIP CHANNEL */}
        <div
          onDragOver={(e) => handleDragOver(e, 'tooltip')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'tooltip')}
          className={`flex flex-col rounded-md border p-2 transition-all ${
            activeDropChannel === 'tooltip'
              ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20'
              : 'border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/50 dark:border-stone-800 dark:bg-stone-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-stone-500" />
              Tooltip
            </span>
          </div>
          <div className="mt-1.5 flex flex-col gap-1 min-h-[26px]">
            {tooltip.length === 0 ? (
              <span className="text-[10px] italic text-stone-400 select-none">Campos adicionales al hover</span>
            ) : (
              tooltip.map((p) => (
                <PillBadge
                  key={p.id}
                  pill={p}
                  shelf="tooltip"
                  compact={true}
                  onRemove={() => onRemovePillFromChannel('tooltip', p.id)}
                  onChangeDataType={onChangeColumnType ? (t) => void onChangeColumnType(p.columnName, t) : undefined}
                  onChangeRole={onChangeColumnRole ? (r) => void onChangeColumnRole(p.columnName, r) : undefined}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Opacity Slider */}
      <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <span>Opacidad</span>
          <span className="font-mono text-[10px]">{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={opacity}
          onChange={(e) => onSetOpacity(parseFloat(e.target.value))}
          className="mt-1 w-full accent-stone-700 dark:accent-stone-300 h-1.5 bg-stone-200 rounded-lg cursor-pointer dark:bg-stone-700"
        />
      </div>
    </div>
  );
};
