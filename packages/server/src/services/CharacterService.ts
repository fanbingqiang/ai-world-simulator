import { v4 as uuidv4 } from 'uuid';
import { prepare, saveDatabase } from '../db/database';
import { Character, Personality } from '@ai-world/shared';

export class CharacterService {
  create(data: Partial<Character>): Character {
    const personality: Personality = data.personality || {
      openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50
    };
    const char: Character = {
      id: uuidv4(),
      worldId: data.worldId || '',
      name: data.name || '未命名角色',
      age: data.age || 25,
      role: data.role || '平民',
      avatarUrl: data.avatarUrl || '/default-avatars/default.png',
      backstory: data.backstory || '',
      personality,
      traits: data.traits || [],
      values: data.values || [],
      moralAlignment: data.moralAlignment || 'true-neutral',
      secrets: data.secrets || [],
      relationships: data.relationships || [],
      memories: data.memories || [],
      currentLocation: data.currentLocation || '',
      emotionalState: data.emotionalState || { primary: '平静', secondary: '中性', intensity: 30 },
      energy: data.energy ?? 80,
      health: data.health ?? 100,
      currentGoals: data.currentGoals || [],
      growthArc: data.growthArc || { initialPersonality: { ...personality }, pivotalMoments: [], arcProgress: 0 },
      isActive: true,
      createdAt: new Date().toISOString()
    };
    prepare('INSERT INTO characters (id, world_id, data) VALUES (?, ?, ?)').run(char.id, char.worldId, JSON.stringify(char));
    saveDatabase();
    return char;
  }

  get(id: string): Character | null {
    const row = prepare('SELECT data FROM characters WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : null;
  }

  update(id: string, data: Partial<Character>): Character | null {
    const char = this.get(id);
    if (!char) return null;
    Object.assign(char, data);
    prepare('UPDATE characters SET data = ?, updated_at = datetime(\'now\') WHERE id = ?').run(JSON.stringify(char), id);
    saveDatabase();
    return char;
  }

  delete(id: string): void {
    prepare('DELETE FROM characters WHERE id = ?').run(id);
    saveDatabase();
  }

  list(worldId?: string): Character[] {
    const query = worldId
      ? prepare('SELECT data FROM characters WHERE world_id = ? ORDER BY created_at').all(worldId)
      : prepare('SELECT data FROM characters ORDER BY created_at').all();
    return (query as any[]).map(r => JSON.parse(r.data));
  }

  listByLocation(worldId: string, locationId: string): Character[] {
    return this.list(worldId).filter(c => c.currentLocation === locationId && c.isActive);
  }
}
