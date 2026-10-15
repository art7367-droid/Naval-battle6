import { Ship, Compartment, getCompartmentTypeColor } from '../types';

interface BattleShipSchematicProps {
  ship: Ship;
  hitMarkers?: Array<{shipId: number; compartmentId: string; turn: number; damage: number}>;
}

export default function BattleShipSchematic({ ship, hitMarkers = [] }: BattleShipSchematicProps) {
  const shipHitMarkers = hitMarkers.filter(m => m.shipId === ship.id);
  const compartments = ship.compartments as any[];
  const cols = 56;
  const rows = 13;
  const gridSize = 12;
  const padding = 20;
  const svgWidth = cols * gridSize + padding * 2;
  const svgHeight = rows * gridSize + padding * 2 + 20;
  
  const getCompartmentColor = (comp: Compartment) => {
    return getCompartmentTypeColor(comp.type, comp.status);
  };
  
  const getHitMarkersForCompartment = (compId: string) => {
    return shipHitMarkers.filter(m => m.compartmentId === compId);
  };
  
  return (
    <svg width={svgWidth} height={svgHeight} className="border border-slate-700 rounded bg-slate-900/50">
      {ship.backgroundImage && (
        <image 
          href={ship.backgroundImage} 
          x={ship.backgroundPosition?.x || padding} 
          y={ship.backgroundPosition?.y || padding} 
          opacity={0.6}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {compartments.map((comp) => {
        const posX = (comp.gridX || 0) * gridSize + padding;
        const posY = (comp.gridY || 0) * gridSize + padding;
        const compWidth = gridSize * 0.9;
        const compHeight = gridSize * 0.9;
        const color = getCompartmentColor(comp);
        const hits = getHitMarkersForCompartment(comp.id);
        
        return (
          <g key={comp.id}>
            <rect x={posX} y={posY} width={compWidth} height={compHeight} fill={color} opacity={0.6} stroke="#475569" strokeWidth="0.5" />
            {comp.flooded > 0 && (
              <g>
                <circle cx={posX + compWidth / 2} cy={posY + compHeight / 2} r={compHeight * 0.3} fill="#1e40af" opacity="0.8" />
                <text x={posX + compWidth / 2} y={posY + compHeight / 2 + 1} fill="#ffffff" fontSize={compHeight * 0.5} textAnchor="middle" dominantBaseline="middle" style={{pointerEvents: 'none'}}>💧</text>
              </g>
            )}
            {comp.fire > 0 && (
              <g>
                <circle cx={posX + compWidth / 2} cy={posY + compHeight / 2} r={compHeight * 0.3} fill="#991b1b" opacity="0.8" />
                <text x={posX + compWidth / 2} y={posY + compHeight / 2 + 1} fill="#ffffff" fontSize={compHeight * 0.5} textAnchor="middle" dominantBaseline="middle" style={{pointerEvents: 'none'}}>🔥</text>
              </g>
            )}
            {hits.length > 0 && (
              <g>
                <circle cx={posX + compWidth * 0.8} cy={posY + compHeight * 0.2} r={compHeight * 0.25} fill="#dc2626" stroke="#fff" strokeWidth="1" opacity="0.9" />
                <text x={posX + compWidth * 0.8} y={posY + compHeight * 0.2 + 1} fill="#fff" fontSize={compHeight * 0.3} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">{hits.length}</text>
              </g>
            )}
          </g>
        );
      })}
      <g>
        <line x1={padding} y1={svgHeight - 18} x2={svgWidth - padding} y2={svgHeight - 18} stroke="#94a3b8" strokeWidth="1" />
        {Array.from({ length: Math.floor(cols / 4) + 1 }).map((_, i) => {
          const x = padding + i * 4 * gridSize;
          const meters = i * 20;
          return (
            <g key={`ruler-${i}`}>
              <line x1={x} y1={svgHeight - 18} x2={x} y2={svgHeight - 12} stroke="#94a3b8" strokeWidth="1" />
              <text x={x} y={svgHeight - 6} fill="#94a3b8" fontSize="7" textAnchor="middle">{meters}м</text>
            </g>
          );
        })}
        {Array.from({ length: cols + 1 }).map((_, i) => {
          if (i % 4 === 0) return null;
          const x = padding + i * gridSize;
          return <line key={`tick-${i}`} x1={x} y1={svgHeight - 18} x2={x} y2={svgHeight - 14} stroke="#64748b" strokeWidth="0.5" />;
        })}
        <text x={svgWidth / 2} y={svgHeight - 2} fill="#64748b" fontSize="8" textAnchor="middle">1 клетка = 5м | Всего: {cols * 5}м</text>
      </g>
    </svg>
  );
}
