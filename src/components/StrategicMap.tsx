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
  iconName?: string;
}

const ZOOM_LEVELS = [0.5, 1, 1.5, 2];
const MINI_MAP_HEIGHT = 200;

export default function StrategicMap({ onBack, strategicMapData }: StrategicMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniMapCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const MAP_WIDTH = strategicMapData?.mapWidth || 9703;
  const MAP_HEIGHT = strategicMapData?.mapHeight || 7767;
  
  const MINI_MAP_WIDTH = MINI_MAP_HEIGHT * (MAP_WIDTH / MAP_HEIGHT);
  
  const [viewport, setViewport] = useState<Viewport>({
    x: 0, y: 0, width: 1200, height: 800, zoom: 0.5
  });
  
  const [selectedElement, setSelectedElement] = useState<MapElement | null>(null);
  const [cursorHex, setCursorHex] = useState<{ row: number; col: number } | null>(null);
  const [showHexCoords, setShowHexCoords] = useState(false); 

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  
  const isMiniMapDraggingRef = useRef(false);

  const mapElements: MapElement[] = [
    { id: 'yokosuka', name: 'Йокосука', x: 7900, y: 1500, type: 'naval_base', description: 'Крупнейшая военно-морская база Японии', iconName: 'japan_flag' },
    { id: 'san_francisco', name: 'Сан-Франциско', x: 850, y: 1700, type: 'city', description: 'Крупный порт на западном побережье США', iconName: 'usa_flag' },
    { id: 'yamato', name: 'Линкор Ямато', x: 7600, y: 1600, type: 'ship', description: 'Крупнейший линкор в истории', iconName: 'japan_flag' },
    { id: 'enterprise', name: 'Авианосец Энтерпрайз', x: 2800, y: 2000, type: 'ship', description: 'Легендарный американский авианосец', iconName: 'usa_flag' },
    { id: 'guam', name: 'Гуам', x: 4473, y: 3600, type: 'naval_base', description: 'База США на Гуаме', iconName: 'usa_flag' },
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
  const customElementImages = useRef<Map<string, HTMLImageElement>>(new Map());

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
    const savedIcons = localStorage.getItem('naval_battle_map_icons');
    if (savedIcons) {
      try {
        const icons = JSON.parse(savedIcons);
        icons.forEach((icon: any) => {
          if (!customElementImages.current.has(icon.name)) {
            const img = new Image();
            img.src = icon.imageData;
            customElementImages.current.set(icon.name, img);
          }
        });
      } catch (e) { console.error('Ошибка чтения иконок', e); }
    }
  }, []);

  useEffect(() => {
    if (strategicMapData?.hexSample) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
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
            hasWhitePixels = true; data[i + 3] = 0;
          }
        }
        if (hasWhitePixels) {
          ctx.putImageData(imageData, 0, 0);
          const processedImg = new Image();
          processedImg.onload = () => { hexSampleImage.current = processedImg; };
          processedImg.src = canvas.toDataURL('image/png');
        } else { hexSampleImage.current = img; }
      };
      img.src = strategicMapData.hexSample;
    } else { hexSampleImage.current = null; }
  }, [strategicMapData?.hexSample]);

  // Отрисовка основной карты
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Отключаем сглаживание, чтобы иконки 7x6 были идеально четкими (пиксель в пиксель)
    ctx.imageSmoothingEnabled = false; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const visibleX = viewport.x / viewport.zoom;
    const visibleY = viewport.y / viewport.zoom;
    const visibleWidth = viewport.width / viewport.zoom;
    const visibleHeight = viewport.height / viewport.zoom;
    
    if (strategicMapData?.tiles) {
      const cols = 7;
      const standardTileWidth = 1500; const standardTileHeight = 1500;
      const lastColumnWidth = 703; const lastRowHeight = 267;
      
      const getTileSize = (tileId: number, tileData?: any) => {
        const row = Math.floor(tileId / cols); const col = tileId % cols;
        return {
          width: tileData?.width || (col === 6 ? lastColumnWidth : standardTileWidth),
          height: tileData?.height || (row === 5 ? lastRowHeight : standardTileHeight)
        };
      };
      const getTilePosition = (tileId: number) => {
        const row = Math.floor(tileId / cols); const col = tileId % cols;
        let x = 0; for (let c = 0; c < col; c++) { x += (c === 6 ? lastColumnWidth : standardTileWidth); }
        let y = 0; for (let r = 0; r < row; r++) { y += (r === 5 ? lastRowHeight : standardTileHeight); }
        return { x, y };
      };
      
      strategicMapData.tiles.forEach(tile => {
        const tileSize = getTileSize(tile.id, tile);
        const tilePos = getTilePosition(tile.id);
        if (tilePos.x + tileSize.width < visibleX || tilePos.x > visibleX + visibleWidth ||
            tilePos.y + tileSize.height < visibleY || tilePos.y > visibleY + visibleHeight) return;
        
        const img = imageCache.current.get(tile.imageData);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, (tilePos.x - visibleX) * viewport.zoom, (tilePos.y - visibleY) * viewport.zoom, tileSize.width * viewport.zoom, tileSize.height * viewport.zoom);
        }
      });
    }
    
    // Отрисовка элементов карты
    mapElements.forEach(element => {
      const screenX = (element.x - visibleX) * viewport.zoom;
      const screenY = (element.y - visibleY) * viewport.zoom;
      
      if (screenX < -100 || screenX > canvas.width + 100 || screenY < -100 || screenY > canvas.height + 100) return;
      
      const img = element.iconName ? customElementImages.current.get(element.iconName) : null;
      
      if (img && img.complete && img.naturalWidth > 0) {
        // 🪄 РИСУЕМ ИКОНКУ В ОРИГИНАЛЬНОМ РАЗМЕРЕ 7x6 ПИКСЕЛЕЙ
        const drawWidth = img.width;
        const drawHeight = img.height;
        
        ctx.drawImage(
          img, 
          screenX - drawWidth / 2, 
          screenY - drawHeight / 2, 
          drawWidth, 
          drawHeight
        );
      } else {
        // Если картинки нет, рисуем красный кружок-заглушку (размер 6px)
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444'; 
        ctx.fill();
      }
      
      // Название (рисуем только при зуме >= 1)
      if (viewport.zoom >= 1) { 
        const fontSize = Math.max(10, 12 * viewport.zoom);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 3 / viewport.zoom;
        
        // Сдвигаем текст чуть ниже иконки (7px / 2 + отступ)
        const textY = screenY + 8; 
        
        ctx.strokeText(element.name, screenX, textY); 
        ctx.fillText(element.name, screenX, textY);
      }
    });
    
    // Гексагональная сетка
    const hexWidth = 21; const hexHeight = 25;
    const hexSpacingX = hexWidth; const hexSpacingY = hexHeight * 0.75;
    const hexCols = Math.ceil(MAP_WIDTH / hexSpacingX) + 1; const hexRows = Math.ceil(MAP_HEIGHT / hexSpacingY) + 1;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 1 / viewport.zoom;
    const startHexCol = Math.max(0, Math.floor(visibleX / hexSpacingX) - 1);
    const endHexCol = Math.min(hexCols, Math.ceil((visibleX + visibleWidth) / hexSpacingX) + 1);
    const startHexRow = Math.max(0, Math.floor(visibleY / hexSpacingY) - 1);
    const endHexRow = Math.min(hexRows, Math.ceil((visibleY + visibleHeight) / hexSpacingY) + 1);
    
    if (hexSampleImage.current) {
      const sampleImg = hexSampleImage.current; const sampleWidth = hexWidth * viewport.zoom; const sampleHeight = hexHeight * viewport.zoom;
      const hexOpacity = strategicMapData?.hexGridOpacity ?? 0.3; ctx.globalAlpha = hexOpacity;
      for (let row = startHexRow; row < endHexRow; row++) {
        for (let col = startHexCol; col < endHexCol; col++) {
          const offsetX = (row % 2) * (hexSpacingX / 2); const centerX = col * hexSpacingX + offsetX; const centerY = row * hexSpacingY;
          const screenX = (centerX - visibleX) * viewport.zoom - sampleWidth / 2 + 0.5;
          const screenY = (centerY - visibleY) * viewport.zoom - sampleHeight / 2 + 0.5;
          ctx.drawImage(sampleImg, screenX, screenY, sampleWidth, sampleHeight);
          
          if (showHexCoords) {
            ctx.fillStyle = 'rgba(255, 80, 80, 0.9)'; ctx.globalAlpha = 1.0; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const fontSize = Math.max(6, Math.min(10, 8 * viewport.zoom)); ctx.font = `${fontSize}px sans-serif`;
            ctx.fillText(`${row},${col}`, screenX + sampleWidth / 2, screenY + sampleHeight / 2);
            ctx.globalAlpha = hexOpacity; 
          }
        }
      }
      ctx.globalAlpha = 1.0;
    }
  }, [viewport, strategicMapData, mapElements, showHexCoords]);

  // === Отрисовка Мини-карты ===
  useEffect(() => {
    const canvas = miniMapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (strategicMapData?.tiles) {
      const cols = 7;
      const standardTileWidth = 1500; const standardTileHeight = 1500;
      const lastColumnWidth = 703; const lastRowHeight = 267;
      
      const getTilePosition = (tileId: number) => {
        const row = Math.floor(tileId / cols); const col = tileId % cols;
        let x = 0; for (let c = 0; c < col; c++) { x += (c === 6 ? lastColumnWidth : standardTileWidth); }
        let y = 0; for (let r = 0; r < row; r++) { y += (r === 5 ? lastRowHeight : standardTileHeight); }
        return { x, y };
      };
      const getTileSize = (tileId: number) => {
        const row = Math.floor(tileId / cols); const col = tileId % cols;
        return {
          width: col === 6 ? lastColumnWidth : standardTileWidth,
          height: row === 5 ? lastRowHeight : standardTileHeight
        };
      };
      
      const scaleX = canvas.width / MAP_WIDTH; const scaleY = canvas.height / MAP_HEIGHT;

      strategicMapData.tiles.forEach(tile => {
        const img = imageCache.current.get(tile.imageData);
        if (img && img.complete && img.naturalWidth > 0) {
          const pos = getTilePosition(tile.id); const size = getTileSize(tile.id);
          ctx.drawImage(img, pos.x * scaleX, pos.y * scaleY, size.width * scaleX, size.height * scaleY);
        }
      });
    }

    const scaleX = canvas.width / MAP_WIDTH; const scaleY = canvas.height / MAP_HEIGHT;
    const viewWorldX = viewport.x / viewport.zoom; const viewWorldY = viewport.y / viewport.zoom;
    const viewWorldW = viewport.width / viewport.zoom; const viewWorldH = viewport.height / viewport.zoom;

    const miniX = viewWorldX * scaleX; const miniY = viewWorldY * scaleY;
    const miniW = viewWorldW * scaleX; const miniH = viewWorldH * scaleY;

    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.strokeRect(miniX, miniY, miniW, miniH);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; ctx.fillRect(miniX, miniY, miniW, miniH);
  }, [viewport, strategicMapData]);

  // === Обработчики миникарты ===
  const handleMiniMapClick = (e: React.MouseEvent<HTMLCanvasElement> | React.MouseEvent) => {
    const canvas = miniMapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left; const clickY = e.clientY - rect.top;
    
    const worldX = (clickX / canvas.width) * MAP_WIDTH; const worldY = (clickY / canvas.height) * MAP_HEIGHT;
    const newX = worldX * viewport.zoom - viewport.width / 2; const newY = worldY * viewport.zoom - viewport.height / 2;

    setViewport(prev => ({
      ...prev,
      x: Math.max(0, Math.min(MAP_WIDTH * prev.zoom - prev.width, newX)),
      y: Math.max(0, Math.min(MAP_HEIGHT * prev.zoom - prev.height, newY))
    }));
  };

  const handleMiniMapMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); isMiniMapDraggingRef.current = true; handleMiniMapClick(e);
  };
  const handleMiniMapMouseMove = (e: React.MouseEvent) => {
    if (isMiniMapDraggingRef.current) { handleMiniMapClick(e); }
  };
  const handleMiniMapMouseUp = () => { isMiniMapDraggingRef.current = false; };

  useEffect(() => {
    const handleGlobalMouseUp = () => { isMiniMapDraggingRef.current = false; };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);
  
  // === Поиск элемента под мышью ===
  const findElementAtScreen = (screenX: number, screenY: number): MapElement | null => {
    const v = viewportRef.current;
    const mapX = v.x / v.zoom + screenX / v.zoom;
    const mapY = v.y / v.zoom + screenY / v.zoom;
    const clickRadius = 60 / v.zoom;
    let closest: MapElement | null = null;
    let closestDist = Infinity;
    
    for (const element of mapElements) {
      const distance = Math.sqrt(Math.pow(mapX - element.x, 2) + Math.pow(mapY - element.y, 2));
      if (distance < clickRadius && distance < closestDist) {
        closestDist = distance; closest = element;
      }
    }
    return closest;
  };
  
  // === Вычисление координат гекса ===
  const getHexAtPosition = (screenX: number, screenY: number): { row: number; col: number } | null => {
    const v = viewportRef.current;
    const mapX = v.x / v.zoom + screenX / v.zoom;
    const mapY = v.y / v.zoom + screenY / v.zoom;
    const hexWidth = 21; const hexHeight = 25;
    const hexSpacingX = hexWidth; const hexSpacingY = hexHeight * 0.75;

    let row = Math.floor(mapY / hexSpacingY);
    let offsetX = (row % 2) * (hexSpacingX / 2);
    let col = Math.floor((mapX - offsetX) / hexSpacingX);

    const candidates = [
      { r: row, c: col }, { r: row, c: col - 1 }, { r: row, c: col + 1 },
      { r: row - 1, c: col }, { r: row - 1, c: col + (row % 2 === 0 ? -1 : 1) },
      { r: row + 1, c: col }, { r: row + 1, c: col + (row % 2 === 0 ? -1 : 1) }
    ];

    let bestHex = { r: row, c: col };
    let minDistance = Infinity;

    for (const cand of candidates) {
      const candOffset = (cand.r % 2) * (hexSpacingX / 2);
      const centerX = cand.c * hexSpacingX + candOffset;
      const centerY = cand.r * hexSpacingY;
      const dist = Math.pow(mapX - centerX, 2) + Math.pow(mapY - centerY, 2);
      if (dist < minDistance) { minDistance = dist; bestHex = cand; }
    }

    const maxRow = Math.ceil(MAP_HEIGHT / hexSpacingY); const maxCol = Math.ceil(MAP_WIDTH / hexSpacingX);
    if (bestHex.r >= 0 && bestHex.r < maxRow && bestHex.c >= 0 && bestHex.c < maxCol) { return { row: bestHex.r, col: bestHex.c }; }
    return null;
  };

  const changeZoom = (newZoom: number) => {
    if (newZoom === viewport.zoom) return;
    const centerX = viewport.width / 2; const centerY = viewport.height / 2;
    const worldX = viewport.x / viewport.zoom + centerX / viewport.zoom;
    const worldY = viewport.y / viewport.zoom + centerY / viewport.zoom;
    const newX = worldX * newZoom - centerX; const newY = worldY * newZoom - centerY;
    setViewport(prev => ({
      ...prev, zoom: newZoom,
      x: Math.max(0, Math.min(MAP_WIDTH * newZoom - prev.width, newX)),
      y: Math.max(0, Math.min(MAP_HEIGHT * newZoom - prev.height, newY))
    }));
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const screenX = e.clientX - rect.left; const screenY = e.clientY - rect.top;
      const hex = getHexAtPosition(screenX, screenY);
      setCursorHex(hex);
    }
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x; const dy = e.clientY - panStartRef.current.y;
    if (!hasMovedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) { hasMovedRef.current = true; }
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
    if (e.button !== 0) return;
    isPanningRef.current = true; hasMovedRef.current = false;
    panStartRef.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (!hasMovedRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left; const screenY = e.clientY - rect.top;
        const element = findElementAtScreen(screenX, screenY);
        if (element) { setSelectedElement(element); }
      }
    }
    isPanningRef.current = false; hasMovedRef.current = false;
  };
  
  const handleMouseLeave = () => {
    isPanningRef.current = false; hasMovedRef.current = false;
    setCursorHex(null);
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    let currentIndex = ZOOM_LEVELS.indexOf(viewport.zoom);
    if (currentIndex === -1) {
      currentIndex = ZOOM_LEVELS.reduce((prev, curr) => 
        Math.abs(curr - viewport.zoom) < Math.abs(ZOOM_LEVELS[prev] - viewport.zoom) ? ZOOM_LEVELS.indexOf(curr) : prev, 0
      );
    }
    let nextIndex = currentIndex;
    if (e.deltaY < 0 && currentIndex < ZOOM_LEVELS.length - 1) nextIndex++;
    if (e.deltaY > 0 && currentIndex > 0) nextIndex--;

    if (nextIndex !== currentIndex) {
      const newZoom = ZOOM_LEVELS[nextIndex];
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
      const worldX = viewport.x / viewport.zoom + mouseX / viewport.zoom;
      const worldY = viewport.y / viewport.zoom + mouseY / viewport.zoom;
      const newX = worldX * newZoom - mouseX; const newY = worldY * newZoom - mouseY;
      setViewport(prev => ({
        ...prev, zoom: newZoom,
        x: Math.max(0, Math.min(MAP_WIDTH * newZoom - prev.width, newX)),
        y: Math.max(0, Math.min(MAP_HEIGHT * newZoom - prev.height, newY))
      }));
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative">
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
          <button onClick={() => setShowHexCoords(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${showHexCoords ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}>
            {showHexCoords ? '👁️ Скрыть координаты' : '👁️ Показать координаты'}
          </button>
          <div className="text-sm text-slate-400">Масштаб: {Math.round(viewport.zoom * 100)}%</div>
          <div className="flex gap-1 text-xs">
            {[50, 100, 150, 200].map((percent) => (
              <button key={percent} onClick={() => changeZoom(percent / 100)}
                className={`px-2 py-1.5 rounded transition-colors ${Math.round(viewport.zoom * 100) === percent ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                {percent}%
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ cursor: 'default' }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onWheel={handleWheel}>
        <canvas ref={canvasRef} width={viewport.width} height={viewport.height} className="absolute top-0 left-0" />
        <div className="absolute bottom-0 right-0 border-t-2 border-l-2 border-slate-600 shadow-2xl overflow-hidden bg-slate-800 z-10 rounded-tl-lg"
          style={{ width: MINI_MAP_WIDTH, height: MINI_MAP_HEIGHT }}>
          <canvas ref={miniMapCanvasRef} width={MINI_MAP_WIDTH} height={MINI_MAP_HEIGHT} className="block cursor-pointer"
            onMouseDown={handleMiniMapMouseDown} onMouseMove={handleMiniMapMouseMove} onMouseUp={handleMiniMapMouseUp} onMouseLeave={handleMiniMapMouseUp} />
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
        <p>🖱️ Зажмите ЛКМ и двигайте — перемещение карты</p>
        <p>👆 Короткий клик на объекте — открыть информацию</p>
        <p>🔍 Колесо мыши — масштабирование</p>
      </div>
      
      {selectedElement && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedElement(null)}>
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
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