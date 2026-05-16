import { Router, Request, Response } from 'express';
import { CharacterService } from '../services/CharacterService';

const router = Router();
const cs = new CharacterService();

router.post('/', (req: Request, res: Response) => {
  const char = cs.create(req.body);
  res.json(char);
});

router.get('/', (req: Request, res: Response) => {
  const { worldId } = req.query;
  res.json(cs.list(worldId as string));
});

router.get('/:id', (req: Request, res: Response) => {
  const char = cs.get(req.params.id);
  char ? res.json(char) : res.status(404).json({ error: 'Character not found' });
});

router.put('/:id', (req: Request, res: Response) => {
  const char = cs.update(req.params.id, req.body);
  char ? res.json(char) : res.status(404).json({ error: 'Character not found' });
});

router.delete('/:id', (req: Request, res: Response) => {
  cs.delete(req.params.id);
  res.json({ success: true });
});

export { router as characterRoutes };
