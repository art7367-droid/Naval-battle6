import { useState, useRef, useEffect, useCallback } from 'react';
import { StrategicMapData } from '../types/shipDatabase'; // 🪄 Исправлен путь
import { createCompartments, calculateShipStats } from '../types'; // 🪄 Исправлен путь

interface GameMapViewProps {
  onBack: () => void;
  strategicMapData?: StrategicMapData;
  gameId: string;
  token: string;
  campaignConfig?: any;
  onStartBattle?: (playerTF: any, enemyTF: any) => void;
  onStartLandBattle?: (playerUnit: any, enemyUnit: any) => void;
}

interface Viewport { x: number; y: number; width: number; height: number; zoom: number; }

interface TaskForce {
  id: string; game_id: string; owner: string; name: string; row: number; col: number; status: string; mission: string;
}

interface LandUnit {
  id: number;
  name: string;
  icon_url: string;
  owner: string; // 'japan' | 'usa'
  row: number;
  col: number;
  type: 'land';
}

const ZOOM_LEVELS = [0.5, 1, 1.5, 2];
const MINI_MAP_HEIGHT = 200;
type CampaignPhase = 'jp_movement' | 'us_movement' | 'resolution';

export default function GameMapView({ 
  onBack, strategicMapData, gameId, token, campaignConfig, 
  onStartBattle, onStartLandBattle 
}: GameMapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniMapCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAP_WIDTH = strategicMapData?.mapWidth || 9703;
  const MAP_HEIGHT = strategicMapData?.mapHeight || 7767;
  const MINI_MAP_WIDTH = MINI_MAP_HEIGHT * (MAP_WIDTH / MAP_HEIGHT);

  const [viewport, setViewport] = useState<Viewport>({
    x: 0, y: 0, width: 1200, height: 800, zoom: 1
  });

  const [taskForces, setTaskForces] = useState<TaskForce[]>([]);
  const [landUnits, setLandUnits] = useState<LandUnit[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<any[]>([]);
  
  const [selectedTF, setSelectedTF] = useState<TaskForce | null>(null);
  const [selectedLandUnit, setSelectedLandUnit] = useState<LandUnit | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [cursorHex, setCursorHex] = useState<{ row: number; col: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [campaignPhase, setCampaignPhase] = useState<CampaignPhase>('jp_movement');
  const [turnNumber, setTurnNumber] = useState(1);
  const [jpOrders, setJpOrders] = useState<{ tfId: string, targetRow: number, targetCol: number }[]>([]);
  const [usOrders, setUsOrders] = useState<{ tfId: string, targetRow: number, targetCol: number }[]>([]);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const isMiniMapDraggingRef = useRef(false);

  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const hexSampleImage = useRef<HTMLImageElement | null>(null);
  const landUnitImages = useRef<Map<string, HTMLImageElement>>(new Map());

  // === ЗАГРУЗКА ДИВИЗИЙ ИЗ БАЗЫ ===
  useEffect(() => {
    fetch('http://localhost:4000/api/admin/land-units')
      .then(res => res.json())
      .then(data => {
        console.log('🪄 Загружены дивизии из базы:', data);
        setAvailableDivisions(Array.isArray(data) ? data : []);
        data.forEach((u: any) => {
          if (u.icon_url && !landUnitImages.current.has(u.icon_url)) {
            const img = new Image();
            img.src = u.icon_url;
            landUnitImages.current.set(u.icon_url, img);
          }
        });
      })
      .catch(err => console.error('Ошибка загрузки дивизий:', err));
  }, []);

  // === РЕСАЙЗ ===
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

  // === ЗАГРУЗКА ОГ ===
  useEffect(() => {
    if (campaignConfig) {
      const startTFs: TaskForce[] = [
        { id: 'jp-1', game_id: gameId, owner: 'japan', name: '1-й флот', row: 10, col: 10, status: 'active', mission: 'patrol' },
        { id: 'us-1', game_id: gameId, owner: 'usa', name: 'Тихоокеанский флот', row: 15, col: 15, status: 'active', mission: 'patrol' }
      ];
      setTaskForces(startTFs);
    }
    setLoading(false);
  }, [gameId, token, campaignConfig]);

  // === СОЗДАНИЕ ОГ ===
  const handleCreateTF = () => {
    const ownerSide = campaignPhase === 'jp_movement' ? 'japan' : 'usa';
    const newTF: TaskForce = {
      id: `tf-${Date.now()}`, game_id: gameId, owner: ownerSide,
      name: `${ownerSide === 'japan' ? 'Яп' : 'США'}-TF-${taskForces.length + 1}`,
      row: Math.floor(Math.random() * 20) + 5, col: Math.floor(Math.random() * 20) + 5,
      status: 'active', mission: 'patrol'
    };
    setTaskForces([...taskForces, newTF]);
    setSelectedTF(newTF);
  };

  // 🪄 СОЗДАНИЕ ДИВИЗИИ (Из базы с передачей icon_url)
  const handleCreateDivision = () => {
    if (availableDivisions.length === 0) {
      alert('В базе данных нет дивизий! Создайте их в Редакторе Баз Данных.');
      return;
    }
    const ownerSide = campaignPhase === 'jp_movement' ? 'japan' : 'usa';
    const randomDiv = availableDivisions[Math.floor(Math.random() * availableDivisions.length)];
    
    console.log('🪄 Создана дивизия:', randomDiv.name, 'с icon_url:', randomDiv.icon_url ? 'ДА' : 'НЕТ');

    const newUnit: LandUnit = {
      id: Date.now(),
      name: randomDiv.name,
      icon_url: randomDiv.icon_url, // 🪄 Передаем значок
      owner: ownerSide,
      row: Math.floor(Math.random() * 20) + 5,
      col: Math.floor(Math.random() * 20) + 5,
      type: 'land'
    };

    if (newUnit.icon_url && !landUnitImages.current.has(newUnit.icon_url)) {
      const img = new Image();
      img.src = newUnit.icon_url;
      landUnitImages.current.set(newUnit.icon_url, img);
    }

    setLandUnits([...landUnits, newUnit]);
    setSelectedLandUnit(newUnit);
  };

  // === ПЕРЕМЕЩЕНИЕ ===
  const handleMoveSelected = useCallback((targetRow: number, targetCol: number) => {
    const currentSide = campaignPhase === 'jp_movement' ? 'japan' : 'usa';

    // 1. ОГ
    if (selectedTF) {
      if (selectedTF.owner !== currentSide) return;
      const newOrder = { tfId: selectedTF.id, targetRow, targetCol };
      if (campaignPhase === 'jp_movement') setJpOrders(prev => [...prev.filter(o => o.tfId !== selectedTF.id), newOrder]);
      else setUsOrders(prev => [...prev.filter(o => o.tfId !== selectedTF.id), newOrder]);
      setTaskForces(prev => prev.map(tf => tf.id === selectedTF.id ? { ...tf, row: targetRow, col: targetCol } : tf));
      setSelectedTF(null);
    } 
    // 2. Дивизия
    else if (selectedLandUnit) {
      if (selectedLandUnit.owner !== currentSide) return;

      // Столкновение с врагом
      const enemyUnit = landUnits.find(u => u.owner !== selectedLandUnit.owner && u.row === targetRow && u.col === targetCol);
      if (enemyUnit && onStartLandBattle) {
        console.log('⚔️ Столкновение дивизий!', selectedLandUnit.name, 'vs', enemyUnit.name);
        onStartLandBattle(selectedLandUnit, enemyUnit);
        return;
      }

      setLandUnits(prev => prev.map(u => u.id === selectedLandUnit.id ? { ...u, row: targetRow, col: targetCol } : u));
      setSelectedLandUnit(null);
    }
  }, [selectedTF, selectedLandUnit, campaignPhase, landUnits, onStartLandBattle]);

  // === ЗАВЕРШЕНИЕ ХОДА ===
  const handleEndPhase = () => {
    if (campaignPhase === 'jp_movement') {
      setCampaignPhase('us_movement');
      setSelectedTF(null); setSelectedLandUnit(null);
    } else if (campaignPhase === 'us_movement') {
      setCampaignPhase('resolution');
      resolveMoves();
    }
  };

  // === РАЗРЕШЕНИЕ ХОДА ===
  const resolveMoves = () => {
    let updatedTFs = [...taskForces];
    usOrders.forEach(order => {
      updatedTFs = updatedTFs.map(tf => tf.id === order.tfId ? { ...tf, row: order.targetRow, col: order.targetCol } : tf);
    });
    setTaskForces(updatedTFs);

    let collisionDetected = false;
    for (let i = 0; i < updatedTFs.length; i++) {
      for (let j = i + 1; j < updatedTFs.length; j++) {
        const tf1 = updatedTFs[i];
        const tf2 = updatedTFs[j];
        if (tf1.owner !== tf2.owner && tf1.row === tf2.row && tf1.col === tf2.col) {
          collisionDetected = true;
          if (onStartBattle) {
            onStartBattle(tf1, tf2);
            return;
          }
        }
      }
    }

    if (!collisionDetected) {
      setTimeout(() => {
        setTurnNumber(t => t + 1);
        setCampaignPhase('jp_movement');
        setJpOrders([]); setUsOrders([]);
        setSelectedTF(null); setSelectedLandUnit(null);
      }, 1000);
    }
  };

  // === ЗАГРУЗКА ТАЙЛОВ ===
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

  // === ОТРИСОВКА ===
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
        const row = Math.floor(tile.id / cols); const col = tile.id % cols;
        const isLastCol = col === 6; const isLastRow = row === 5;
        let x = 0; for (let c = 0; c < col; c++) { x += (c === 6 ? 703 : 1500); }
        let y = 0; for (let r = 0; r < row; r++) { y += (r === 5 ? 267 : 1500); }
        const w = isLastCol ? 703 : 1500; const h = isLastRow ? 267 : 1500;
        if (x + w < visibleX || x > visibleX + visibleWidth || y + h < visibleY || y > visibleY + visibleHeight) return;
        const img = imageCache.current.get(tile.imageData);
        if (img && img.complete) ctx.drawImage(img, (x - visibleX) * viewport.zoom, (y - visibleY) * viewport.zoom, w * viewport.zoom, h * viewport.zoom);
      });
    }

    const hexWidth = 21; const hexHeight = 25;
    const hexSpacingX = hexWidth; const hexSpacingY = hexHeight * 0.75;
    const startHexRow = Math.max(0, Math.floor(visibleY / hexSpacingY) - 1);
    const endHexRow = Math.ceil((visibleY + visibleHeight) / hexSpacingY) + 1;
    const startHexCol = Math.max(0, Math.floor(visibleX / hexSpacingX) - 1);
    const endHexCol = Math.ceil((visibleX + visibleWidth) / hexSpacingX) + 1;

    if (showGrid && hexSampleImage.current) {
      const sampleImg = hexSampleImage.current;
      const sampleWidth = hexWidth * viewport.zoom; const sampleHeight = hexHeight * viewport.zoom;
      const hexOpacity = strategicMapData?.hexGridOpacity ?? 0.3;
      ctx.globalAlpha = hexOpacity;
      for (let row = startHexRow; row < endHexRow; row++) {
        for (let col = startHexCol; col < endHexCol; col++) {
          const offsetX = (row % 2) * (hexSpacingX / 2);
          const centerX = col * hexSpacingX + offsetX; const centerY = row * hexSpacingY;
          const screenX = (centerX - visibleX) * viewport.zoom - sampleWidth / 2 + 0.5;
          const screenY = (centerY - visibleY) * viewport.zoom - sampleHeight / 2 + 0.5;
          ctx.drawImage(sampleImg, screenX, screenY, sampleWidth, sampleHeight);
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // ОГ
    taskForces.forEach(tf => {
      const offsetX = (tf.row % 2) * (hexSpacingX / 2);
      const centerX = tf.col * hexSpacingX + offsetX; const centerY = tf.row * hexSpacingY;
      const screenX = (centerX - visibleX) * viewport.zoom; const screenY = (centerY - visibleY) * viewport.zoom;
      if (selectedTF?.id === tf.id) {
        ctx.beginPath(); ctx.arc(screenX, screenY, 12 * viewport.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(screenX, screenY, 8 * viewport.zoom, 0, Math.PI * 2);
      ctx.fillStyle = tf.owner === 'usa' ? '#3b82f6' : '#ef4444'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `${Math.max(10, 12 * viewport.zoom)}px sans-serif`; ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(tf.name, screenX, screenY - 15 * viewport.zoom); ctx.fillText(tf.name, screenX, screenY - 15 * viewport.zoom);
    });

    // 🪄 Дивизии (РИСУЕМ КАК КРУЖКИ, БЕЗ КАРТИНОК)
    landUnits.forEach(unit => {
      const offsetX = (unit.row % 2) * (hexSpacingX / 2);
      const centerX = unit.col * hexSpacingX + offsetX; const centerY = unit.row * hexSpacingY;
      const screenX = (centerX - visibleX) * viewport.zoom; const screenY = (centerY - visibleY) * viewport.zoom;
      
      if (selectedLandUnit?.id === unit.id) {
        ctx.beginPath(); ctx.arc(screenX, screenY, 15 * viewport.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.stroke();
      }

      // Рисуем просто квадрат/кружок для стратегической карты
      ctx.fillStyle = unit.owner === 'usa' ? '#3b82f6' : '#ef4444';
      ctx.fillRect(screenX - 10, screenY - 10, 20, 20); // Квадратик для дивизии

      ctx.font = `${Math.max(10, 11 * viewport.zoom)}px sans-serif`; ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(unit.name, screenX, screenY - 18 * viewport.zoom); ctx.fillText(unit.name, screenX, screenY - 18 * viewport.zoom);
    });

  }, [viewport, taskForces, landUnits, strategicMapData, showGrid, selectedTF, selectedLandUnit]);

  // === МИНИКАРТА ===
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
      const scaleX = canvas.width / MAP_WIDTH;
      const scaleY = canvas.height / MAP_HEIGHT;
      strategicMapData.tiles.forEach(tile => {
        const row = Math.floor(tile.id / cols); const col = tile.id % cols;
        const isLastCol = col === 6; const isLastRow = row === 5;
        let x = 0; for (let c = 0; c < col; c++) { x += (c === 6 ? 703 : 1500); }
        let y = 0; for (let r = 0; r < row; r++) { y += (r === 5 ? 267 : 1500); }
        const w = isLastCol ? 703 : 1500; const h = isLastRow ? 267 : 1500;
        const img = imageCache.current.get(tile.imageData);
        if (img && img.complete) ctx.drawImage(img, x * scaleX, y * scaleY, w * scaleX, h * scaleY);
      });
    }

    const scaleX = canvas.width / MAP_WIDTH;
    const scaleY = canvas.height / MAP_HEIGHT;
    const viewWorldX = viewport.x / viewport.zoom;
    const viewWorldY = viewport.y / viewport.zoom;
    const viewWorldW = viewport.width / viewport.zoom;
    const viewWorldH = viewport.height / viewport.zoom;
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.strokeRect(viewWorldX * scaleX, viewWorldY * scaleY, viewWorldW * scaleX, viewWorldH * scaleY);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.fillRect(viewWorldX * scaleX, viewWorldY * scaleY, viewWorldW * scaleX, viewWorldH * scaleY);
  }, [viewport, strategicMapData]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
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
      let bestHex = { r: row, c: col }; let minDistance = Infinity;
      for (const cand of candidates) {
        const candOffset = (cand.r % 2) * (hexSpacingX / 2);
        const centerX = cand.c * hexSpacingX + candOffset;
        const centerY = cand.r * hexSpacingY;
        const dist = Math.pow(worldX - centerX, 2) + Math.pow(worldY - centerY, 2);
        if (dist < minDistance) { minDistance = dist; bestHex = cand; }
      }
      setCursorHex({ row: bestHex.r, col: bestHex.c });
    }

    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!hasMovedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) hasMovedRef.current = true;
    if (hasMovedRef.current) {
      setViewport(prev => ({
        ...prev,
        x: Math.max(0, Math.min(MAP_WIDTH * prev.zoom - prev.width, prev.x - dx)),
        y: Math.max(0, Math.min(MAP_HEIGHT * prev.zoom - prev.height, prev.y - dy))
      }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingRef.current && !hasMovedRef.current && cursorHex) {
      if (selectedTF || selectedLandUnit) {
        handleMoveSelected(cursorHex.row, cursorHex.col);
      } else {
        const clickedTF = taskForces.find(tf => tf.row === cursorHex.row && tf.col === cursorHex.col);
        const clickedUnit = landUnits.find(u => u.row === cursorHex.row && u.col === cursorHex.col);
        
        if (clickedTF) setSelectedTF(clickedTF);
        else if (clickedUnit) setSelectedLandUnit(clickedUnit);
      }
    }
    isDraggingRef.current = false;
    hasMovedRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    hasMovedRef.current = false;
    setCursorHex(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    let currentIndex = ZOOM_LEVELS.indexOf(viewport.zoom);
    if (currentIndex === -1) currentIndex = 1;
    let nextIndex = currentIndex;
    if (e.deltaY < 0 && currentIndex < ZOOM_LEVELS.length - 1) nextIndex++;
    if (e.deltaY > 0 && currentIndex > 0) nextIndex--;
    if (nextIndex !== currentIndex) changeZoom(ZOOM_LEVELS[nextIndex]);
  };

  const handleMiniMapClick = (e: React.MouseEvent<HTMLCanvasElement> | React.MouseEvent) => {
    const canvas = miniMapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = (clickX / canvas.width) * MAP_WIDTH;
    const worldY = (clickY / canvas.height) * MAP_HEIGHT;
    const newX = worldX * viewport.zoom - viewport.width / 2;
    const newY = worldY * viewport.zoom - viewport.height / 2;
    setViewport(prev => ({
      ...prev,
      x: Math.max(0, Math.min(MAP_WIDTH * prev.zoom - prev.width, newX)),
      y: Math.max(0, Math.min(MAP_HEIGHT * prev.zoom - prev.height, newY))
    }));
  };

  const handleMiniMapMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isMiniMapDraggingRef.current = true;
    handleMiniMapClick(e);
  };
  const handleMiniMapMouseMove = (e: React.MouseEvent) => {
    if (isMiniMapDraggingRef.current) handleMiniMapClick(e);
  };
  const handleMiniMapMouseUp = () => { isMiniMapDraggingRef.current = false; };

  useEffect(() => {
    const handleGlobalMouseUp = () => { isMiniMapDraggingRef.current = false; };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const phaseText = campaignPhase === 'jp_movement' ? '🇯🇵 Ход Японии' : campaignPhase === 'us_movement' ? '🇺🇸 Ход США' : '⚔️ Выполнение приказов...';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative">
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">← Назад</button>
          
          <button onClick={handleCreateTF} disabled={campaignPhase === 'resolution'} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold disabled:opacity-50">➕ Создать ОГ</button>
          
          <button onClick={handleCreateDivision} disabled={campaignPhase === 'resolution'} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold disabled:opacity-50">➕ Создать Дивизию</button>

          <div className="px-4 py-1 bg-slate-900 rounded border border-slate-600">
            <span className="text-slate-400 text-sm">Ход: </span><span className="font-bold text-cyan-300">{turnNumber}</span>
            <span className="mx-2 text-slate-500">|</span>
            <span className={`font-bold ${campaignPhase === 'jp_movement' ? 'text-red-400' : 'text-blue-400'}`}>{phaseText}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {cursorHex && <div className="px-3 py-1 bg-slate-900/50 border border-cyan-600 rounded text-sm font-mono"><span className="text-slate-400">Гекс: </span><span className="text-cyan-300 font-bold">{cursorHex.row},{cursorHex.col}</span></div>}
          {campaignPhase !== 'resolution' && (
            <button onClick={handleEndPhase} className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg font-bold shadow-lg animate-pulse">⏭️ Закончить ход</button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowGrid(prev => !prev)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${showGrid ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}>
            {showGrid ? '⬡ Скрыть сетку' : '⬡ Показать сетку'}
          </button>
          <div className="text-sm text-slate-400">Масштаб: {Math.round(viewport.zoom * 100)}%</div>
          <div className="flex gap-1 text-xs">
            {[50, 100, 150, 200].map((percent) => (
              <button key={percent} onClick={() => changeZoom(percent / 100)} className={`px-2 py-1.5 rounded transition-colors ${Math.round(viewport.zoom * 100) === percent ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{percent}%</button>
            ))}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onWheel={handleWheel}>
        <canvas ref={canvasRef} width={viewport.width} height={viewport.height} className="absolute top-0 left-0" />
        <div className="absolute bottom-0 right-0 border-t-2 border-l-2 border-slate-600 shadow-2xl overflow-hidden bg-slate-800 z-10 rounded-tl-lg" style={{ width: MINI_MAP_WIDTH, height: MINI_MAP_HEIGHT }}>
          <canvas ref={miniMapCanvasRef} width={MINI_MAP_WIDTH} height={MINI_MAP_HEIGHT} className="block cursor-pointer" onMouseDown={handleMiniMapMouseDown} onMouseMove={handleMiniMapMouseMove} onMouseUp={handleMiniMapMouseUp} onMouseLeave={handleMiniMapMouseUp} />
        </div>
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-30"><div className="text-xl text-cyan-300">Загрузка...</div></div>}
      </div>
    </div>
  );
}