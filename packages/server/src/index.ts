import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import { worldRoutes } from './routes/world.routes';
import { characterRoutes } from './routes/character.routes';
import { eventRoutes } from './routes/event.routes';
import { simulationRoutes } from './routes/simulation.routes';
import { storyRoutes } from './routes/story.routes';
import { analyticsRoutes } from './routes/analytics.routes';

dotenv.config();

async function main() {
  await initDatabase();

  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  // 挂载路由
  app.use('/api/world', worldRoutes);
  app.use('/api/characters', characterRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/simulation', simulationRoutes(io));
  app.use('/api/story-arcs', storyRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // WebSocket
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
