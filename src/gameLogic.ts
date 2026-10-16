import { Ship, ShipType, SHIP_FLEET, Shot, BOARD_SIZE, Heading, createCompartments, calculateShipStats } from './types';

export { BOARD_SIZE };

export const HEX_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
];

function offsetToCube(q: number, r: number): { x: number; y: number; z: number } {
  const x = q - (r - (r & 1)) / 2;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const cube1 = offsetToCube(q1, r1);
  const cube2 = offsetToCube(q2, r2);
  return (Math.abs(cube1.x - cube2.x) + Math.abs(cube1.y - cube2.y) + Math.abs(cube1.z - cube2.z)) / 2;
}

export function getHeading(fromQ: number, fromR: number, toQ: number, toR: number): Heading {
  const fromCube = offsetToCube(fromQ, fromR);
  const toCube = offsetToCube(toQ, toR);
  const dx = toCube.x - fromCube.x;
  const dy = toCube.y - fromCube.y;
  const dz = toCube.z - fromCube.z;
  const directions = [
    { dx: 1, dy: -1, dz: 0 }, { dx: 0, dy: -1, dz: 1 }, { dx: -1, dy: 0, dz: 1 },
    { dx: -1, dy: 1, dz: 0 }, { dx: 0, dy: 1, dz: -1 }, { dx: 1, dy: 0, dz: -1 },
  ];
  let bestHeading: Heading = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < directions.length; i++) {
    const dir = directions[i];
    const distance = Math.abs(dx - dir.dx) + Math.abs(dy - dir.dy) + Math.abs(dz - dir.dz);
    if (distance < bestDistance) { bestDistance = distance; bestHeading = i as Heading; }
  }
  return bestHeading;
}

export function generatePlayerShips(): Ship[] {
  const ships: Ship[] = [];
  let shipId = 1;
  const queue = SHIP_FLEET.flatMap(fleet =>
    Array(fleet.count).fill(null).map(() => ({
      type: fleet.type, name: fleet.name, hp: fleet.hp,
      accuracy: fleet.accuracy, damage: fleet.damage, speed: fleet.speed, range: fleet.range,
    }))
  );
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  for (const shipDef of queue) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 500) {
      attempts++;
      const q = Math.floor(Math.random() * 8);
      const r = Math.floor(Math.random() * BOARD_SIZE);
      const occupied = ships.some(s => s.q === q && s.r === r);
      if (!occupied) {
        const defaultLength = shipDef.type === 'battleship' ? 250 : shipDef.type === 'cruiser' ? 200 : 115;
        const compartments = createCompartments(shipDef.type, defaultLength);
        const stats = calculateShipStats(compartments);
        const totalHP = compartments.reduce((sum, c) => sum + c.maxHP, 0);
        ships.push({
          id: shipId++, type: shipDef.type, name: shipDef.name,
          maxHP: totalHP, currentHP: totalHP, q, r, heading: 0,
          accuracy: shipDef.accuracy, damage: shipDef.damage, speed: shipDef.speed, range: shipDef.range,
          hasMoved: false, hasFired: false, compartments, stats, battleLog: [], isSunk: false,
        });
        placed = true;
      }
    }
  }
  return ships;
}

export function generateEnemyShips(): Ship[] {
  const ships: Ship[] = [];
  let shipId = 100;
  const queue = SHIP_FLEET.flatMap(fleet =>
    Array(fleet.count).fill(null).map(() => ({
      type: fleet.type, name: fleet.name, hp: fleet.hp,
      accuracy: fleet.accuracy, damage: fleet.damage, speed: fleet.speed, range: fleet.range,
    }))
  );
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  for (const shipDef of queue) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 500) {
      attempts++;
      const q = BOARD_SIZE - 1 - Math.floor(Math.random() * 8);
      const r = Math.floor(Math.random() * BOARD_SIZE);
      const occupied = ships.some(s => s.q === q && s.r === r);
      if (!occupied) {
        const defaultLength = shipDef.type === 'battleship' ? 250 : shipDef.type === 'cruiser' ? 200 : 115;
        const compartments = createCompartments(shipDef.type, defaultLength);
        const stats = calculateShipStats(compartments);
        const totalHP = compartments.reduce((sum, c) => sum + c.maxHP, 0);
        ships.push({
          id: shipId++, type: shipDef.type, name: shipDef.name,
          maxHP: totalHP, currentHP: totalHP, q, r, heading: 3,
          accuracy: shipDef.accuracy, damage: shipDef.damage, speed: shipDef.speed, range: shipDef.range,
          hasMoved: false, hasFired: false, compartments, stats, battleLog: [], isSunk: false,
        });
        placed = true;
      }
    }
  }
  return ships;
}

export function getReachableHexes(ship: Ship, allShips: Ship[]): { q: number; r: number }[] {
  const reachable: { q: number; r: number }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let q = 0; q < BOARD_SIZE; q++) {
      const distance = hexDistance(ship.q, ship.r, q, r);
      if (distance <= ship.speed && distance > 0) {
        const occupied = allShips.some(s => s.q === q && s.r === r && s.currentHP > 0 && s.id !== ship.id);
        if (!occupied) reachable.push({ q, r });
      }
    }
  }
  return reachable;
}

export function executeShots(
  shots: { shipId: number; targetShipId: number }[],
  attackerShips: Ship[],
  defenderShips: Ship[]
): { shots: Shot[]; updatedShips: Ship[] } {
  let newShips = defenderShips.map(s => ({ ...s }));
  const executedShots: Shot[] = [];

  console.log(`🎯 executeShots: Получено ${shots.length} выстрелов`);
  
  for (const shot of shots) {
    const attacker = attackerShips.find(s => s.id === shot.shipId);
    if (!attacker || attacker.currentHP <= 0) {
      console.log(`⚠️ Выстрел от корабля ${shot.shipId} пропущен: корабль не найден или уничтожен`);
      continue;
    }
    
    // Находим корабль-цель по ID
    const targetShip = newShips.find(s => s.id === shot.targetShipId && s.currentHP > 0);
    
    if (!targetShip) {
      console.log(`⚠️ ${attacker.name}: Цель не найдена или уничтожена`);
      executedShots.push({
        shipId: attacker.id,
        shipName: attacker.name,
        shipType: attacker.type,
        targetQ: 0,
        targetR: 0,
        hit: false,
        damage: 0,
        targetShipId: null,
        targetShipName: null,
      });
      continue;
    }
    
    const distance = hexDistance(attacker.q, attacker.r, targetShip.q, targetShip.r);
    
    console.log(`🔫 ${attacker.name} стреляет в ${targetShip.name}, дистанция: ${distance}, дальность: ${attacker.range}`);
    
    // Если цель вне дальности - промах
    if (distance > attacker.range) {
      console.log(`⚠️ ${attacker.name}: Цель вне дальности (${distance} > ${attacker.range})`);
      executedShots.push({
        shipId: attacker.id,
        shipName: attacker.name,
        shipType: attacker.type,
        targetQ: targetShip.q,
        targetR: targetShip.r,
        hit: false,
        damage: 0,
        targetShipId: targetShip.id,
        targetShipName: targetShip.name,
      });
      continue;
    }
    
    // Бонус к точности за близкую дистанцию
    const accuracyBonus = distance <= 3 ? 25 : distance <= 6 ? 15 : 5;
    const effectiveAccuracy = Math.min(98, attacker.accuracy + accuracyBonus);
    
    const hitRoll = Math.random() * 100;
    const hit = hitRoll < effectiveAccuracy;
    
    console.log(`🎲 Бросок: ${hitRoll.toFixed(1)} vs ${effectiveAccuracy} → ${hit ? 'ПОПАДАНИЕ' : 'промах'}`);

    if (hit && targetShip) {
      newShips = newShips.map(ship => {
        if (ship.id !== targetShip.id) return ship;
        const updatedShip = { ...ship, compartments: ship.compartments.map(c => ({ ...c, components: c.components.map(comp => ({ ...comp })) })) };
        const availableCompartments = updatedShip.compartments.filter(c => c.status !== 'destroyed');
        if (availableCompartments.length === 0) return ship;
        const targetCompartment = availableCompartments[Math.floor(Math.random() * availableCompartments.length)];
        const compIndex = updatedShip.compartments.findIndex(c => c.id === targetCompartment.id);
        if (compIndex === -1) return ship;
        const updatedCompartment = { ...updatedShip.compartments[compIndex] };
        const penetration = attacker.damage;
        const armor = updatedCompartment.armor;
        
        // Бонус за близкую дистанцию
        const distanceBonus = distance <= 3 ? 2.0 : distance <= 6 ? 1.5 : 1.2;
        const effectivePenetration = penetration * distanceBonus;
        
        let effectiveDamage = attacker.damage;
        
        // Улучшенная система пробития брони
        if (effectivePenetration >= armor) {
          effectiveDamage = Math.floor(attacker.damage * distanceBonus); // Полное пробитие
        } else if (effectivePenetration >= armor * 0.5) {
          effectiveDamage = Math.floor(attacker.damage * 0.7 * distanceBonus); // Частичное пробитие
        } else if (effectivePenetration >= armor * 0.25) {
          effectiveDamage = Math.floor(attacker.damage * 0.4 * distanceBonus); // Слабое пробитие
        } else {
          effectiveDamage = Math.floor(attacker.damage * 0.2 * distanceBonus); // Минимальный урон
        }
        
        const compartmentDamage = Math.floor(effectiveDamage);
        updatedCompartment.currentHP = Math.max(0, updatedCompartment.currentHP - compartmentDamage);
        if (updatedCompartment.currentHP <= 0) updatedCompartment.status = 'destroyed';
        else if (updatedCompartment.currentHP < updatedCompartment.maxHP * 0.5) updatedCompartment.status = 'damaged';
        if (updatedCompartment.watertight && updatedCompartment.currentHP < updatedCompartment.maxHP * 0.3) {
          updatedCompartment.flooded = Math.min(1.0, updatedCompartment.flooded + 0.3);
        }
        if (updatedCompartment.currentHP < updatedCompartment.maxHP * 0.5) {
          const hasFuelOrAmmo = updatedCompartment.type === 'ammunition';
          if (hasFuelOrAmmo && Math.random() < 0.4) {
            updatedCompartment.fire = Math.min(1.0, updatedCompartment.fire + 0.3);
          }
        }
        const componentDamagePool = Math.floor(effectiveDamage * 0.4);
        if (updatedCompartment.components.length > 0 && componentDamagePool > 0) {
          updatedCompartment.components = updatedCompartment.components.map(component => {
            const damageProbability = ((updatedCompartment.maxHP - updatedCompartment.currentHP) / updatedCompartment.maxHP) * component.vulnerability;
            if (Math.random() < damageProbability) {
              const updatedComponent = { ...component };
              const componentDamage = Math.floor(componentDamagePool / updatedCompartment.components.length);
              updatedComponent.currentHP = Math.max(0, updatedComponent.currentHP - componentDamage);
              if (updatedComponent.currentHP <= 0) updatedComponent.status = 'destroyed';
              else if (updatedComponent.currentHP < updatedComponent.maxHP * 0.5) updatedComponent.status = 'damaged';
              return updatedComponent;
            }
            return component;
          });
        }
        updatedShip.compartments[compIndex] = updatedCompartment;
        updatedShip.stats = calculateShipStats(updatedShip.compartments);
        updatedShip.currentHP = updatedShip.compartments.reduce((sum, c) => sum + c.currentHP, 0);
        return updatedShip;
      });
      executedShots.push({
        shipId: attacker.id, shipName: attacker.name, shipType: attacker.type,
        targetQ: targetShip.q, targetR: targetShip.r, hit: true, damage: attacker.damage,
        targetShipId: targetShip.id, targetShipName: targetShip.name,
      });
    } else {
      executedShots.push({
        shipId: attacker.id, shipName: attacker.name, shipType: attacker.type,
        targetQ: targetShip.q, targetR: targetShip.r, hit: false, damage: 0,
        targetShipId: targetShip.id, targetShipName: targetShip.name,
      });
    }
  }
  return { shots: executedShots, updatedShips: newShips };
}

export function allShipsSunk(ships: Ship[]): boolean {
  return ships.every(ship => ship.currentHP <= 0);
}
