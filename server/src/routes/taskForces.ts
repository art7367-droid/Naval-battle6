import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Все роуты требуют авторизации
router.use(requireAuth);

// 1. Создать новую TF
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { gameId, name, row, col } = req.body;
    if (!gameId || !name || row === undefined || col === undefined) {
      return res.status(400).json({ error: 'Нужны gameId, name, row, col' });
    }

    const id = randomUUID();
    const owner = req.userId === 1 ? 'usa' : 'japan'; // Упрощённо: ID 1 = USA, остальные = Japan. Позже исправим.

    db.prepare(`
      INSERT INTO task_forces (id, game_id, owner, name, row, col, status, mission)
      VALUES (?, ?, ?, ?, ?, ?, 'at_sea', 'patrol')
    `).run(id, gameId, owner, name, row, col);

    res.json({ id, gameId, owner, name, row, col, status: 'at_sea', mission: 'patrol' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 2. Получить все TF для конкретной игры
router.get('/:gameId', (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const tfs = db.prepare(`
      SELECT * FROM task_forces WHERE game_id = ?
    `).all(gameId);

    res.json(tfs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;