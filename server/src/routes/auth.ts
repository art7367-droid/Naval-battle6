import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();
const JWT_SECRET = 'your-secret-key-change-me'; // ⚠️ в проде — из .env

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Нужны username и password' });
    }

    // Проверяем, не занят ли логин
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь уже существует' });
    }

    // Хешируем пароль
    const hash = await bcrypt.hash(password, 10);

    // Создаём пользователя
    const result = db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    ).run(username, hash);

    // Создаём токен
    const token = jwt.sign(
      { userId: result.lastInsertRowid, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: result.lastInsertRowid, username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Нужны username и password' });
    }

    // Ищем пользователя
    const user = db.prepare(
      'SELECT id, username, password_hash FROM users WHERE username = ?'
    ).get(username) as { id: number; username: string; password_hash: string } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Проверяем пароль
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Создаём токен
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user.id, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;