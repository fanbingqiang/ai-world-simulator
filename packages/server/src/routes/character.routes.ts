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

// 关系管理
router.post('/:id/relationships', (req: Request, res: Response) => {
  const { characterId, type, affinity, trust, conflict, lastInteractionTick } = req.body;
  const char = cs.get(req.params.id);
  if (!char) return res.status(404).json({ error: 'Character not found' });
  const existing = char.relationships.findIndex(r => r.characterId === characterId);
  if (existing >= 0) {
    char.relationships[existing] = { ...char.relationships[existing], ...req.body };
  } else {
    char.relationships.push({
      characterId, type: type || 'acquaintance',
      affinity: affinity || 0, trust: trust || 50,
      conflict: conflict || 0, lastInteractionTick: lastInteractionTick || 0
    });
  }
  cs.update(req.params.id, { relationships: char.relationships });
  res.json(char);
});

export { router as characterRoutes };
