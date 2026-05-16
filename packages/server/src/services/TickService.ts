import { Server as SocketIOServer } from 'socket.io';
import { World, Character, Event, TickResult } from '@ai-world/shared';
import { WorldService } from './WorldService';
import { CharacterService } from './CharacterService';
import { EventService } from './EventService';
import { DeepSeekService } from './DeepSeekService';
import { WorldEngine } from '../engines/WorldEngine';
import { CharacterEngine } from '../engines/CharacterEngine';
import { MemoryEngine } from '../engines/MemoryEngine';
import { ConflictEngine } from '../engines/ConflictEngine';
import { EvolutionEngine } from '../engines/EvolutionEngine';

export class TickService {
  private worldEngine = new WorldEngine();
  private characterEngine = new CharacterEngine(this.deepseek);
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

  // 执行一个 tick
  async tick(worldId: string): Promise<TickResult> {
    const world = this.worldSvc.get(worldId);
    if (!world) throw new Error('世界不存在');

    const characters = this.charSvc.list(worldId).filter(c => c.isActive);

    // 1. WorldEngine 推进时间
    const { world: updatedWorld, spontaneousEvents } = this.worldEngine.advance(world);
    this.worldSvc.update(worldId, updatedWorld);

    // 2. ConflictEngine 扫描冲突
    const conflicts = this.conflictEngine.scan(characters);

    // 3. 收集角色上下文，调用 DeepSeek 决策
    const recentEvents = this.eventSvc.list(worldId, { limit: 5 });
    const charActions = new Map<string, any>();
    const tickEvents: Event[] = [];

    // 处理自发世界事件
    for (const se of spontaneousEvents) {
      const event = this.eventSvc.create({
        worldId, tick: world.time.tick,
        category: 'world-event', severity: 'minor',
        title: se, summary: se, description: se,
        tags: ['weather']
      });
      tickEvents.push(event);
    }

    // 处理冲突种子（生成冲突事件）
    for (const conflict of conflicts.slice(0, 1)) {
      const charA = characters.find(c => c.id === conflict.characterA);
      const charB = characters.find(c => c.id === conflict.characterB);
      if (charA && charB) {
        const event = this.eventSvc.create({
          worldId, tick: world.time.tick,
          category: 'conflict', severity: 'significant',
          title: `${charA.name} 和 ${charB.name} 的紧张关系`,
          summary: conflict.description,
          description: conflict.description,
          participantIds: [charA.id, charB.id],
          locationId: charA.currentLocation || charB.currentLocation,
          tags: ['conflict', conflict.type]
        });
        tickEvents.push(event);
      }
    }

    // 角色决策
    for (const char of characters) {
      try {
        const locationChars = characters.filter(c =>
          c.currentLocation === char.currentLocation && c.id !== char.id
        );
        const decision = await this.characterEngine.decideAction(
          char, updatedWorld, tickEvents, locationChars
        );

        charActions.set(char.id, decision);

        // 处理移动
        if (decision.moveTo && decision.moveTo !== 'null') {
          const targetLoc = world.locations.find(l => l.name === decision.moveTo || l.id === decision.moveTo);
          if (targetLoc) char.currentLocation = targetLoc.id;
        }

        // 更新角色情绪
        if (decision.emotionalShift) {
          char.emotionalState = { ...char.emotionalState, primary: decision.emotionalShift };
        }
        char.energy = Math.max(0, char.energy - 5);

        // 创建事件
        const event = this.eventSvc.create({
          worldId, tick: world.time.tick,
          category: decision.dialogue ? 'dialogue' : 'character-action',
          severity: 'minor',
          title: `${char.name}${decision.action === 'speak' ? '说了话' : decision.action === 'move' ? '移动了' : '做了一件事'}`,
          summary: decision.description,
          description: `${char.name}${decision.description}`,
          initiatorId: char.id,
          participantIds: [char.id],
          locationId: char.currentLocation,
          dialogue: decision.dialogue ? [{
            speakerId: char.id, speakerName: char.name,
            content: decision.dialogue, emotion: char.emotionalState.primary,
            isInternalThought: false
          }] : [],
          tags: [decision.action]
        });
        tickEvents.push(event);

      } catch (err: any) {
        console.error(`角色 ${char.name} 决策失败:`, err.message);
        // 失败时创建观察事件
        const event = this.eventSvc.create({
          worldId, tick: world.time.tick,
          category: 'character-action', severity: 'trivial',
          title: `${char.name}在观察`,
          summary: `${char.name}静静地观察着周围`,
          description: `${char.name}静静地观察着周围`,
          initiatorId: char.id,
          locationId: char.currentLocation,
          tags: ['observe']
        });
        tickEvents.push(event);
      }
    }

    // 4. MemoryEngine 存储记忆
    for (const char of characters) {
      for (const event of tickEvents) {
        if (event.participantIds.includes(char.id)) {
          this.memoryEngine.storeEventMemory(char, event);
        }
      }
    }

    // 5. EvolutionEngine 性格演化
    for (const char of characters) {
      const delta = this.evolutionEngine.evaluate(char, tickEvents);
      if (Object.values(delta).some(d => d !== 0)) {
        this.evolutionEngine.apply(char, delta);
      }
    }

    // 保存所有角色更新
    for (const char of characters) {
      this.charSvc.update(char.id, {
        emotionalState: char.emotionalState,
        energy: char.energy,
        currentLocation: char.currentLocation,
        memories: char.memories,
        personality: char.personality,
        currentGoals: char.currentGoals
      } as any);
    }

    // 生成最终结果
    const result: TickResult = {
      tick: world.time.tick,
      worldState: { time: world.time },
      events: tickEvents,
      characterUpdates: Object.fromEntries(
        characters.map(c => [c.id, { emotionalState: c.emotionalState, energy: c.energy }])
      ),
      relationshipUpdates: {},
      personalityChanges: Object.fromEntries(
        characters.map(c => [c.id, c.personality])
      )
    };

    return result;
  }

  // 开始自动运行
  start(worldId: string, intervalMs: number = 2000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const run = async () => {
      if (!this.isRunning) return;
      try {
        const result = await this.tick(worldId);
        if (this.io) {
          this.io.emit('tick:complete', result);
        }
      } catch (err) {
        console.error('Tick error:', err);
      }
      this.tickTimer = setTimeout(run, intervalMs);
    };
    run();
  }

  stop(): void {
    this.isRunning = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
  }

  getState(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}
