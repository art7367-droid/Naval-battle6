import { useState } from 'react';
import HexGrid from '../HexGrid';
import { Ship, GamePhase } from '../types';

interface LandUnit {
  id: number;
  name: string;
  icon_url: string;
  owner: 'japan' | 'usa';
  q: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  range: number;
  ammo: number;
  hasMoved: boolean;
  hasFired: boolean;
}

interface TacticalBattleViewProps {
  playerShips: Ship[];
  enemyShips: Ship[];
  initialLandUnits?: LandUnit[];
  onBack: () => void;
}

export default function TacticalBattleView({ 
  playerShips: initPlayerShips, 
  enemyShips: initEnemyShips, 
  initialLandUnits = [], 
  onBack 
}: TacticalBattleViewProps) {
  const [phase, setPhase] = useState<GamePhase>('movement');
  const [turn, setTurn] = useState(1);
  
  const [playerShips, setPlayerShips] = useState<Ship[]>(initPlayerShips);
  const [enemyShips, setEnemyShips] = useState<Ship[]>(initEnemyShips);
  const [landUnits, setLandUnits] = useState<LandUnit[]>(initialLandUnits);
  
  const [selectedLandUnit, setSelectedLandUnit] = useState<LandUnit | null>(null);
  const [selectedShipForMove, setSelectedShipForMove] = useState<Ship | null>(null);
  const [reachableHexes, setReachableHexes] = useState<{q: number, r: number}[]>([]);
  
  const [message, setMessage] = useState('Выберите юнит для перемещения');

  const handleLandUnitClick = (unit: LandUnit) => {
    if (phase !== 'movement') return;
    
    if (unit.owner === 'japan') {
      setSelectedLandUnit(unit);
      setSelectedShipForMove(null);
      
      // 🪄 ИСПРАВЛЕННЫЕ КООРДИНАТЫ ДЛЯ POINTY-TOP ГЕКСОВ
      const adjacent = [
        { q: unit.q + 1, r: unit.r },     // Вправо
        { q: unit.q - 1, r: unit.r },     // Влево
        { q: unit.q, r: unit.r + 1 },     // Вниз
        { q: unit.q, r: unit.r - 1 },     // Вверх
        { q: unit.q + 1, r: unit.r + 1 }, // Вправо-вниз 🪄
        { q: unit.q - 1, r: unit.r - 1 }, // Влево-вверх 🪄
      ];
      setReachableHexes(adjacent);
      setMessage(`Выбрана дивизия: ${unit.name}. Выберите гекс для перемещения.`);
    } else {
      if (phase === 'planning') {
        const dist = Math.max(Math.abs(selectedLandUnit!.q - unit.q), Math.abs(selectedLandUnit!.r - unit.r));
        if (selectedLandUnit && dist <= selectedLandUnit.range && selectedLandUnit.ammo > 0) {
          setLandUnits(prev => prev.map(u => {
            if (u.id === unit.id) return { ...u, hp: Math.max(0, u.hp - 20) };
            if (u.id === selectedLandUnit.id) return { ...u, ammo: u.ammo - 1, hasFired: true };
            return u;
          }));
          setMessage(`Попадание! ${unit.name} потеряла 20 HP.`);
        }
      }
    }
  };

  const handleCellClick = (q: number, r: number) => {
    if (selectedLandUnit) {
      const isReachable = reachableHexes.some(h => h.q === q && h.r === r);
      if (isReachable) {
        setLandUnits(prev => prev.map(u => 
          u.id === selectedLandUnit.id ? { ...u, q, r } : u
        ));
        setSelectedLandUnit(null);
        setReachableHexes([]);
        setMessage('Дивизия перемещена');
      }
    }
  };

  const handleEndTurn = () => {
    if (phase === 'movement') {
      setPhase('planning');
      setMessage('Фаза стрельбы: выберите цель для атаки');
    } else {
      setPhase('movement');
      setTurn(t => t + 1);
      setMessage(`Ход ${turn + 1}: Фаза движения`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden relative">
      <div className="flex-1 overflow-hidden relative">
        <HexGrid
          playerShips={playerShips}
          enemyShips={enemyShips}
          phase={phase}
          onCellClick={handleCellClick}
          landUnits={landUnits}
          selectedLandUnit={selectedLandUnit}
          onLandUnitClick={handleLandUnitClick}
          selectedShipForMove={selectedShipForMove}
          reachableHexes={reachableHexes}
        />
      </div>

      <button 
        onClick={onBack} 
        className="absolute top-2 left-2 px-3 py-1 bg-slate-800/80 hover:bg-slate-700 text-white rounded border border-slate-600 text-sm z-50"
      >
        ← Назад
      </button>

      <button 
        onClick={handleEndTurn} 
        className="absolute bottom-2 right-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded shadow-lg z-50"
      >
        {phase === 'movement' ? 'Закончить ход (Движение)' : 'Закончить ход (Стрельба)'}
      </button>

      {message && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-slate-800/80 text-cyan-200 px-4 py-1 rounded-full text-sm border border-slate-600 pointer-events-none z-50">
          {message}
        </div>
      )}
    </div>
  );
}