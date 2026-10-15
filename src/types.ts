export type ShipType = 'battleship' | 'cruiser' | 'destroyer';

export interface HexCell {
  q: number;
  r: number;
  isShip: boolean;
  isHit: boolean;
  isMiss: boolean;
  shipId: number | null;
  shipType: ShipType | null;
  currentHP: number | null;
}

export type CompartmentPosition = 'bow' | 'forward' | 'mid' | 'aft' | 'stern';
export type CompartmentDeck = 'lower' | 'middle' | 'upper' | 'deck';
export type CompartmentSide = 'port' | 'center' | 'starboard';
export type CompartmentStatus = 'intact' | 'damaged' | 'flooded' | 'destroyed' | 'on_fire';

// Новые типы отсеков
export type CompartmentType = 
  | 'bridge'                    // Мостик
  | 'control_system'            // Система управления и обнаружения (КДП, БИУС, Дальномер, Радар, Гидролокатор)
  | 'weaponry'                  // Вооружение (ГК, Вспомогательный калибр, Торпедные аппараты, Зенитки)
  | 'propulsion'                // ГЭУ (котлы, турбины)
  | 'rudder'                    // Руль
  | 'propellers'                // Винты
  | 'ammunition'                // Боезапас
  | 'other';                    // Остальные отсеки (жилые и вспомогательные, включая топливо)

export interface BattleLogEntry {
  id: string;
  turn: number;
  timestamp: number;
  type: 'fire_start' | 'fire_spread' | 'fire_extinguished' | 'flooding_start' | 'flooding_spread' | 'ammo_detonation' | 'ship_sunk' | 'critical_damage' | 'shot_hit' | 'shot_miss';
  shipId: number;
  shipName: string;
  compartmentId?: string;
  compartmentName?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export type ComponentType = 
  | 'bridge' | 'forward_turret' | 'aft_turret' | 'engine' | 'boiler'
  | 'rudder' | 'propeller' | 'radar' | 'torpedo_tube' | 'ammo_magazine'
  | 'fuel_tank' | 'generator' | 'pump' | 'aa_gun' | 'fire_control';

export type ComponentStatus = 'operational' | 'damaged' | 'destroyed';

export interface Component {
  type: ComponentType;
  name: string;
  maxHP: number;
  currentHP: number;
  status: ComponentStatus;
  vulnerability: number;
  effect: string;
}

export interface Compartment {
  id: string;
  position: CompartmentPosition;
  deck: CompartmentDeck;
  side: CompartmentSide;
  type: CompartmentType;  // Новый тип отсека
  name: string;
  maxHP: number;
  currentHP: number;
  status: CompartmentStatus;
  watertight: boolean;
  armor: number;
  flooded: number;
  fire: number;
  components: Component[];
  adjacentIds: string[];
  detonated?: boolean;
  lengthMeters?: number;
  positionFromBow?: number;
}

export interface ShipStats {
  speed: number;
  maneuverability: number;
  mainGunFire: number;
  aaFire: number;
  detection: number;
  buoyancy: number;
  list: number;
  trim: number;
  fires: number;
  flooding: number;
}

export interface Ship {
  id: number;
  type: ShipType;
  name: string;
  maxHP: number;
  currentHP: number;
  q: number;
  r: number;
  heading: Heading;
  accuracy: number;
  damage: number;
  speed: number;
  range: number;
  hasMoved: boolean;
  hasFired: boolean;
  compartments: Compartment[];
  stats: ShipStats;
  battleLog: BattleLogEntry[];
  isSunk: boolean;
  sinkCause?: 'flooding' | 'detonation' | 'buoyancy';
  length?: number;
  beam?: number;
  draft?: number;
  displacementStandard?: number;
  displacementFull?: number;
  backgroundImage?: string;
  backgroundPosition?: { x: number; y: number };
}

export type Heading = 0 | 1 | 2 | 3 | 4 | 5;

export interface Shot {
  shipId: number;
  shipName: string;
  shipType: ShipType;
  targetQ: number;
  targetR: number;
  hit: boolean;
  damage: number;
  targetShipId: number | null;
  targetShipName: string | null;
}

export interface Trajectory {
  shipId: number;
  path: { q: number; r: number }[];
}

export type GamePhase = 'placement' | 'movement' | 'planning' | 'execution' | 'results' | 'gameOver';

export const SHIP_FLEET = [
  { type: 'battleship' as ShipType, count: 1, name: 'Линкор', hp: 100, accuracy: 75, damage: 35, speed: 2, range: 10 },
  { type: 'cruiser' as ShipType, count: 1, name: 'Крейсер', hp: 50, accuracy: 70, damage: 25, speed: 3, range: 7 },
  { type: 'destroyer' as ShipType, count: 2, name: 'Эсминец', hp: 25, accuracy: 65, damage: 20, speed: 4, range: 4 },
];

export const TOTAL_SHIPS = SHIP_FLEET.reduce((sum, s) => sum + s.count, 0);
export const BOARD_SIZE = 42;

// Функция создания компонентов больше не используется - типы отсеков задаются вручную

export function createCompartments(shipType: ShipType, shipLengthMeters: number = 200): Compartment[] {
  const compartments: Compartment[] = [];
  const COMPARTMENT_LENGTH = 10;
  
  const numCompartments = Math.ceil(shipLengthMeters / COMPARTMENT_LENGTH);
  
  const decks: CompartmentDeck[] = shipType === 'destroyer' 
    ? ['upper', 'lower'] 
    : ['upper', 'middle', 'lower'];
  
  let compartmentId = 1;

  for (let i = 0; i < numCompartments; i++) {
    const positionFromBow = i * COMPARTMENT_LENGTH;
    
    let position: CompartmentPosition;
    const relativePos = i / numCompartments;
    
    if (relativePos < 0.15) {
      position = 'bow';
    } else if (relativePos < 0.35) {
      position = 'forward';
    } else if (relativePos < 0.65) {
      position = 'mid';
    } else if (relativePos < 0.85) {
      position = 'aft';
    } else {
      position = 'stern';
    }
    
    for (const deck of decks) {
      const id = `comp_${compartmentId++}`;
      
      let baseHP = 20;
      if (shipType === 'battleship') {
        baseHP = deck === 'upper' ? 25 : deck === 'middle' ? 30 : 35;
      } else if (shipType === 'cruiser') {
        baseHP = deck === 'upper' ? 20 : deck === 'middle' ? 25 : 30;
      } else {
        baseHP = deck === 'upper' ? 15 : 25;
      }
      
      let armor = 30;
      if (shipType === 'battleship') {
        armor = deck === 'upper' ? 50 : deck === 'middle' ? 75 : 100;
      } else if (shipType === 'cruiser') {
        armor = deck === 'upper' ? 40 : deck === 'middle' ? 60 : 80;
      } else {
        armor = deck === 'upper' ? 20 : 40;
      }

      compartments.push({
        id,
        position,
        deck,
        side: 'center',
        type: 'other',  // По умолчанию - остальные отсеки, тип задаётся вручную
        name: `Отсек ${i + 1} - ${getDeckName(deck)}`,
        maxHP: baseHP,
        currentHP: baseHP,
        status: 'intact',
        watertight: deck !== 'upper' && deck !== 'deck',
        armor,
        flooded: 0.0,
        fire: 0.0,
        components: [],  // Компоненты больше не создаются автоматически
        adjacentIds: [],
        lengthMeters: COMPARTMENT_LENGTH,
        positionFromBow
      });
    }
  }

  compartments.forEach(comp => {
    const adjacent = compartments.filter(other => {
      if (other.id === comp.id) return false;
      
      if (comp.positionFromBow !== undefined && other.positionFromBow !== undefined) {
        const posDiff = Math.abs(comp.positionFromBow - other.positionFromBow);
        if (posDiff === COMPARTMENT_LENGTH && comp.deck === other.deck) {
          return true;
        }
      }
      
      const deckOrder: CompartmentDeck[] = ['lower', 'middle', 'upper', 'deck'];
      const deckDiff = Math.abs(deckOrder.indexOf(comp.deck) - deckOrder.indexOf(other.deck));
      if (deckDiff === 1 && comp.positionFromBow === other.positionFromBow) {
        return true;
      }
      
      return false;
    });
    comp.adjacentIds = adjacent.map(a => a.id);
  });

  return compartments;
}

function getDeckName(deck: CompartmentDeck): string {
  switch (deck) {
    case 'upper': return 'Верхняя палуба';
    case 'middle': return 'Средняя палуба';
    case 'lower': return 'Нижняя палуба';
    case 'deck': return 'Палуба';
    default: return 'Палуба';
  }
}

export function getCompartmentTypeName(type: CompartmentType): string {
  switch (type) {
    case 'bridge': return 'Мостик';
    case 'control_system': return 'Система управления и обнаружения';
    case 'weaponry': return 'Вооружение';
    case 'propulsion': return 'ГЭУ';
    case 'rudder': return 'Руль';
    case 'propellers': return 'Винты';
    case 'ammunition': return 'Боезапас';
    case 'other': return 'Остальные отсеки';
    default: return 'Отсек';
  }
}

export function getCompartmentTypeColor(type: CompartmentType, status: CompartmentStatus): string {
  // Уничтоженный отсек - тёмно-серый
  if (status === 'destroyed') return '#374151';
  // Повреждённый отсек - светло-серый
  if (status === 'damaged') return '#d1d5db';
  
  // Цвета по типу отсека (для intact, flooded, on_fire)
  switch (type) {
    case 'weaponry':
      return '#7f1d1d'; // Тёмно-красный
    case 'ammunition':
      return '#78350f'; // Тёмно-коричневый
    case 'propulsion':
    case 'rudder':
    case 'propellers':
      return '#1e3a8a'; // Тёмно-синий
    case 'bridge':
    case 'control_system':
      return '#eab308'; // Жёлтый
    case 'other':
    default:
      return '#14532d'; // Тёмно-зелёный
  }
}

export function calculateShipStats(compartments: Compartment[]): ShipStats {
  const stats: ShipStats = {
    speed: 1.0,
    maneuverability: 1.0,
    mainGunFire: 1.0,
    aaFire: 1.0,
    detection: 1.0,
    buoyancy: 1.0,
    list: 0.0,
    trim: 0.0,
    fires: 0,
    flooding: 0.0
  };

  let totalFlooded = 0;
  let totalCompartments = 0;
  let portFlooded = 0;
  let starboardFlooded = 0;
  let bowFlooded = 0;
  let sternFlooded = 0;
  
  let propulsionDamage = 0;
  let propulsionCount = 0;
  let rudderDamage = 0;
  let rudderCount = 0;
  let bridgeDamage = 0;
  let bridgeCount = 0;
  let controlDamage = 0;
  let controlCount = 0;
  let weaponDamage = 0;
  let weaponCount = 0;

  compartments.forEach(comp => {
    totalCompartments++;
    
    const compHealth = comp.maxHP > 0 ? comp.currentHP / comp.maxHP : 0;
    
    // Подсчёт повреждений по типам отсеков
    switch (comp.type) {
      case 'propulsion':
        propulsionCount++;
        propulsionDamage += (1 - compHealth);
        break;
      case 'rudder':
      case 'propellers':
        rudderCount++;
        rudderDamage += (1 - compHealth);
        break;
      case 'bridge':
        bridgeCount++;
        bridgeDamage += (1 - compHealth);
        break;
      case 'control_system':
        controlCount++;
        controlDamage += (1 - compHealth);
        break;
      case 'weaponry':
        weaponCount++;
        weaponDamage += (1 - compHealth);
        break;
    }
    
    if (comp.flooded > 0) {
      totalFlooded += comp.flooded;
      if (comp.side === 'port') portFlooded += comp.flooded;
      if (comp.side === 'starboard') starboardFlooded += comp.flooded;
      if (comp.position === 'bow' || comp.position === 'forward') bowFlooded += comp.flooded;
      if (comp.position === 'stern' || comp.position === 'aft') sternFlooded += comp.flooded;
    }

    if (comp.fire > 0) {
      stats.fires++;
    }
  });

  // Расчёт характеристик на основе повреждений отсеков
  if (propulsionCount > 0) {
    const avgPropulsionDamage = propulsionDamage / propulsionCount;
    stats.speed = Math.max(0.1, 1.0 - avgPropulsionDamage * 0.8);
  }
  
  if (rudderCount > 0) {
    const avgRudderDamage = rudderDamage / rudderCount;
    stats.maneuverability = Math.max(0.1, 1.0 - avgRudderDamage * 0.9);
  }
  
  if (bridgeCount > 0) {
    const avgBridgeDamage = bridgeDamage / bridgeCount;
    stats.maneuverability *= Math.max(0.3, 1.0 - avgBridgeDamage * 0.5);
  }
  
  if (controlCount > 0) {
    const avgControlDamage = controlDamage / controlCount;
    stats.detection = Math.max(0.1, 1.0 - avgControlDamage * 0.7);
    stats.mainGunFire *= Math.max(0.4, 1.0 - avgControlDamage * 0.4);
  }
  
  if (weaponCount > 0) {
    const avgWeaponDamage = weaponDamage / weaponCount;
    stats.mainGunFire *= Math.max(0.2, 1.0 - avgWeaponDamage * 0.8);
    stats.aaFire *= Math.max(0.2, 1.0 - avgWeaponDamage * 0.8);
  }

  if (totalCompartments > 0) {
    stats.flooding = totalFlooded / totalCompartments;
    stats.buoyancy = Math.max(0, 1.0 - stats.flooding * 0.8);
    stats.list = (starboardFlooded - portFlooded) / totalCompartments;
    stats.trim = (sternFlooded - bowFlooded) / totalCompartments;
  }

  return stats;
}
