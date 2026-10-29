import { useState, useRef, useEffect } from 'react';
import { StrategicMapData } from '../types/shipDatabase';
import { saveToIndexedDB, deleteFromIndexedDB } from '../utils/indexedDB';

interface StrategicMapEditorProps {
  strategicMapData?: StrategicMapData;
  onUpdate: (data: StrategicMapData) => void;
}

// 👈 Интерфейс для иконок
export interface MapIcon {
  id: string;
  name: string;
  imageData: string;
}

export default function StrategicMapEditor({ strategicMapData, onUpdate }: StrategicMapEditorProps) {
  const [mapTiles, setMapTiles] = useState<Array<{ id: number; imageData: string; row: number; col: number }>>(
    strategicMapData?.tiles || []
  );
  const mapWidth = strategicMapData?.mapWidth || 9703;
  const mapHeight = strategicMapData?.mapHeight || 7767;
  const cols = 7;
  const rows = 6;
  const standardTileWidth = 1500;
  const standardTileHeight = 1500;
  const lastColumnWidth = 703;
  const lastRowHeight = 267;
  
  // 👈 Состояние для иконок
  const [mapIcons, setMapIcons] = useState<MapIcon[]>([]);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // 👈 Загрузка иконок при старте
  useEffect(() => {
    const savedIcons = localStorage.getItem('naval_battle_map_icons');
    if (savedIcons) {
      try {
        setMapIcons(JSON.parse(savedIcons));
      } catch (e) {
        console.error('Ошибка загрузки иконок', e);
      }
    }
  }, []);

  const getTileSize = (tileId: number) => {
    const row = Math.floor(tileId / cols);
    const col = tileId % cols;
    const isLastColumn = col === 6;
    const isLastRow = row === 5;
    return { width: isLastColumn ? lastColumnWidth : standardTileWidth, height: isLastRow ? lastRowHeight : standardTileHeight };
  };
  
  const getTilePosition = (tileId: number) => {
    const row = Math.floor(tileId / cols);
    const col = tileId % cols;
    let x = 0;
    for (let c = 0; c < col; c++) { x += (c === 6 ? lastColumnWidth : standardTileWidth); }
    let y = 0;
    for (let r = 0; r < row; r++) { y += (r === 5 ? lastRowHeight : standardTileHeight); }
    return { x, y };
  };
  
  const displayScale = 0.15;
  const tileWidth = mapWidth / cols;
  const tileHeight = mapHeight / rows;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const hexSampleInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverTile, setDragOverTile] = useState<number | null>(null);
  const [hexSample, setHexSample] = useState<string | undefined>(strategicMapData?.hexSample);
  const [hexGridOpacity, setHexGridOpacity] = useState<number>(strategicMapData?.hexGridOpacity ?? 0.3);

  // 👈 Обработчик загрузки новой иконки
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      const newIcon: MapIcon = {
        id: `icon_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""), // Имя файла без расширения
        imageData
      };
      
      const updatedIcons = [...mapIcons, newIcon];
      setMapIcons(updatedIcons);
      localStorage.setItem('naval_battle_map_icons', JSON.stringify(updatedIcons));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 👈 Удаление иконки
  const handleDeleteIcon = (iconId: string) => {
    const updatedIcons = mapIcons.filter(i => i.id !== iconId);
    setMapIcons(updatedIcons);
    localStorage.setItem('naval_battle_map_icons', JSON.stringify(updatedIcons));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        const match = file.name.match(/(\d{2})/);
        if (match) {
          const tileId = parseInt(match[1]);
          if (tileId >= 0 && tileId < 42) {
            const row = Math.floor(tileId / cols);
            const col = tileId % cols;
            setMapTiles(prev => {
              const existing = prev.findIndex(t => t.id === tileId);
              let updated;
              if (existing >= 0) { updated = [...prev]; updated[existing] = { id: tileId, imageData, row, col }; }
              else { updated = [...prev, { id: tileId, imageData, row, col }]; }
              const tilesWithSizes = updated.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
              const dataToSave: StrategicMapData = { tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight, hexSample, hexGridOpacity };
              saveToIndexedDB(dataToSave).then(() => console.log(`✅ Тайл ${String(tileId).padStart(2, '0')} сохранён`)).catch(err => console.error('❌', err));
              return updated;
            });
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent, tileId: number) => {
    e.preventDefault();
    setIsDragging(false);
    setDragOverTile(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        const row = Math.floor(tileId / cols);
        const col = tileId % cols;
        setMapTiles(prev => {
          const existing = prev.findIndex(t => t.id === tileId);
          let updated;
          if (existing >= 0) { updated = [...prev]; updated[existing] = { id: tileId, imageData, row, col }; }
          else { updated = [...prev, { id: tileId, imageData, row, col }]; }
          const tilesWithSizes = updated.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
          const dataToSave: StrategicMapData = { tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight, hexSample, hexGridOpacity };
          saveToIndexedDB(dataToSave).then(() => console.log(`✅ Тайл ${String(tileId).padStart(2, '0')} сохранён`)).catch(err => console.error('❌', err));
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent, tileId: number) => {
    e.preventDefault();
    setIsDragging(true);
    setDragOverTile(tileId);
  };

  const handleDragLeave = () => { setIsDragging(false); setDragOverTile(null); };

  const handleSave = async () => {
    const tilesWithSizes = mapTiles.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
    const dataToSave: StrategicMapData = { tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight, hexSample, hexGridOpacity };
    try {
      await saveToIndexedDB(dataToSave);
      onUpdate(dataToSave);
      alert(`✅ Карта сохранена! Тайлов: ${tilesWithSizes.length}`);
    } catch (error) { alert('❌ Ошибка сохранения'); }
  };

  const handleClear = async () => {
    if (confirm('Очистить все изображения карты?')) {
      try { await deleteFromIndexedDB(); setMapTiles([]); setHexSample(undefined); }
      catch (error) { alert('Ошибка очистки'); }
    }
  };

  const handleExport = () => {
    const tilesWithSizes = mapTiles.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
    const dataToExport: StrategicMapData = { tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight, hexSample, hexGridOpacity };
    const jsonData = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'strategic-map-data.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as StrategicMapData;
        if (data.tiles && Array.isArray(data.tiles)) {
          setMapTiles(data.tiles);
          if (data.hexSample) setHexSample(data.hexSample);
          await saveToIndexedDB(data);
          alert(`✅ Импортировано ${data.tiles.length} тайлов`);
        } else { alert('❌ Неверный формат'); }
      } catch (error) { alert('❌ Ошибка чтения'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleHexSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const originalImageData = event.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const whiteThreshold = 240;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > whiteThreshold && data[i + 1] > whiteThreshold && data[i + 2] > whiteThreshold) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        const processedImageData = canvas.toDataURL('image/png');
        setHexSample(processedImageData);
        const tilesWithSizes = mapTiles.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
        const dataToSave: StrategicMapData = { tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight, hexSample: processedImageData, hexGridOpacity };
        await saveToIndexedDB(dataToSave);
        alert('✅ Образец гекса загружен! Белый фон удалён.');
      };
      img.src = originalImageData;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-cyan-300">🗺️ Редактор стратегической карты</h3>
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">📁 Загрузить карту</button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm">💾 Сохранить</button>
          <button onClick={handleExport} disabled={mapTiles.length === 0} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-sm">📤 Экспорт</button>
          <button onClick={() => importInputRef.current?.click()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm">📥 Импорт</button>
          <button onClick={handleClear} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">🗑️ Очистить</button>
        </div>
      </div>
      
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
      <input ref={importInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
      <input ref={hexSampleInputRef} type="file" accept="image/*" onChange={handleHexSampleUpload} className="hidden" />
      {/* 👈 Скрытый инпут для иконок */}
      <input ref={iconInputRef} type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />

      {/* 👈 НОВАЯ ПАНЕЛЬ: Менеджер иконок */}
      <div className="mb-4 p-3 bg-slate-900/50 rounded border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-cyan-300">🖼️ Менеджер иконок (Города, Базы, Корабли)</h4>
          <button onClick={() => iconInputRef.current?.click()} className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded text-xs">📁 Загрузить иконку</button>
        </div>
        
        {mapIcons.length === 0 ? (
          <div className="text-xs text-slate-500">⚠️ Иконки не загружены</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {mapIcons.map(icon => (
              <div key={icon.id} className="flex flex-col items-center bg-slate-800 p-2 rounded border border-slate-600 relative">
                <img src={icon.imageData} alt={icon.name} className="w-12 h-12 object-contain mb-1" />
                <span className="text-[10px] text-slate-300 truncate w-full text-center">{icon.name}</span>
                <button 
                  onClick={() => handleDeleteIcon(icon.id)}
                  className="absolute top-1 right-1 text-red-400 hover:text-red-300 text-xs font-bold"
                  title="Удалить иконку"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 p-3 bg-slate-900/50 rounded border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-cyan-300">⬡ Образец гекса для сетки</h4>
          <div className="flex gap-2">
            <button onClick={() => hexSampleInputRef.current?.click()} className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded text-xs">📁 Загрузить образец</button>
            {hexSample && <button onClick={() => { setHexSample(undefined); }} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">✕ Удалить</button>}
          </div>
        </div>
        {hexSample ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img src={hexSample} alt="Образец гекса" className="border border-slate-600 rounded" style={{ maxWidth: '100px', maxHeight: '100px', opacity: hexGridOpacity }} />
              <div className="text-xs text-green-400">✅ Образец загружен</div>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-slate-700">
              <label className="text-xs text-slate-300 whitespace-nowrap">🔲 Прозрачность границ сетки:</label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(hexGridOpacity * 100)}
                onChange={(e) => {
                  const newOpacity = parseInt(e.target.value) / 100;
                  setHexGridOpacity(newOpacity);
                  const tilesWithSizes = mapTiles.map(tile => ({ ...tile, width: getTileSize(tile.id).width, height: getTileSize(tile.id).height }));
                  const dataToSave: StrategicMapData = { tiles: tilesWithSizes, mapWidth, mapHeight, tileWidth, tileHeight, hexSample, hexGridOpacity: newOpacity };
                  saveToIndexedDB(dataToSave).catch(err => console.error('❌', err));
                }}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${hexGridOpacity * 100}%, #374151 ${hexGridOpacity * 100}%, #374151 100%)`
                }}
              />
              <span className="text-xs text-cyan-300 font-semibold w-12 text-right">{Math.round(hexGridOpacity * 100)}%</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">⚠️ Образец не загружен</div>
        )}
      </div>

      <div className="mb-4 text-sm text-slate-400">
        <p>Размер карты: {mapWidth} × {mapHeight} пикселей</p>
        <p>Загружено: <span className="text-cyan-400 font-bold">{mapTiles.length}</span> из 42 изображений</p>
      </div>

      <div className="relative border border-slate-700 rounded overflow-auto bg-slate-900/50" style={{ maxHeight: '600px' }}>
        <div className="relative" style={{ width: `${mapWidth * displayScale}px`, height: `${mapHeight * displayScale}px` }}>
          {Array.from({ length: 42 }).map((_, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const tile = mapTiles.find(t => t.id === idx);
            const isHovered = dragOverTile === idx;
            const tileSize = getTileSize(idx);
            const tilePos = getTilePosition(idx);
            return (
              <div key={idx} className={`absolute border-2 transition-all ${isHovered ? 'border-cyan-400 bg-cyan-500/20' : tile ? 'border-green-600' : 'border-slate-600 hover:border-slate-500'}`}
                style={{ left: `${tilePos.x * displayScale}px`, top: `${tilePos.y * displayScale}px`, width: `${tileSize.width * displayScale}px`, height: `${tileSize.height * displayScale}px` }}
                onDragOver={(e) => handleDragOver(e, idx)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, idx)}>
                {tile ? (<img src={tile.imageData} alt={`Tile ${idx}`} className="w-full h-full object-cover" />) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                    <div className="text-center"><div className="text-2xl mb-1">{String(idx).padStart(2, '0')}</div><div className="text-[10px]">Ряд {row + 1}, Кол {col + 1}</div></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}