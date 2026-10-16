import { useState, useRef, useEffect } from 'react';
import { StrategicMapData } from '../types/shipDatabase';

interface StrategicMapProps {
  onBack: () => void;
  strategicMapData?: StrategicMapData;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

interface MapElement {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'city' | 'naval_base' | 'ship';
  description?: string;
  icon: string;
}

export default function StrategicMap({ onBack, strategicMapData }: StrategicMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const MAP_WIDTH = strategicMapData?.mapWidth || 9703;
  const MAP_HEIGHT = strategicMapData?.mapHeight || 7767;
  
  const [viewport, setViewport] = useState<Viewport>({
    x: 0, y: 0, width: 1200, height: 800, zoom: 0.5
  });
  
  const [selectedElement, setSelectedElement] = useState<MapElement | null>(null);
  const [cursorHex, setCursorHex] = useState<{ row: number; col: number } | null>(null);

  // Ref-ы для отслеживания перетаскивания (не вызывают ре-рендер)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  
  // Элементы на карте
  const mapElements: MapElement[] = [
    { id: 'tokyo', name: 'Токио', x: 7800, y: 1400, type: 'city', description: 'Столица Японии, главный порт', icon: '🏙️' },
    { id: 'yokosuka', name: 'Йокосука', x: 7900, y: 1500, type: 'naval_base', description: 'Крупнейшая военно-морская база Японии', icon: '⚓' },
    { id: 'manila', name: 'Манила', x: 6900, y: 2500, type: 'city', description: 'Столица Филиппин', icon: '🏙️' },
    { id: 'subic_bay', name: 'Субик-Бей', x: 6850, y: 2550, type: 'naval_base', description: 'Американская военно-морская база', icon: '⚓' },
    { id: 'midway_atoll', name: 'Мидуэй', x: 4600, y: 1600, type: 'naval_base', description: 'Атолл Мидуэй — стратегическая база США', icon: '⚓' },
    { id: 'pearl_harbor', name: 'Перл-Харбор', x: 2600, y: 1900, type: 'naval_base', description: 'Главная база Тихоокеанского флота США', icon: '⚓' },
    { id: 'honolulu', name: 'Гонолулу', x: 2700, y: 1850, type: 'city', description: 'Столица Гавайев', icon: '🏙️' },
    { id: 'sydney', name: 'Сидней', x: 7500, y: 4000, type: 'city', description: 'Крупнейший город Австралии', icon: '🏙️' },
    { id: 'darwin', name: 'Дарвин', x: 7200, y: 3700, type: 'naval_base', description: 'Военно-морская база Австралии', icon: '⚓' },
    { id: 'dutch_harbor', name: 'Датч-Харбор', x: 1200, y: 700, type: 'naval_base', description: 'Американская база на Аляске', icon: '⚓' },
    { id: 'anchorage', name: 'Анкоридж', x: 1400, y: 600, type: 'city', description: 'Крупнейший город Аляски', icon: '🏙️' },
    { id: 'san_diego', name: 'Сан-Диего', x: 900, y: 1800, type: 'naval_base', description: 'База Тихоокеанского флота США', icon: '⚓' },
    { id: 'san_francisco', name: 'Сан-Франциско', x: 850, y: 1700, type: 'city', description: 'Крупный порт на западном побережье США', icon: '🏙️' },
    { id: 'yamato', name: 'Линкор Ямато', x: 7600, y: 1600, type: 'ship', description: 'Крупнейший линкор в истории, 460-мм орудия', icon: '🚢' },
    { id: 'enterprise', name: 'Авианосец Энтерпрайз', x: 2800, y: 2000, type: 'ship', description: 'Легендарный американский авианосец', icon: '🚢' },
  ];
  
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewport(prev => ({ ...prev, width: rect.width, height: rect.height }));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const hexSampleImage = useRef<HTMLImageElement | null>(null);
  
  useEffect(() => {
    if (!strategicMapData?.tiles) return;
    strategicMapData.tiles.forEach(tile => {
      if (!imageCache.current.has(tile.imageData)) {
        const img = new Image();
        img.src = tile.imageData;
        imageCache.current.set(tile.imageData, img);
      }
    });
  }, [strategicMapData]);
  
  useEffect(() => {
    if (strategicMapData?.hexSample) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { hexSampleImage.current = img; return; }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let hasWhitePixels = false;
        const whiteThreshold = 240;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
          if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
            hasWhitePixels = true;
            data[i + 3] = 0;
          }
        }
        if (hasWhitePixels) {
          ctx.putImageData(imageData, 0, 0);
          const processedImg = new Image();
          processedImg.onload = () => { hexSampleImage.current = processedImg; };
          processedImg.src = canvas.toDataURL('image/png');
        } else {
          hexSampleImage.current = img;
        }
      };
      img.src = strategicMapData.hexSample;
    } else {
      hexSampleImage.current = null;
    }
  }, [strategicMapData?.hexSample]);

  // Отрисовка canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const visibleX = viewport.x / viewport.zoom;
    const visibleY = viewport.y / viewport.zoom;
    const visibleWidth = viewport.width / viewport.zoom;
    const visibleHeight = viewport.height / viewport.zoom;
    
    // Тайлы карты
    if (strategicMapData?.tiles) {
      const cols = 7;
      const standardTileWidth = 1500;
      const standardTileHeight = 1500;
      const lastColumnWidth = 703;
      const lastRowHeight = 267;
      
      const getTileSize = (tileId: number, tileData?: any) => {
        const row = Math.floor(tileId / cols);
        const col = tileId % cols;
        const isLastColumn = col === 6;
        const isLastRow = row === 5;
        return {
          width: tileData?.width || (isLastColumn ? lastColumnWidth : standardTileWidth),
          height: tileData?.height || (isLastRow ? lastRowHeight : standardTileHeight)
        };
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
      
      strategicMapData.tiles.forEach(tile => {
        const tileSize = getTileSize(tile.id, tile);
        const tilePos = getTilePosition(tile.id);
        const tileRight = tilePos.x + tileSize.width;
        const tileBottom = tilePos.y + tileSize.height;
        
        if (tileRight < visibleX || tilePos.x > visibleX + visibleWidth ||
            tileBottom < visibleY || tilePos.y > visibleY + visibleHeight) {
          return;
        }
        
        const img = imageCache.current.get(tile.imageData);
        if (img && img.complete && img.naturalWidth > 0) {
          const screenX = (tilePos.x - visibleX) * viewport.zoom;
          const screenY = (tilePos.y - visibleY) * viewport.zoom;
          const screenWidth = tileSize.width * viewport.zoom;
          const screenHeight = tileSize.height * viewport.zoom;
          ctx.drawImage(img, screenX, screenY, screenWidth, screenHeight);
        }
      });
    }
    
    // Элементы карты (всегда рисуем поверх тайлов)
    mapElements.forEach(element => {
      const screenX = (element.x - visibleX) * viewport.zoom;
      const screenY = (element.y - visibleY) * viewport.zoom;
      
      if (screenX < -60 || screenX > canvas.width + 60 || screenY < -60 || screenY > canvas.height + 60) {
        return;
      }
      
      // Иконка
      ctx.font = `${Math.max(20, 32 * viewport.zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(element.icon, screenX, screenY);
      
      // Название
      ctx.font = `bold ${Math.max(10, 13 * viewport.zoom)}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(element.name, screenX, screenY + 22 * viewport.zoom);
      ctx.fillText(element.name, screenX, screenY + 22 * viewport.zoom);
    });
    
    // Сетка
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1 / viewport.zoom;
    const gridSize = 500;
    const startX = Math.floor(visibleX / gridSize) * gridSize;
    const startY = Math.floor(visibleY / gridSize) * gridSize;
    
    for (let x = startX; x < visibleX + visibleWidth; x += gridSize) {
      if (x >= 0 && x <= MAP_WIDTH) {
        const screenX = (x - visibleX) * viewport.zoom;
        ctx.beginPath(); ctx.moveTo(screenX, 0); ctx.lineTo(screenX, canvas.height); ctx.stroke();
      }
    }
    for (let y = startY; y < visibleY + visibleHeight; y += gridSize) {
      if (y >= 0 && y <= MAP_HEIGHT) {
        const screenY = (y - visibleY) * viewport.zoom;
        ctx.beginPath(); ctx.moveTo(0, screenY); ctx.lineTo(canvas.width, screenY); ctx.stroke();
      }
    }
    
    // Гексагональная сетка
    const hexWidth = 21;
    const hexHeight = 25;
    const hexSpacingX = hexWidth;
    const hexSpacingY = hexHeight * 0.75;
    const hexCols = Math.ceil(MAP_WIDTH / hexSpacingX) + 1;
    const hexRows = Math.ceil(MAP_HEIGHT / hexSpacingY) + 1;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1 / viewport.zoom;
    
    const startHexCol = Math.max(0, Math.floor(visibleX / hexSpacingX) - 1);
    const endHexCol = Math.min(hexCols, Math.ceil((visibleX + visibleWidth) / hexSpacingX) + 1);
    const startHexRow = Math.max(0, Math.floor(visibleY / hexSpacingY) - 1);
    const endHexRow = Math.min(hexRows, Math.ceil((visibleY + visibleHeight) / hexSpacingY) + 1);
    
    if (hexSampleImage.current) {
      const sampleImg = hexSampleImage.current;
      const sampleWidth = hexWidth * viewport.zoom;
      const sampleHeight = hexHeight * viewport.zoom;
      const hexOpacity = strategicMapData?.hexGridOpacity ?? 0.3;
      ctx.globalAlpha = hexOpacity;
      for (let row = startHexRow; row < endHexRow; row++) {
        for (let col = startHexCol; col < endHexCol; col++) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const centerX = col * hexSpacingX + offsetX;
          const centerY = row * hexSpacingY;
          const screenX = (centerX - visibleX) * viewport.zoom - sampleWidth / 2;
          const screenY = (centerY - visibleY) * viewport.zoom - sampleHeight / 2;
          ctx.drawImage(sampleImg, screenX, screenY, sampleWidth, sampleHeight);
        }
      }
      ctx.globalAlpha = 1.0;
    } else {
      const hexOpacity = strategicMapData?.hexGridOpacity ?? 0.3;
      ctx.globalAlpha = hexOpacity;
      for (let row = startHexRow; row < endHexRow; row++) {
        for (let col = startHexCol; col < endHexCol; col++) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const centerX = col * hexSpacingX + offsetX;
          const centerY = row * hexSpacingY;
          const screenX = (centerX - visibleX) * viewport.zoom;
          const screenY = (centerY - visibleY) * viewport.zoom;
          const screenRadiusX = (hexWidth / 2) * viewport.zoom;
          const screenRadiusY = (hexHeight / 2) * viewport.zoom;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = screenX + screenRadiusX * Math.cos(angle);
            const y = screenY + screenRadiusY * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;
    }
  }, [viewport, strategicMapData, mapElements]);
  
  // Поиск элемента по экранным координатам клика
  const findElementAtScreen = (screenX: number, screenY: number): MapElement | null => {
    const v = viewportRef.current;
    const mapX = v.x / v.zoom + screenX / v.zoom;
    const mapY = v.y / v.zoom + screenY / v.zoom;
    
    // Ищем ближайший элемент в радиусе клика
    const clickRadius = 60 / v.zoom; // 60 экранных пикселей в мировых координатах
    let closest: MapElement | null = null;
    let closestDist = Infinity;
    
    for (const element of mapElements) {
      const distance = Math.sqrt(Math.pow(mapX - element.x, 2) + Math.pow(mapY - element.y, 2));
      if (distance < clickRadius && distance < closestDist) {
        closestDist = distance;
        closest = element;
      }
    }
    
    return closest;
  };
  
  // === Вычисление координат гекса ===
  
  const getHexAtPosition = (screenX: number, screenY: number): { row: number; col: number } | null => {
    const v = viewportRef.current;
    
    // Конвертируем экранные координаты в мировые
    const mapX = v.x / v.zoom + screenX / v.zoom;
    const mapY = v.y / v.zoom + screenY / v.zoom;
    
    // Параметры гексов (должны совпадать с отрисовкой)
    const hexWidth = 21;
    const hexHeight = 25;
    const hexSpacingX = hexWidth;
    const hexSpacingY = hexHeight * 0.75;
    
    // Вычисляем ряд (вертикальная координата)
    const row = Math.floor(mapY / hexSpacingY);
    
    // Вычисляем колонку с учётом смещения нечётных рядов
    const offsetX = (row % 2) * (hexSpacingX / 2);
    const col = Math.floor((mapX - offsetX) / hexSpacingX);
    
    // Проверяем границы карты
    const maxRow = Math.ceil(MAP_HEIGHT / hexSpacingY);
    const maxCol = Math.ceil(MAP_WIDTH / hexSpacingX);
    
    if (row >= 0 && row < maxRow && col >= 0 && col < maxCol) {
      return { row, col };
    }
    
    return null;
  };
  
  // === Обработчики мыши ===
  
  const handleMouseMove = (e: React.MouseEvent) => {
    // Обновляем координаты гекса под курсором
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const hex = getHexAtPosition(screenX, screenY);
      setCursorHex(hex);
    }
    
    if (!isPanningRef.current) return;
    
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    
    if (!hasMovedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      hasMovedRef.current = true;
    }
    
    if (hasMovedRef.current) {
      setViewport(prev => ({
        ...prev,
        x: Math.max(0, Math.min(MAP_WIDTH * prev.zoom - prev.width, prev.x - dx)),
        y: Math.max(0, Math.min(MAP_HEIGHT * prev.zoom - prev.height, prev.y - dy))
      }));
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // только ЛКМ
    isPanningRef.current = true;
    hasMovedRef.current = false;
    panStartRef.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    // Если не двигали мышь — это клик по элементу
    if (!hasMovedRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const element = findElementAtScreen(screenX, screenY);
        if (element) {
          setSelectedElement(element);
        }
      }
    }
    
    isPanningRef.current = false;
    hasMovedRef.current = false;
  };
  
  const handleMouseLeave = () => {
    isPanningRef.current = false;
    hasMovedRef.current = false;
    setCursorHex(null);
  };
  
  // Масштабирование колесом
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(2, viewport.zoom * zoomFactor));
    const centerX = viewport.x + viewport.width / 2;
    const centerY = viewport.y + viewport.height / 2;
    const newX = centerX - (centerX - viewport.x) * (newZoom / viewport.zoom);
    const newY = centerY - (centerY - viewport.y) * (newZoom / viewport.zoom);
    setViewport(prev => ({
      ...prev, zoom: newZoom,
      x: Math.max(0, Math.min(MAP_WIDTH * newZoom - prev.width, newX)),
      y: Math.max(0, Math.min(MAP_HEIGHT * newZoom - prev.height, newY))
    }));
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Верхняя панель */}
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <button onClick={onBack} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">← Назад в меню</button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-cyan-300">🗺️ Стратегическая карта</h1>
          {cursorHex && (
            <div className="px-3 py-1 bg-slate-900/50 border border-cyan-600 rounded text-sm font-mono">
              <span className="text-slate-400">Гекс: </span>
              <span className="text-cyan-300 font-bold">{cursorHex.row},{cursorHex.col}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">Масштаб: {Math.round(viewport.zoom * 100)}%</div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Масштаб:</label>
            <input type="range" min="0" max="3" step="1" value={[0.5, 1, 1.5, 2].indexOf(viewport.zoom)}
              onChange={(e) => {
                const zoomLevels = [0.5, 1, 1.5, 2];
                const newZoom = zoomLevels[parseInt(e.target.value)];
                setViewport(prev => ({ ...prev, zoom: newZoom }));
              }}
              className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${([0.5, 1, 1.5, 2].indexOf(viewport.zoom) / 3) * 100}%, #374151 ${([0.5, 1, 1.5, 2].indexOf(viewport.zoom) / 3) * 100}%, #374151 100%)` }}
            />
            <div className="flex gap-1 text-xs">
              {[50, 100, 150, 200].map((percent) => (
                <button key={percent} onClick={() => setViewport(prev => ({ ...prev, zoom: percent / 100 }))}
                  className={`px-2 py-1 rounded transition-colors ${Math.round(viewport.zoom * 100) === percent ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                  {percent}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Карта — обычный курсор */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          width={viewport.width}
          height={viewport.height}
          className="absolute top-0 left-0"
        />
      </div>
      
      {/* Подсказки */}
      <div className="absolute bottom-4 left-4 bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
        <p>🖱️ Зажмите ЛКМ и двигайте — перемещение карты</p>
        <p>👆 Короткий клик на объекте — открыть информацию</p>
        <p>🔍 Колесо мыши — масштабирование</p>
      </div>
      
      {/* Модальное окно с информацией об элементе */}
      {selectedElement && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedElement(null)}>
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedElement.icon}</span>
                <div>
                  <h3 className="text-2xl font-bold text-cyan-300">{selectedElement.name}</h3>
                  <p className="text-sm text-slate-400">
                    {selectedElement.type === 'city' && '🏙️ Город'}
                    {selectedElement.type === 'naval_base' && '⚓ Военно-морская база'}
                    {selectedElement.type === 'ship' && '🚢 Корабль'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedElement(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            
            {selectedElement.description && (
              <div className="mb-4 p-3 bg-slate-900/50 rounded border border-slate-700">
                <p className="text-slate-300">{selectedElement.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 bg-slate-900/50 rounded">
                <div className="text-slate-400 text-xs">Координаты X</div>
                <div className="text-white font-semibold">{Math.round(selectedElement.x)}</div>
              </div>
              <div className="p-2 bg-slate-900/50 rounded">
                <div className="text-slate-400 text-xs">Координаты Y</div>
                <div className="text-white font-semibold">{Math.round(selectedElement.y)}</div>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button onClick={() => setSelectedElement(null)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
