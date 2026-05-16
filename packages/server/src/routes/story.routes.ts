import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prepare, saveDatabase } from '../db/database';
import { StoryArc } from '@ai-world/shared';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { worldId } = req.query;
  if (!worldId) return res.status(400).json({ error: 'worldId required' });
  const rows = prepare('SELECT data FROM story_arcs WHERE world_id = ?').all(worldId);
  res.json(rows.map(r => JSON.parse(r.data)));
});

router.post('/', (req: Request, res: Response) => {
  const arc: StoryArc = {
    id: uuidv4(),
    worldId: req.body.worldId,
    name: req.body.name || '未命名故事弧',
    description: req.body.description || '',
    arcType: req.body.arcType || 'character',
    status: 'dormant',
    primaryCharacterIds: req.body.primaryCharacterIds || [],
    acts: [{ actNumber: 1, name: '开端', summary: '', eventIds: [], status: 'pending' }],
    themes: req.body.themes || [],
    progress: 0,
    createdAt: new Date().toISOString()
  };
  prepare('INSERT INTO story_arcs (id, world_id, data) VALUES (?, ?, ?)').run(arc.id, arc.worldId, JSON.stringify(arc));
  saveDatabase();
  res.json(arc);
});

router.post('/:id/export', (req: Request, res: Response) => {
  const row = prepare('SELECT data FROM story_arcs WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'StoryArc not found' });
  const arc: StoryArc = JSON.parse(row.data);
  const events = prepare('SELECT data FROM events WHERE world_id = ? ORDER BY tick ASC').all(arc.worldId);
  const eventList = events.map((r: any) => JSON.parse(r.data));

  let md = `# ${arc.name}\n\n${arc.description}\n\n`;
  for (const act of arc.acts) {
    md += `## 第${act.actNumber}幕：${act.name}\n\n${act.summary}\n\n`;
    const actEvents = eventList.filter((e: any) => act.eventIds.includes(e.id));
    for (const evt of actEvents) {
      md += `### [Tick ${evt.tick}] ${evt.title}\n${evt.description}\n\n`;
      for (const d of evt.dialogue || []) {
        md += `> **${d.speakerName}**（${d.emotion}）：${d.content}\n\n`;
      }
    }
  }
  res.json({ markdown: md });
});

export { router as storyRoutes };
