import { useState, useEffect } from 'react';

// ==========================================
// СПРАВОЧНИКИ (ПОЛНЫЙ СПИСОК ИЗ AE)
// ==========================================
const DEVICE_TYPES = [
  { id: 0, name: '00 - Aircraft Cannon' }, { id: 1, name: '01 - GA Rocket' },
  { id: 2, name: '02 - Guided Missile' }, { id: 3, name: '03 - GP Bomb' },
  { id: 4, name: '04 - AP Bomb' }, { id: 5, name: '05 - Drop Tank' },
  { id: 6, name: '06 - Radar Detector' }, { id: 7, name: '07 - Radar Jammer' },
  { id: 8, name: '08 - Navigation' }, { id: 9, name: '09 - Aircraft Radar' },
  { id: 10, name: '10 - Ground Radar' }, { id: 11, name: '11 - Anti-Air Rocket' },
  { id: 12, name: '12 - AA Gun' }, { id: 13, name: '13 - Balloon' },
  { id: 14, name: '14 - Factory Machine' }, { id: 15, name: '15 - ELINT' },
  { id: 16, name: '16 - Torpedo' }, { id: 17, name: '17 - DP Gun' },
  { id: 18, name: '18 - Naval Gun' }, { id: 19, name: '19 - Army Weapon' },
  { id: 20, name: '20 - ASW' }, { id: 21, name: '21 - Mine' },
  { id: 22, name: '22 - AFV' }, { id: 23, name: '23 - Squad' },
  { id: 24, name: '24 - Engineer' }, { id: 25, name: '25 - Vehicle' },
  { id: 26, name: '26 - Resource' }, { id: 27, name: '27 - A/C Engine' },
];

const SIDE_TYPES = [
  { id: 0, name: '00 - Japanese' }, 
  { id: 1, name: '01 - Allied' },
  { id: 2, name: '02 - Other' }, 
  { id: 3, name: '03 - Both' },
];

type TabType = 'devices' | 'ship_classes' | 'ships' | 'aircraft' | 'air_groups' | 'ground_elements' | 'land_units' | 'task_forces' | 'locations' | 'pilots' | 'leaders' | 'scenario' | 'ai_data';

const TABS = [
  { id: 'devices', label: 'Devices' }, { id: 'ship_classes', label: 'Ship Classes' },
  { id: 'ships', label: 'Ships' }, { id: 'aircraft', label: 'Aircraft' },
  { id: 'air_groups', label: 'Air Groups' }, 
  { id: 'ground_elements', label: 'Ground Elements' },
  { id: 'land_units', label: 'Land Units' },
  { id: 'task_forces', label: 'Task Forces' }, { id: 'locations', label: 'Locations' },
  { id: 'pilots', label: 'Pilots' }, { id: 'leaders', label: 'Leaders' },
  { id: 'scenario', label: 'Scenario' }, { id: 'ai_data', label: 'AI Data' },
] as const;

// ==========================================
// ИНТЕРФЕЙСЫ
// ==========================================
interface Device {
  id: number; name: string; type_id: number; side_id: number; available_date: string; end_date: string;
  can_build: number; build_rate: number; pool: number; load_cost: number;
  range: number; accuracy: number; penetration: number; effect: number; armor: number;
}

interface GroundElement {
  id: number;
  name: string;
  type: string;
  load_cost: number;
  build_rate: number;
  pool: number;
  soft_attack: number;
  hard_attack: number;
  anti_air: number;
  armor: number;
  penetration: number;
  range: number;
  accuracy: number;
  effect: number;
}

interface LandUnit {
  id: number;
  name: string;
  icon_url: string;
  nationality: number;
  type_id: number;
  hq_id: number;
  leader_id: number;
  delay: number;
  supply_cap: number;
  fuel: number;
  supply: number;
  oil: number;
  resource: number;
  daily_supply: number;
  daily_fuel: number;
  daily_res: number;
  fatigue: number;
  disabled_pct: number;
  readiness: number;
  experience: number;
  morale: number;
  disruption: number;
  af_build: number;
  forts: number;
  port_dmg: number;
  service_dmg: number;
  runway_dmg: number;
  unit_type: string;
  stance: string;
  symbol: number;
  infantry: number;
  artillery: number;
  aa: number;
  eng: number;
  armor: number;
  total_bases: number;
  weapons: any[]; 
}

const initialFormData = {
  name: '', type_id: 18, side_id: 3, available_date: '1941-12-07', end_date: '1946-05-30',
  can_build: true, build_rate: 0, pool: 0, load_cost: 0,
  range: 0, accuracy: 0, penetration: 0, effect: 0, armor: 0,
};

const initialGroundElement: GroundElement = {
  id: -1, name: '', type: 'infantry', load_cost: 0, build_rate: 0, pool: 0,
  soft_attack: 0, hard_attack: 0, anti_air: 0, armor: 0, penetration: 0, range: 0, accuracy: 0, effect: 0
};

const initialLandUnit: LandUnit = {
  id: -1, name: 'New Land Unit', icon_url: '',
  nationality: 0, type_id: 0, hq_id: 0, leader_id: 0, delay: 0, supply_cap: 0,
  fuel: 0, supply: 0, oil: 0, resource: 0, daily_supply: 0, daily_fuel: 0, daily_res: 0,
  fatigue: 0, disabled_pct: 0, readiness: 0, experience: 0, morale: 0, disruption: 0,
  af_build: 0, forts: 0, port_dmg: 0, service_dmg: 0, runway_dmg: 0,
  unit_type: '00 - Invalid', stance: '00 - Defend', symbol: 0,
  infantry: 0, artillery: 0, aa: 0, eng: 0, armor: 0, total_bases: 0,
  weapons: Array(32).fill({ device_id: 0, num_weapons: 0, dis_weapons: 0 })
};

// ==========================================
// СТИЛИ (AE Editor Style)
// ==========================================
const inputClass = "w-full bg-[#ccffcc] text-black border border-gray-400 px-1 py-0 text-[11px] focus:outline-none focus:border-blue-500";
const labelClass = "bg-[#e0e0e0] text-black text-[11px] font-bold px-1 py-0 border border-gray-400 flex items-center justify-end text-right pr-2";
const btnClass = "bg-[#e0e0e0] text-black border border-gray-400 px-2 py-0.5 text-[11px] font-bold hover:bg-gray-300 active:bg-gray-400";

export default function DatabaseEditor({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('devices');
  const [loading, setLoading] = useState(false);
  
  // Devices
  const [devices, setDevices] = useState<Device[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>(initialFormData);

  // Ground Elements
  const [groundElements, setGroundElements] = useState<GroundElement[]>([]);
  const [editingElementId, setEditingElementId] = useState<number | null>(null);
  const [elementForm, setElementForm] = useState<GroundElement>(initialGroundElement);

  // Land Units
  const [landUnits, setLandUnits] = useState<LandUnit[]>([]);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [unitForm, setUnitForm] = useState<LandUnit>(initialLandUnit);

  const [searchId, setSearchId] = useState('');
  const [searchName, setSearchName] = useState('');

  // === ЗАГРУЗКИ ===
  const fetchDevices = () => {
    setLoading(true);
    fetch('http://localhost:4000/api/admin/devices')
      .then(res => res.json())
      .then(data => { setDevices(data); setLoading(false); if (data.length > 0 && editingId === null) handleSelectDevice(data[0]); })
      .catch(() => setLoading(false));
  };

  const fetchGroundElements = () => {
    setLoading(true);
    fetch('http://localhost:4000/api/admin/ground-elements')
      .then(res => res.json())
      .then(data => { setGroundElements(Array.isArray(data) ? data : []); setLoading(false); if (data.length > 0 && editingElementId === null) handleSelectElement(data[0]); })
      .catch(() => setLoading(false));
  };

  const fetchLandUnits = () => {
    setLoading(true);
    fetch('http://localhost:4000/api/admin/land-units')
      .then(res => res.json())
      .then(data => { setLandUnits(data); setLoading(false); if (data.length > 0 && editingUnitId === null) handleSelectUnit(data[0]); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { 
    if (activeTab === 'devices') fetchDevices(); 
    if (activeTab === 'ground_elements') fetchGroundElements();
    if (activeTab === 'land_units') fetchLandUnits();
  }, [activeTab]);

  // === ЛОГИКА DEVICES ===
  const handleSelectDevice = (d: Device) => {
    setEditingId(d.id);
    setFormData({ ...d, can_build: d.can_build === 1 });
  };
  const handleNewDevice = () => { setEditingId(-1); setFormData({ ...initialFormData, name: '' }); };
  const handleSubmitDevice = async () => {
    const isNew = editingId === -1;
    const url = isNew ? 'http://localhost:4000/api/admin/devices' : `http://localhost:4000/api/admin/devices/${editingId}`;
    const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    if (res.ok) { setEditingId(null); fetchDevices(); }
  };

  // === ЛОГИКА GROUND ELEMENTS ===
  const handleSelectElement = (el: GroundElement) => {
    setEditingElementId(el.id);
    setElementForm({ ...el });
  };
  const handleNewElement = () => { setEditingElementId(-1); setElementForm({ ...initialGroundElement, name: '' }); };
  const handleSubmitElement = async () => {
    const isNew = editingElementId === -1;
    const url = isNew ? 'http://localhost:4000/api/admin/ground-elements' : `http://localhost:4000/api/admin/ground-elements/${editingElementId}`;
    const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(elementForm) });
    if (res.ok) { setEditingElementId(null); fetchGroundElements(); }
  };

  // === ЛОГИКА LAND UNITS ===
  const handleSelectUnit = (u: LandUnit) => {
    setEditingUnitId(u.id);
    setUnitForm({
      ...u,
      weapons: u.weapons && u.weapons.length > 0 ? u.weapons : Array(32).fill({ device_id: 0, num_weapons: 0, dis_weapons: 0 })
    });
  };
  const handleNewUnit = () => { setEditingUnitId(-1); setUnitForm({ ...initialLandUnit, name: '' }); };
  
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUnitForm({ ...unitForm, icon_url: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitUnit = async () => {
    const isNew = editingUnitId === -1;
    const url = isNew ? 'http://localhost:4000/api/admin/land-units' : `http://localhost:4000/api/admin/land-units/${editingUnitId}`;
    const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(unitForm) });
    if (res.ok) { setEditingUnitId(null); fetchLandUnits(); }
  };

  const filteredDevices = devices.filter(d => d.id.toString().includes(searchId) && d.name.toLowerCase().includes(searchName.toLowerCase()));
  const filteredElements = groundElements.filter(e => e.id.toString().includes(searchId) && e.name.toLowerCase().includes(searchName.toLowerCase()));
  const filteredUnits = landUnits.filter(u => u.id.toString().includes(searchId) && u.name.toLowerCase().includes(searchName.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f0f0f0] text-black flex flex-col font-sans select-none">
      
      {/* ВКЛАДКИ */}
      <div className="bg-[#d4d0c8] border-b-2 border-white p-1 flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-1 text-xs font-bold border-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-[#f0f0f0] border-t-white border-l-white border-b-[#f0f0f0] border-r-[#808080]' : 'bg-[#d4d0c8] border-t-white border-l-white border-b-[#808080] border-r-[#808080] hover:bg-[#e0e0e0]'}`}>
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2"><button onClick={onBack} className={btnClass}>← Назад</button></div>
      </div>

      <div className="flex-1 flex p-2 gap-2 overflow-hidden">
        
        {/* ЛЕВАЯ ПАНЕЛЬ (СПИСОК) */}
        <div className="w-[280px] flex flex-col border-2 border-[#808080] bg-white">
          <div className="bg-[#d4d0c8] border-b border-[#808080] p-1 flex gap-1">
            <input type="text" placeholder="ID" value={searchId} onChange={e => setSearchId(e.target.value)} className="w-12 bg-[#ccffcc] border border-gray-400 text-[11px] px-1" />
            <input type="text" placeholder="Name" value={searchName} onChange={e => setSearchName(e.target.value)} className="flex-1 bg-[#ccffcc] border border-gray-400 text-[11px] px-1" />
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-[#e0e0e0] sticky top-0 border-b border-gray-400">
                <tr><th className="p-1 border-r border-gray-300 w-10">ID</th><th className="p-1 border-r border-gray-300">Name</th></tr>
              </thead>
              <tbody>
                {activeTab === 'devices' && filteredDevices.map(d => (
                  <tr key={d.id} onClick={() => handleSelectDevice(d)} className={`cursor-pointer ${editingId === d.id ? 'bg-[#000080] text-white' : 'hover:bg-[#e0e0e0]'}`}>
                    <td className="p-1 border-r border-gray-200 font-mono">{String(d.id).padStart(3, '0')}</td>
                    <td className="p-1 border-r border-gray-200 truncate">{d.name}</td>
                  </tr>
                ))}
                {activeTab === 'ground_elements' && filteredElements.map(e => (
                  <tr key={e.id} onClick={() => handleSelectElement(e)} className={`cursor-pointer ${editingElementId === e.id ? 'bg-[#000080] text-white' : 'hover:bg-[#e0e0e0]'}`}>
                    <td className="p-1 border-r border-gray-200 font-mono">{String(e.id).padStart(3, '0')}</td>
                    <td className="p-1 border-r border-gray-200 truncate">{e.name}</td>
                  </tr>
                ))}
                {activeTab === 'land_units' && filteredUnits.map(u => (
                  <tr key={u.id} onClick={() => handleSelectUnit(u)} className={`cursor-pointer ${editingUnitId === u.id ? 'bg-[#000080] text-white' : 'hover:bg-[#e0e0e0]'}`}>
                    <td className="p-1 border-r border-gray-200 font-mono">{u.id === -1 ? '---' : String(u.id).padStart(3, '0')}</td>
                    <td className="p-1 border-r border-gray-200 truncate">{u.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-[#d4d0c8] p-1 border-t border-[#808080] flex gap-1">
            <button onClick={activeTab === 'devices' ? handleNewDevice : activeTab === 'ground_elements' ? handleNewElement : handleNewUnit} className={btnClass}>New</button>
            <button className={btnClass}>Del</button>
            <button onClick={activeTab === 'devices' ? handleSubmitDevice : activeTab === 'ground_elements' ? handleSubmitElement : handleSubmitUnit} className={`${btnClass} font-bold ml-auto`}>Save</button>
          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ (ФОРМА) */}
        <div className="flex-1 flex flex-col border-2 border-[#808080] bg-[#f0f0f0] overflow-auto">
          
          {/* ================= DEVICES ================= */}
          {activeTab === 'devices' && (
            <div className="p-2 grid grid-cols-[100px_1fr] gap-x-1 gap-y-[2px] items-center max-w-2xl">
              <div className={labelClass}>ID</div>
              <div className="text-[11px] font-bold font-mono pl-1">{editingId && editingId !== -1 ? String(editingId).padStart(3, '0') : '---'}</div>
              
              <div className={labelClass}>Name</div>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} />
              
              <div className={labelClass}>Type</div>
              <select value={formData.type_id} onChange={e => setFormData({...formData, type_id: Number(e.target.value)})} className={inputClass}>
                {DEVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <div className={labelClass}>Available</div>
              <input type="date" value={formData.available_date} onChange={e => setFormData({...formData, available_date: e.target.value})} className={inputClass} />
              
              <div className={labelClass}>End Date</div>
              <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className={inputClass} />

              <div className={labelClass}>Range</div>
              <div className="flex items-center">
                <input type="number" value={formData.range} onChange={e => setFormData({...formData, range: Number(e.target.value)})} className={inputClass} />
                <span className="text-[10px] ml-1 whitespace-nowrap">K yards</span>
              </div>
              
              <div className={labelClass}>Armor</div>
              <div className="flex items-center">
                <input type="number" value={formData.armor} onChange={e => setFormData({...formData, armor: Number(e.target.value)})} className={inputClass} />
                <span className="text-[10px] ml-1">mm</span>
              </div>
            </div>
          )}

          {/* ================= GROUND ELEMENTS ================= */}
          {activeTab === 'ground_elements' && (
            <div className="p-2 grid grid-cols-[100px_1fr] gap-x-1 gap-y-[2px] items-center max-w-2xl">
              <div className={labelClass}>ID</div>
              <div className="text-[11px] font-bold font-mono pl-1">{editingElementId && editingElementId !== -1 ? String(editingElementId).padStart(3, '0') : '---'}</div>
              
              <div className={labelClass}>Name</div>
              <input value={elementForm.name} onChange={e => setElementForm({...elementForm, name: e.target.value})} className={inputClass} />
              
              <div className={labelClass}>Type</div>
              <select value={elementForm.type} onChange={e => setElementForm({...elementForm, type: e.target.value})} className={inputClass}>
                <option value="infantry">Infantry (Пехота)</option>
                <option value="armor">Armor (Танки)</option>
                <option value="artillery">Artillery (Артиллерия)</option>
                <option value="engineer">Engineer (Инженеры)</option>
              </select>

              <div className={labelClass}>Load Cost</div>
              <input type="number" value={elementForm.load_cost} onChange={e => setElementForm({...elementForm, load_cost: Number(e.target.value)})} className={inputClass} />
              
              <div className={labelClass}>Build Rate</div>
              <input type="number" value={elementForm.build_rate} onChange={e => setElementForm({...elementForm, build_rate: Number(e.target.value)})} className={inputClass} />
              
              <div className={labelClass}>Pool</div>
              <input type="number" value={elementForm.pool} onChange={e => setElementForm({...elementForm, pool: Number(e.target.value)})} className={inputClass} />

              <div className={labelClass}>Soft Attack</div>
              <input type="number" value={elementForm.soft_attack} onChange={e => setElementForm({...elementForm, soft_attack: Number(e.target.value)})} className={inputClass} />
              
              <div className={labelClass}>Hard Attack</div>
              <input type="number" value={elementForm.hard_attack} onChange={e => setElementForm({...elementForm, hard_attack: Number(e.target.value)})} className={inputClass} />
              
              <div className={labelClass}>Anti-Air</div>
              <input type="number" value={elementForm.anti_air} onChange={e => setElementForm({...elementForm, anti_air: Number(e.target.value)})} className={inputClass} />
              
              <div className={labelClass}>Armor</div>
              <input type="number" value={elementForm.armor} onChange={e => setElementForm({...elementForm, armor: Number(e.target.value)})} className={inputClass} />
              
              <div className={labelClass}>Penetration</div>
              <input type="number" value={elementForm.penetration} onChange={e => setElementForm({...elementForm, penetration: Number(e.target.value)})} className={inputClass} />
            </div>
          )}

          {/* ================= LAND UNITS ================= */}
          {activeTab === 'land_units' && (
            <div className="p-2 flex flex-col gap-2">
              
              {/* ВЕРХНЯЯ ЧАСТЬ: Основные данные и Логистика (3 колонки) */}
              <div className="flex gap-2 border-b border-gray-400 pb-2">
                
                {/* Левая колонка */}
                <div className="w-[320px] grid grid-cols-[90px_1fr] gap-x-1 gap-y-[2px] items-center">
                  <div className={labelClass}>Name</div>
                  <input value={unitForm.name} onChange={e => setUnitForm({...unitForm, name: e.target.value})} className={inputClass} />
                  
                  <div className={labelClass}>Name Delay</div>
                  <div className="flex gap-1 items-center">
                    <input type="number" value={unitForm.delay} onChange={e => setUnitForm({...unitForm, delay: Number(e.target.value)})} className={`${inputClass} max-w-[40px]`} />
                    <span className="text-[10px]">ME</span>
                    <span className="text-[10px] ml-2">Supply Cap</span>
                    <input type="number" value={unitForm.supply_cap} onChange={e => setUnitForm({...unitForm, supply_cap: Number(e.target.value)})} className={`${inputClass} max-w-[40px]`} />
                  </div>
                  
                  <div className={labelClass}>Type</div>
                  <select value={unitForm.type_id} onChange={e => setUnitForm({...unitForm, type_id: Number(e.target.value)})} className={inputClass}>
                    <option value="0">00 - City</option>
                  </select>

                  <div className={labelClass}>Suffix</div>
                  <select className={inputClass}><option>00 - None</option></select>

                  <div className={labelClass}>Nationality</div>
                  <select value={unitForm.nationality} onChange={e => setUnitForm({...unitForm, nationality: Number(e.target.value)})} className={inputClass}>
                    {SIDE_TYPES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  <div className={labelClass}>HQ</div>
                  <select className={inputClass}><option>000 - None</option></select>

                  <div className={labelClass}>Leader</div>
                  <div className="flex gap-1">
                    <select className={inputClass}><option>Random</option></select>
                    <select className={`${inputClass} max-w-[50px]`}><option>BL</option></select>
                  </div>
                </div>

                {/* Центральная колонка */}
                <div className="w-[280px] grid grid-cols-[80px_1fr] gap-x-1 gap-y-[2px] items-center">
                  <div className={labelClass}>Fuel</div>
                  <input type="number" value={unitForm.fuel} onChange={e => setUnitForm({...unitForm, fuel: Number(e.target.value)})} className={inputClass} />
                  
                  <div className={labelClass}>Supply</div>
                  <input type="number" value={unitForm.supply} onChange={e => setUnitForm({...unitForm, supply: Number(e.target.value)})} className={inputClass} />
                  
                  <div className={labelClass}>Oil</div>
                  <input type="number" value={unitForm.oil} onChange={e => setUnitForm({...unitForm, oil: Number(e.target.value)})} className={inputClass} />

                  <div className={labelClass}>Resource</div>
                  <input type="number" value={unitForm.resource} onChange={e => setUnitForm({...unitForm, resource: Number(e.target.value)})} className={inputClass} />

                  <div className={labelClass}>Daily Supply</div>
                  <input type="number" value={unitForm.daily_supply} onChange={e => setUnitForm({...unitForm, daily_supply: Number(e.target.value)})} className={inputClass} />

                  <div className={labelClass}>Daily Fuel</div>
                  <input type="number" value={unitForm.daily_fuel} onChange={e => setUnitForm({...unitForm, daily_fuel: Number(e.target.value)})} className={inputClass} />

                  <div className={labelClass}>Damage</div>
                  <input type="number" className={inputClass} defaultValue={0} />
                  
                  <div className={labelClass}>Morale</div>
                  <input type="number" value={unitForm.morale} onChange={e => setUnitForm({...unitForm, morale: Number(e.target.value)})} className={inputClass} />
                </div>

                {/* Правая колонка */}
                <div className="w-[300px] grid grid-cols-[100px_1fr] gap-x-1 gap-y-[2px] items-center">
                  <div className={labelClass}>HQ Air</div>
                  <input type="number" className={inputClass} defaultValue={55} />
                  
                  <div className={labelClass}>Inf Corps</div>
                  <input type="number" className={inputClass} defaultValue={124} />
                  
                  <div className={labelClass}>Inf Div</div>
                  <input type="number" className={inputClass} defaultValue={191} />

                  <div className={labelClass}>Artillery</div>
                  <input type="number" value={unitForm.artillery} onChange={e => setUnitForm({...unitForm, artillery: Number(e.target.value)})} className={inputClass} />

                  <div className={labelClass}>Stance</div>
                  <select value={unitForm.stance} onChange={e => setUnitForm({...unitForm, stance: e.target.value})} className={inputClass}>
                    <option value="00 - Defend">00 - Defend</option>
                  </select>

                  <div className={labelClass}>Unit Type</div>
                  <select value={unitForm.unit_type} onChange={e => setUnitForm({...unitForm, unit_type: e.target.value})} className={inputClass}>
                    <option value="00 - Invalid">00 - Invalid</option>
                  </select>

                  {/* ЗАГРУЗКА ИКОНКИ (ЗНАЧКА) */}
                  <div className={labelClass}>Icon</div>
                  <div className="flex items-center gap-1 bg-[#d4d0c8] border border-gray-400 p-0.5">
                    {unitForm.icon_url ? (
                      <img src={unitForm.icon_url} alt="Icon" className="h-5 w-5 object-contain bg-white border border-gray-500" />
                    ) : (
                      <div className="h-5 w-5 bg-white border border-gray-500"></div>
                    )}
                    <input type="file" accept="image/*" onChange={handleIconUpload} className="text-[9px] w-full" />
                  </div>
                </div>
              </div>

              {/* НИЖНЯЯ ЧАСТЬ: 32 СЛОТА ВООРУЖЕНИЯ (Сдвинуто вправо) */}
              <div className="flex gap-4">
                <div className="w-[150px] flex flex-col gap-[2px] border-r border-gray-400 pr-2">
                   <div className={labelClass}>Withdraw 1/2</div>
                   <div className="flex gap-2 items-center text-[11px]">
                     <input type="radio" name="withdraw" /> 1
                     <input type="radio" name="withdraw" /> 2
                   </div>
                   <div className={labelClass}>Port</div>
                   <input type="number" className={inputClass} defaultValue={0} />
                   <div className={labelClass}>Port Build</div>
                   <input type="number" className={inputClass} defaultValue={0} />
                </div>

                <div className="flex-1 grid grid-cols-[40px_1fr_60px_60px] gap-x-1 gap-y-[1px] items-center max-w-xl">
                  <div className="text-[10px] font-bold text-center">Wpn</div>
                  <div className="text-[10px] font-bold">Device</div>
                  <div className="text-[10px] font-bold text-center">Num</div>
                  <div className="text-[10px] font-bold text-center">Dis</div>

                  {Array.from({ length: 32 }).map((_, index) => {
                    const wpn = unitForm.weapons[index] || { device_id: 0, num_weapons: 0, dis_weapons: 0 };
                    return (
                      <div key={index} className="contents">
                        <div className="text-[10px] text-right pr-1">{index + 1}</div>
                        <select 
                          value={wpn.device_id || 0} 
                          onChange={e => {
                            const newWeapons = [...unitForm.weapons];
                            newWeapons[index] = { ...wpn, device_id: Number(e.target.value) };
                            setUnitForm({ ...unitForm, weapons: newWeapons });
                          }}
                          className={inputClass}
                        >
                          <option value="0">00 - None</option>
                          {devices.map(d => <option key={d.id} value={d.id}>{String(d.id).padStart(3, '0')} - {d.name}</option>)}
                        </select>
                        <input type="number" value={wpn.num_weapons} onChange={e => {
                            const newWeapons = [...unitForm.weapons];
                            newWeapons[index] = { ...wpn, num_weapons: Number(e.target.value) };
                            setUnitForm({ ...unitForm, weapons: newWeapons });
                          }} className={inputClass} />
                        <input type="number" value={wpn.dis_weapons} onChange={e => {
                            const newWeapons = [...unitForm.weapons];
                            newWeapons[index] = { ...wpn, dis_weapons: Number(e.target.value) };
                            setUnitForm({ ...unitForm, weapons: newWeapons });
                          }} className={inputClass} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* НИЖНЯЯ ИНФО-ПАНЕЛЬ */}
          <div className="bg-[#d4d0c8] border-t border-[#808080] p-1 flex justify-between items-end mt-auto">
            <div className="text-[10px] font-mono bg-white border border-gray-400 p-0.5 w-56 h-14 overflow-hidden">
              <div className="flex justify-between"><span>Date Start</span> <span>December 07, 1941</span></div>
              <div className="flex justify-between"><span>Date End</span> <span>May 30, 1946</span></div>
              <div className="flex justify-between"><span>Total Days</span> <span>1635</span></div>
              <div className="mt-1 text-gray-500">Ready</div>
            </div>
            <button className={btnClass}>Refresh Total</button>
          </div>

        </div>
      </div>
    </div>
  );
}