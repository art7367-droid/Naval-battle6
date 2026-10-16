import { Ship, BattleLogEntry } from './types';

let logIdCounter = 0;
function generateLogId(): string {
  return `log_${Date.now()}_${logIdCounter++}`;
}

function createLogEntry(
  turn: number, type: BattleLogEntry['type'], shipId: number, shipName: string,
  message: string, severity: BattleLogEntry['severity'],
  compartmentId?: string, compartmentName?: string
): BattleLogEntry {
  return {
    id: generateLogId(), turn, timestamp: Date.now(), type, shipId, shipName,
    compartmentId, compartmentName, message, severity
  };
}

export function propagateFires(ships: Ship[], turn: number): { ships: Ship[]; newLogs: BattleLogEntry[] } {
  const newLogs: BattleLogEntry[] = [];
  const updatedShips = ships.map(ship => {
    if (ship.isSunk) return ship;
    const updatedCompartments = ship.compartments.map(comp => ({ ...comp, components: comp.components.map(c => ({...c})) }));
    const shipLogs: BattleLogEntry[] = [];
    const burningCompartments = updatedCompartments.filter(c => c.fire > 0);
    burningCompartments.forEach(burningComp => {
      if (burningComp.fire < 1.0) burningComp.fire = Math.min(1.0, burningComp.fire + 0.03);
      burningComp.adjacentIds.forEach(adjId => {
        const adjacentComp = updatedCompartments.find(c => c.id === adjId);
        if (!adjacentComp) return;
        const spreadChance = burningComp.fire * 0.3;
        if (Math.random() < spreadChance) {
          const watertightModifier = adjacentComp.watertight ? 0.5 : 1.0;
          if (Math.random() < watertightModifier) {
            if (adjacentComp.fire === 0) {
              adjacentComp.fire = 0.2;
              adjacentComp.status = 'on_fire';
              shipLogs.push(createLogEntry(turn, 'fire_spread', ship.id, ship.name,
                `🔥 Пожар распространился в "${adjacentComp.name}"`, 'warning', adjacentComp.id, adjacentComp.name));
            } else {
              adjacentComp.fire = Math.min(1.0, adjacentComp.fire + 0.1);
            }
          }
        }
      });
    });
    updatedCompartments.forEach(comp => {
      if (comp.fire > 0) {
        comp.components = comp.components.map(component => {
          const damageChance = comp.fire * 0.2;
          if (Math.random() < damageChance) {
            const damage = Math.floor(component.maxHP * 0.1);
            const newHP = Math.max(0, component.currentHP - damage);
            if (newHP <= 0 && component.status !== 'destroyed') {
              shipLogs.push(createLogEntry(turn, 'critical_damage', ship.id, ship.name,
                `💥 ${component.name} уничтожен пожаром`, 'critical', comp.id, comp.name));
            }
            return { ...component, currentHP: newHP, status: newHP <= 0 ? 'destroyed' as const : newHP < component.maxHP * 0.5 ? 'damaged' as const : component.status };
          }
          return component;
        });
      }
    });
    return { ...ship, compartments: updatedCompartments, battleLog: [...ship.battleLog, ...shipLogs] };
  });
  return { ships: updatedShips, newLogs };
}

export function propagateFlooding(ships: Ship[], turn: number): { ships: Ship[]; newLogs: BattleLogEntry[] } {
  const newLogs: BattleLogEntry[] = [];
  const updatedShips = ships.map(ship => {
    if (ship.isSunk) return ship;
    const updatedCompartments = ship.compartments.map(comp => ({ ...comp, components: comp.components.map(c => ({...c})) }));
    const shipLogs: BattleLogEntry[] = [];
    const floodedCompartments = updatedCompartments.filter(c => c.flooded > 0);
    floodedCompartments.forEach(floodedComp => {
      floodedComp.adjacentIds.forEach(adjId => {
        const adjacentComp = updatedCompartments.find(c => c.id === adjId);
        if (!adjacentComp) return;
        const spreadChance = floodedComp.flooded * 0.25;
        if (Math.random() < spreadChance) {
          const watertightModifier = adjacentComp.watertight ? 0.2 : 1.0;
          if (Math.random() < watertightModifier) {
            if (adjacentComp.flooded === 0) {
              adjacentComp.flooded = 0.15;
              if (adjacentComp.status === 'intact' || adjacentComp.status === 'damaged') adjacentComp.status = 'flooded';
              shipLogs.push(createLogEntry(turn, 'flooding_spread', ship.id, ship.name,
                `🌊 Затопление в "${adjacentComp.name}"`, 'warning', adjacentComp.id, adjacentComp.name));
            } else {
              adjacentComp.flooded = Math.min(1.0, adjacentComp.flooded + 0.08);
            }
          }
        }
      });
    });
    updatedCompartments.forEach(comp => {
      if (comp.flooded > 0) {
        const overallHealth = comp.currentHP / comp.maxHP;
        if (overallHealth > 0.5) {
          comp.flooded = Math.max(0, comp.flooded - 0.03);
        }
      }
    });
    return { ...ship, compartments: updatedCompartments, battleLog: [...ship.battleLog, ...shipLogs] };
  });
  return { ships: updatedShips, newLogs };
}

export function checkAmmoDetonation(ships: Ship[], turn: number): { ships: Ship[]; newLogs: BattleLogEntry[] } {
  const newLogs: BattleLogEntry[] = [];
  const updatedShips = ships.map(ship => {
    if (ship.isSunk) return ship;
    const updatedCompartments = ship.compartments.map(comp => ({ ...comp, components: comp.components.map(c => ({...c})) }));
    const shipLogs: BattleLogEntry[] = [];
    updatedCompartments.forEach(comp => {
      if (comp.detonated) return;
      if (comp.type !== 'ammunition') return;
      const hasFire = comp.fire > 0.5;
      const ammoDestroyed = comp.status === 'destroyed';
      const criticalDamage = comp.currentHP < comp.maxHP * 0.2;
      let detonationChance = 0;
      if (ammoDestroyed && hasFire) detonationChance = 0.4;
      else if (ammoDestroyed && criticalDamage) detonationChance = 0.25;
      else if (hasFire && criticalDamage) detonationChance = 0.1;
      if (detonationChance > 0 && Math.random() < detonationChance) {
        comp.detonated = true;
        comp.fire = 1.0;
        comp.currentHP = 0;
        comp.status = 'destroyed';
        comp.components = comp.components.map(c => ({ ...c, currentHP: 0, status: 'destroyed' as const }));
        comp.adjacentIds.forEach(adjId => {
          const adjacentComp = updatedCompartments.find(c => c.id === adjId);
          if (adjacentComp) {
            const damage = Math.floor(adjacentComp.maxHP * 0.6);
            adjacentComp.currentHP = Math.max(0, adjacentComp.currentHP - damage);
            adjacentComp.fire = Math.min(1.0, adjacentComp.fire + 0.5);
            if (adjacentComp.currentHP <= 0) adjacentComp.status = 'destroyed';
          }
        });
        shipLogs.push(createLogEntry(turn, 'ammo_detonation', ship.id, ship.name,
          `💥💥💥 ВЗРЫВ БОЕЗАПАСА в "${comp.name}"!`, 'critical', comp.id, comp.name));
      }
    });
    return { ...ship, compartments: updatedCompartments, battleLog: [...ship.battleLog, ...shipLogs] };
  });
  return { ships: updatedShips, newLogs };
}

export function checkShipSinking(ships: Ship[], turn: number): { ships: Ship[]; newLogs: BattleLogEntry[] } {
  const newLogs: BattleLogEntry[] = [];
  const updatedShips = ships.map(ship => {
    if (ship.isSunk) return ship;
    const stats = calculateShipStatsForShip(ship);
    let sinkCause: 'flooding' | 'detonation' | 'buoyancy' | undefined;
    let isSunk = false;
    if (stats.buoyancy <= 0.05) { isSunk = true; sinkCause = 'buoyancy'; }
    else if (stats.flooding >= 0.60) { isSunk = true; sinkCause = 'flooding'; }
    const allAmmoDetonated = ship.compartments
      .filter(c => c.type === 'ammunition')
      .every(c => c.detonated);
    if (allAmmoDetonated && ship.compartments.some(c => c.detonated)) { isSunk = true; sinkCause = 'detonation'; }
    if (isSunk && !ship.isSunk) {
      const causeMessage = sinkCause === 'buoyancy' ? 'Корабль потерял плавучесть' :
        sinkCause === 'flooding' ? 'Корабль затонул из-за затопления' : 'Корабль уничтожен взрывами';
      newLogs.push(createLogEntry(turn, 'ship_sunk', ship.id, ship.name, `☠️ ${causeMessage}!`, 'critical'));
    }
    return { ...ship, stats, isSunk, sinkCause: isSunk ? sinkCause : undefined, battleLog: [...ship.battleLog, ...newLogs.filter(l => l.shipId === ship.id)] };
  });
  return { ships: updatedShips, newLogs };
}

function calculateShipStatsForShip(ship: Ship) {
  const stats = { speed: 1.0, maneuverability: 1.0, mainGunFire: 1.0, aaFire: 1.0, detection: 1.0, buoyancy: 1.0, list: 0.0, trim: 0.0, fires: 0, flooding: 0.0 };
  let totalFlooded = 0, totalCompartments = 0, portFlooded = 0, starboardFlooded = 0, bowFlooded = 0, sternFlooded = 0;
  
  let propulsionDamage = 0, propulsionCount = 0;
  let rudderDamage = 0, rudderCount = 0;
  let bridgeDamage = 0, bridgeCount = 0;
  let controlDamage = 0, controlCount = 0;
  let weaponDamage = 0, weaponCount = 0;
  
  ship.compartments.forEach(comp => {
    totalCompartments++;
    const compHealth = comp.maxHP > 0 ? comp.currentHP / comp.maxHP : 0;
    
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
    if (comp.fire > 0) stats.fires++;
  });
  
  if (propulsionCount > 0) {
    const avgDamage = propulsionDamage / propulsionCount;
    stats.speed = Math.max(0.1, 1.0 - avgDamage * 0.8);
  }
  if (rudderCount > 0) {
    const avgDamage = rudderDamage / rudderCount;
    stats.maneuverability = Math.max(0.1, 1.0 - avgDamage * 0.9);
  }
  if (bridgeCount > 0) {
    const avgDamage = bridgeDamage / bridgeCount;
    stats.maneuverability *= Math.max(0.3, 1.0 - avgDamage * 0.5);
  }
  if (controlCount > 0) {
    const avgDamage = controlDamage / controlCount;
    stats.detection = Math.max(0.1, 1.0 - avgDamage * 0.7);
    stats.mainGunFire *= Math.max(0.4, 1.0 - avgDamage * 0.4);
  }
  if (weaponCount > 0) {
    const avgDamage = weaponDamage / weaponCount;
    stats.mainGunFire *= Math.max(0.2, 1.0 - avgDamage * 0.8);
    stats.aaFire *= Math.max(0.2, 1.0 - avgDamage * 0.8);
  }
  
  if (totalCompartments > 0) {
    stats.flooding = totalFlooded / totalCompartments;
    stats.buoyancy = Math.max(0, 1.0 - stats.flooding * 0.8);
    stats.list = (starboardFlooded - portFlooded) / totalCompartments;
    stats.trim = (sternFlooded - bowFlooded) / totalCompartments;
  }
  return stats;
}

export function processDamagePropagation(ships: Ship[], turn: number): { ships: Ship[]; allLogs: BattleLogEntry[] } {
  let currentShips = ships;
  const allLogs: BattleLogEntry[] = [];
  const fireResult = propagateFires(currentShips, turn);
  currentShips = fireResult.ships;
  allLogs.push(...fireResult.newLogs);
  const floodResult = propagateFlooding(currentShips, turn);
  currentShips = floodResult.ships;
  allLogs.push(...floodResult.newLogs);
  const detonationResult = checkAmmoDetonation(currentShips, turn);
  currentShips = detonationResult.ships;
  allLogs.push(...detonationResult.newLogs);
  const sinkingResult = checkShipSinking(currentShips, turn);
  currentShips = sinkingResult.ships;
  allLogs.push(...sinkingResult.newLogs);
  return { ships: currentShips, allLogs };
}
