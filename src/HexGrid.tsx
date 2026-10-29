import { Ship, GamePhase, Shot, Trajectory, BOARD_SIZE } from './types';
import ShipSprite from './ShipSprite';

interface HexGridProps {
  playerShips: Ship[];
  enemyShips: Ship[];
  phase: GamePhase;
  selectedTarget?: { shipId: number } | null;
  shotTargets?: { shipId: number; targetShipId: number }[];
  shots?: Shot[];
  enemyShots?: Shot[];
  selectedShipForMove?: Ship | null;
  reachableHexes?: { q: number; r: number }[];
  attackingShip?: Ship | null;
  playerTrajectories?: Trajectory[];
  enemyTrajectories?: Trajectory[];
  isAnimating?: boolean;
  movementOrders?: Map<number, { q: number; r: number }>;
  shotAnimations?: Array<{from: {q: number; r: number}; to: {q: number; r: number}; id: number}>;
  onCellClick: (q: number, r: number) => void;
  onShipClick?: (ship: Ship) => void;
  onShipRightClick?: (e: React.MouseEvent, ship: Ship) => void;
  
  // 🪄 Пропсы для дивизий
  landUnits?: any[];
  selectedLandUnit?: any | null;
  onLandUnitClick?: (unit: any) => void;
}

// 🪄 ЖЕСТКО ЗАДАННЫЙ РАЗМЕР ГЕКСА (25x29)
const HEX_WIDTH = 25;
const HEX_HEIGHT = 29;
// Радиус для отрисовки (высота / 2)
const HEX_RADIUS = HEX_HEIGHT / 2;

function getHexPoints(size: number): string {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    const x = size * Math.cos(angle);
    const y = size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

// 🪄 Позиция гекса с учетом жестких размеров (Pointy-top)
function getHexPosition(q: number, r: number) {
  const xOffset = (r % 2 === 1) ? HEX_WIDTH / 2 : 0;
  const x = q * HEX_WIDTH + xOffset + HEX_WIDTH / 2;
  // Вертикальный шаг для pointy-top = высота * 0.75
  const y = r * (HEX_HEIGHT * 0.75) + HEX_HEIGHT / 2;
  return { x, y };
}

export default function HexGrid({
  playerShips, enemyShips, phase, selectedTarget, selectedShipForMove,
  reachableHexes = [], attackingShip, playerTrajectories = [], enemyTrajectories = [],
  movementOrders = new Map(), shotAnimations = [],
  onCellClick, onShipClick, onShipRightClick,
  landUnits = [], selectedLandUnit, onLandUnitClick
}: HexGridProps) {
  
  // 🪄 Рассчитываем общий размер карты
  const mapWidth = BOARD_SIZE * HEX_WIDTH + HEX_WIDTH;
  const mapHeight = BOARD_SIZE * (HEX_HEIGHT * 0.75) + HEX_HEIGHT;

  const isClickable = (q: number, r: number) => {
    if (phase === 'movement' && (selectedShipForMove || selectedLandUnit)) {
      return reachableHexes.some(h => h.q === q && h.r === r);
    }
    if (phase === 'planning') {
      const isPlayerShip = playerShips.some(s => s.q === q && s.r === r && s.currentHP > 0);
      return !isPlayerShip;
    }
    return false;
  };

  return (
    // 🪄 Контейнер со скроллом, если карта не влезает
    <div className="w-full h-full overflow-auto bg-slate-900/50 relative flex justify-center">
      
      {/* 🪄 SVG с жесткими размерами */}
      <svg 
        width={mapWidth} 
        height={mapHeight} 
        className="drop-shadow-2xl block"
        style={{ minWidth: mapWidth, minHeight: mapHeight }} // 🪄 Жесткая фиксация размера
      >
        {/* 1. ГЕКСЫ */}
        {Array.from({ length: BOARD_SIZE }).map((_, r) =>
          Array.from({ length: BOARD_SIZE }).map((_, q) => {
            const pos = getHexPosition(q, r);
            const clickable = isClickable(q, r);
            const isSelected = selectedTarget && enemyShips.some(s => s.id === selectedTarget.shipId && s.q === q && s.r === r);
            const isReachable = reachableHexes.some(h => h.q === q && h.r === r);
            const isMovementTarget = (phase === 'movement' || phase === 'planning') && 
              Array.from(movementOrders.values()).some(dest => dest.q === q && dest.r === r);

            // 🪄 Используем HEX_RADIUS для отрисовки полигона
            return (
              <g key={`${q}-${r}`} transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => clickable && onCellClick(q, r)} className={clickable ? 'cursor-crosshair' : ''}>
                <polygon 
                  points={getHexPoints(HEX_RADIUS - 1)}
                  style={isMovementTarget ? { fill: 'rgba(6, 182, 212, 0.4)', stroke: '#06b6d4', strokeWidth: '2px' } : undefined}
                  className={`transition-all duration-200 ${!isMovementTarget ? 'fill-slate-700/40 stroke-slate-500/60 stroke-[1px]' : ''} ${clickable ? 'hover:fill-cyan-500/40 hover:stroke-cyan-300' : ''} ${isReachable && !isMovementTarget ? 'fill-green-500/30 stroke-green-400' : ''}`} 
                />
                {isSelected && (
                  <circle cx={0} cy={0} r={HEX_RADIUS * 0.6} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3,3" />
                )}
              </g>
            );
          })
        )}

        {/* 2. ТРАЕКТОРИИ */}
        {playerTrajectories.map((trajectory, idx) => {
          if (!trajectory.path || trajectory.path.length < 2) return null;
          const points = trajectory.path.map((p: { q: number; r: number }) => {
            const pos = getHexPosition(p.q, p.r);
            return `${pos.x},${pos.y}`;
          }).join(' ');
          return (
            <polyline key={`player-traj-${idx}`} points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" style={{ pointerEvents: 'none' }} />
          );
        })}

        {enemyTrajectories.map((trajectory, idx) => {
          if (!trajectory.path || trajectory.path.length < 2) return null;
          const points = trajectory.path.map((p: { q: number; r: number }) => {
            const pos = getHexPosition(p.q, p.r);
            return `${pos.x},${pos.y}`;
          }).join(' ');
          return (
            <polyline key={`enemy-traj-${idx}`} points={points} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" style={{ pointerEvents: 'none' }} />
          );
        })}

        {/* 3. ЛИНИИ ПРИКАЗОВ ДВИЖЕНИЯ */}
        {(phase === 'movement' || phase === 'planning') && Array.from(movementOrders.entries()).map(([shipId, dest]) => {
          const ship = playerShips.find(s => s.id === shipId);
          if (!ship) return null;
          const fromPos = getHexPosition(ship.q, ship.r);
          const toPos = getHexPosition(dest.q, dest.r);
          return (
            <line key={`movement-order-${shipId}`} x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y} stroke="#06b6d4" strokeWidth="2" strokeDasharray="8,4" opacity="0.8" style={{ pointerEvents: 'none' }} />
          );
        })}

        {/* 4. АНИМАЦИЯ ВЫСТРЕЛОВ */}
        {shotAnimations.map((anim) => {
          const fromPos = getHexPosition(anim.from.q, anim.from.r);
          const toPos = getHexPosition(anim.to.q, anim.to.r);
          return (
            <g key={`shot-${anim.id}`}>
              <line x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y} stroke="#fbbf24" strokeWidth="3" opacity="0.9" style={{ pointerEvents: 'none' }}>
                <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="0.8s" fill="freeze" />
              </line>
              <circle cx={toPos.x} cy={toPos.y} r={HEX_RADIUS * 0.3} fill="#fbbf24" opacity="0.8">
                <animate attributeName="r" from={String(HEX_RADIUS * 0.1)} to={String(HEX_RADIUS * 0.4)} dur="0.8s" fill="freeze" />
                <animate attributeName="opacity" from="1" to="0" dur="0.8s" fill="freeze" />
              </circle>
            </g>
          );
        })}

        {/* 5. КОРАБЛИ ИГРОКА */}
        {playerShips.filter(s => s.currentHP > 0).map(ship => {
          const pos = getHexPosition(ship.q, ship.r);
          const isSelected = selectedShipForMove?.id === ship.id;
          const hasMoved = ship.hasMoved;
          return (
            <g key={`player-${ship.id}`} transform={`translate(${pos.x}, ${pos.y})`}
              onClick={(e) => { e.stopPropagation(); onShipClick?.(ship); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onShipRightClick?.(e, ship); }}
              className="cursor-pointer">
              {isSelected && (<circle cx={0} cy={0} r={HEX_RADIUS * 0.8} fill="none" stroke="#fbbf24" strokeWidth="2" />)}
              {phase === 'planning' && attackingShip && attackingShip.id === ship.id && (
                <circle cx={0} cy={0} r={HEX_RADIUS * 0.9} fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="5,3" opacity="0.9" />
              )}
              <ShipSprite type={ship.type} heading={ship.heading} isPlayer={true} size={HEX_RADIUS * 0.85} />
              <text x={0} y={HEX_RADIUS * 0.9} textAnchor="middle" fontSize={HEX_RADIUS * 0.35} fontWeight="bold" fill={hasMoved ? "#94a3b8" : "#4ade80"}>{ship.currentHP}/{ship.maxHP}</text>
            </g>
          );
        })}

        {/* 6. КОРАБЛИ ВРАГА */}
        {enemyShips.filter(s => s.currentHP > 0).map(ship => {
          const pos = getHexPosition(ship.q, ship.r);
          return (
            <g key={`enemy-${ship.id}`} transform={`translate(${pos.x}, ${pos.y})`}
              onClick={(e) => { e.stopPropagation(); if (phase === 'planning') onCellClick(ship.q, ship.r); }}
              className={phase === 'planning' ? 'cursor-crosshair' : ''}>
              <ShipSprite type={ship.type} heading={ship.heading} isPlayer={false} size={HEX_RADIUS * 0.85} />
              <text x={0} y={HEX_RADIUS * 0.9} textAnchor="middle" fontSize={HEX_RADIUS * 0.35} fontWeight="bold" fill="#f87171">{ship.currentHP}/{ship.maxHP}</text>
            </g>
          );
        })}

        {/* 7. ДИВИЗИИ (С ЧЕТКИМИ КАРТИНКАМИ) */}
        {landUnits.map(unit => {
          const pos = getHexPosition(unit.q, unit.r);
          const isSelected = selectedLandUnit?.id === unit.id;
          
          return (
            <g key={`land-${unit.id}`} transform={`translate(${pos.x}, ${pos.y})`}
              onClick={(e) => { e.stopPropagation(); onLandUnitClick?.(unit); }}
              className="cursor-pointer">
              
              {isSelected && (
                <circle cx={0} cy={0} r={HEX_RADIUS * 0.9} fill="none" stroke="#fbbf24" strokeWidth="2" />
              )}
              
              {unit.icon_url ? (
                <image 
                  href={unit.icon_url} 
                  x={-HEX_RADIUS * 0.65} 
                  y={-HEX_RADIUS * 0.65} 
                  width={HEX_RADIUS * 1.3} 
                  height={HEX_RADIUS * 1.3} 
                  preserveAspectRatio="xMidYMid meet"
                  imageRendering="pixelated" // 🪄 Убирает размытие
                />
              ) : (
                <circle cx={0} cy={0} r={HEX_RADIUS * 0.5} fill={unit.owner === 'usa' ? '#3b82f6' : '#ef4444'} />
              )}

              <text x={0} y={HEX_RADIUS * 0.9} textAnchor="middle" fontSize={HEX_RADIUS * 0.28} fontWeight="bold" fill={unit.owner === 'usa' ? '#93c5fd' : '#fca5a5'}>
                {unit.name?.substring(0, 8) || 'Див.'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}