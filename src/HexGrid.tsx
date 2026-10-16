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
}

const HEX_SIZE = 15;

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

function getHexPosition(q: number, r: number, size: number) {
  const width = Math.sqrt(3) * size;
  const height = size * 2;
  const xOffset = (r % 2 === 1) ? width / 2 : 0;
  const x = q * width + xOffset + size;
  const y = r * (height * 0.75) + size;
  return { x, y };
}

export default function HexGrid({
  playerShips, enemyShips, phase, selectedTarget, selectedShipForMove,
  reachableHexes = [], attackingShip, playerTrajectories = [], enemyTrajectories = [],
  movementOrders = new Map(), shotAnimations = [],
  onCellClick, onShipClick, onShipRightClick,
}: HexGridProps) {
  const width = BOARD_SIZE * (Math.sqrt(3) * HEX_SIZE) + HEX_SIZE * 2;
  const height = BOARD_SIZE * (HEX_SIZE * 1.5) + HEX_SIZE * 2;

  const isClickable = (q: number, r: number) => {
    if (phase === 'movement' && selectedShipForMove) {
      return reachableHexes.some(h => h.q === q && h.r === r);
    }
    if (phase === 'planning') {
      const isPlayerShip = playerShips.some(s => s.q === q && s.r === r && s.currentHP > 0);
      return !isPlayerShip;
    }
    return false;
  };

  return (
    <div className="relative overflow-auto max-w-full">
      <svg width={width} height={height} className="drop-shadow-2xl bg-slate-800/30 rounded-lg">
        {Array.from({ length: BOARD_SIZE }).map((_, r) =>
          Array.from({ length: BOARD_SIZE }).map((_, q) => {
            const pos = getHexPosition(q, r, HEX_SIZE);
            const clickable = isClickable(q, r);
            const isSelected = selectedTarget && enemyShips.some(s => s.id === selectedTarget.shipId && s.q === q && s.r === r);
            const isReachable = reachableHexes.some(h => h.q === q && h.r === r);
            const isMovementTarget = (phase === 'movement' || phase === 'planning') && 
              Array.from(movementOrders.values()).some(dest => dest.q === q && dest.r === r);

            return (
              <g key={`${q}-${r}`} transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => clickable && onCellClick(q, r)} className={clickable ? 'cursor-crosshair' : ''}>
                <polygon 
                  points={getHexPoints(HEX_SIZE - 1)}
                  style={isMovementTarget ? { fill: 'rgba(6, 182, 212, 0.4)', stroke: '#06b6d4', strokeWidth: '2px' } : undefined}
                  className={`transition-all duration-200 ${!isMovementTarget ? 'fill-slate-700/40 stroke-slate-500/60 stroke-[1px]' : ''} ${clickable ? 'hover:fill-cyan-500/40 hover:stroke-cyan-300' : ''} ${isReachable && !isMovementTarget ? 'fill-green-500/30 stroke-green-400' : ''}`} 
                />
                {isSelected && (
                  <circle cx={0} cy={0} r={HEX_SIZE * 0.6} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3,3" />
                )}
              </g>
            );
          })
        )}

        {playerTrajectories.map((trajectory, idx) => {
          if (!trajectory.path || trajectory.path.length < 2) return null;
          const points = trajectory.path.map((p: { q: number; r: number }) => {
            const pos = getHexPosition(p.q, p.r, HEX_SIZE);
            return `${pos.x},${pos.y}`;
          }).join(' ');
          return (
            <polyline
              key={`player-traj-${idx}`}
              points={points}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.6"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}

        {enemyTrajectories.map((trajectory, idx) => {
          if (!trajectory.path || trajectory.path.length < 2) return null;
          const points = trajectory.path.map((p: { q: number; r: number }) => {
            const pos = getHexPosition(p.q, p.r, HEX_SIZE);
            return `${pos.x},${pos.y}`;
          }).join(' ');
          return (
            <polyline
              key={`enemy-traj-${idx}`}
              points={points}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.6"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}

        {/* Пунктирные линии от кораблей к целевым гексам движения */}
        {(phase === 'movement' || phase === 'planning') && Array.from(movementOrders.entries()).map(([shipId, dest]) => {
          const ship = playerShips.find(s => s.id === shipId);
          if (!ship) return null;
          const fromPos = getHexPosition(ship.q, ship.r, HEX_SIZE);
          const toPos = getHexPosition(dest.q, dest.r, HEX_SIZE);
          return (
            <line
              key={`movement-order-${shipId}`}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="8,4"
              opacity="0.8"
              style={{ pointerEvents: 'none' }}
            />
          );
        })}

        {/* Анимация выстрелов */}
        {shotAnimations.map((anim) => {
          const fromPos = getHexPosition(anim.from.q, anim.from.r, HEX_SIZE);
          const toPos = getHexPosition(anim.to.q, anim.to.r, HEX_SIZE);
          return (
            <g key={`shot-${anim.id}`}>
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="#fbbf24"
                strokeWidth="3"
                opacity="0.9"
                style={{ pointerEvents: 'none' }}
              >
                <animate
                  attributeName="stroke-dasharray"
                  from="0,1000"
                  to="1000,0"
                  dur="0.8s"
                  fill="freeze"
                />
              </line>
              <circle cx={toPos.x} cy={toPos.y} r={HEX_SIZE * 0.3} fill="#fbbf24" opacity="0.8">
                <animate
                  attributeName="r"
                  from={String(HEX_SIZE * 0.1)}
                  to={String(HEX_SIZE * 0.4)}
                  dur="0.8s"
                  fill="freeze"
                />
                <animate
                  attributeName="opacity"
                  from="1"
                  to="0"
                  dur="0.8s"
                  fill="freeze"
                />
              </circle>
            </g>
          );
        })}

        {playerShips.filter(s => s.currentHP > 0).map(ship => {
          const pos = getHexPosition(ship.q, ship.r, HEX_SIZE);
          const isSelected = selectedShipForMove?.id === ship.id;
          const hasMoved = ship.hasMoved;
          return (
            <g key={`player-${ship.id}`} transform={`translate(${pos.x}, ${pos.y})`}
              onClick={(e) => { e.stopPropagation(); onShipClick?.(ship); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onShipRightClick?.(e, ship); }}
              className="cursor-pointer">
              {isSelected && (<circle cx={0} cy={0} r={HEX_SIZE * 0.8} fill="none" stroke="#fbbf24" strokeWidth="2" />)}
              {phase === 'planning' && attackingShip && attackingShip.id === ship.id && (
                <circle cx={0} cy={0} r={HEX_SIZE * 0.9} fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="5,3" opacity="0.9" />
              )}
              <ShipSprite type={ship.type} heading={ship.heading} isPlayer={true} size={HEX_SIZE * 0.85} />
              <text x={0} y={HEX_SIZE * 0.9} textAnchor="middle" fontSize={HEX_SIZE * 0.35} fontWeight="bold" fill={hasMoved ? "#94a3b8" : "#4ade80"}>{ship.currentHP}/{ship.maxHP}</text>
            </g>
          );
        })}

        {enemyShips.filter(s => s.currentHP > 0).map(ship => {
          const pos = getHexPosition(ship.q, ship.r, HEX_SIZE);
          return (
            <g key={`enemy-${ship.id}`} transform={`translate(${pos.x}, ${pos.y})`}
              onClick={(e) => { e.stopPropagation(); if (phase === 'planning') onCellClick(ship.q, ship.r); }}
              className={phase === 'planning' ? 'cursor-crosshair' : ''}>
              <ShipSprite type={ship.type} heading={ship.heading} isPlayer={false} size={HEX_SIZE * 0.85} />
              <text x={0} y={HEX_SIZE * 0.9} textAnchor="middle" fontSize={HEX_SIZE * 0.35} fontWeight="bold" fill="#f87171">{ship.currentHP}/{ship.maxHP}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
