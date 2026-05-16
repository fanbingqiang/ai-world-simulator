import { Router, Request, Response } from 'express';
import { WorldService } from '../services/WorldService';

const router = Router();
const ws = new WorldService();

router.post('/', (req: Request, res: Response) => {
  const world = ws.create(req.body);
  res.json(world);
});

router.get('/:id', (req: Request, res: Response) => {
  const world = ws.get(req.params.id);
  world ? res.json(world) : res.status(404).json({ error: 'World not found' });
});

router.put('/:id', (req: Request, res: Response) => {
  const world = ws.update(req.params.id, req.body);
  world ? res.json(world) : res.status(404).json({ error: 'World not found' });
});

router.delete('/:id', (req: Request, res: Response) => {
  ws.delete(req.params.id);
  res.json({ success: true });
});

router.get('/', (req: Request, res: Response) => {
  res.json(ws.list());
});

router.post('/:id/locations', (req: Request, res: Response) => {
  const world = ws.addLocation(req.params.id, req.body);
  world ? res.json(world) : res.status(404).json({ error: 'World not found' });
});

router.get('/:id/locations', (req: Request, res: Response) => {
  const world = ws.get(req.params.id);
  world ? res.json(world.locations) : res.status(404).json({ error: 'World not found' });
});

export { router as worldRoutes };
