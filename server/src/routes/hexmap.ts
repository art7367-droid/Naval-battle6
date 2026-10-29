import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// Получить все гексы (или часть по видимой области)
router.get('/', (req: Request, res: Response) => {
  try {
    const { minRow, maxRow, minCol, maxCol } = req.query;

    let hexes: any[];

    if (minRow && maxRow && minCol && maxCol) {
      hexes = db.prepare(`
        SELECT row, col, terrain, edges, is_ready
        FROM hex_map
        WHERE row BETWEEN ? AND ? AND col BETWEEN ? AND ?
      `).all(
        Number(minRow), Number(maxRow),
        Number(minCol), Number(maxCol)
      ) as any[];
    } else {
      hexes = db.prepare(`
        SELECT row, col, terrain, edges, is_ready
        FROM hex_map
      `).all() as any[];
    }

    res.json({
      hexes: hexes.map(h => ({
        row: h.row,
        col: h.col,
        terrain: h.terrain,
        edges: JSON.parse(h.edges),
        isReady: Boolean(h.is_ready),
      })),
      total: hexes.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить один гекс по координатам
router.get('/:row/:col', (req: Request, res: Response) => {
  try {
    const { row, col } = req.params;
    const hex = db.prepare(`
      SELECT row, col, terrain, edges, is_ready
      FROM hex_map
      WHERE row = ? AND col = ?
    `).get(Number(row), Number(col)) as any;

    if (!hex) {
      return res.status(404).json({ error: 'Гекс не найден' });
    }

    res.json({
      row: hex.row,
      col: hex.col,
      terrain: hex.terrain,
      edges: JSON.parse(hex.edges),
      isReady: Boolean(hex.is_ready),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;