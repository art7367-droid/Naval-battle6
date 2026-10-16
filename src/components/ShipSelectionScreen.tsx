import { useState, useEffect } from 'react';
import { ShipDatabaseEntry } from '../types/shipDatabase';
import { loadDatabase } from '../utils/shipDatabase';
import ShipSpecsTable from './ShipSpecsTable';

interface ShipSelectionScreenProps {
  onStartBattle: (playerShips: ShipDatabaseEntry[], enemyShips: ShipDatabaseEntry[]) => void;
}

export default function ShipSelectionScreen({ onStartBattle }: ShipSelectionScreenProps) {
  const [ships, setShips] = useState<ShipDatabaseEntry[]>([]);
  const [selectedPlayerShips, setSelectedPlayerShips] = useState<ShipDatabaseEntry[]>([]);
  const [selectedEnemyShips, setSelectedEnemyShips] = useState<ShipDatabaseEntry[]>([]);
  const [viewingShip, setViewingShip] = useState<ShipDatabaseEntry | null>(null);

  useEffect(() => { const db = loadDatabase(); setShips(db.ships); }, []);

  const randomSelectFleet = (excludeIds: string[] = []): ShipDatabaseEntry[] => {
    const available = ships.filter(s => !excludeIds.includes(s.id));
    const battleships = available.filter(s => s.class === 'battleship');
    const cruisers = available.filter(s => s.class === 'cruiser');
    const destroyers = available.filter(s => s.class === 'destroyer');
    const fleet: ShipDatabaseEntry[] = [];
    if (battleships.length > 0) fleet.push(battleships[Math.floor(Math.random() * battleships.length)]);
    if (cruisers.length > 0) fleet.push(cruisers[Math.floor(Math.random() * cruisers.length)]);
    if (destroyers.length > 0) fleet.push(destroyers[Math.floor(Math.random() * destroyers.length)]);
    return fleet;
  };

  const handleRandomSelectAll = () => {
    const playerFleet = randomSelectFleet();
    const playerIds = playerFleet.map(s => s.id);
    const enemyFleet = randomSelectFleet(playerIds);
    setSelectedPlayerShips(playerFleet); setSelectedEnemyShips(enemyFleet);
  };

  const handleRandomPlayer = () => { const enemyIds = selectedEnemyShips.map(s => s.id); setSelectedPlayerShips(randomSelectFleet(enemyIds)); };
  const handleRandomEnemy = () => { const playerIds = selectedPlayerShips.map(s => s.id); setSelectedEnemyShips(randomSelectFleet(playerIds)); };

  const togglePlayerShip = (ship: ShipDatabaseEntry) => {
    if (selectedPlayerShips.find(s => s.id === ship.id)) setSelectedPlayerShips(selectedPlayerShips.filter(s => s.id !== ship.id));
    else setSelectedPlayerShips([...selectedPlayerShips, ship]);
  };

  const toggleEnemyShip = (ship: ShipDatabaseEntry) => {
    if (selectedEnemyShips.find(s => s.id === ship.id)) setSelectedEnemyShips(selectedEnemyShips.filter(s => s.id !== ship.id));
    else setSelectedEnemyShips([...selectedEnemyShips, ship]);
  };

  const handleStart = () => {
    if (selectedPlayerShips.length === 0 || selectedEnemyShips.length === 0) { alert('Выберите хотя бы один корабль для каждой стороны!'); return; }
    onStartBattle(selectedPlayerShips, selectedEnemyShips);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6 text-cyan-300">⚓ Выбор кораблей для боя</h1>
        {ships.length > 0 && (
          <div className="flex justify-center gap-3 mb-6 flex-wrap">
            <button onClick={handleRandomSelectAll} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold text-sm transition-all shadow-lg">🎲 Случайный выбор (все)</button>
            <button onClick={handleRandomPlayer} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg font-semibold text-sm transition-all shadow-lg">🎲 Случайный (🛡️ Игрок)</button>
            <button onClick={handleRandomEnemy} className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg font-semibold text-sm transition-all shadow-lg">🎲 Случайный (🎯 Враг)</button>
          </div>
        )}
        {ships.length === 0 ? (
          <div className="text-center py-12"><div className="text-6xl mb-4">📚</div><div className="text-xl text-slate-400 mb-2">База данных пуста</div><div className="text-sm text-slate-500">Сначала добавьте корабли в базу данных</div></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-600">
              <h2 className="text-lg font-bold text-cyan-300 mb-3">🛡️ Ваш флот ({selectedPlayerShips.length})</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedPlayerShips.map(ship => (
                  <div key={ship.id} className="p-2 bg-cyan-900/30 border border-cyan-500 rounded cursor-pointer" onClick={() => togglePlayerShip(ship)}>
                    <div className="font-semibold">{ship.name}</div><div className="text-xs text-slate-400">{ship.class} • {ship.country}</div>
                  </div>
                ))}
                {selectedPlayerShips.length === 0 && <div className="text-center text-slate-500 py-4 text-sm">Выберите корабли из списка</div>}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
              <h2 className="text-lg font-bold text-slate-300 mb-3">📚 Доступные корабли ({ships.length})</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {ships.map(ship => {
                  const isPlayerSelected = selectedPlayerShips.find(s => s.id === ship.id);
                  const isEnemySelected = selectedEnemyShips.find(s => s.id === ship.id);
                  return (
                    <div key={ship.id} className={`p-2 rounded border ${isPlayerSelected ? 'bg-cyan-900/30 border-cyan-500' : isEnemySelected ? 'bg-red-900/30 border-red-500' : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800/50'}`}>
                      <div className="flex justify-between items-start">
                        <div><div className="font-semibold text-sm">{ship.name}</div><div className="text-xs text-slate-400">{ship.class} • {ship.country} • {ship.year}</div><div className="text-xs text-slate-500 mb-2">HP: {ship.maxHP} | Скорость: {ship.speed} | Дальность: {ship.range}</div></div>
                        <button onClick={() => setViewingShip(ship)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs" title="Показать ТТХ">📋</button>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => togglePlayerShip(ship)} className={`flex-1 px-2 py-1 rounded text-xs ${isPlayerSelected ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-slate-700 hover:bg-slate-600'}`}>🛡️ Игрок</button>
                        <button onClick={() => toggleEnemyShip(ship)} className={`flex-1 px-2 py-1 rounded text-xs ${isEnemySelected ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'}`}>🎯 Враг</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-red-600">
              <h2 className="text-lg font-bold text-red-300 mb-3">🎯 Флот противника ({selectedEnemyShips.length})</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedEnemyShips.map(ship => (
                  <div key={ship.id} className="p-2 bg-red-900/30 border border-red-500 rounded cursor-pointer" onClick={() => toggleEnemyShip(ship)}>
                    <div className="font-semibold">{ship.name}</div><div className="text-xs text-slate-400">{ship.class} • {ship.country}</div>
                  </div>
                ))}
                {selectedEnemyShips.length === 0 && <div className="text-center text-slate-500 py-4 text-sm">Выберите корабли из списка</div>}
              </div>
            </div>
          </div>
        )}
        <div className="text-center mt-6">
          <button onClick={handleStart} disabled={selectedPlayerShips.length === 0 || selectedEnemyShips.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg font-bold text-lg hover:from-red-600 hover:to-orange-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all shadow-lg">⚔️ Начать бой!</button>
        </div>
        {viewingShip && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-4 max-w-md w-full border border-slate-600 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-cyan-300">📋 {viewingShip.name}</h3>
                <button onClick={() => setViewingShip(null)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">✕ Закрыть</button>
              </div>
              <ShipSpecsTable ship={viewingShip} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
