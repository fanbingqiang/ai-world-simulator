import { Character, Event, Memory } from '@ai-world/shared';
import { v4 as uuidv4 } from 'uuid';

export class MemoryEngine {
  // 将事件转化为角色的记忆
  storeEventMemory(character: Character, event: Event, subjectiveDescription?: string): void {
    const importance = this.calcImportance(event);
    const memory: Memory = {
      id: uuidv4(),
      eventId: event.id,
      tick: event.tick,
      title: event.title,
      description: subjectiveDescription || event.summary,
      emotionalImpact: character.emotionalState.primary,
      emotionalIntensity: character.emotionalState.intensity,
      importance,
      salience: 100,
      isCoreMemory: importance > 70,
      tags: event.tags
    };
    character.memories.push(memory);
    this.consolidate(character);
  }

  // 检索相关记忆（按重要性+鲜活度加权）
  retrieveRelevant(character: Character, limit = 5): Memory[] {
    return character.memories
      .sort((a, b) => (b.importance * b.salience) - (a.importance * a.salience))
      .slice(0, limit);
  }

  // 记忆整合（遗忘低重要性的旧记忆）
  private consolidate(character: Character): void {
    character.memories.forEach(m => {
      if (!m.isCoreMemory) {
        m.salience = Math.max(0, m.salience - 2); // 每次衰减2%
      }
    });
    character.memories = character.memories
      .filter(m => m.isCoreMemory || m.salience > 10);
    if (character.memories.length > 50) {
      character.memories.sort((a, b) => b.importance - a.importance);
      character.memories = character.memories.slice(0, 50);
    }
  }

  // 计算事件重要性
  private calcImportance(event: Event): number {
    const severityMap: Record<string, number> = { trivial: 10, minor: 25, significant: 50, major: 75, pivotal: 95 };
    const base = severityMap[event.severity] || 25;
    const participantBonus = Math.min(event.participantIds.length * 5, 20);
    return Math.min(base + participantBonus, 100);
  }
}
