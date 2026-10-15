import { useState, useRef, useEffect, useCallback } from 'react';
import { ShipDatabaseEntry } from '../types/shipDatabase';

interface CompartmentData {
  id: string;
  gridX: number;
  gridY: number;
  position: string;
  deck: string;
  side: string;
  type: string;
  name: string;
  maxHP: number;
  currentHP: number;
  status: string;
  watertight: boolean;
  armor: number;
}

interface ShipDetailCardProps {
  ship: ShipDatabaseEntry;
  onClose: () => void;
  onSave: (updatedShip: ShipDatabaseEntry) => void;
}

interface GridPosition { x: number; y: number; }
interface CompartmentGridPosition { gridX: number; gridY: number; }

export default function ShipDetailCard({ ship, onClose, onSave }: ShipDetailCardProps) {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(ship.compartmentData?.backgroundImage || null);
  const [compartments, setCompartments] = useState<CompartmentData[]>(
    (ship.compartmentData?.compartments || []).map(c => ({ ...c, type: c.type || 'other' }))
  );
  const [compartmentPositions, setCompartmentPositions] = useState<Map<string, CompartmentGridPosition>>(new Map());
  const [selectedCompartment, setSelectedCompartment] = useState<string | null>(null);
  const [selectedCompartments, setSelectedCompartments] = useState<Set<string>>(new Set());
  const [draggingCompartment, setDraggingCompartment] = useState<string | null>(null);
  const [draggingMultiple, setDraggingMultiple] = useState(false);
  const [dragOffset, setDragOffset] = useState<GridPosition>({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState<GridPosition>({ x: 0, y: 0 });
  const [backgroundPosition, setBackgroundPosition] = useState<GridPosition>(
    ship.compartmentData?.backgroundPosition || { x: 0, y: 0 }
  );
  const [isBackgroundLocked, setIsBackgroundLocked] = useState<boolean>(
    ship.compartmentData?.backgroundLocked || false
  );
  const [draggingBackground, setDraggingBackground] = useState(false);
  const [backgroundDragOffset, setBackgroundDragOffset] = useState<GridPosition>({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<GridPosition | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<GridPosition | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showCompartments, setShowCompartments] = useState(true);
  const [compartmentOpacity, setCompartmentOpacity] = useState(0.6);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cols = 56;
  const rows = 13;
  const gridSize = 12;
  const padding = 20;
  const width = cols * gridSize + padding * 2;
  const height = rows * gridSize + padding * 2;

  useEffect(() => {
    const newPositions = new Map<string, CompartmentGridPosition>();
    compartments.forEach(comp => {
      newPositions.set(comp.id, { gridX: comp.gridX, gridY: comp.gridY });
    });
    setCompartmentPositions(newPositions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
        setHasUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (isBackgroundLocked) return;
    if (e.shiftKey) {
      e.preventDefault();
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const mouseX = e.clientX - svgRect.left - padding;
      const mouseY = e.clientY - svgRect.top - padding;
      setIsSelecting(true);
      setSelectionStart({ x: mouseX, y: mouseY });
      setSelectionEnd({ x: mouseX, y: mouseY });
      return;
    }
    if (!backgroundImage) return;
    e.preventDefault();
    e.stopPropagation();
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;
    setDraggingBackground(true);
    setBackgroundDragOffset({ x: mouseX - backgroundPosition.x, y: mouseY - backgroundPosition.y });
    setHasUnsavedChanges(true);
  };

  const handleMouseDown = (e: React.MouseEvent, compId: string, forceMultiple: boolean = false) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = compartmentPositions.get(compId);
    if (!pos) return;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const mouseX = e.clientX - svgRect.left - padding;
    const mouseY = e.clientY - svgRect.top - padding;
    const shouldDragMultiple = forceMultiple || (selectedCompartments.has(compId) && selectedCompartments.size > 1);
    if (shouldDragMultiple) {
      setDraggingMultiple(true);
      setDraggingCompartment(compId);
      setDragOffset({ x: mouseX - pos.gridX * gridSize, y: mouseY - pos.gridY * gridSize });
      setDragPosition({ x: pos.gridX, y: pos.gridY });
    } else {
      setDraggingMultiple(false);
      setDraggingCompartment(compId);
      setDragOffset({ x: mouseX - pos.gridX * gridSize, y: mouseY - pos.gridY * gridSize });
      setDragPosition({ x: pos.gridX, y: pos.gridY });
      setSelectedCompartment(compId);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;
    if (isSelecting) {
      setSelectionEnd({ x: mouseX - padding, y: mouseY - padding });
    } else if (draggingBackground) {
      setBackgroundPosition({ x: mouseX - backgroundDragOffset.x, y: mouseY - backgroundDragOffset.y });
    } else if (draggingCompartment) {
      const relX = mouseX - padding;
      const relY = mouseY - padding;
      const newGridX = Math.max(0, Math.min(Math.round((relX - dragOffset.x) / gridSize), cols - 1));
      const newGridY = Math.max(0, Math.min(Math.round((relY - dragOffset.y) / gridSize), rows - 1));
      setDragPosition({ x: newGridX, y: newGridY });
    }
  }, [isSelecting, draggingBackground, draggingCompartment, backgroundDragOffset, dragOffset, gridSize, cols, rows, padding]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionStart && selectionEnd) {
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);
      const selected = new Set<string>();
      compartmentPositions.forEach((pos, id) => {
        const compX = pos.gridX * gridSize;
        const compY = pos.gridY * gridSize;
        if (compX >= minX && compX <= maxX && compY >= minY && compY <= maxY) selected.add(id);
      });
      setSelectedCompartments(selected);
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    } else if (draggingBackground) {
      setDraggingBackground(false);
    } else if (draggingCompartment) {
      const deltaX = dragPosition.x - (compartmentPositions.get(draggingCompartment)?.gridX || 0);
      const deltaY = dragPosition.y - (compartmentPositions.get(draggingCompartment)?.gridY || 0);
      const tempPositions = new Map(compartmentPositions);
      let hasCollision = false;
      if (draggingMultiple && selectedCompartments.size > 1) {
        const newTargetPositions: Map<string, CompartmentGridPosition> = new Map();
        selectedCompartments.forEach(id => {
          const pos = tempPositions.get(id);
          if (pos) {
            const newX = Math.max(0, Math.min(pos.gridX + deltaX, cols - 1));
            const newY = Math.max(0, Math.min(pos.gridY + deltaY, rows - 1));
            newTargetPositions.set(id, { gridX: newX, gridY: newY });
          }
        });
        newTargetPositions.forEach((newPos, id) => {
          tempPositions.forEach((existingPos, existingId) => {
            if (!selectedCompartments.has(existingId) && existingPos.gridX === newPos.gridX && existingPos.gridY === newPos.gridY) hasCollision = true;
          });
          newTargetPositions.forEach((otherPos, otherId) => {
            if (otherId !== id && otherPos.gridX === newPos.gridX && otherPos.gridY === newPos.gridY) hasCollision = true;
          });
        });
        if (!hasCollision) newTargetPositions.forEach((newPos, id) => { tempPositions.set(id, newPos); });
      } else {
        const targetPos = { gridX: dragPosition.x, gridY: dragPosition.y };
        tempPositions.forEach((existingPos, existingId) => {
          if (existingId !== draggingCompartment && existingPos.gridX === targetPos.gridX && existingPos.gridY === targetPos.gridY) hasCollision = true;
        });
        if (!hasCollision) tempPositions.set(draggingCompartment, targetPos);
      }
      if (!hasCollision) {
        setCompartmentPositions(tempPositions);
        const updatedCompartments = compartments.map(c => {
          const newPos = tempPositions.get(c.id);
          if (newPos) return { ...c, gridX: newPos.gridX, gridY: newPos.gridY };
          return c;
        });
        setCompartments(updatedCompartments);
        setHasUnsavedChanges(true);
      }
    }
    setDraggingCompartment(null);
    setDraggingMultiple(false);
    setDraggingBackground(false);
  }, [isSelecting, selectionStart, selectionEnd, draggingCompartment, draggingMultiple, dragPosition, compartmentPositions, compartments, selectedCompartments, gridSize, cols, rows]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  const addCompartment = () => {
    let targetPosition: CompartmentGridPosition | null = null;
    for (let y = 0; y < rows && !targetPosition; y++) {
      for (let x = 0; x < cols && !targetPosition; x++) {
        const isOccupied = Array.from(compartmentPositions.values()).some(pos => pos.gridX === x && pos.gridY === y);
        if (!isOccupied) targetPosition = { gridX: x, gridY: y };
      }
    }
    if (!targetPosition) { alert('Нет свободных ячеек!'); return; }
    const newCompartment: CompartmentData = {
      id: `comp_${Date.now()}_${Math.random()}`, gridX: targetPosition.gridX, gridY: targetPosition.gridY,
      position: 'mid', deck: 'lower', side: 'center', type: 'other', name: `Отсек ${compartments.length + 1}`,
      maxHP: 20, currentHP: 20, status: 'intact', watertight: true, armor: 50
    };
    const newPositions = new Map(compartmentPositions);
    newPositions.set(newCompartment.id, targetPosition);
    setCompartmentPositions(newPositions);
    setCompartments([...compartments, newCompartment]);
    setSelectedCompartment(newCompartment.id);
    setHasUnsavedChanges(true);
  };

  const deleteCompartment = (id: string) => {
    setCompartments(compartments.filter(c => c.id !== id));
    if (selectedCompartment === id) setSelectedCompartment(null);
    setHasUnsavedChanges(true);
  };

  const updateCompartment = (id: string, updates: Partial<CompartmentData>) => {
    setCompartments(compartments.map(c => c.id === id ? { ...c, ...updates } : c));
    setHasUnsavedChanges(true);
  };

  const getCompartmentColor = (type: string, status: string) => {
    if (status === 'destroyed') return '#374151';
    if (status === 'damaged') return '#d1d5db';
    switch (type) {
      case 'weaponry': return '#7f1d1d';
      case 'ammunition': return '#78350f';
      case 'propulsion': case 'rudder': case 'propellers': return '#1e3a8a';
      case 'bridge': case 'control_system': return '#eab308';
      case 'other': default: return '#14532d';
    }
  };

  const handleSave = () => {
    const updatedShip: ShipDatabaseEntry = {
      ...ship,
      compartmentData: {
        backgroundImage: backgroundImage || undefined,
        backgroundPosition: backgroundPosition,
        backgroundLocked: isBackgroundLocked,
        compartments: compartments.map(c => ({
          ...c,
          gridX: compartmentPositions.get(c.id)?.gridX || c.gridX,
          gridY: compartmentPositions.get(c.id)?.gridY || c.gridY
        }))
      },
      updatedAt: Date.now()
    };
    onSave(updatedShip);
    setHasUnsavedChanges(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-cyan-300">{ship.name}</h2>
          <p className="text-sm text-slate-400">{ship.class} • {ship.country} • {ship.year}</p>
        </div>
        <div className="flex gap-3">
          {hasUnsavedChanges && <span className="text-yellow-400 text-sm self-center">⚠️ Есть несохранённые изменения</span>}
          <button onClick={handleSave} disabled={!hasUnsavedChanges} className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold text-white">💾 Сохранить</button>
          <button onClick={onClose} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg font-semibold text-white">✕ Закрыть</button>
        </div>
      </div>

      <div className="bg-slate-900 border-b border-slate-700 p-3 flex gap-3 flex-wrap items-center">
        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white">📁 Загрузить изображение</button>
        {backgroundImage && (
          <>
            <button onClick={() => { setBackgroundImage(null); setHasUnsavedChanges(true); }} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white">✕ Удалить</button>
            <button onClick={() => setBackgroundPosition({ x: 0, y: 0 })} className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs text-white">🎯 Сброс</button>
            <button onClick={() => { setIsBackgroundLocked(!isBackgroundLocked); setHasUnsavedChanges(true); }} className={`px-3 py-1 rounded text-xs text-white ${isBackgroundLocked ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
              {isBackgroundLocked ? '🔒 Закреплено' : '🔓 Закрепить'}
            </button>
          </>
        )}
        <button onClick={addCompartment} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold text-white">➕ Создать отсек</button>
        <label className="flex items-center gap-2 text-xs text-white"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />Сетка</label>
        <label className="flex items-center gap-2 text-xs text-white"><input type="checkbox" checked={showCompartments} onChange={(e) => setShowCompartments(e.target.checked)} />Отсеки</label>
        <label className="flex items-center gap-2 text-xs text-white">Прозр.: <input type="range" min="0" max="1" step="0.1" value={compartmentOpacity} onChange={(e) => setCompartmentOpacity(parseFloat(e.target.value))} className="w-20" />{Math.round(compartmentOpacity * 100)}%</label>
        <div className="px-2 py-1 bg-cyan-900/50 border border-cyan-600 rounded text-xs font-bold text-cyan-300">📊 Отсеков: {compartments.length}</div>
        {selectedCompartments.size > 0 && (
          <>
            <div className="px-2 py-1 bg-yellow-900/50 border border-yellow-600 rounded text-xs font-bold text-yellow-300">✓ Выделено: {selectedCompartments.size}</div>
            <button onClick={() => { setSelectedCompartments(new Set()); setSelectedCompartment(null); }} className="px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded text-xs text-white">✕ Снять</button>
          </>
        )}
        <div className="text-xs text-slate-400 ml-auto">💡 Shift+ЛКМ для выделения | Shift+рамка для группового</div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
          <div className="border border-slate-600 rounded bg-slate-900/50">
            <svg ref={svgRef} width={width} height={height + 20} className="cursor-default" onMouseDown={handleBackgroundMouseDown}>
              {backgroundImage && (<image href={backgroundImage} x={backgroundPosition.x} y={backgroundPosition.y} opacity={0.6} className={isBackgroundLocked ? "pointer-events-none" : "cursor-move"} />)}
              {showGrid && (
                <g opacity={0.3}>
                  {Array.from({ length: cols + 1 }).map((_, i) => (<line key={`v-${i}`} x1={padding + i * gridSize} y1={padding} x2={padding + i * gridSize} y2={height - padding} stroke="#64748b" strokeWidth="0.5" />))}
                  {Array.from({ length: rows + 1 }).map((_, i) => (<line key={`h-${i}`} x1={padding} y1={padding + i * gridSize} x2={width - padding} y2={padding + i * gridSize} stroke="#64748b" strokeWidth="0.5" />))}
                </g>
              )}
              <g>
                <line x1={padding} y1={height - padding + 2} x2={width - padding} y2={height - padding + 2} stroke="#94a3b8" strokeWidth="1" />
                {Array.from({ length: Math.floor(cols / 4) + 1 }).map((_, i) => {
                  const x = padding + i * 4 * gridSize;
                  const meters = i * 20;
                  return (<g key={`ruler-${i}`}><line x1={x} y1={height - padding + 2} x2={x} y2={height - padding + 8} stroke="#94a3b8" strokeWidth="1" /><text x={x} y={height - padding + 14} fill="#94a3b8" fontSize="7" textAnchor="middle">{meters}м</text></g>);
                })}
                {Array.from({ length: cols + 1 }).map((_, i) => {
                  if (i % 4 === 0) return null;
                  const x = padding + i * gridSize;
                  return (<line key={`tick-${i}`} x1={x} y1={height - padding + 2} x2={x} y2={height - padding + 6} stroke="#64748b" strokeWidth="0.5" />);
                })}
                <text x={width / 2} y={height - padding + 18} fill="#64748b" fontSize="8" textAnchor="middle">1 клетка = 5м | Всего: 280м</text>
              </g>
              {showCompartments && compartments.map((comp) => {
                const pos = compartmentPositions.get(comp.id);
                if (!pos) return null;
                const isSelected = selectedCompartment === comp.id || selectedCompartments.has(comp.id);
                const isDragging = draggingCompartment === comp.id || (draggingMultiple && selectedCompartments.has(comp.id));
                const color = getCompartmentColor(comp.type, comp.status);
                let displayX = pos.gridX;
                let displayY = pos.gridY;
                if (isDragging && draggingCompartment) {
                  if (draggingMultiple && selectedCompartments.size > 1) {
                    const originalPos = compartmentPositions.get(draggingCompartment);
                    if (originalPos) {
                      displayX = Math.max(0, Math.min(pos.gridX + dragPosition.x - originalPos.gridX, cols - 1));
                      displayY = Math.max(0, Math.min(pos.gridY + dragPosition.y - originalPos.gridY, rows - 1));
                    }
                  } else {
                    displayX = dragPosition.x;
                    displayY = dragPosition.y;
                  }
                }
                const cellX = padding + displayX * gridSize;
                const cellY = padding + displayY * gridSize;
                return (
                  <g key={comp.id} onMouseDown={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      const newSelected = new Set(selectedCompartments);
                      if (newSelected.has(comp.id)) { newSelected.delete(comp.id); } else { newSelected.add(comp.id); }
                      setSelectedCompartments(newSelected);
                      if (newSelected.size > 1) { handleMouseDown(e, comp.id, true); } else if (newSelected.size === 1) { handleMouseDown(e, comp.id, false); }
                    } else {
                      if (selectedCompartments.has(comp.id) && selectedCompartments.size > 1) { handleMouseDown(e, comp.id, true); }
                      else { setSelectedCompartments(new Set([comp.id])); handleMouseDown(e, comp.id, false); }
                    }
                  }} className="cursor-move">
                    <rect x={cellX} y={cellY} width={gridSize} height={gridSize}
                      fill={color} opacity={compartmentOpacity} stroke={isSelected ? '#fbbf24' : isDragging ? '#06b6d4' : '#475569'}
                      strokeWidth={isSelected || isDragging ? 2 : 1} />
                    {comp.status === 'flooded' && (
                      <g>
                        <circle cx={cellX + gridSize / 2} cy={cellY + gridSize / 2} r={gridSize * 0.4} fill="#1e40af" opacity="0.8" />
                        <text x={cellX + gridSize / 2} y={cellY + gridSize / 2 + 1} fill="#ffffff" fontSize={gridSize * 0.6} textAnchor="middle" dominantBaseline="middle" style={{pointerEvents: 'none'}}>💧</text>
                      </g>
                    )}
                    {comp.status === 'on_fire' && (
                      <g>
                        <circle cx={cellX + gridSize / 2} cy={cellY + gridSize / 2} r={gridSize * 0.4} fill="#991b1b" opacity="0.8" />
                        <text x={cellX + gridSize / 2} y={cellY + gridSize / 2 + 1} fill="#ffffff" fontSize={gridSize * 0.6} textAnchor="middle" dominantBaseline="middle" style={{pointerEvents: 'none'}}>🔥</text>
                      </g>
                    )}
                  </g>
                );
              })}
              {isSelecting && selectionStart && selectionEnd && (
                <rect x={padding + Math.min(selectionStart.x, selectionEnd.x)} y={padding + Math.min(selectionStart.y, selectionEnd.y)}
                  width={Math.abs(selectionEnd.x - selectionStart.x)} height={Math.abs(selectionEnd.y - selectionStart.y)}
                  fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" pointerEvents="none" />
              )}
            </svg>
          </div>
          
          <div className="mt-3 p-3 bg-slate-900/50 rounded border border-slate-700">
            <div className="text-xs font-bold text-slate-300 mb-2">🎨 Расшифровка цветов отсеков:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-slate-600" style={{backgroundColor: '#7f1d1d'}}></div><span className="text-slate-300">Вооружение</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-slate-600" style={{backgroundColor: '#78350f'}}></div><span className="text-slate-300">Боезапас</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-slate-600" style={{backgroundColor: '#1e3a8a'}}></div><span className="text-slate-300">ГЭУ / Руль / Винты</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-slate-600" style={{backgroundColor: '#eab308'}}></div><span className="text-slate-300">Мостик / Управление</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-slate-600" style={{backgroundColor: '#14532d'}}></div><span className="text-slate-300">Остальные отсеки</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-slate-600" style={{backgroundColor: '#374151'}}></div><span className="text-slate-300">Уничтожен</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border border-slate-600" style={{backgroundColor: '#d1d5db'}}></div><span className="text-slate-300">Повреждён</span></div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
              <div className="flex items-center gap-2"><span>💧</span><span>Затопление</span></div>
              <div className="flex items-center gap-2 mt-1"><span>🔥</span><span>Пожар</span></div>
            </div>
          </div>
        </div>

        {selectedCompartments.size > 0 && (
          <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
            <div className="text-sm font-bold text-slate-300 mb-3">{selectedCompartments.size === 1 ? 'Свойства отсека:' : `Выбрано: ${selectedCompartments.size}`}</div>
            {selectedCompartments.size === 1 ? (() => {
              const compId = Array.from(selectedCompartments)[0];
              const comp = compartments.find(c => c.id === compId);
              if (!comp) return null;
              return (
                <div className="space-y-3">
                  <div><label className="text-xs text-slate-400">Название:</label><input type="text" value={comp.name} onChange={(e) => updateCompartment(comp.id, { name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-slate-400">Тип отсека:</label><select value={comp.type} onChange={(e) => updateCompartment(comp.id, { type: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"><option value="bridge">Мостик</option><option value="control_system">Система управления</option><option value="weaponry">Вооружение</option><option value="propulsion">ГЭУ</option><option value="rudder">Руль</option><option value="propellers">Винты</option><option value="ammunition">Боезапас</option><option value="other">Остальные</option></select></div>
                    <div><label className="text-xs text-slate-400">Палуба:</label><select value={comp.deck} onChange={(e) => updateCompartment(comp.id, { deck: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"><option value="lower">Нижняя</option><option value="middle">Средняя</option><option value="upper">Верхняя</option><option value="deck">Палуба</option></select></div>
                    <div><label className="text-xs text-slate-400">Позиция:</label><select value={comp.position} onChange={(e) => updateCompartment(comp.id, { position: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"><option value="bow">Нос</option><option value="forward">Носовая</option><option value="mid">Центр</option><option value="aft">Кормовая</option><option value="stern">Корма</option></select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-slate-400">Статус:</label><select value={comp.status} onChange={(e) => updateCompartment(comp.id, { status: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"><option value="intact">Целый</option><option value="damaged">Повреждён</option><option value="flooded">Затоплен</option><option value="on_fire">Пожар</option><option value="destroyed">Разрушен</option></select></div>
                    <div><label className="text-xs text-slate-400">Броня:</label><input type="number" value={comp.armor} onChange={(e) => updateCompartment(comp.id, { armor: parseInt(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
                  </div>
                  <button onClick={() => deleteCompartment(comp.id)} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded">🗑️ Удалить</button>
                </div>
              );
            })() : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setCompartments(compartments.map(c => selectedCompartments.has(c.id) ? { ...c, status: 'intact' } : c)); setHasUnsavedChanges(true); }} className="bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded">✓ Целый</button>
                  <button onClick={() => { setCompartments(compartments.map(c => selectedCompartments.has(c.id) ? { ...c, status: 'damaged' } : c)); setHasUnsavedChanges(true); }} className="bg-orange-600 hover:bg-orange-700 text-white text-xs py-2 rounded">⚠ Повреждён</button>
                  <button onClick={() => { setCompartments(compartments.map(c => selectedCompartments.has(c.id) ? { ...c, status: 'flooded' } : c)); setHasUnsavedChanges(true); }} className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded">💧 Затоплен</button>
                  <button onClick={() => { setCompartments(compartments.map(c => selectedCompartments.has(c.id) ? { ...c, status: 'destroyed' } : c)); setHasUnsavedChanges(true); }} className="bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded">✕ Разрушен</button>
                </div>
                <button onClick={() => { setCompartments(compartments.filter(c => !selectedCompartments.has(c.id))); setSelectedCompartments(new Set()); setHasUnsavedChanges(true); }} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded">🗑️ Удалить все ({selectedCompartments.size})</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
