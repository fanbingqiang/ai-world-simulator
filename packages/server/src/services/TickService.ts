import { Server as SocketIOServer } from 'socket.io';
import { World, Character, Event, TickResult } from '@ai-world/shared';
import { WorldService } from './WorldService';
import { CharacterService } from './CharacterService';
import { EventService } from './EventService';
import { DeepSeekService } from './DeepSeekService';
import { WorldEngine } from '../engines/WorldEngine';
import { CharacterEngine } from '../engines/CharacterEngine';
import { NarrativeEngine } from '../engines/NarrativeEngine';
import { MemoryEngine } from '../engines/MemoryEngine';
import { ConflictEngine } from '../engines/ConflictEngine';
import { EvolutionEngine } from '../engines/EvolutionEngine';

export class TickService {
  private worldEngine = new WorldEngine();
  private characterEngine = new CharacterEngine(this.deepseek);
  private narrativeEngine = new NarrativeEngine();
  private memoryEngine = new MemoryEngine();
  private conflictEngine = new ConflictEngine();
  private evolutionEngine = new EvolutionEngine();
  private isRunning = false;
  private tickTimer: any = null;

  constructor(
    private deepseek: DeepSeekService,
    private worldSvc: WorldService,
    private charSvc: CharacterService,
    private eventSvc: EventService,
    private io: Server | null
  ) {}

  async tick(worldId: string): Promise<TickResult> {
    const world = this.worldSvc.get(worldId);
    if (!world) throw new Error('世界不存在');
    const characters = this.charSvc.list(worldId).filter(c => c.isActive);

    // 1. WorldEngine 推进时间
    const { world: updatedWorld, spontaneousEvents } = this.worldEngine.advance(world);
    this.worldSvc.update(worldId, updatedWorld);
    const tickEvents: Event[] = [];

    // 2. 处理自发世界事件
    for (const se of spontaneousEvents) {
      const event = this.eventSvc.create({
        worldId, tick: world.time.tick,
        category: 'world-event', severity: 'minor',
        title: se, summary: se, description: se,
        tags: ['weather']
      });
      tickEvents.push(event);
    }

    // 3. ConflictEngine 扫描冲突——仅高 tension 且非重复
    const conflicts = this.conflictEngine.scan(characters);
    const existingConflictPairs = new Set(
      tickEvents.filter(e => e.category === 'conflict')
        .flatMap(e => e.participantIds)
    );
    for (const conflict of conflicts.slice(0, 1)) {
      if (conflict.tension < 60) continue;
      if (existingConflictPairs.has(conflict.characterA) && existingConflictPairs.has(conflict.characterB)) continue;
      const charA = characters.find(c => c.id === conflict.characterA);
      const charB = characters.find(c => c.id === conflict.characterB);
      if (charA && charB) {
        const event = this.eventSvc.create({
          worldId, tick: world.time.tick,
          category: 'conflict', severity: 'significant',
          title: `${charA.name} 和 ${charB.name} 之间的紧张关系`,
          summary: conflict.description,
          description: `${charA.name}和${charB.name}之间的气氛越来越紧张。${conflict.description}。周围的人都能感受到那股暗流涌动的压力。`,
          participantIds: [charA.id, charB.id],
          locationId: charA.currentLocation || charB.currentLocation,
          tags: ['conflict', conflict.type]
        });
        tickEvents.push(event);
      }
    }

    // 4. 角色决策 + 本地叙事生成
    for (const char of characters) {
      const location = world.locations.find(l => l.id === char.currentLocation);
      const othersHere = characters.filter(c =>
        c.currentLocation === char.currentLocation && c.id !== char.id
      );

      let decision;
      try {
        // 尝试 DeepSeek API
        decision = await this.characterEngine.decideAction(
          char, updatedWorld, tickEvents, othersHere
        );
      } catch {
        // 失败时使用本地规则引擎
        decision = this.narrativeEngine.generateLocalAction(char, othersHere, location);
      }

      // 更新角色状态
      if (decision.emotionalShift) {
        char.emotionalState = { ...char.emotionalState, primary: decision.emotionalShift };
      }
      char.energy = Math.max(0, char.energy - (decision.action === 'rest' ? 0 : 5));

      // 生成以动作描写为主的叙事描述
      const locationName = location?.name || '某处';
      let description = decision.description;
      if (!description || description.length < 5 || description === `${char.name}环顾四周`) {
        description = `${char.name}${this.getActionVerb(char, location, othersHere)}`;
      }
      // 如果有对话但没有动作描写，把对话嵌入动作中
      if (decision.dialogue && description === decision.dialogue) {
        description = `${char.name}${this.getActionVerb(char, location, othersHere)}"${decision.dialogue}"`;
      }

      // 构建内心独白
      const internalThought = decision.internalThought ||
        `"${this.generateInternalThought(char, tickEvents)}"`;

      // 创建角色行动事件——始终以动作为主，对话为附属
      const event = this.eventSvc.create({
        worldId, tick: world.time.tick,
        category: 'character-action',
        severity: decision.dialogue ? 'minor' : 'trivial',
        title: `${char.name}${this.getEventActionSuffix(decision.action, decision.target)}`,
        summary: description,
        description,
        initiatorId: char.id,
        participantIds: [char.id, ...(decision.target && othersHere.find(o => o.name === decision.target) ? [othersHere.find(o => o.name === decision.target)!.id] : [])],
        locationId: char.currentLocation,
        dialogue: [
          ...(decision.dialogue ? [{
            speakerId: char.id, speakerName: char.name,
            content: decision.dialogue, emotion: char.emotionalState.primary,
            isInternalThought: false
          }] : []),
          {
            speakerId: char.id, speakerName: char.name,
            content: internalThought, emotion: char.emotionalState.primary,
            isInternalThought: true
          }
        ],
        tags: [decision.action]
      });
      tickEvents.push(event);
    }

    // 5. 生成角色反思——只在有重要事件时生成
    for (const char of characters) {
      const hasSignificantEvent = tickEvents.some(e =>
        e.participantIds.includes(char.id) && e.severity !== 'trivial'
      );
      if (!hasSignificantEvent) continue;

      const reflection = this.narrativeEngine.generateReflection(char, tickEvents);
      const impactReport = this.narrativeEngine.generateImpactReport(char, tickEvents);

      // 创建反思事件
      if (reflection.newGoal) {
        const existingGoal = char.currentGoals.find(g => g.status === 'active');
        if (!existingGoal) {
          char.currentGoals.push({
            id: `goal_${Date.now()}_${char.id}`,
            description: reflection.newGoal,
            priority: char.currentGoals.length + 1,
            status: 'active',
            origin: 'ai-generated'
          });
        }
        const reflectEvent = this.eventSvc.create({
          worldId, tick: world.time.tick,
          category: 'internal-reflection', severity: 'trivial',
          title: `${char.name}的内心活动`,
          summary: reflection.lesson,
          description: `${char.name}反思道：${reflection.lesson}` +
            (reflection.newGoal ? `\n他/她暗下决心：${reflection.newGoal}` : ''),
          initiatorId: char.id,
          participantIds: [char.id],
          locationId: char.currentLocation,
          dialogue: [{
            speakerId: char.id, speakerName: char.name,
            content: reflection.lesson, emotion: char.emotionalState.primary,
            isInternalThought: true
          }],
          tags: ['reflection']
        });
        tickEvents.push(reflectEvent);
      }
    }

    // 6. MemoryEngine 存储记忆
    for (const char of characters) {
      for (const event of tickEvents) {
        if (event.participantIds.includes(char.id)) {
          this.memoryEngine.storeEventMemory(char, event);
        }
      }
    }

    // 7. EvolutionEngine 性格演化
    for (const char of characters) {
      const delta = this.evolutionEngine.evaluate(char, tickEvents);
      if (Object.values(delta).some(d => d !== 0)) {
        this.evolutionEngine.apply(char, delta);
      }
    }

    // 8. 更新角色关系
    for (const char of characters) {
      for (const other of characters) {
        if (char.id === other.id) continue;
        const interactionEvents = tickEvents.filter(e =>
          e.participantIds.includes(char.id) && e.participantIds.includes(other.id)
        );
        if (interactionEvents.length > 0) {
          let existing = char.relationships.find(r => r.characterId === other.id);
          if (!existing) {
            existing = { characterId: other.id, type: 'acquaintance', affinity: 0, trust: 50, conflict: 0, lastInteractionTick: world.time.tick };
            char.relationships.push(existing);
          }
          existing.lastInteractionTick = world.time.tick;
          const conflictEvents = interactionEvents.filter(e => e.category === 'conflict');
          if (conflictEvents.length > 0) {
            existing.affinity -= 5;
            existing.conflict += 5;
            existing.trust -= 5;
          }
          const dialogueEvents = interactionEvents.filter(e => e.dialogue?.some(d => !d.isInternalThought));
          if (dialogueEvents.length > 0 && existing.affinity < 100) {
            existing.affinity += 1;
          }
          if (char.personality.agreeableness > 60) existing.affinity += 2;
        }
      }
    }

    // 9. 保存所有角色更新
    for (const char of characters) {
      this.charSvc.update(char.id, {
        emotionalState: char.emotionalState,
        energy: char.energy,
        currentLocation: char.currentLocation,
        memories: char.memories,
        personality: char.personality,
        currentGoals: char.currentGoals,
        relationships: char.relationships
      } as any);
    }

    return {
      tick: world.time.tick,
      worldState: { time: world.time },
      events: tickEvents,
      characterUpdates: Object.fromEntries(
        characters.map(c => [c.id, {
          emotionalState: c.emotionalState, energy: c.energy,
          memories: c.memories.slice(-3), relationships: c.relationships
        }])
      ),
      relationshipUpdates: Object.fromEntries(
        characters.flatMap(c =>
          c.relationships.map(r => [`${c.id}_${r.characterId}`, {
            affinity: r.affinity, trust: r.trust, conflict: r.conflict
          }])
        )
      ),
      personalityChanges: Object.fromEntries(
        characters.map(c => [c.id, c.personality])
      )
    };
  }

  start(worldId: string, intervalMs: number = 2000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const run = async () => {
      if (!this.isRunning) return;
      try {
        const result = await this.tick(worldId);
        if (this.io) this.io.emit('tick:complete', result);
      } catch (err) {
        console.error('Tick error:', err);
      }
      this.tickTimer = setTimeout(run, intervalMs);
    };
    run();
  }

  stop(): void {
    this.isRunning = false;
    if (this.tickTimer) { clearTimeout(this.tickTimer); this.tickTimer = null; }
  }

  getState(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }

  private getEventActionSuffix(action: string, target: string | null): string {
    const suffixMap: Record<string, string> = {
      speak: target ? `对${target}说了些什么` : '开口说话',
      confront: target ? `与${target}对峙' : '面色不善',
      interact: target ? `与${target}互动` : '环顾四周',
      act: '做出了一个动作',
      move: '离开了这里',
      rest: '找了个地方休息',
      observe: '仔细观察着四周',
      think: '低头沉思着什么',
      work: '埋头做自己的事',
    };
    return suffixMap[action] || '有所行动';
  }

  // 根据性格生成具体的动作描写（替代默认的观察类描述）
  private getActionVerb(char: Character, location?: any, others: Character[] = []): string {
    if (char.energy < 20) return '拖着疲惫的身体找了个角落坐下，背靠着墙闭上双眼，大口喘着气。';
    if (char.personality.neuroticism > 70) return '坐立不安地来回走动，手指不自觉地绞在一起，时不时警惕地扫视门口。';
    if (char.personality.openness > 70) return '微微探出身，好奇地打量着周围的一切，眼睛亮晶晶的，像发现了什么新奇的事物。';
    if (char.personality.extraversion > 70 && others.length > 0) return `脸上带着笑意，目光热切地扫过在场的${others.map(o => o.name).join('、')}，脚步轻快地朝他们走去。`;
    if (char.personality.agreeableness < 35) return '双臂抱胸靠在一旁，面无表情地扫视着往来的人，周身散发出一种「别来惹我」的低气压。';
    if (char.personality.conscientiousness > 75) return '低着头专注地做着自己的事，动作一丝不苟，仿佛周围的热闹与自己毫无关系。';
    return '安静地站在一旁，目光流转间若有所思。';
  }

  private generateInternalThought(char: Character, events: Event[]): string {
    const recentEvent = events.filter(e => e.participantIds.includes(char.id));
    if (recentEvent.length > 0) {
      const evt = recentEvent[recentEvent.length - 1];
      if (evt.category === 'conflict') {
        if (char.personality.agreeableness > 50) return '真不想这样……非要弄得这么僵吗？';
        return '哼，早看他不顺眼了。来啊，谁怕谁。';
      }
      if (evt.dialogue && evt.dialogue.some(d => !d.isInternalThought)) return '刚才说的话会不会太重了？算了，说都说了。';
      if (evt.tags.includes('weather')) return '天气变了，是不是该换个地方了？';
    }
    if (char.energy < 25) return '好累……今天就这样吧。';
    if (char.personality.neuroticism > 65) return '感觉有人在盯着我……是错觉吗？';
    if (char.personality.extraversion < 30) return '人太多了，想找个安静的地方待着。';
    if (char.personality.openness > 70) return '这个世界还有多少我不知道的秘密呢？';
    return '今天会发生什么呢……';
  }
}
