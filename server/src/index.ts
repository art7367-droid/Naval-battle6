import express from 'express';
import cors from 'cors';
import { db } from './db';
import authRoutes from './routes/auth';
import gamesRoutes from './routes/games';
import hexmapRoutes from './routes/hexmap';
import taskForcesRoutes from './routes/taskForces';
import adminRoutes from './routes/admin'; // 👈 добавить

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/hexmap', hexmapRoutes);
app.use('/api/games/:gameId/tf', taskForcesRoutes);
app.use('/api/admin', adminRoutes); // 👈 добавить

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Сервер работает!' });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});