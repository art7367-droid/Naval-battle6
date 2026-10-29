import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// ==========================================
// 1. УСТРОЙСТВА (Devices)
// ==========================================

// Получить все устройства
router.get('/devices', (req: Request, res: Response) => {
  try {
    const devices = db.prepare('SELECT * FROM ref_devices ORDER BY id ASC').all();
    res.json(devices);
  } catch (error) {
    console.error('Ошибка получения устройств:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новое устройство
router.post('/devices', (req: Request, res: Response) => {
  try {
    const d = req.body;

    if (!d.name || d.type_id === undefined) {
      return res.status(400).json({ error: 'Нужно указать name и type_id' });
    }

    const stmt = db.prepare(`
      INSERT INTO ref_devices (
        name, type_id, upgrade_id, side_id,
        available_date, end_date, can_build, build_rate, pool, load_cost,
        alt_device_id, alt_use,
        range, accuracy, penetration, effect, ceiling, armor, dud_rate, anti_armor, anti_soft,
        is_static, is_air_search, is_a_bomb, is_cannon_mg, is_shore_party
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      d.name, d.type_id, d.upgrade_id || null, d.side_id !== undefined ? d.side_id : 3,
      d.available_date || '1941-12-07', d.end_date || '1946-05-30', 
      d.can_build ? 1 : 0, d.build_rate || 0, d.pool || 0, d.load_cost || 0,
      d.alt_device_id || null, d.alt_use || 0,
      d.range || 0, d.accuracy || 0, d.penetration || 0, d.effect || 0,
      d.ceiling || 0, d.armor || 0, d.dud_rate || 0, d.anti_armor || 0, d.anti_soft || 0,
      d.is_static ? 1 : 0, d.is_air_search ? 1 : 0, d.is_a_bomb ? 1 : 0,
      d.is_cannon_mg ? 1 : 0, d.is_shore_party ? 1 : 0
    );

    res.json({ success: true, id: info.lastInsertRowid, name: d.name });
  } catch (error) {
    console.error('Ошибка создания устройства:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить существующее устройство
router.put('/devices/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const d = req.body;

    if (!d.name || d.type_id === undefined) {
      return res.status(400).json({ error: 'Нужно указать name и type_id' });
    }

    const stmt = db.prepare(`
      UPDATE ref_devices SET
        name = ?, type_id = ?, upgrade_id = ?, side_id = ?,
        available_date = ?, end_date = ?, can_build = ?, build_rate = ?, pool = ?, load_cost = ?,
        alt_device_id = ?, alt_use = ?,
        range = ?, accuracy = ?, penetration = ?, effect = ?, ceiling = ?, armor = ?, dud_rate = ?, anti_armor = ?, anti_soft = ?,
        is_static = ?, is_air_search = ?, is_a_bomb = ?, is_cannon_mg = ?, is_shore_party = ?
      WHERE id = ?
    `);
    
    const info = stmt.run(
      d.name, d.type_id, d.upgrade_id || null, d.side_id !== undefined ? d.side_id : 3,
      d.available_date || '1941-12-07', d.end_date || '1946-05-30', 
      d.can_build ? 1 : 0, d.build_rate || 0, d.pool || 0, d.load_cost || 0,
      d.alt_device_id || null, d.alt_use || 0,
      d.range || 0, d.accuracy || 0, d.penetration || 0, d.effect || 0,
      d.ceiling || 0, d.armor || 0, d.dud_rate || 0, d.anti_armor || 0, d.anti_soft || 0,
      d.is_static ? 1 : 0, d.is_air_search ? 1 : 0, d.is_a_bomb ? 1 : 0,
      d.is_cannon_mg ? 1 : 0, d.is_shore_party ? 1 : 0,
      id
    );

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }

    res.json({ success: true, id: Number(id), name: d.name });
  } catch (error) {
    console.error('Ошибка обновления устройства:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


// ==========================================
// 2. НАЗЕМНЫЕ ЭЛЕМЕНТЫ (Ground Elements)
// ==========================================

// Получить все элементы
router.get('/ground-elements', (req: Request, res: Response) => {
  try {
    const elements = db.prepare('SELECT * FROM ref_ground_elements ORDER BY id ASC').all();
    res.json(elements);
  } catch (error) {
    console.error('Ошибка получения элементов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать элемент
router.post('/ground-elements', (req: Request, res: Response) => {
  try {
    const d = req.body;
    if (!d.name) return res.status(400).json({ error: 'Нужно указать name' });

    const stmt = db.prepare(`
      INSERT INTO ref_ground_elements (
        name, type, load_cost, build_rate, pool, 
        soft_attack, hard_attack, anti_air, armor, penetration, range, accuracy, effect
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      d.name, d.type || 'infantry', d.load_cost || 0, d.build_rate || 0, d.pool || 0,
      d.soft_attack || 0, d.hard_attack || 0, d.anti_air || 0, d.armor || 0,
      d.penetration || 0, d.range || 0, d.accuracy || 0, d.effect || 0
    );

    res.json({ success: true, id: info.lastInsertRowid, name: d.name });
  } catch (error) {
    console.error('Ошибка создания элемента:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить элемент
router.put('/ground-elements/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const d = req.body;
    if (!d.name) return res.status(400).json({ error: 'Нужно указать name' });

    const stmt = db.prepare(`
      UPDATE ref_ground_elements SET
        name = ?, type = ?, load_cost = ?, build_rate = ?, pool = ?,
        soft_attack = ?, hard_attack = ?, anti_air = ?, armor = ?, penetration = ?, range = ?, accuracy = ?, effect = ?
      WHERE id = ?
    `);
    
    const info = stmt.run(
      d.name, d.type || 'infantry', d.load_cost || 0, d.build_rate || 0, d.pool || 0,
      d.soft_attack || 0, d.hard_attack || 0, d.anti_air || 0, d.armor || 0,
      d.penetration || 0, d.range || 0, d.accuracy || 0, d.effect || 0,
      id
    );

    if (info.changes === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json({ success: true, id: Number(id) });
  } catch (error) {
    console.error('Ошибка обновления элемента:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


// ==========================================
// 3. НАЗЕМНЫЕ ЮНИТЫ (Land Units)
// ==========================================

// Получить все наземные юниты
router.get('/land-units', (req: Request, res: Response) => {
  try {
    const units = db.prepare('SELECT * FROM ref_land_units ORDER BY id ASC').all();
    res.json(units);
  } catch (error) {
    console.error('Ошибка получения юнитов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить один юнит (с его оружием)
router.get('/land-units/:id', (req: Request, res: Response) => {
  try {
    const unit = db.prepare('SELECT * FROM ref_land_units WHERE id = ?').get(req.params.id) as any;
    if (!unit) {
      return res.status(404).json({ error: 'Юнит не найден' });
    }
    
    // Подгружаем 32 слота вооружения
    const weapons = db.prepare('SELECT * FROM ref_land_unit_weapons WHERE land_unit_id = ? ORDER BY slot_num ASC').all(req.params.id);
    unit.weapons = weapons;
    
    res.json(unit);
  } catch (error) {
    console.error('Ошибка получения юнита:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новый наземный юнит
router.post('/land-units', (req: Request, res: Response) => {
  try {
    const d = req.body;
    
    if (!d.name) {
      return res.status(400).json({ error: 'Нужно указать name' });
    }

    const stmt = db.prepare(`
      INSERT INTO ref_land_units (
        name, icon_url, nationality, type_id, hq_id, leader_id, delay,
        supply_cap, fuel, supply, oil, resource, daily_supply, daily_fuel,
        fatigue, disabled_pct, readiness, experience, morale, disruption,
        af_build, forts, port_dmg, service_dmg, runway_dmg,
        unit_type, stance, travel_time, target_x, target_y, symbol
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      d.name, d.icon_url || '', d.nationality || 0, d.type_id || 0, d.hq_id || 0, d.leader_id || 0, d.delay || 0,
      d.supply_cap || 0, d.fuel || 0, d.supply || 0, d.oil || 0, d.resource || 0, d.daily_supply || 0, d.daily_fuel || 0,
      d.fatigue || 0, d.disabled_pct || 0, d.readiness || 0, d.experience || 0, d.morale || 0, d.disruption || 0,
      d.af_build || 0, d.forts || 0, d.port_dmg || 0, d.service_dmg || 0, d.runway_dmg || 0,
      d.unit_type || '00 - Invalid', d.stance || '00 - Defend', d.travel_time || 0, d.target_x || 0, d.target_y || 0, d.symbol || 0
    );

    const newId = info.lastInsertRowid;

    // Сохраняем оружие, если оно есть
    if (d.weapons && Array.isArray(d.weapons)) {
      const insertWpn = db.prepare(`
        INSERT INTO ref_land_unit_weapons (land_unit_id, slot_num, device_id, num_weapons, dis_weapons)
        VALUES (?, ?, ?, ?, ?)
      `);
      d.weapons.forEach((w: any, index: number) => {
        if (w.device_id && w.device_id !== 0) {
          insertWpn.run(newId, index + 1, w.device_id, w.num_weapons || 0, w.dis_weapons || 0);
        }
      });
    }

    res.json({ success: true, id: newId, name: d.name });
  } catch (error) {
    console.error('Ошибка создания юнита:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить наземный юнит
router.put('/land-units/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const d = req.body;

    if (!d.name) {
      return res.status(400).json({ error: 'Нужно указать name' });
    }

    // 1. Обновляем основные поля
    const stmt = db.prepare(`
      UPDATE ref_land_units SET
        name = ?, icon_url = ?, nationality = ?, type_id = ?, hq_id = ?, leader_id = ?, delay = ?,
        supply_cap = ?, fuel = ?, supply = ?, oil = ?, resource = ?, daily_supply = ?, daily_fuel = ?,
        fatigue = ?, disabled_pct = ?, readiness = ?, experience = ?, morale = ?, disruption = ?,
        af_build = ?, forts = ?, port_dmg = ?, service_dmg = ?, runway_dmg = ?,
        unit_type = ?, stance = ?, travel_time = ?, target_x = ?, target_y = ?, symbol = ?
      WHERE id = ?
    `);
    
    const info = stmt.run(
      d.name, d.icon_url || '', d.nationality || 0, d.type_id || 0, d.hq_id || 0, d.leader_id || 0, d.delay || 0,
      d.supply_cap || 0, d.fuel || 0, d.supply || 0, d.oil || 0, d.resource || 0, d.daily_supply || 0, d.daily_fuel || 0,
      d.fatigue || 0, d.disabled_pct || 0, d.readiness || 0, d.experience || 0, d.morale || 0, d.disruption || 0,
      d.af_build || 0, d.forts || 0, d.port_dmg || 0, d.service_dmg || 0, d.runway_dmg || 0,
      d.unit_type || '00 - Invalid', d.stance || '00 - Defend', d.travel_time || 0, d.target_x || 0, d.target_y || 0, d.symbol || 0,
      id
    );

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Юнит не найден' });
    }

    // 2. Обновляем вооружение (удаляем старые и вставляем новые)
    if (d.weapons && Array.isArray(d.weapons)) {
      db.prepare('DELETE FROM ref_land_unit_weapons WHERE land_unit_id = ?').run(id);
      
      const insertWpn = db.prepare(`
        INSERT INTO ref_land_unit_weapons (land_unit_id, slot_num, device_id, num_weapons, dis_weapons)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      d.weapons.forEach((w: any, index: number) => {
        if (w.device_id && w.device_id !== 0) {
          insertWpn.run(id, index + 1, w.device_id, w.num_weapons || 0, w.dis_weapons || 0);
        }
      });
    }

    res.json({ success: true, id: Number(id), name: d.name });
  } catch (error) {
    console.error('Ошибка обновления юнита:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;