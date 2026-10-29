import { useState, useRef, useEffect } from 'react';
import { StrategicMapData } from '../types/shipDatabase';

// === ТИПЫ ДЛЯ ГЕКСОВ ===
export type TerrainType = 
  | 'plain' | 'hills' | 'desert' | 'forest' | 'jungle' | 'swamp'
  | 'forest_hills' | 'jungle_hills' | 'desert_hills' | 'mountain' | 'jungle_mountain'
  | 'desert_sand' | 'tundra' | 'major_city' | 'minor_city' | 'rural_road' | 'rural_dirt'
  | 'atoll' | 'deep_ocean' | 'shallow_sea' | 'coast' | 'solid_ice' | 'ice_floes' 
  | 'transit_zone' | 'entry_zone' | 'reef' | 'impassable_mountain' | 'main_railway' 
  | 'secondary_railway' | 'highway' | 'dirt_road' | 'navigable_river' | 'major_river' | 'minor_river';

export type HexEdge = 'NW' | 'NE' | 'W' | 'E' | 'SW' | 'SE';

export interface EdgeFeatures {
  coast: boolean;
  mainRail: boolean;
  secRail: boolean;
  highway: boolean;
  dirtRoad: boolean;
  minorRiver: boolean;
  majorRiver: boolean;
  navRiver: boolean;
  blocked: boolean;
}

export interface HexData {
  terrain: TerrainType;
  edges: Record<HexEdge, EdgeFeatures>;
  isReady?: boolean;
}

type HexGrid = Record<string, HexData>;

interface HexGridEditorProps {
  onBack: () => void;
  strategicMapData?: StrategicMapData;
}

const ZOOM_LEVELS = [1, 2];

const TERRAIN_INFO: Record<TerrainType, { name: string, color: string, abbr: string }> = {
  plain: { name: 'Равнина', color: 'rgba(163, 230, 53, 0.4)', abbr: 'Р' },
  hills: { name: 'Холмы', color: 'rgba(168, 162, 158, 0.5)', abbr: 'Х' },
  desert: { name: 'Пустыня', color: 'rgba(253, 224, 71, 0.4)', abbr: 'П' },
  forest: { name: 'Лес', color: 'rgba(21, 128, 61, 0.5)', abbr: 'Л' },
  jungle: { name: 'Джунгли', color: 'rgba(4, 120, 87, 0.6)', abbr: 'Д' },
  swamp: { name: 'Болота', color: 'rgba(120, 53, 15, 0.5)', abbr: 'Б' },
  forest_hills: { name: 'Лес+Холмы', color: 'rgba(22, 101, 52, 0.6)', abbr: 'ЛХ' },
  jungle_hills: { name: 'Джунгли+Холмы', color: 'rgba(6, 78, 59, 0.7)', abbr: 'ДХ' },
  desert_hills: { name: 'Пустыня+Холмы', color: 'rgba(202, 138, 4, 0.5)', abbr: 'ПХ' },
  mountain: { name: 'Горы', color: 'rgba(120, 113, 108, 0.6)', abbr: 'Г' },
  jungle_mountain: { name: 'Горы+Джунгли', color: 'rgba(69, 26, 3, 0.6)', abbr: 'ГД' },
  desert_sand: { name: 'Пустыня+Пески', color: 'rgba(254, 240, 138, 0.5)', abbr: 'ПП' },
  tundra: { name: 'Тундра', color: 'rgba(148, 163, 184, 0.5)', abbr: 'Т' },
  major_city: { name: 'Крупный город', color: 'rgba(239, 68, 68, 0.7)', abbr: 'КГ' },
  minor_city: { name: 'Небольшой город', color: 'rgba(249, 115, 22, 0.6)', abbr: 'МГ' },
  rural_road: { name: 'Село+Дороги', color: 'rgba(234, 179, 8, 0.4)', abbr: 'СД' },
  rural_dirt: { name: 'Село+Грунт', color: 'rgba(180, 83, 9, 0.4)', abbr: 'СГ' },
  atoll: { name: 'Атолл', color: 'rgba(250, 204, 21, 0.4)', abbr: 'А' },
  deep_ocean: { name: 'Глубокий океан', color: 'transparent', abbr: '' },
  shallow_sea: { name: 'Мелкое море', color: 'rgba(56, 189, 248, 0.4)', abbr: 'ММ' },
  coast: { name: 'Побережье', color: 'rgba(125, 211, 252, 0.5)', abbr: 'ПБ' },
  solid_ice: { name: 'Крепкий лед', color: 'rgba(224, 242, 254, 0.6)', abbr: 'КЛ' },
  ice_floes: { name: 'Льдины', color: 'rgba(186, 230, 253, 0.5)', abbr: 'ЛД' },
  transit_zone: { name: 'Транзит', color: 'rgba(167, 139, 250, 0.3)', abbr: 'ТЗ' },
  entry_zone: { name: 'Вход', color: 'rgba(52, 211, 153, 0.3)', abbr: 'ВЗ' },
  reef: { name: 'Риф', color: 'rgba(236, 72, 153, 0.4)', abbr: 'РФ' },
  impassable_mountain: { name: 'Непрох. горы', color: 'rgba(68, 64, 60, 0.7)', abbr: 'НГ' },
  main_railway: { name: 'Главная ЖД', color: 'rgba(87, 83, 78, 0.6)', abbr: 'ГЖ' },
  secondary_railway: { name: 'Второст. ЖД', color: 'rgba(120, 113, 108, 0.5)', abbr: 'ВЖ' },
  highway: { name: 'Автодорога', color: 'rgba(107, 114, 128, 0.5)', abbr: 'АД' },
  dirt_road: { name: 'Грунтовка', color: 'rgba(180, 83, 9, 0.4)', abbr: 'ГР' },
  navigable_river: { name: 'Судоходная река', color: 'rgba(56, 189, 248, 0.5)', abbr: 'СР' },
  major_river: { name: 'Большая река', color: 'rgba(14, 165, 233, 0.6)', abbr: 'БР' },
  minor_river: { name: 'Малая река', color: 'rgba(125, 211, 252, 0.5)', abbr: 'МР' },
};

const DEFAULT_EDGE: EdgeFeatures = {
  coast: false, mainRail: false, secRail: false, highway: false, dirtRoad: false,
  minorRiver: false, majorRiver: false, navRiver: false, blocked: false
};

const DEFAULT_EDGES: Record<HexEdge, EdgeFeatures> = {
  NW: { ...DEFAULT_EDGE }, NE: { ...DEFAULT_EDGE }, W: { ...DEFAULT_EDGE },
  E: { ...DEFAULT_EDGE }, SW: { ...DEFAULT_EDGE }, SE: { ...DEFAULT_EDGE }
};

const DB_NAME = 'NavalBattleDB';
const DB_VERSION = 2;
const STORE_NAME = 'hexGrid';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const loadGridFromDB = async (): Promise<HexGrid> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('hexGridData');
    
    request.onsuccess = () => {
      resolve(request.result || {});
    };
    request.onerror = () => reject(request.error);
  });
};

const saveGridToDB = async (grid: HexGrid): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(grid, 'hexGridData');
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// 🪄 Функция нормализации (приводит любой формат edges к новому)
const normalizeEdges = (edges: any): Record<HexEdge, EdgeFeatures> => {
  const result: Record<HexEdge, EdgeFeatures> = {
    NW: { ...DEFAULT_EDGE },
    NE: { ...DEFAULT_EDGE },
    W: { ...DEFAULT_EDGE },
    E: { ...DEFAULT_EDGE },
    SW: { ...DEFAULT_EDGE },
    SE: { ...DEFAULT_EDGE },
  };

  if (!edges || typeof edges !== 'object') return result;

  const edgeKeys: HexEdge[] = ['NW', 'NE', 'W', 'E', 'SW', 'SE'];

  for (const key of edgeKeys) {
    const val = edges[key];
    if (val && typeof val === 'object') {
      // Если пришёл объект с полями — копируем известные
      result[key] = {
        coast: Boolean(val.coast),
        mainRail: Boolean(val.mainRail),
        secRail: Boolean(val.secRail),
        highway: Boolean(val.highway),
        dirtRoad: Boolean(val.dirtRoad),
        minorRiver: Boolean(val.minorRiver),
        majorRiver: Boolean(val.majorRiver),
        navRiver: Boolean(val.navRiver),
        blocked: Boolean(val.blocked),
      };
    } else if (val === true) {
      // Если пришёл boolean (старый формат) — ставим coast как заглушку? 
      // Лучше игнорировать — сохраняем пустым
    }
  }

  return result;
};

export default function HexGridEditor({ onBack, strategicMapData }: HexGridEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAP_WIDTH = strategicMapData?.mapWidth || 9703;
  const MAP_HEIGHT = strategicMapData?.mapHeight || 7767;
  
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: 1200, height: 800, zoom: 1 });
  const [hexGrid, setHexGrid] = useState<HexGrid>({});
  
  const [activeBrush, setActiveBrush] = useState<'select' | 'terrain' | 'erase'>('select');
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType | null>(null);
  const [selectedHex, setSelectedHex] = useState<{ r: number, c: number } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showCoords, setShowCoords] = useState(false);

  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const hexSampleImage = useRef<HTMLImageElement | null>(null);

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

  useEffect(() => {
    loadGridFromDB().then(data => {
      // 🪄 Нормализуем при загрузке — даже старые данные не сломают
      const normalized: HexGrid = {};
      for (const [key, hex] of Object.entries(data)) {
        normalized[key] = {
          terrain: hex.terrain,
          edges: normalizeEdges(hex.edges),
          isReady: hex.isReady || false,
        };
      }
      setHexGrid(normalized);
    }).catch(err => {
      console.error("Ошибка загрузки карты из IndexedDB:", err);
    });
  }, []);

  const importFromLocalStorage = async () => {
    try {
      const legacyData = localStorage.getItem('naval_battle_hex_grid');
      if (!legacyData) {
        alert('В localStorage не найдено старых данных.');
        return;
      }
      const parsed = JSON.parse(legacyData);
      // 🪄 Нормализуем
      const normalized: HexGrid = {};
      for (const [key, hex] of Object.entries(parsed as any)) {
        normalized[key] = {
          terrain: (hex as any).terrain,
          edges: normalizeEdges((hex as any).edges),
          isReady: (hex as any).isReady || false,
        };
      }
      setHexGrid(normalized);
      await saveGridToDB(normalized);
      alert('✅ Данные успешно импортированы из localStorage!');
    } catch (e) {
      console.error(e);
      alert('❌ Ошибка импорта: ' + (e as Error).message);
    }
  };

  // 🪄 Загрузка с сервера
  const loadFromServer = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/hexmap');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // 🪄 Нормализуем каждый гекс (даже если старый формат)
      const newGrid: HexGrid = {};
      for (const hex of data.hexes) {
        newGrid[`${hex.row},${hex.col}`] = {
          terrain: hex.terrain,
          edges: normalizeEdges(hex.edges),
          isReady: hex.isReady || false,
        };
      }

      setHexGrid(newGrid);
      await saveGridToDB(newGrid);
      alert(`✅ Загружено с сервера: ${data.hexes.length} гексов`);
    } catch (e) {
      console.error(e);
      alert('❌ Ошибка загрузки с сервера: ' + (e as Error).message);
    }
  };

  // 🪄 Экспорт в JSON
  const exportToJSON = () => {
    const data = {
      hexes: Object.entries(hexGrid).map(([key, hex]) => {
        const [row, col] = key.split(',').map(Number);
        return {
          row,
          col,
          terrain: hex.terrain,
          edges: hex.edges,
          isReady: hex.isReady || false,
        };
      }),
      exportedAt: new Date().toISOString(),
      totalHexes: Object.keys(hexGrid).length,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hexmap_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { hexSampleImage.current = img; return; }
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
        const processedImg = new Image();
        processedImg.onload = () => { hexSampleImage.current = processedImg; };
        processedImg.src = canvas.toDataURL('image/png');
      };
      img.src = strategicMapData.hexSample;
    } else {
      hexSampleImage.current = null;
    }
  }, [strategicMapData?.hexSample]);

  const changeZoom = (newZoom: number) => {
    if (newZoom === viewport.zoom) return;
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const worldX = viewport.x / viewport.zoom + centerX / viewport.zoom;
    const worldY = viewport.y / viewport.zoom + centerY / viewport.zoom;
    const newX = worldX * newZoom - centerX;
    const newY = worldY * newZoom - centerY;
    setViewport(prev => ({
      ...prev, zoom: newZoom,
      x: Math.max(0, Math.min(MAP_WIDTH * newZoom - prev.width, newX)),
      y: Math.max(0, Math.min(MAP_HEIGHT * newZoom - prev.height, newY))
    }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedHex) return;
      
      let newR = selectedHex.r;
      let newC = selectedHex.c;
      const isOdd = selectedHex.r % 2 !== 0;

      switch (e.key) {
        case 'ArrowUp': newR -= 1; break;
        case 'ArrowDown': newR += 1; break;
        case 'ArrowLeft': 
          newC -= 1; 
          if (isOdd) newR -= 1;
          break;
        case 'ArrowRight': 
          newC += 1; 
          if (isOdd) newR -= 1;
          break;
        default: return;
      }

      if (newR < 0) newR = 0;
      if (newC < 0) newC = 0;

      setSelectedHex({ r: newR, c: newC });
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const visibleX = viewport.x / viewport.zoom;
    const visibleY = viewport.y / viewport.zoom;
    const visibleWidth = viewport.width / viewport.zoom;
    const visibleHeight = viewport.height / viewport.zoom;

    if (strategicMapData?.tiles) {
      const cols = 7;
      strategicMapData.tiles.forEach(tile => {
        const row = Math.floor(tile.id / cols);
        const col = tile.id % cols;
        const isLastCol = col === 6;
        const isLastRow = row === 5;
        let x = 0; for (let c = 0; c < col; c++) { x += (c === 6 ? 703 : 1500); }
        let y = 0; for (let r = 0; r < row; r++) { y += (r === 5 ? 267 : 1500); }
        const w = isLastCol ? 703 : 1500;
        const h = isLastRow ? 267 : 1500;

        if (x + w < visibleX || x > visibleX + visibleWidth || y + h < visibleY || y > visibleY + visibleHeight) return;

        const img = imageCache.current.get(tile.imageData);
        if (img && img.complete) {
          ctx.drawImage(img, (x - visibleX) * viewport.zoom, (y - visibleY) * viewport.zoom, w * viewport.zoom, h * viewport.zoom);
        }
      });
    }

    const hexWidth = 21;
    const hexHeight = 25;
    const hexSpacingX = hexWidth;
    const hexSpacingY = hexHeight * 0.75;
    
    const sampleWidth = hexWidth * viewport.zoom;
    const sampleHeight = hexHeight * viewport.zoom;

    const startHexRow = Math.max(0, Math.floor(visibleY / hexSpacingY) - 1);
    const endHexRow = Math.ceil((visibleY + visibleHeight) / hexSpacingY) + 1;
    const startHexCol = Math.max(0, Math.floor(visibleX / hexSpacingX) - 1);
    const endHexCol = Math.ceil((visibleX + visibleWidth) / hexSpacingX) + 1;

    for (let row = startHexRow; row < endHexRow; row++) {
      for (let col = startHexCol; col < endHexCol; col++) {
        const key = `${row},${col}`;
        const hex = hexGrid[key];
        if (!hex || hex.terrain === 'deep_ocean') continue;

        const offsetX = (row % 2) * (hexSpacingX / 2);
        const centerX = col * hexSpacingX + offsetX;
        const centerY = row * hexSpacingY;

        const screenX = (centerX - visibleX) * viewport.zoom;
        const screenY = (centerY - visibleY) * viewport.zoom;

        ctx.fillStyle = TERRAIN_INFO[hex.terrain]?.color || 'rgba(0,0,0,0)';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = -Math.PI / 2 + (Math.PI / 3) * i;
          const px = screenX + (hexWidth / 2 * viewport.zoom) * Math.cos(angle);
          const py = screenY + (hexHeight / 2 * viewport.zoom) * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    if (hexSampleImage.current) {
      const sampleImg = hexSampleImage.current;
      const hexOpacity = strategicMapData?.hexGridOpacity ?? 0.3;
      ctx.globalAlpha = hexOpacity;
      
      for (let row = startHexRow; row < endHexRow; row++) {
        for (let col = startHexCol; col < endHexCol; col++) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const centerX = col * hexSpacingX + offsetX;
          const centerY = row * hexSpacingY;
          const screenX = (centerX - visibleX) * viewport.zoom - sampleWidth / 2 + 0.5;
          const screenY = (centerY - visibleY) * viewport.zoom - sampleHeight / 2 + 0.5;
          ctx.drawImage(sampleImg, screenX, screenY, sampleWidth, sampleHeight);
        }
      }
      ctx.globalAlpha = 1.0;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let row = startHexRow; row < endHexRow; row++) {
        for (let col = startHexCol; col < endHexCol; col++) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const cx = (col * hexSpacingX + offsetX - visibleX) * viewport.zoom;
          const cy = (row * hexSpacingY - visibleY) * viewport.zoom;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = -Math.PI / 2 + (Math.PI / 3) * i;
            const px = cx + (hexWidth / 2 * viewport.zoom) * Math.cos(angle);
            const py = cy + (hexHeight / 2 * viewport.zoom) * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    for (let row = startHexRow; row < endHexRow; row++) {
      for (let col = startHexCol; col < endHexCol; col++) {
        const key = `${row},${col}`;
        const hex = hexGrid[key];
        
        const isSelected = selectedHex?.r === row && selectedHex?.c === col;
        const isReady = hex?.isReady;

        if (isSelected) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const centerX = col * hexSpacingX + offsetX;
          const centerY = row * hexSpacingY;
          const screenX = (centerX - visibleX) * viewport.zoom;
          const screenY = (centerY - visibleY) * viewport.zoom;

          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = -Math.PI / 2 + (Math.PI / 3) * i;
            const px = screenX + (hexWidth / 2 * viewport.zoom) * Math.cos(angle);
            const py = screenY + (hexHeight / 2 * viewport.zoom) * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        } 
        else if (isReady) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const centerX = col * hexSpacingX + offsetX;
          const centerY = row * hexSpacingY;
          const screenX = (centerX - visibleX) * viewport.zoom;
          const screenY = (centerY - visibleY) * viewport.zoom;

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = -Math.PI / 2 + (Math.PI / 3) * i;
            const px = screenX + (hexWidth / 2 * viewport.zoom) * Math.cos(angle);
            const py = screenY + (hexHeight / 2 * viewport.zoom) * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    if (showCoords) {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(6, Math.min(10, 8 * viewport.zoom));
      ctx.font = `${fontSize}px sans-serif`;
      for (let row = startHexRow; row < endHexRow; row++) {
        for (let col = startHexCol; col < endHexCol; col++) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const centerX = col * hexSpacingX + offsetX;
          const centerY = row * hexSpacingY;
          const screenX = (centerX - visibleX) * viewport.zoom;
          const screenY = (centerY - visibleY) * viewport.zoom;
          ctx.fillText(`${row},${col}`, screenX, screenY);
        }
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textSize = Math.max(8, Math.min(14, 10 * viewport.zoom));
    ctx.font = `bold ${textSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    for (let row = startHexRow; row < endHexRow; row++) {
      for (let col = startHexCol; col < endHexCol; col++) {
        const key = `${row},${col}`;
        const hex = hexGrid[key];
        if (!hex || hex.terrain === 'deep_ocean') continue;
        const offsetX = (row % 2) * (hexSpacingX / 2);
        const centerX = col * hexSpacingX + offsetX;
        const centerY = row * hexSpacingY;
        const screenX = (centerX - visibleX) * viewport.zoom;
        const screenY = (centerY - visibleY) * viewport.zoom;
        const abbr = TERRAIN_INFO[hex.terrain]?.abbr;
        if (abbr) {
          ctx.strokeText(abbr, screenX, screenY);
          ctx.fillText(abbr, screenX, screenY);
        }
      }
    }

  }, [viewport, hexGrid, strategicMapData, showCoords, selectedHex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setViewport(prev => ({ 
        ...prev, 
        x: Math.max(0, Math.min(MAP_WIDTH * prev.zoom - prev.width, prev.x - dx)),
        y: Math.max(0, Math.min(MAP_HEIGHT * prev.zoom - prev.height, prev.y - dy))
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const dx = Math.abs(e.clientX - dragStart.x);
    const dy = Math.abs(e.clientY - dragStart.y);
    if (dx > 5 || dy > 5) return; 

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left + viewport.x;
    const mouseY = e.clientY - rect.top + viewport.y;
    const worldX = mouseX / viewport.zoom;
    const worldY = mouseY / viewport.zoom;
    
    const hexWidth = 21; const hexHeight = 25;
    const hexSpacingX = hexWidth; const hexSpacingY = hexHeight * 0.75;
    let row = Math.floor(worldY / hexSpacingY);
    let offsetX = (row % 2) * (hexSpacingX / 2);
    let col = Math.floor((worldX - offsetX) / hexSpacingX);

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
      const dist = Math.pow(worldX - centerX, 2) + Math.pow(worldY - centerY, 2);
      if (dist < minDistance) { minDistance = dist; bestHex = cand; }
    }
    row = bestHex.r; col = bestHex.c;

    setSelectedHex({ r: row, c: col });

    if (activeBrush === 'select') {
      return;
    }

    if (activeBrush === 'terrain') {
      if (!selectedTerrain) return;

      setHexGrid(prev => {
        const newGrid = { ...prev };
        let hex = newGrid[`${row},${col}`];
        if (!hex) {
          hex = { terrain: 'deep_ocean', edges: JSON.parse(JSON.stringify(DEFAULT_EDGES)) };
        }
        hex.terrain = selectedTerrain;
        newGrid[`${row},${col}`] = hex;
        saveGridToDB(newGrid).catch(console.error);
        return newGrid;
      });
    } 
    else if (activeBrush === 'erase') {
      setHexGrid(prev => {
        const newGrid = { ...prev };
        const key = `${row},${col}`;
        const existingHex = newGrid[key];
        
        if (existingHex) {
          newGrid[key] = {
            ...existingHex,
            terrain: 'deep_ocean'
          };
        }
        saveGridToDB(newGrid).catch(console.error);
        return newGrid;
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    let currentIndex = ZOOM_LEVELS.indexOf(viewport.zoom);
    if (currentIndex === -1) currentIndex = 0;
    let nextIndex = currentIndex;
    if (e.deltaY < 0 && currentIndex < ZOOM_LEVELS.length - 1) nextIndex++;
    if (e.deltaY > 0 && currentIndex > 0) nextIndex--;
    if (nextIndex !== currentIndex) changeZoom(ZOOM_LEVELS[nextIndex]);
  };

  const updateEdge = (edge: HexEdge, feature: keyof EdgeFeatures) => {
    if (!selectedHex) return;
    const key = `${selectedHex.r},${selectedHex.c}`;
    
    setHexGrid(prev => {
      const newGrid = { ...prev };
      let hex = newGrid[key];
      
      if (!hex) {
        hex = { terrain: 'deep_ocean', edges: JSON.parse(JSON.stringify(DEFAULT_EDGES)) };
      }
      
      if (!hex.edges || !hex.edges[edge]) {
        hex.edges = JSON.parse(JSON.stringify(DEFAULT_EDGES));
      }
      
      const newEdges = JSON.parse(JSON.stringify(hex.edges));
      newEdges[edge][feature] = !newEdges[edge][feature];
      
      if (feature === 'mainRail' && newEdges[edge].mainRail) {
        newEdges[edge].secRail = false;
      }
      if (feature === 'secRail' && newEdges[edge].secRail) {
        newEdges[edge].mainRail = false;
      }
      if (feature === 'highway' && newEdges[edge].highway) {
        newEdges[edge].dirtRoad = false;
      }
      if (feature === 'dirtRoad' && newEdges[edge].dirtRoad) {
        newEdges[edge].highway = false;
      }
      if (feature === 'minorRiver' && newEdges[edge].minorRiver) {
        newEdges[edge].majorRiver = false;
        newEdges[edge].navRiver = false;
      }
      if (feature === 'majorRiver' && newEdges[edge].majorRiver) {
        newEdges[edge].minorRiver = false;
        newEdges[edge].navRiver = false;
      }
      if (feature === 'navRiver' && newEdges[edge].navRiver) {
        newEdges[edge].minorRiver = false;
        newEdges[edge].majorRiver = false;
      }

      newGrid[key] = { ...hex, edges: newEdges };
      saveGridToDB(newGrid).catch(console.error); 
      
      return newGrid;
    });
  };

  const toggleReady = () => {
    if (!selectedHex) return;
    const key = `${selectedHex.r},${selectedHex.c}`;
    setHexGrid(prev => {
      const newGrid = { ...prev };
      let hex = newGrid[key];
      if (!hex) {
         hex = { terrain: 'plain', edges: JSON.parse(JSON.stringify(DEFAULT_EDGES)) };
      }
      hex.isReady = !hex.isReady;
      newGrid[key] = hex;
      saveGridToDB(newGrid).catch(console.error);
      return newGrid;
    });
  };

  const currentHex = selectedHex ? hexGrid[`${selectedHex.r},${selectedHex.c}`] : null;
  const currentEdges = currentHex?.edges || DEFAULT_EDGES;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex flex-col gap-4">
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button type="button" onClick={onBack} className="bg-slate-700 px-4 py-2 rounded">← Назад</button>
            <h1 className="text-xl font-bold text-cyan-300">🗺️ Картограф (Гексы)</h1>
          </div>

          <div className="flex gap-4 bg-slate-900 p-2 rounded border border-slate-600 items-center">
            <select 
              value={activeBrush} 
              onChange={(e) => setActiveBrush(e.target.value as any)}
              className="bg-slate-700 p-2 rounded text-sm"
            >
              <option value="select">👆 Режим: Выбор гекса</option>
              <option value="terrain">🖌️ Режим: Кисть (красить)</option>
              <option value="erase">🗑️ Режим: Стереть</option>
            </select>

            <button 
              type="button"
              onClick={() => setShowCoords(prev => !prev)}
              className={`px-3 py-2 text-sm rounded transition-colors border ${
                showCoords 
                  ? 'bg-cyan-600 border-cyan-500 text-white' 
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {showCoords ? '👁️ Скрыть координаты' : '👁️ Показать координаты'}
            </button>

            <button 
              type="button"
              onClick={importFromLocalStorage}
              className="px-3 py-2 text-sm rounded transition-colors border bg-yellow-900/50 border-yellow-600 text-yellow-200 hover:bg-yellow-800/50"
            >
              📥 Импорт из localStorage
            </button>

            {/* 🪄 Кнопка загрузки с сервера */}
            <button 
              type="button"
              onClick={loadFromServer}
              className="px-3 py-2 text-sm rounded transition-colors border bg-blue-900/50 border-blue-600 text-blue-200 hover:bg-blue-800/50"
            >
              📥 Загрузить с сервера
            </button>

            {/* 🪄 Кнопка экспорта в JSON */}
            <button 
              type="button"
              onClick={exportToJSON}
              className="px-3 py-2 text-sm rounded transition-colors border bg-green-900/50 border-green-600 text-green-200 hover:bg-green-800/50"
            >
              💾 Экспорт в JSON
            </button>

            <div className="flex gap-1 ml-4 pl-4 border-l border-slate-600">
              <button type="button" onClick={() => changeZoom(1)} className={`px-2 py-1 text-xs rounded ${viewport.zoom === 1 ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}>100%</button>
              <button type="button" onClick={() => changeZoom(2)} className={`px-2 py-1 text-xs rounded ${viewport.zoom === 2 ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}>200%</button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs bg-slate-900/50 p-2 rounded border border-slate-700 items-center">
          <button 
            type="button"
            onClick={() => {
              setActiveBrush('select');
              setSelectedTerrain(null);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all border mr-2 ${
              activeBrush === 'select'
                ? 'border-cyan-400 bg-cyan-900/50 shadow-[0_0_8px_rgba(34,211,238,0.5)] text-white' 
                : 'border-slate-600 hover:bg-slate-700/50 text-slate-300'
            }`}
          >
            <span>👆</span>
            <span className="font-medium">Выбор гекса</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveBrush('erase')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all border mr-2 ${
              activeBrush === 'erase'
                ? 'border-red-500 bg-red-900/50 shadow-[0_0_8px_rgba(239,68,68,0.5)] text-white' 
                : 'border-slate-600 hover:bg-slate-700/50 text-slate-300'
            }`}
          >
            <span>🗑️</span>
            <span className="font-medium">Стереть</span>
          </button>

          <div className="w-px h-6 bg-slate-600 mr-2"></div>

          {Object.entries(TERRAIN_INFO).filter(([key]) => key !== 'deep_ocean').map(([key, info]) => (
            <button 
              type="button"
              key={key} 
              onClick={() => {
                setActiveBrush('terrain');
                setSelectedTerrain(key as TerrainType);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all border ${
                selectedTerrain === key && activeBrush === 'terrain'
                  ? 'border-cyan-400 bg-slate-700 shadow-[0_0_8px_rgba(34,211,238,0.5)]' 
                  : 'border-transparent hover:bg-slate-700/50'
              }`}
            >
              <div className="w-3 h-3 rounded-sm border border-slate-600" style={{ backgroundColor: info.color }}></div>
              <span className="text-slate-300 font-medium">{info.abbr}</span>
              <span className="text-slate-500 hidden md:inline">{info.name}</span>
            </button>
          ))}
        </div>

      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDragging(false)}
          onWheel={handleWheel}
        >
          <canvas 
            ref={canvasRef} 
            width={viewport.width} 
            height={viewport.height} 
            className="absolute top-0 left-0"
          />
        </div>

        <div className="w-[520px] bg-slate-800 border-l border-slate-700 p-4 flex flex-col shadow-xl z-10 overflow-y-auto">
          <h3 className="text-sm font-bold text-cyan-300 mb-2">Редактор гекса</h3>
          
          {selectedHex ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="text-xs text-slate-400">
                  Выбран гекс: <span className="text-white font-mono">{selectedHex.r},{selectedHex.c}</span>
                </div>
                <button 
                  type="button"
                  onClick={toggleReady}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    currentHex?.isReady 
                      ? 'bg-red-900/50 border-red-500 text-red-200' 
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {currentHex?.isReady ? '❌ Снять готовность' : '✔️ Готовый гекс'}
                </button>
              </div>

              <div className="relative w-[500px] h-[440px] bg-slate-900/50 rounded-lg flex items-center justify-center border border-slate-700 mx-auto mb-4 overflow-hidden">
                
                <svg width="500" height="440" viewBox="0 0 500 440" className="absolute inset-0 w-full h-full">
                  <polygon 
                    points="250,40 410,130 410,310 250,400 90,310 90,130" 
                    fill="rgba(30, 58, 138, 0.5)" 
                    stroke="#22d3ee" 
                    strokeWidth="2" 
                  />

                  {(['NW', 'NE', 'W', 'E', 'SW', 'SE'] as HexEdge[]).map(edge => {
                    const features = currentEdges[edge];
                    
                    const points = [
                      { x: 250, y: 40 }, { x: 410, y: 130 }, { x: 410, y: 310 }, 
                      { x: 250, y: 400 }, { x: 90, y: 310 }, { x: 90, y: 130 }
                    ];
                    const edgeIndex: Record<HexEdge, [number, number]> = {
                      NE: [0, 1], E: [1, 2], SE: [2, 3], SW: [3, 4], W: [4, 5], NW: [5, 0],
                    };
                    const [idx1, idx2] = edgeIndex[edge];
                    const p1 = points[idx1];
                    const p2 = points[idx2];

                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    
                    const nx = -dy / len;
                    const ny = dx / len;
                    
                    const tx = dx / len;
                    const ty = dy / len;

                    const edgeCenterX = (p1.x + p2.x) / 2;
                    const edgeCenterY = (p1.y + p2.y) / 2;

                    const cx = 250;
                    const cy = 220;

                    const shiftPoint = (shiftTangential: number) => ({
                      x: edgeCenterX + tx * shiftTangential + nx * 10, 
                      y: edgeCenterY + ty * shiftTangential + ny * 10,
                    });

                    const shiftCenter = (shiftTangential: number) => ({
                      x: cx + tx * shiftTangential,
                      y: cy + ty * shiftTangential,
                    });

                    const RAIL_SHIFT = -14;
                    const ROAD_SHIFT = 14;

                    const railStart = shiftPoint(RAIL_SHIFT);
                    const railEnd = shiftCenter(RAIL_SHIFT);
                    const roadStart = shiftPoint(ROAD_SHIFT);
                    const roadEnd = shiftCenter(ROAD_SHIFT);

                    return (
                      <g key={edge}>
                        {features?.coast && (
                          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" />
                        )}

                        {features?.blocked && (
                          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
                        )}

                        {features?.minorRiver && (
                          <line 
                            x1={p1.x + nx * 12} y1={p1.y + ny * 12} 
                            x2={p2.x + nx * 12} y2={p2.y + ny * 12} 
                            stroke="#00bfff" strokeWidth="3" strokeLinecap="round"
                          />
                        )}
                        {features?.majorRiver && (
                          <line 
                            x1={p1.x + nx * 14} y1={p1.y + ny * 14} 
                            x2={p2.x + nx * 14} y2={p2.y + ny * 14} 
                            stroke="#00bfff" strokeWidth="6" strokeLinecap="round"
                          />
                        )}
                        {features?.navRiver && (
                          <>
                            <line 
                              x1={p1.x + nx * 16} y1={p1.y + ny * 16} 
                              x2={p2.x + nx * 16} y2={p2.y + ny * 16} 
                              stroke="#ffffff" strokeWidth="14" strokeLinecap="round"
                            />
                            <line 
                              x1={p1.x + nx * 16} y1={p1.y + ny * 16} 
                              x2={p2.x + nx * 16} y2={p2.y + ny * 16} 
                              stroke="#1e3a8a" strokeWidth="10" strokeLinecap="round"
                            />
                          </>
                        )}

                        {features?.mainRail && (
                          <>
                            <line 
                              x1={railStart.x} y1={railStart.y} 
                              x2={railEnd.x} y2={railEnd.y} 
                              stroke="#000" strokeWidth="4" 
                            />
                            <line 
                              x1={railStart.x} y1={railStart.y} 
                              x2={railEnd.x} y2={railEnd.y} 
                              stroke="#fff" strokeWidth="4" strokeDasharray="4 4" 
                            />
                          </>
                        )}
                        {features?.secRail && (
                          <line 
                            x1={railStart.x} y1={railStart.y} 
                            x2={railEnd.x} y2={railEnd.y} 
                            stroke="#000" strokeWidth="4" 
                          />
                        )}

                        {features?.highway && (
                          <line 
                            x1={roadStart.x} y1={roadStart.y} 
                            x2={roadEnd.x} y2={roadEnd.y} 
                            stroke="#eab308" strokeWidth="3" 
                          />
                        )}
                        {features?.dirtRoad && (
                          <line 
                            x1={roadStart.x} y1={roadStart.y} 
                            x2={roadEnd.x} y2={roadEnd.y} 
                            stroke="#78350f" strokeWidth="6" strokeDasharray="3 3" 
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {currentHex && currentHex.terrain !== 'deep_ocean' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div className="text-3xl font-bold text-white drop-shadow-lg opacity-80 text-center">
                      {TERRAIN_INFO[currentHex.terrain]?.abbr}
                      <div className="text-[10px] font-normal text-slate-300 mt-1">
                        {TERRAIN_INFO[currentHex.terrain]?.name}
                      </div>
                    </div>
                  </div>
                )}

                {(['NW', 'NE', 'W', 'E', 'SW', 'SE'] as HexEdge[]).map(edge => {
                  const pos = {
                    NW: { x: 125, y: 90, rot: 30 },
                    NE: { x: 375, y: 90, rot: -30 },
                    W:  { x: 50, y: 220, rot: 90 },
                    E:  { x: 450, y: 220, rot: -90 },
                    SW: { x: 125, y: 350, rot: -30 },
                    SE: { x: 375, y: 350, rot: 30 },
                  }[edge];
                  
                  const features = currentEdges[edge];
                  
                  return (
                    <div 
                      key={edge} 
                      className="absolute flex flex-col items-center z-10"
                      style={{ 
                        left: `${pos.x}px`, 
                        top: `${pos.y}px`,
                        transform: `translate(-50%, -50%) rotate(${pos.rot}deg)`
                      }}
                    >
                      <div 
                        className="bg-slate-800/95 p-1 rounded border border-slate-600 shadow-xl grid grid-cols-3 gap-1"
                        style={{ 
                          transform: `rotate(${-pos.rot}deg)`,
                          width: '96px',
                          minHeight: '96px'
                        }}
                      >
                        <button type="button" onClick={() => updateEdge(edge, 'coast')}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs ${features?.coast ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Побережье">🌊</button>

                        <button type="button" onClick={() => updateEdge(edge, 'mainRail')}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs ${features?.mainRail ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Главная ЖД">🛤️</button>

                        <button type="button" onClick={() => updateEdge(edge, 'secRail')}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs ${features?.secRail ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Второстепенная ЖД">🚂</button>

                        <button type="button" onClick={() => updateEdge(edge, 'highway')}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs ${features?.highway ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Автодорога">🛣️</button>

                        <button type="button" onClick={() => updateEdge(edge, 'dirtRoad')}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs ${features?.dirtRoad ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Грунтовка">⛰️</button>

                        <button type="button" onClick={() => updateEdge(edge, 'minorRiver')}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs ${features?.minorRiver ? 'bg-sky-400 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Малая река">〰️</button>

                        <button type="button" onClick={() => updateEdge(edge, 'majorRiver')}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs ${features?.majorRiver ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Большая река">💧</button>

                        <button type="button" onClick={() => updateEdge(edge, 'navRiver')}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs ${features?.navRiver ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Судоходная река">🚢</button>

                        <button type="button" onClick={() => updateEdge(edge, 'blocked')}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs ${features?.blocked ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title="Запрет">🚫</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-slate-400">
                <p className="mb-1"><span className="font-bold text-slate-300">Обозначения:</span></p>
                <div className="grid grid-cols-3 gap-1">
                  <p>🌊 - Побережье</p>
                  <p>🛤️ - Главная ЖД</p>
                  <p>🚂 - Второст. ЖД</p>
                  <p>🛣️ - Автодорога</p>
                  <p>⛰️ - Грунтовка</p>
                  <p>〰️ - Малая река</p>
                  <p>💧 - Большая река</p>
                  <p>🚢 - Судоходная река</p>
                  <p>🚫 - Запрет</p>
                </div>
                {!selectedTerrain && activeBrush === 'terrain' && (
                  <p className="mt-2 text-yellow-400">⚠️ Выберите тип местности в легенде сверху</p>
                )}
                <p className="mt-2 text-cyan-300">💡 Используйте стрелки клавиатуры (← ↑ → ↓) для перемещения по соседним гексам.</p>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 text-center mt-10">
              Кликните по любому гексу на карте, чтобы отредактировать его стороны.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}