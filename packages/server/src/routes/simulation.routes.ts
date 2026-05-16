import { Router, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { DeepSeekService } from '../services/DeepSeekService';
import { WorldService } from '../services/WorldService';
import { CharacterService } from '../services/CharacterService';
import { EventService } from '../services/EventService';
import { TickService } from '../services/TickService';

export function simulationRoutes(io: SocketIOServer | null): Router {
  const router = Router();
  const deepseek = new DeepSeekService();
  const worldSvc = new WorldService();
  const charSvc = new CharacterService();
  const eventSvc = new EventService();
  const tickService = new TickService(deepseek, worldSvc, charSvc, eventSvc, io || null);

  router.post('/tick', async (req: Request, res: Response) => {
    try {
      const { worldId } = req.body;
      if (!worldId) return res.status(400).json({ error: 'worldId required' });
      const result = await tickService.tick(worldId);
      if (io) io.emit('tick:complete', result);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/start', (req: Request, res: Response) => {
    const { worldId, interval } = req.body;
    if (!worldId) return res.status(400).json({ error: 'worldId required' });
    tickService.start(worldId, interval || 2000);
    res.json({ status: 'started' });
  });

  router.post('/stop', (_req: Request, res: Response) => {
    tickService.stop();
    res.json({ status: 'stopped' });
  });

  router.get('/state', (_req: Request, res: Response) => {
    res.json(tickService.getState());
  });

  router.post('/reset', async (req: Request, res: Response) => {
    try {
      const { worldId } = req.body;
      tickService.stop();
      if (worldId) {
        const world = worldSvc.get(worldId);
        if (world) {
          world.time.tick = 0;
          worldSvc.update(worldId, { time: world.time });
          eventSvc.deleteByWorld(worldId);
        }
      }
      res.json({ status: 'reset' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
