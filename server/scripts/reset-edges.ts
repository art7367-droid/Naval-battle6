import { db } from '../src/db';

const NEW_EMPTY_EDGES = {
  NW: { coast: false, mainRail: false, secRail: false, highway: false, dirtRoad: false, minorRiver: false, majorRiver: false, navRiver: false, blocked: false },
  NE: { coast: false, mainRail: false, secRail: false, highway: false, dirtRoad: false, minorRiver: false, majorRiver: false, navRiver: false, blocked: false },
  W:  { coast: false, mainRail: false, secRail: false, highway: false, dirtRoad: false, minorRiver: false, majorRiver: false, navRiver: false, blocked: false },
  E:  { coast: false, mainRail: false, secRail: false, highway: false, dirtRoad: false, minorRiver: false, majorRiver: false, navRiver: false, blocked: false },
  SW: { coast: false, mainRail: false, secRail: false, highway: false, dirtRoad: false, minorRiver: false, majorRiver: false, navRiver: false, blocked: false },
  SE: { coast: false, mainRail: false, secRail: false, highway: false, dirtRoad: false, minorRiver: false, majorRiver: false, navRiver: false, blocked: false },
};

function main() {
  console.log('🔧 Сброс сторон у всех гексов...');

  const result = db.prepare(`
    UPDATE hex_map
    SET edges = ?
  `).run(JSON.stringify(NEW_EMPTY_EDGES));

  console.log(`✅ Обновлено гексов: ${result.changes}`);

  const first = db.prepare('SELECT * FROM hex_map LIMIT 1').get() as any;
  console.log('🔍 Пример гекса после сброса:', {
    ...first,
    edges: JSON.parse(first.edges),
  });
}

main();