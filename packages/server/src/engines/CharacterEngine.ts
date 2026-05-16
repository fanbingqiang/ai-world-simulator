import { Character, World, Event, Memory } from '@ai-world/shared';
import { DeepSeekService } from '../services/DeepSeekService';

interface CharacterDecision {
  action: string;
  target: string | null;
  description: string;
  internalThought: string;
  dialogue: string;
  emotionalShift: string;
  moveTo?: string;
}

export class CharacterEngine {
  constructor(private deepseek: DeepSeekService) {}

  // 构建角色决策 prompt 并调用 DeepSeek
  async decideAction(
    character: Character,
    world: World,
    recentEvents: Event[],
    charactersPresent: Character[],
    reactionContext?: { action: string; description: string; dialogue: string }
  ): Promise<CharacterDecision> {
    const systemPrompt = this.buildSystemPrompt(character);
    const userPrompt = this.buildUserPrompt(character, world, recentEvents, charactersPresent, reactionContext);

    const response = await this.deepseek.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { responseFormat: { type: 'json_object' } });

    try {
      return JSON.parse(response);
    } catch {
      return { action: 'observe', target: null, description: `${character.name}环顾四周`, internalThought: '...', dialogue: '', emotionalShift: '平静', moveTo: undefined };
    }
  }

  // 构建系统 prompt（角色身份 + 性格）
  private buildSystemPrompt(char: Character): string {
    return `你是一个虚拟世界小说中的角色，必须完全代入角色，不要跳出角色说话。

## 角色身份
名字：${char.name}
年龄：${char.age} | 身份：${char.role}
背景故事：${char.backstory}

## 性格特征（五维度 0-100）
开放性（好奇心 vs 保守）：${char.personality.openness}
尽责性（自律 vs 随性）：${char.personality.conscientiousness}
外向性（社交 vs 独处）：${char.personality.extraversion}
宜人性（友善 vs 竞争）：${char.personality.agreeableness}
神经质（敏感 vs 稳定）：${char.personality.neuroticism}

## 性格标签
${char.traits.join('、')}

## 价值观
${char.values.map(v => `${v.dimension}（重要性${Math.round(v.weight * 100)}%）：${v.description}`).join('\n')}

## 道德倾向
${char.moralAlignment}

## 行为指南
1. 高神经质（>70）的角色容易情绪化、多疑、过度思考
2. 低宜人性（<30）的角色说话直接、自私、好斗
3. 高尽责性（>70）的角色做事有计划、守规矩
4. 高开放性（>70）的角色好奇、爱尝试、质疑常规
5. 高外向性（>70）的角色喜欢社交、话多

请完全根据以上性格特征来思考和行为。`;
  }

  // 构建用户 prompt（场景 + 上下文）
  private buildUserPrompt(
    char: Character,
    world: World,
    recentEvents: Event[],
    charactersPresent: Character[],
    reactionContext?: { action: string; description: string; dialogue: string }
  ): string {
    const location = world.locations.find(l => l.id === char.currentLocation);
    const relationships = char.relationships
      .filter(r => charactersPresent.some(c => c.id === r.characterId))
      .map(r => {
        const other = charactersPresent.find(c => c.id === r.characterId);
        return `${other?.name || '某人'}：${r.type}（好感度${r.affinity}，信任${r.trust}）`;
      }).join('\n');

    const memories = char.memories
      .sort((a, b) => (b.importance * b.salience) - (a.importance * a.salience))
      .slice(0, 3)
      .map(m => `[Tick ${m.tick}] ${m.title} - ${m.description}`).join('\n');

    let prompt = `## 当前场景
地点：${location?.name || '未知'} — ${location?.description || ''}
时间：Tick ${world.time.tick}，${world.time.dayPeriod}，${world.time.season}天

## 在场角色
${charactersPresent.filter(c => c.id !== char.id).map(c => `${c.name}（${c.role}）- 情绪：${c.emotionalState.primary}`).join('\n') || '无'}

## 你与在场角色的关系
${relationships || '尚不相识'}

## 近期事件
${recentEvents.slice(-3).map(e => `[Tick ${e.tick}] ${e.title}：${e.summary}`).join('\n') || '暂无'}

## 你当前状态
情绪：${char.emotionalState.primary}（强度${char.emotionalState.intensity}%）
精力：${char.energy}/100 | 健康：${char.health}/100

## 浮现的记忆
${memories || '暂无特别记忆'}

## 当前目标
${char.currentGoals.filter(g => g.status === 'active').map(g => `${g.priority}. ${g.description}`).join('\n') || '无特定目标'}`;

    if (reactionContext) {
      prompt += `\n\n## 有人对你行动
${reactionContext.description}
${reactionContext.dialogue ? `对方说："${reactionContext.dialogue}"` : ''}

请根据以上情况做出反应。`;
    }

    prompt += `\n\n请用JSON格式回答，包含以下字段：
{
  "action": "speak|move|interact|observe|act|think|rest|work",
  "target": "目标角色名或地点名或null",
  "description": "用第三人称描述你的行动，1-2句话",
  "internalThought": "用第一人称表达内心想法",
  "dialogue": "你说出来的话，如果不想说话就留空",
  "emotionalShift": "你的情绪变化",
  "moveTo": "如果要移动到这里（地点名），不移动就null"
}`;

    return prompt;
  }
}
