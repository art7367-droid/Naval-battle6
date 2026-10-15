export type ShipClass = 'battleship' | 'cruiser' | 'destroyer' | 'aircraft_carrier' | 'submarine';

export interface WeaponSystem {
  id: string;
  name: string;
  type: 'main_gun' | 'secondary_gun' | 'aa_gun' | 'torpedo' | 'missile';
  caliber?: number;
  range: number;
  damage: number;
  accuracy: number;
  rateOfFire: number;
}

export interface StrategicMapData {
  tiles: Array<{
    id: number;
    imageData: string;
    row: number;
    col: number;
    width?: number;
    height?: number;
  }>;
  mapWidth: number;
  mapHeight: number;
  tileWidth: number;
  tileHeight: number;
  hexSample?: string; // Изображение образца гекса для отрисовки сетки
}

export interface ShipDatabaseEntry {
  id: string;
  name: string;
  class: ShipClass;
  country: string;
  year: number;
  maxHP: number;
  speed: number;
  range: number;
  armor: number;
  weapons: WeaponSystem[];
  schematic?: string;
  photo?: string;
  description?: string;
  length?: number;
  beam?: number;
  draft?: number;
  displacementStandard?: number;
  displacementFull?: number;
  compartmentData?: {
    backgroundImage?: string;
    backgroundPosition?: { x: number; y: number };
    backgroundLocked?: boolean;
    compartments: Array<{
      id: string;
      gridX: number;
      gridY: number;
      position: string;
      deck: string;
      side: string;
      type: string;
      name: string;
      maxHP: number;
      currentHP: number;
      status: string;
      watertight: boolean;
      armor: number;
    }>;
  };
  strategicMapData?: StrategicMapData;
  createdAt: number;
  updatedAt: number;
}

export interface ShipDatabase {
  ships: ShipDatabaseEntry[];
  version: string;
  lastUpdated: number;
}
