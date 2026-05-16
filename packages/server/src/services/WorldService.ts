import { v4 as uuidv4 } from 'uuid';
import { prepare, saveDatabase } from '../db/database';
import { World, Location } from '@ai-world/shared';

export class WorldService {
  create(data: Partial<World>): World {
    const world: World = {
      id: uuidv4(),
      name: data.name || '新世界',
      description: data.description || '',
      rules: data.rules || [],
      tone: data.tone || 'neutral',
      locations: (data.locations || []).map(l => ({ ...l, id: l.id || uuidv4() })),
      time: data.time || { tick: 0, era: '现代', year: 2024, season: '春', dayPeriod: '早晨', ticksPerDay: 6 },
      settings: data.settings || { simulationSpeed: 1000, autoAdvance: false, aiTemperature: 1.2, maxCharacters: 10 },
      createdAt: new Date().toISOString()
    };
    prepare('INSERT INTO worlds (id, data) VALUES (?, ?)').run(world.id, JSON.stringify(world));
    prepare('INSERT OR REPLACE INTO simulation_state (world_id, current_tick) VALUES (?, 0)').run(world.id);
    saveDatabase();
    return world;
  }

  get(id: string): World | null {
    const row = prepare('SELECT data FROM worlds WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : null;
  }

  update(id: string, data: Partial<World>): World | null {
    const world = this.get(id);
    if (!world) return null;
    Object.assign(world, data);
    prepare('UPDATE worlds SET data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(world), id);
    saveDatabase();
    return world;
  }

  delete(id: string): void {
    prepare('DELETE FROM events WHERE world_id = ?').run(id);
    prepare('DELETE FROM characters WHERE world_id = ?').run(id);
    prepare('DELETE FROM story_arcs WHERE world_id = ?').run(id);
    prepare('DELETE FROM simulation_state WHERE world_id = ?').run(id);
    prepare('DELETE FROM worlds WHERE id = ?').run(id);
    saveDatabase();
  }

  list(): World[] {
    const rows = prepare('SELECT data FROM worlds ORDER BY created_at DESC').all();
    return rows.map(r => JSON.parse(r.data));
  }

  addLocation(worldId: string, locData: Partial<Location>): World | null {
    const world = this.get(worldId);
    if (!world) return null;
    const loc: Location = {
      id: uuidv4(),
      name: locData.name || '未命名地点',
      description: locData.description || '',
      type: locData.type || 'urban',
      connectedLocations: locData.connectedLocations || [],
      charactersPresent: [],
      tags: locData.tags || []
    };
    world.locations.push(loc);
    this.update(worldId, { locations: [...world.locations] });
    return world;
  }
}
