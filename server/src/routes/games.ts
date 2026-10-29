import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Все роуты ниже требуют авторизации
router.use(requireAuth);

// Создать игру
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Нужно имя игры' });

    const id = randomUUID();
    db.prepare(
      'INSERT INTO games (id, name, player1_id, status) VALUES (?, ?, ?, ?)'
    ).run(id, name, req.userId, 'waiting');

    res.json({ id, name, status: 'waiting', player1_id: req.userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Список открытых игр
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const games = db.prepare(
      `SELECT g.id, g.name, g.status, g.created_at, u.username as player1_name
       FROM games g
       LEFT JOIN users u ON g.player1_id = u.id
       WHERE g.status = 'waiting' AND g.player1_id != ?
       ORDER BY g.created_at DESC`
    ).all(req.userId);

    res.json(games);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Присоединиться к игре
router.post('/:id/join', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const game = db.prepare(
      'SELECT * FROM games WHERE id = ?'
    ).get(id) as any;

    if (!game) return res.status(404).json({ error: 'Игра не найдена' });
    if (game.status !== 'waiting') return res.status(400).json({ error: 'Игра уже начата' });
    if (game.player1_id === req.userId) return res.status(400).json({ error: 'Вы не можете играть сами с собой' });

    db.prepare(
      `UPDATE games SET player2_id = ?, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(req.userId, id);

    res.json({ id, status: 'active', player1_id: game.player1_id, player2_id: req.userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить состояние игры
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as any;
    if (!game) return res.status(404).json({ error: 'Игра не найдена' });

    if (game.player1_id !== req.userId && game.player2_id !== req.userId) {
      return res.status(403).json({ error: 'Вы не участвуете в этой игре' });
    }

    const ships = db.prepare('SELECT * FROM ships WHERE game_id = ?').all(id) as any[];
    const log = db.prepare('SELECT * FROM battle_log WHERE game_id = ? ORDER BY created_at').all(id);

    res.json({
      game,
      ships: ships.map(s => ({
        ...s,
        stats: JSON.parse(s.stats),
        compartments: JSON.parse(s.compartments),
        is_sunk: Boolean(s.is_sunk),
      })),
      log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;