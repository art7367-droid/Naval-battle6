import { useState, useEffect } from 'react';
import { ShipDatabaseEntry, ShipClass } from '../types/shipDatabase';
import { loadDatabase, createShipEntry, addShipToDatabase, updateShipInDatabase, deleteShipFromDatabase, createDemoDatabase } from '../utils/shipDatabase';
import ShipDetailCard from './ShipDetailCard';

interface ShipDatabaseManagerProps {
  onDatabaseUpdate?: () => void;
}

export default function ShipDatabaseManager({ onDatabaseUpdate }: ShipDatabaseManagerProps) {
  const [ships, setShips] = useState<ShipDatabaseEntry[]>([]);
  const [selectedShip, setSelectedShip] = useState<ShipDatabaseEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [shipDetailCardOpen, setShipDetailCardOpen] = useState(false);
  const [shipForDetail, setShipForDetail] = useState<ShipDatabaseEntry | null>(null);

  const [formData, setFormData] = useState({
    name: '', class: 'battleship' as ShipClass, country: '', year: 1940,
    maxHP: 100, speed: 30, range: 10, armor: 100,
    length: 200, beam: 20, draft: 8, displacementStandard: 30000, displacementFull: 40000, description: ''
  });

  useEffect(() => { const db = loadDatabase(); setShips(db.ships); }, []);

  const handleCreate = () => {
    const newShip = createShipEntry(formData.name, formData.class, formData.country, formData.year);
    newShip.maxHP = formData.maxHP; newShip.speed = formData.speed; newShip.range = formData.range; newShip.armor = formData.armor;
    newShip.length = formData.length; newShip.beam = formData.beam; newShip.draft = formData.draft;
    newShip.displacementStandard = formData.displacementStandard; newShip.displacementFull = formData.displacementFull;
    newShip.description = formData.description;
    const db = addShipToDatabase(newShip); setShips(db.ships); resetForm(); onDatabaseUpdate?.();
  };

  const handleUpdate = () => {
    if (!selectedShip) return;
    const updatedShip: ShipDatabaseEntry = { ...selectedShip, ...formData, updatedAt: Date.now() };
    const db = updateShipInDatabase(updatedShip); setShips(db.ships); setSelectedShip(null); resetForm(); onDatabaseUpdate?.();
  };

  const handleDelete = (shipId: string) => {
    if (confirm('Удалить этот корабль из базы?')) {
      const db = deleteShipFromDatabase(shipId); setShips(db.ships);
      if (selectedShip?.id === shipId) { setSelectedShip(null); resetForm(); }
      onDatabaseUpdate?.();
    }
  };

  const handleSelectShip = (ship: ShipDatabaseEntry) => {
    setSelectedShip(ship);
    setFormData({
      name: ship.name, class: ship.class, country: ship.country, year: ship.year,
      maxHP: ship.maxHP, speed: ship.speed, range: ship.range, armor: ship.armor,
      length: ship.length || 200, beam: ship.beam || 20, draft: ship.draft || 8,
      displacementStandard: ship.displacementStandard || 30000, displacementFull: ship.displacementFull || 40000,
      description: ship.description || ''
    });
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({ name: '', class: 'battleship', country: '', year: 1940, maxHP: 100, speed: 30, range: 10, armor: 100, length: 200, beam: 20, draft: 8, displacementStandard: 30000, displacementFull: 40000, description: '' });
    setIsEditing(false); setSelectedShip(null);
  };

  const handleCreateDemo = () => {
    if (confirm('Создать демо-базу с примерами кораблей?')) { createDemoDatabase(); const db = loadDatabase(); setShips(db.ships); onDatabaseUpdate?.(); }
  };

  const handleOpenDetailCard = (ship: ShipDatabaseEntry) => {
    setShipForDetail(ship);
    setShipDetailCardOpen(true);
  };

  const handleCloseDetailCard = () => {
    setShipDetailCardOpen(false);
    setShipForDetail(null);
  };

  const handleSaveFromDetailCard = (updatedShip: ShipDatabaseEntry) => {
    const db = updateShipInDatabase(updatedShip);
    setShips(db.ships);
    if (selectedShip?.id === updatedShip.id) setSelectedShip(updatedShip);
    onDatabaseUpdate?.();
  };

  return (
    <>
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
        <h2 className="text-xl font-bold text-cyan-300 mb-4">📚 База данных кораблей</h2>
        <div className="flex gap-2 mb-4">
          <button onClick={handleCreateDemo} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">🎲 Создать демо</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Корабли ({ships.length})</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {ships.map(ship => (
                <div key={ship.id} className={`p-3 rounded border cursor-pointer transition-colors ${selectedShip?.id === ship.id ? 'bg-cyan-900/30 border-cyan-500' : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800/50'}`}>
                  <div className="flex justify-between items-start">
                    <div onClick={() => handleSelectShip(ship)} className="flex-1">
                      <div className="font-semibold text-white">{ship.name}</div>
                      <div className="text-xs text-slate-400">{ship.class} • {ship.country} • {ship.year}</div>
                      <div className="text-xs text-slate-500 mt-1">HP: {ship.maxHP} | Скорость: {ship.speed} | Дальность: {ship.range}</div>
                      {ship.compartmentData?.compartments && ship.compartmentData.compartments.length > 0 && (
                        <div className="text-xs text-green-400 mt-1">✓ Отсеков: {ship.compartmentData.compartments.length}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenDetailCard(ship); }} className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs text-white" title="Открыть карточку">📋 Карточка</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(ship.id); }} className="text-red-400 hover:text-red-300 text-sm px-2">✕</button>
                    </div>
                  </div>
                </div>
              ))}
              {ships.length === 0 && <div className="text-center text-slate-500 py-8">База данных пуста.</div>}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">{isEditing ? 'Редактирование' : 'Новый корабль'}</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-400">Название:</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" placeholder="Ямато" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-slate-400">Класс:</label><select value={formData.class} onChange={(e) => setFormData({ ...formData, class: e.target.value as ShipClass })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"><option value="battleship">Линкор</option><option value="cruiser">Крейсер</option><option value="destroyer">Эсминец</option><option value="aircraft_carrier">Авианосец</option><option value="submarine">Подводная лодка</option></select></div>
                <div><label className="text-xs text-slate-400">Страна:</label><input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" placeholder="Япония" /></div>
              </div>
              <div><label className="text-xs text-slate-400">Год:</label><input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-slate-400">HP:</label><input type="number" value={formData.maxHP} onChange={(e) => setFormData({ ...formData, maxHP: parseInt(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" /></div>
                <div><label className="text-xs text-slate-400">Скорость:</label><input type="number" value={formData.speed} onChange={(e) => setFormData({ ...formData, speed: parseInt(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" /></div>
                <div><label className="text-xs text-slate-400">Дальность:</label><input type="number" value={formData.range} onChange={(e) => setFormData({ ...formData, range: parseInt(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" /></div>
                <div><label className="text-xs text-slate-400">Броня:</label><input type="number" value={formData.armor} onChange={(e) => setFormData({ ...formData, armor: parseInt(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" /></div>
              </div>
              <div><label className="text-xs text-slate-400">Описание:</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" rows={2} /></div>
              <div className="flex gap-2 pt-2">
                {isEditing ? (
                  <>
                    <button onClick={handleUpdate} className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold">💾 Сохранить</button>
                    <button onClick={() => handleOpenDetailCard(selectedShip!)} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-semibold">📋 Карточка</button>
                    <button onClick={resetForm} className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 rounded text-sm">Отмена</button>
                  </>
                ) : (
                  <button onClick={handleCreate} disabled={!formData.name} className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded text-sm font-semibold">➕ Добавить корабль</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {shipDetailCardOpen && shipForDetail && (
        <ShipDetailCard ship={shipForDetail} onClose={handleCloseDetailCard} onSave={handleSaveFromDetailCard} />
      )}
    </>
  );
}
