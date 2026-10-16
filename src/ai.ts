import { Ship } from './types';
import { BOARD_SIZE, hexDistance } from './gameLogic';

interface AIState {
  damagedShips: { q: number; r: number }[];
  missedCells: Set<string>;
}

let aiState: AIState = { damagedShips: [], missedCells: new Set() };

export function resetAI() {
  aiState = { damagedShips: [], missedCells: new Set() };
}

export function generateAIShots(
  attackerShips: Ship[],
  defenderShips: Ship[]
): { shipId: number; targetShipId: number }[] {
  const shots: { shipId: number; targetShipId: number }[] = [];
  const aliveShips = attackerShips.filter(s => s.currentHP > 0);
  const aliveDefenders = defenderShips.filter(s => s.currentHP > 0);

  for (const ship of aliveShips) {
    const targetsInRange = aliveDefenders.filter(d => hexDistance(ship.q, ship.r, d.q, d.r) <= ship.range);
    
    if (targetsInRange.length > 0) {
      const damagedTargets = targetsInRange.filter(t => t.currentHP < t.maxHP);
      const target = damagedTargets.length > 0 
        ? damagedTargets[Math.floor(Math.random() * damagedTargets.length)]
        : targetsInRange[Math.floor(Math.random() * targetsInRange.length)];
      
      shots.push({ shipId: ship.id, targetShipId: target.id });
    }
  }
  
  return shots;
}

export function generateAIMoves(
  enemyShips: Ship[],
  playerShips: Ship[]
): { shipId: number; fromQ: number; fromR: number; toQ: number; toR: number }[] {
  const moves: { shipId: number; fromQ: number; fromR: number; toQ: number; toR: number }[] = [];
  const aliveShips = enemyShips.filter(s => s.currentHP > 0);

  for (const ship of aliveShips) {
    const alivePlayerShips = playerShips.filter(s => s.currentHP > 0);
    if (alivePlayerShips.length === 0) continue;

    let closestPlayer = alivePlayerShips[0];
    let minDistance = hexDistance(ship.q, ship.r, closestPlayer.q, closestPlayer.r);

    for (const playerShip of alivePlayerShips) {
      const dist = hexDistance(ship.q, ship.r, playerShip.q, playerShip.r);
      if (dist < minDistance) { minDistance = dist; closestPlayer = playerShip; }
    }

    const reachable: { q: number; r: number; dist: number }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let q = 0; q < BOARD_SIZE; q++) {
        const moveDistance = hexDistance(ship.q, ship.r, q, r);
        if (moveDistance <= ship.speed && moveDistance > 0) {
          const occupied = [...enemyShips, ...playerShips].some(s =>
            s.q === q && s.r === r && s.currentHP > 0 && s.id !== ship.id
          );
          if (!occupied) {
            const distToTarget = hexDistance(q, r, closestPlayer.q, closestPlayer.r);
            reachable.push({ q, r, dist: distToTarget });
          }
        }
      }
    }

    if (reachable.length > 0) {
      const inRange = reachable.filter(r => r.dist <= ship.range);
      let bestMove;
      if (inRange.length > 0) {
        inRange.sort((a, b) => a.dist - b.dist);
        bestMove = inRange[0];
      } else {
        reachable.sort((a, b) => a.dist - b.dist);
        bestMove = reachable[0];
      }
      moves.push({ shipId: ship.id, fromQ: ship.q, fromR: ship.r, toQ: bestMove.q, toR: bestMove.r });
    }
  }
  return moves;
}

export function updateAIAfterShots(
  shots: { targetQ: number; targetR: number; hit: boolean; targetShipId: number | null }[],
  defenderShips: Ship[]
) {
  for (const shot of shots) {
    const key = `${shot.targetQ},${shot.targetR}`;
    if (shot.hit && shot.targetShipId !== null) {
      const targetShip = defenderShips.find(s => s.id === shot.targetShipId);
      if (targetShip && targetShip.currentHP > 0) {
        const inList = aiState.damagedShips.some(t => t.q === shot.targetQ && t.r === shot.targetR);
        if (!inList) aiState.damagedShips.push({ q: shot.targetQ, r: shot.targetR });
      } else {
        aiState.missedCells.add(key);
        aiState.damagedShips = aiState.damagedShips.filter(t => !(t.q === shot.targetQ && t.r === shot.targetR));
      }
    } else {
      aiState.missedCells.add(key);
    }
  }
}
