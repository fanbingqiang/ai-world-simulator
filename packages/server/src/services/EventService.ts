import { v4 as uuidv4 } from 'uuid';
import { prepare, saveDatabase } from '../db/database';
import { Event } from '@ai-world/shared';

export class EventService {
  create(data: Partial<Event>): Event {
    const event: Event = {
      id: uuidv4(),
      worldId: data.worldId || '',
      tick: data.tick || 0,
      category: data.category || 'character-action',
      severity: data.severity || 'minor',
      title: data.title || '未命名事件',
      summary: data.summary || '',
      description: data.description || '',
      initiatorId: data.initiatorId || null,
      participantIds: data.participantIds || [],
      locationId: data.locationId || '',
      dialogue: data.dialogue || [],
      consequences: data.consequences || { relationshipDeltas: {}, characterStateChanges: {} },
      tags: data.tags || [],
      createdAt: new Date().toISOString()
    };
    prepare('INSERT INTO events (id, world_id, tick, data) VALUES (?, ?, ?, ?)')
      .run(event.id, event.worldId, event.tick, JSON.stringify(event));
    saveDatabase();
    return event;
  }

  get(id: string): Event | null {
    const row = prepare('SELECT data FROM events WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : null;
  }

  list(worldId: string, opts?: { tick?: number; limit?: number; offset?: number }): Event[] {
    let query = 'SELECT data FROM events WHERE world_id = ?';
    const params: any[] = [worldId];
    if (opts?.tick !== undefined) { query += ' AND tick = ?'; params.push(opts.tick); }
    query += ' ORDER BY tick DESC, created_at DESC';
    if (opts?.limit) query += ` LIMIT ${opts.limit}`;
    if (opts?.offset) query += ` OFFSET ${opts.offset}`;
    const rows = prepare(query).all(...params);
    return rows.map(r => JSON.parse(r.data));
  }

  deleteByWorld(worldId: string): void {
    prepare('DELETE FROM events WHERE world_id = ?').run(worldId);
    saveDatabase();
  }
}
