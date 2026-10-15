import { ShipType, Heading } from './types';

interface ShipSpriteProps {
  type: ShipType;
  heading: Heading;
  isPlayer: boolean;
  size?: number;
}

export default function ShipSprite({ type, heading, isPlayer, size = 24 }: ShipSpriteProps) {
  const rotation = heading * 60;
  const hullColor = isPlayer ? '#3b82f6' : '#ef4444';
  const deckColor = isPlayer ? '#60a5fa' : '#f87171';
  const detailColor = isPlayer ? '#1e40af' : '#991b1b';

  const renderShip = () => {
    switch (type) {
      case 'battleship':
        return (
          <g>
            <path d={`M ${size * 0.9},0 L ${size * 0.6},${size * 0.25} L ${size * 0.2},${size * 0.3} L ${-size * 0.6},${size * 0.3} L ${-size * 0.85},${size * 0.2} L ${-size * 0.9},0 L ${-size * 0.85},${-size * 0.2} L ${-size * 0.6},${-size * 0.3} L ${size * 0.2},${-size * 0.3} L ${size * 0.6},${-size * 0.25} Z`}
              fill={hullColor} stroke={isPlayer ? '#2563eb' : '#dc2626'} strokeWidth="1.5" />
            <rect x={-size * 0.5} y={-size * 0.2} width={size * 1.2} height={size * 0.4} fill={deckColor} opacity="0.5" rx="2" />
            <circle cx={size * 0.5} cy={0} r={size * 0.12} fill={detailColor} stroke="#fff" strokeWidth="0.5" />
            <circle cx={size * 0.1} cy={0} r={size * 0.12} fill={detailColor} stroke="#fff" strokeWidth="0.5" />
            <circle cx={-size * 0.4} cy={0} r={size * 0.12} fill={detailColor} stroke="#fff" strokeWidth="0.5" />
          </g>
        );
      case 'cruiser':
        return (
          <g>
            <path d={`M ${size * 0.85},0 L ${size * 0.55},${size * 0.2} L ${size * 0.15},${size * 0.25} L ${-size * 0.5},${size * 0.25} L ${-size * 0.8},${size * 0.15} L ${-size * 0.85},0 L ${-size * 0.8},${-size * 0.15} L ${-size * 0.5},${-size * 0.25} L ${size * 0.15},${-size * 0.25} L ${size * 0.55},${-size * 0.2} Z`}
              fill={hullColor} stroke={isPlayer ? '#2563eb' : '#dc2626'} strokeWidth="1.5" />
            <rect x={-size * 0.45} y={-size * 0.15} width={size * 1.1} height={size * 0.3} fill={deckColor} opacity="0.5" rx="2" />
            <circle cx={size * 0.4} cy={0} r={size * 0.1} fill={detailColor} stroke="#fff" strokeWidth="0.5" />
            <circle cx={-size * 0.35} cy={0} r={size * 0.1} fill={detailColor} stroke="#fff" strokeWidth="0.5" />
          </g>
        );
      case 'destroyer':
        return (
          <g>
            <path d={`M ${size * 0.8},0 L ${size * 0.5},${size * 0.15} L ${size * 0.1},${size * 0.18} L ${-size * 0.45},${size * 0.18} L ${-size * 0.75},${size * 0.12} L ${-size * 0.8},0 L ${-size * 0.75},${-size * 0.12} L ${-size * 0.45},${-size * 0.18} L ${size * 0.1},${-size * 0.18} L ${size * 0.5},${-size * 0.15} Z`}
              fill={hullColor} stroke={isPlayer ? '#2563eb' : '#dc2626'} strokeWidth="1.5" />
            <rect x={-size * 0.4} y={-size * 0.1} width={size * 0.95} height={size * 0.2} fill={deckColor} opacity="0.5" rx="1.5" />
            <circle cx={size * 0.35} cy={0} r={size * 0.08} fill={detailColor} stroke="#fff" strokeWidth="0.5" />
          </g>
        );
      default: return null;
    }
  };

  return (<g transform={`rotate(${rotation})`}>{renderShip()}</g>);
}
