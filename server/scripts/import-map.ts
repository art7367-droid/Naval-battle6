import fs from 'fs';
import path from 'path';
import { db } from '../src/db';

const JSON_PATH = path.join(__dirname, '../data/hexmap.json');

interface HexExport {
  row: number;
  col: number;
  terrain: string;
  edges: Record<string, any>;
  isReady: boolean;
}

interface ExportData {
  hexes: HexExport[];
  exportedAt: string;
  totalHexes: number;
}

function main() {
  console.log('📂 Читаю файл:', JSON_PATH);

  if (!fs.existsSync(JSON_PATH)) {
    console.error('❌ Файл не найден:', JSON_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_PATH, 'utf-8');
  const data: ExportData = JSON.parse(raw);

  console.log(`📊 Всего гексов в файле: ${data.hexes.length}`);

  db.prepare('DELETE FROM hex_map').run();

  const insert = db.prepare(`
    INSERT INTO hex_map (row, col, terrain, edges, is_ready)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((hexes: HexExport[]) => {
    for (const hex of hexes) {
      insert.run(
        hex.row,
        hex.col,
        hex.terrain,
        JSON.stringify(hex.edges),
        hex.isReady ? 1 : 0
      );
    }
  });

  const start = Date.now();
  insertMany(data.hexes);
  const elapsed = Date.now() - start;

  console.log(`✅ Импортировано ${data.hexes.length} гексов за ${elapsed} мс`);

  const count = db.prepare('SELECT COUNT(*) as count FROM hex_map').get() as { count: number };
  console.log(`📊 В базе данных сейчас: ${count.count} гексов`);

  const first = db.prepare('SELECT * FROM hex_map ORDER BY row, col LIMIT 1').get();
  const last = db.prepare('SELECT * FROM hex_map ORDER BY row DESC, col DESC LIMIT 1').get();
  console.log('🔍 Первый гекс:', first);
  console.log('🔍 Последний гекс:', last);
}

main();