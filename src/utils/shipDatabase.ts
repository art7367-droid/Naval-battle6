import { ShipDatabase, ShipDatabaseEntry, ShipClass } from '../types/shipDatabase';

const DB_KEY = 'naval_battle_ship_database';
const DB_VERSION = '1.0.0';

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createDefaultDatabase(): ShipDatabase {
  const demoShips: ShipDatabaseEntry[] = [
    {
      id: generateId(), name: 'Ямато', class: 'battleship', country: 'Япония', year: 1941,
      maxHP: 150, speed: 27, range: 12, armor: 410, weapons: [],
      length: 263, beam: 38.9, draft: 10.4, displacementStandard: 64000, displacementFull: 72800,
      description: 'Крупнейший линкор в истории.',
      createdAt: Date.now(), updatedAt: Date.now()
    },
    {
      id: generateId(), name: 'Бисмарк', class: 'battleship', country: 'Германия', year: 1940,
      maxHP: 140, speed: 30, range: 11, armor: 320, weapons: [],
      length: 251, beam: 36, draft: 9.9, displacementStandard: 41700, displacementFull: 50900,
      description: 'Немецкий линкор времен WWII.',
      createdAt: Date.now(), updatedAt: Date.now()
    },
    {
      id: generateId(), name: 'Айова', class: 'battleship', country: 'США', year: 1943,
      maxHP: 145, speed: 33, range: 12, armor: 310, weapons: [],
      length: 270.4, beam: 32.9, draft: 11.3, displacementStandard: 45000, displacementFull: 58000,
      description: 'Американский быстроходный линкор.',
      createdAt: Date.now(), updatedAt: Date.now()
    },
    {
      id: generateId(), name: 'Балтимор', class: 'cruiser', country: 'США', year: 1943,
      maxHP: 90, speed: 33, range: 9, armor: 150, weapons: [],
      length: 205.9, beam: 21.6, draft: 7.3, displacementStandard: 14000, displacementFull: 17000,
      description: 'Тяжелый крейсер ВМС США.',
      createdAt: Date.now(), updatedAt: Date.now()
    },
    {
      id: generateId(), name: 'Флетчер', class: 'destroyer', country: 'США', year: 1942,
      maxHP: 60, speed: 37, range: 7, armor: 30, weapons: [],
      length: 114.8, beam: 12, draft: 5.3, displacementStandard: 2100, displacementFull: 2900,
      description: 'Самый массовый эсминец WWII.',
      createdAt: Date.now(), updatedAt: Date.now()
    },
    {
      id: generateId(), name: 'Симкадзэ', class: 'destroyer', country: 'Япония', year: 1940,
      maxHP: 55, speed: 36, range: 7, armor: 25, weapons: [],
      length: 118.5, beam: 10.8, draft: 3.8, displacementStandard: 2033, displacementFull: 2500,
      description: 'Японский эсминец типа Кагэро.',
      createdAt: Date.now(), updatedAt: Date.now()
    },
    {
      id: generateId(), name: 'Гневный', class: 'destroyer', country: 'СССР', year: 1938,
      maxHP: 50, speed: 35, range: 6, armor: 20, weapons: [],
      length: 112.5, beam: 10.2, draft: 3.8, displacementStandard: 1700, displacementFull: 2000,
      description: 'Советский эсминец проекта 7.',
      createdAt: Date.now(), updatedAt: Date.now()
    }
  ];

  return { ships: demoShips, version: DB_VERSION, lastUpdated: Date.now() };
}

export function loadDatabase(): ShipDatabase {
  try {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
      const db = JSON.parse(data);
      if (!db.ships || db.ships.length === 0) {
        const defaultDb = createDefaultDatabase();
        saveDatabase(defaultDb);
        return defaultDb;
      }
      return db;
    }
  } catch (error) {
    console.error('Ошибка загрузки базы данных:', error);
  }
  const defaultDb = createDefaultDatabase();
  saveDatabase(defaultDb);
  return defaultDb;
}

export function saveDatabase(db: ShipDatabase): void {
  try {
    db.lastUpdated = Date.now();
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Ошибка сохранения базы данных:', error);
  }
}

export function createShipEntry(name: string, shipClass: ShipClass, country: string, year: number): ShipDatabaseEntry {
  return {
    id: generateId(), name, class: shipClass, country, year,
    maxHP: 100, speed: 30, range: 10, armor: 100, weapons: [],
    length: 200, beam: 20, draft: 8, displacementStandard: 30000, displacementFull: 40000,
    createdAt: Date.now(), updatedAt: Date.now()
  };
}

export function addShipToDatabase(ship: ShipDatabaseEntry): ShipDatabase {
  const db = loadDatabase();
  db.ships.push(ship);
  saveDatabase(db);
  return db;
}

export function updateShipInDatabase(ship: ShipDatabaseEntry): ShipDatabase {
  const db = loadDatabase();
  const index = db.ships.findIndex(s => s.id === ship.id);
  if (index !== -1) {
    ship.updatedAt = Date.now();
    db.ships[index] = ship;
    saveDatabase(db);
  }
  return db;
}

export function deleteShipFromDatabase(shipId: string): ShipDatabase {
  const db = loadDatabase();
  db.ships = db.ships.filter(s => s.id !== shipId);
  saveDatabase(db);
  return db;
}

export function createDemoDatabase(): ShipDatabase {
  const db = createDefaultDatabase();
  saveDatabase(db);
  return db;
}
