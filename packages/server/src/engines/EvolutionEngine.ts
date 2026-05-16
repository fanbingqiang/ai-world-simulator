import { Character, Personality, Event } from '@ai-world/shared';

export class EvolutionEngine {
  // 根据经历的事件计算性格偏移
  evaluate(character: Character, events: Event[]): Partial<Personality> {
    const delta: Partial<Personality> = {};

    for (const event of events) {
      if (!event.participantIds.includes(character.id)) continue;

      // 根据事件类型计算性格变化
      if (event.category === 'conflict') {
        delta.agreeableness = (delta.agreeableness || 0) - 1;
        delta.neuroticism = (delta.neuroticism || 0) + 1;
      }
      if (event.tags.includes('betrayal')) {
        delta.agreeableness = (delta.agreeableness || 0) - 2;
        delta.neuroticism = (delta.neuroticism || 0) + 2;
      }
      if (event.tags.includes('kindness') || event.tags.includes('help')) {
        delta.agreeableness = (delta.agreeableness || 0) + 1;
      }
      if (event.tags.includes('discovery')) {
        delta.openness = (delta.openness || 0) + 1;
      }
      if (event.tags.includes('success')) {
        delta.conscientiousness = (delta.conscientiousness || 0) + 1;
      }
      if (event.tags.includes('failure')) {
        delta.conscientiousness = (delta.conscientiousness || 0) - 1;
        delta.neuroticism = (delta.neuroticism || 0) + 1;
      }
      if (event.tags.includes('social')) {
        delta.extraversion = (delta.extraversion || 0) + 1;
      }
      if (event.tags.includes('rejection') || event.tags.includes('isolated')) {
        delta.extraversion = (delta.extraversion || 0) - 1;
      }
    }

    // 限制每 tick 偏移不超过 ±3
    for (const key of Object.keys(delta) as (keyof Personality)[]) {
      delta[key] = Math.max(-3, Math.min(3, delta[key] || 0));
    }

    return delta;
  }

  // 应用性格变化
  apply(character: Character, delta: Partial<Personality>): void {
    const oldPersonality = { ...character.personality };
    let hasSignificantChange = false;

    for (const [key, value] of Object.entries(delta)) {
      const k = key as keyof Personality;
      if (value) {
        character.personality[k] = Math.max(0, Math.min(100, character.personality[k] + value));
        if (Math.abs(value) >= 2) hasSignificantChange = true;
      }
    }

    // 记录关键时刻
    if (hasSignificantChange) {
      const changes: Partial<Personality> = {};
      for (const key of Object.keys(delta) as (keyof Personality)[]) {
        if (Math.abs(delta[key] || 0) >= 2) {
          changes[key] = delta[key];
        }
      }
      if (Object.keys(changes).length > 0) {
        // growthArc update is handled by TickService
      }
    }
  }
}
