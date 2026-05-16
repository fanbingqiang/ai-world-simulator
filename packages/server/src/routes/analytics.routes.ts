import { Router, Request, Response } from 'express';
import { CharacterService } from '../services/CharacterService';
import { EventService } from '../services/EventService';
import { ConflictEngine } from '../engines/ConflictEngine';

const router = Router();
const charSvc = new CharacterService();
const eventSvc = new EventService();
const conflictEngine = new ConflictEngine();

router.get('/conflicts', (req: Request, res: Response) => {
  const { worldId } = req.query;
  if (!worldId) return res.status(400).json({ error: 'worldId required' });
  const characters = charSvc.list(worldId as string);
  const conflicts = conflictEngine.scan(characters);
  res.json(conflicts);
});

router.get('/character-evolution', (req: Request, res: Response) => {
  const { characterId } = req.query;
  if (!characterId) return res.status(400).json({ error: 'characterId required' });
  const char = charSvc.get(characterId as string);
  if (!char) return res.status(404).json({ error: 'Character not found' });
  res.json({
    initial: char.growthArc.initialPersonality,
    current: char.personality,
    pivotalMoments: char.growthArc.pivotalMoments,
    memories: char.memories.slice(-10)
  });
});

router.get('/relationships', (req: Request, res: Response) => {
  const { worldId } = req.query;
  if (!worldId) return res.status(400).json({ error: 'worldId required' });
  const characters = charSvc.list(worldId as string);
  const nodes = characters.map(c => ({
    id: c.id, name: c.name, role: c.role, avatarUrl: c.avatarUrl,
    emotionalState: c.emotionalState.primary
  }));
  const edges: any[] = [];
  for (const c of characters) {
    for (const rel of c.relationships) {
      edges.push({
        source: c.id, target: rel.characterId,
        type: rel.type, affinity: rel.affinity, trust: rel.trust, conflict: rel.conflict
      });
    }
  }
  res.json({ nodes, edges });
});

export { router as analyticsRoutes };
