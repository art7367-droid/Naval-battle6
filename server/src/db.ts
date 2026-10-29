import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../game.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    player1_id INTEGER REFERENCES users(id),
    player2_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'waiting',
    current_turn INTEGER DEFAULT 1,
    current_player TEXT DEFAULT 'usa',
    phase TEXT DEFAULT 'movement',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ships (
    id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
    owner TEXT NOT NULL,
    ship_type TEXT NOT NULL,
    name TEXT NOT NULL,
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    current_hp INTEGER NOT NULL,
    max_hp INTEGER NOT NULL,
    stats TEXT NOT NULL,
    compartments TEXT NOT NULL,
    is_sunk INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS battle_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
    turn INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hex_map (
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    terrain TEXT NOT NULL,
    edges TEXT NOT NULL,
    is_ready INTEGER DEFAULT 0,
    PRIMARY KEY (row, col)
  );

  CREATE TABLE IF NOT EXISTS task_forces (
    id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    status TEXT DEFAULT 'in_port',
    mission TEXT DEFAULT 'patrol',
    target_row INTEGER,
    target_col INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tf_ships (
    tf_id TEXT REFERENCES task_forces(id) ON DELETE CASCADE,
    ship_id TEXT REFERENCES ships(id) ON DELETE CASCADE,
    PRIMARY KEY (tf_id, ship_id)
  );

  -- 🪄 РАСШИРЕННЫЙ СПРАВОЧНИК УСТРОЙСТВ (Как в AE Editor)
  CREATE TABLE IF NOT EXISTS ref_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    
    -- Основное
    type_id INTEGER NOT NULL DEFAULT 18,       -- 18 = Naval Gun
    upgrade_id INTEGER DEFAULT NULL,           -- Ссылка на другое устройство
    side_id INTEGER DEFAULT 3,                 -- 0-Axis, 1-Allied, 2-Other, 3-Both
    
    -- Логистика и доступность
    available_date TEXT DEFAULT '1941-12-07',  -- Дата появления
    end_date TEXT DEFAULT '1946-05-30',        -- Дата исчезновения
    can_build INTEGER DEFAULT 1,               -- 0-No, 1-Yes
    build_rate INTEGER DEFAULT 0,              -- Скорость постройки
    pool INTEGER DEFAULT 0,                    -- Запас
    load_cost INTEGER DEFAULT 0,               -- Стоимость погрузки
    alt_device_id INTEGER DEFAULT NULL,        -- Alt Device (ссылка на другое устройство)
    alt_use INTEGER DEFAULT 0,                 -- Alt Use

    -- Боевые характеристики
    range INTEGER DEFAULT 0,
    accuracy INTEGER DEFAULT 0,
    penetration INTEGER DEFAULT 0,
    effect INTEGER DEFAULT 0,
    ceiling INTEGER DEFAULT 0,                 -- Потолок (для авиации)
    armor INTEGER DEFAULT 0,                   -- Броня (для танков)
    dud_rate INTEGER DEFAULT 0,                -- Процент осечек
    anti_armor INTEGER DEFAULT 0,              -- Против брони
    anti_soft INTEGER DEFAULT 0,               -- Против пехоты

    -- Флаги (Boolean)
    is_static INTEGER DEFAULT 0,               -- Статичное
    is_air_search INTEGER DEFAULT 0,           -- Air Search Mode
    is_a_bomb INTEGER DEFAULT 0,               -- A-Bomb (Ядерная)
    is_cannon_mg INTEGER DEFAULT 0,            -- Cannon Is MG
    is_shore_party INTEGER DEFAULT 0           -- Shore Party
  );

  -- 🪄 ТАБЛИЦА НАЗЕМНЫХ ЭЛЕМЕНТОВ (Ground Elements)
  CREATE TABLE IF NOT EXISTS ref_ground_elements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'infantry',    -- infantry, armor, artillery, engineer
    load_cost INTEGER DEFAULT 0,     -- Стоимость погрузки
    build_rate INTEGER DEFAULT 0,    -- Скорость постройки
    pool INTEGER DEFAULT 0,          -- Запас
    soft_attack INTEGER DEFAULT 0,   -- Атака по пехоте
    hard_attack INTEGER DEFAULT 0,   -- Атака по технике
    anti_air INTEGER DEFAULT 0,      -- ПВО
    armor INTEGER DEFAULT 0,         -- Броня
    penetration INTEGER DEFAULT 0,   -- Пробитие
    range INTEGER DEFAULT 0,         -- Дальность
    accuracy INTEGER DEFAULT 0,      -- Точность
    effect INTEGER DEFAULT 0         -- Эффект
  );

  -- 🪄 ТАБЛИЦА НАЗЕМНЫХ ЮНИТОВ (Land Units)
  CREATE TABLE IF NOT EXISTS ref_land_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon_url TEXT,                             -- Ссылка или Base64 картинки (значок НАТО)
    
    -- Основное
    nationality INTEGER DEFAULT 0,
    type_id INTEGER DEFAULT 0,
    hq_id INTEGER DEFAULT 0,
    leader_id INTEGER DEFAULT 0,
    delay INTEGER DEFAULT 0,
    
    -- Логистика и ресурсы
    supply_cap INTEGER DEFAULT 0,
    fuel INTEGER DEFAULT 0,
    supply INTEGER DEFAULT 0,
    oil INTEGER DEFAULT 0,
    resource INTEGER DEFAULT 0,
    daily_supply INTEGER DEFAULT 0,
    daily_fuel INTEGER DEFAULT 0,
    
    -- Состояние и мораль
    fatigue INTEGER DEFAULT 0,
    disabled_pct INTEGER DEFAULT 0,
    readiness INTEGER DEFAULT 0,
    experience INTEGER DEFAULT 0,
    morale INTEGER DEFAULT 0,
    disruption INTEGER DEFAULT 0,
    
    -- Боевые характеристики
    af_build INTEGER DEFAULT 0,
    forts INTEGER DEFAULT 0,
    port_dmg INTEGER DEFAULT 0,
    service_dmg INTEGER DEFAULT 0,
    runway_dmg INTEGER DEFAULT 0,
    
    -- Прочее
    unit_type TEXT DEFAULT '00 - Invalid',
    stance TEXT DEFAULT '00 - Defend',
    travel_time INTEGER DEFAULT 0,
    target_x INTEGER DEFAULT 0,
    target_y INTEGER DEFAULT 0,
    symbol INTEGER DEFAULT 0
  );

  -- 🪄 ТАБЛИЦА ВООРУЖЕНИЯ ЮНИТОВ (32 слота)
  CREATE TABLE IF NOT EXISTS ref_land_unit_weapons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    land_unit_id INTEGER REFERENCES ref_land_units(id) ON DELETE CASCADE,
    slot_num INTEGER NOT NULL,                 -- От 1 до 32
    device_id INTEGER DEFAULT 0,               -- Ссылка на ref_devices
    num_weapons INTEGER DEFAULT 0,
    dis_weapons INTEGER DEFAULT 0
  );
`);

// 🪄 Добавляем тестовые данные для вкладки "Devices"
const checkDevices = db.prepare('SELECT COUNT(*) as count FROM ref_devices').get() as { count: number };
if (checkDevices.count === 0) {
  const insertDevice = db.prepare(`
    INSERT INTO ref_devices (
      name, type_id, upgrade_id, side_id, 
      available_date, end_date, can_build, build_rate, pool, load_cost, 
      range, accuracy, penetration, effect, ceiling, armor, dud_rate, 
      anti_armor, anti_soft, is_static
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 001 - 18.1in/45 T94 Gun (с вашего скриншота)
  insertDevice.run(
    '18.1in/45 T94 Gun', 18, null, 3,
    '1941-12-07', '1946-05-30', 0, 0, 0, 9999,
    46, 20, 850, 3219, 0, 0, 0,
    850, 206, 0
  );
  
  // 002 - 16.1in/45 3YT Gun
  insertDevice.run(
    '16.1in/45 3YT Gun', 18, null, 3,
    '1941-12-07', '1946-05-30', 0, 0, 0, 8000,
    40, 25, 750, 2700, 0, 0, 0,
    750, 180, 0
  );

  console.log('✅ Добавлены тестовые данные в справочник устройств (Devices)');
}

// 🪄 Добавляем тестовые данные для вкладки "Ground Elements"
const checkElements = db.prepare('SELECT COUNT(*) as count FROM ref_ground_elements').get() as { count: number };
if (checkElements.count === 0) {
  const insertElement = db.prepare(`
    INSERT INTO ref_ground_elements (
      name, type, load_cost, build_rate, pool, soft_attack, hard_attack, anti_air, armor, penetration, range, accuracy, effect
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertElement.run('Infantry Squad', 'infantry', 10, 5, 100, 15, 2, 0, 0, 5, 1, 50, 10);
  insertElement.run('Type 97 Tank', 'armor', 20, 3, 50, 5, 25, 0, 25, 30, 2, 60, 20);
  insertElement.run('75mm Field Gun', 'artillery', 15, 2, 30, 30, 10, 0, 0, 15, 4, 40, 25);

  console.log('✅ Добавлены тестовые данные в справочник наземных элементов (Ground Elements)');
}

console.log('✅ База данных инициализирована:', DB_PATH);