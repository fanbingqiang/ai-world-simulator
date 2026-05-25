import { Router, Request, Response } from 'express';
import { EventService } from '../services/EventService';

const router = Router();
const es = new EventService();

router.get('/', (req: Request, res: Response) => {
  const { worldId, tick, limit, offset } = req.query;
  if (!worldId) return res.status(400).json({ error: 'worldId required' });
  res.json(es.list(worldId as string, {
    tick: tick ? parseInt(tick as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined
  }));
});

router.get('/:id', (req: Request, res: Response) => {
  const event = es.get(req.params.id);
  event ? res.json(event) : res.status(404).json({ error: 'Event not found' });
});

router.post('/manual', (req: Request, res: Response) => {
  const event = es.create({ ...req.body, category: 'user-intervention' });
  res.json(event);
});

router.delete('/clear/:worldId', (req: Request, res: Response) => {
  es.deleteByWorld(req.params.worldId);
  res.json({ success: true });
});

export { router as eventRoutes };
