import { Character, Event, World, Location } from '@ai-world/shared';

// 行动模板——以动作描写为核心，对话为附属
const ACTION_NARRATIVES: Record<string, string[]> = {
  speak: [
    '{name}微微侧过头，目光落在{target}身上，嘴唇动了动，终于开口："{}"',
    '{name}停下脚步，转身面向{target}，深吸一口气后缓缓说道："{}" 语气中带着{emotion}。',
    '{name}双手抱胸，靠在墙边看着{target}，若有所思地开口："{}"',
  ],
  confront: [
    '{name}猛地站起身，大步跨到{target}面前，目光如炬般直视着对方，一字一顿地说："{}" 空气仿佛凝固了。',
    '{name}冷冷地盯着{target}，嘴角露出一丝没有温度的笑意，缓缓开口："{}"',
    '{name}一把拦住了{target}的去路，双拳紧握，声音压得极低却带着怒火："{}"',
  ],
  reveal_secret: [
    '{name}垂下眼帘，手指不安地绞在一起，沉默良久后才抬起头，声音微微发颤："{}"',
    '{name}环顾四周，确认没有人注意后才凑近{target}，压低声音说道："{}" 这个秘密压在他/她心头太久了。',
    '{name}咬了咬嘴唇，脸色苍白了几分，终于像是下定了决心般开口："{}"',
  ],
  investigate: [
    '{name}眯起眼睛，锐利的目光扫过四周的每一个角落，手指轻轻摩挲着下巴，似乎在思考什么。',
    '{name}蹲下身来，仔细查看着地面上的痕迹，眉头越皱越紧。',
    '{name}蹑手蹑脚地在周围探索，每一步都格外谨慎，不放过任何可疑的细节。',
  ],
  interact: [
    '{name}脸上浮起一个笑容，迈步走向{target}，自然地拍了拍对方的肩膀："{}"',
    '{name}朝{target}挥了挥手，几步来到对方身边，热情地招呼道："{}"',
  ],
  help: [
    '{name}二话不说，快步走到{target}身边，挽起袖子就搭了把手："{}"',
    '{name}伸出手扶住了{target}，眼神中透着关切："{}"',
  ],
  challenge: [
    '{name}挑起眉毛，用轻蔑的目光上下打量着{target}，嘴角带着一丝挑衅的冷笑："{}"',
    '{name}毫不客气地打断了{target}，向前跨出一步，居高临下地说："{}"',
  ],
  think: [
    '{name}低着头来回踱步，眉头深锁，手指无意识地敲击着桌面，{thought}',
    '{name}靠在角落里双臂环抱，眼神放空地望着远处，内心却在激烈地挣扎：{thought}',
  ],
  rest: [
    '{name}找了一处角落缓缓坐下，背靠着墙壁闭上双眼，长长地呼出一口气，但眉头依然紧锁。',
    '{name}将身体靠在树干上，双手枕在脑后，闭目养神，但耳朵依然警觉地捕捉着周围的动静。',
  ],
  observe: [
    '{name}目光锐利地扫过在场每一个人，从他们的表情到姿态，不放过任何细节，默默地做着判断。',
    '{name}看似随意地靠在一边，双手插兜，实则眼神丝毫不松懈地打量着四周的人和物。',
    '{name}微微偏着头，冷静地观察着眼前的场面，目光在一张张面孔上缓缓移动。',
  ],
  move: [
    '{name}猛地站起身来，像是下定了什么决心，头也不回地朝{moveTarget}大步走去。',
    '{name}最后环顾了一圈这里，转身离开了，脚步匆匆地前往{moveTarget}。',
  ],
};

const EMOTIONAL_THOUGHTS: Record<string, string[]> = {
  '平静': ['"该做点什么了，不能一直这样下去。"', '"也许今天会发生什么意想不到的事。"'],
  '愉快': ['"今天感觉不错，也许该主动做点什么。"', '"心情不错，找人聊聊吧。"'],
  '警惕': ['"不对劲……有人在暗中盯着我。"', '"小心为上，但不能退缩。"'],
  '焦虑': ['"不能再坐以待毙了……我必须行动！"', '"再这样下去会出事的……"'],
  '愤怒': ['"他/她怎么敢……我不会就这么算了！"', '"这笔账一定要算清楚。"'],
  '悲伤': ['"不能一直消沉下去……振作起来。"', '"就算再难过，生活也要继续。"'],
  '好奇': ['"有意思，这里面一定有问题。"', '"值得一探究竟，说不定有什么重大发现。"'],
  '怀疑': ['"他/她说的话可信吗？必须查清楚。"', '"我该相信谁……还是自己去找答案吧。"'],
  '友好': ['"能遇到这些人真是太好了，要多交流。"', '"也许可以交个新朋友。"'],
  '疲惫': ['"先休息一下……但事情还没完。"', '"好累，但不能停下。"'],
};

const REFLECTION_TEMPLATES = [
  '这件事让{name}意识到，{lesson}。',
  '{name}在心里默默记下了这次的教训：{lesson}。',
  '经过这件事，{name}的想法有了一些变化——{lesson}。',
  '{name}暗自下定决心：{lesson}',
];

export class NarrativeEngine {
  // 根据角色性格生成本地行动（专注推进剧情）
  generateLocalAction(char: Character, othersInLocation: Character[], location: Location | undefined): {
    action: string; description: string; internalThought: string; dialogue: string; emotionalShift: string; target: string | null; moveTo: string | null
  } {
    const emotion = char.emotionalState.primary;
    const chosenAction = this.pickStoryAction(char, othersInLocation);
    const target = this.pickTarget(char, othersInLocation, chosenAction);

    const narratives = ACTION_NARRATIVES[chosenAction] || ACTION_NARRATIVES['observe'];
    const template = narratives[Math.floor(Math.random() * narratives.length)];

    const dialogue = this.generateDialogue(char, target, chosenAction, emotion);
    const thoughts = EMOTIONAL_THOUGHTS[emotion] || EMOTIONAL_THOUGHTS['平静'];
    const thought = thoughts[Math.floor(Math.random() * thoughts.length)];
    const emotionalShift = this.getEmotionalShift(char, chosenAction);

    let moveTo: string | null = null;
    if (chosenAction === 'move' && location?.connectedLocations && location.connectedLocations.length > 0) {
      const connected = location.connectedLocations;
      moveTo = connected[Math.floor(Math.random() * connected.length)];
    }

    let description = template
      .replace('{name}', char.name)
      .replace('{emotion}', emotion)
      .replace(/\{\}/g, dialogue)
      .replace('{thought}', thought)
      .replace(/{target}/g, target || '某人')
      .replace('{moveTarget}', moveTo ? (location?.connectedLocations ? '别处' : '') : '');

    // 如果没有 dialogue，清理多余的标点
    if (!dialogue) {
      description = description.replace(/"": "/g, '').replace(/"":/g, '').replace('""', '');
    }

    return { action: chosenAction, description, internalThought: thought, dialogue, emotionalShift, target, moveTo };
  }

  // 专注于讲故事的行动选择
  private pickStoryAction(char: Character, others: Character[]): string {
    // 有秘密且宜人性低→可能揭发或对抗
    const hasSecret = char.secrets.some(s => !s.isRevealed);
    const hasActiveGoal = char.currentGoals.some(g => g.status === 'active');
    const hasRival = char.relationships.some(r => r.conflict > 40);
    const hasFriend = char.relationships.some(r => r.affinity > 50);
    const hasTargets = others.length > 0;

    // 如果有冲突关系在附近，优先触发对抗
    if (hasTargets && hasRival && char.personality.agreeableness < 50) {
      return 'confront';
    }

    // 有秘密且神经质高→想倾诉/揭发
    if (hasSecret && char.personality.neuroticism > 55 && hasTargets) {
      return Math.random() < 0.4 ? 'reveal_secret' : 'speak';
    }

    // 有朋友在附近→互动
    if (hasTargets && hasFriend && char.personality.extraversion > 40) {
      return 'interact';
    }

    // 高外向且有目标→行动
    if (char.personality.extraversion > 60 && hasTargets) {
      return Math.random() < 0.5 ? 'speak' : 'interact';
    }

    // 低宜人性→制造冲突
    if (char.personality.agreeableness < 35 && hasTargets) {
      return Math.random() < 0.5 ? 'challenge' : 'confront';
    }

    // 高开放性→探索
    if (char.personality.openness > 65) {
      return 'investigate';
    }

    // 有活跃目标→行动
    if (hasActiveGoal && char.personality.conscientiousness > 50) {
      return hasTargets ? 'speak' : 'investigate';
    }

    // 低精力→休息
    if (char.energy < 25) return 'rest';

    // 默认选择——确保故事推进
    const defaultPool = ['speak', 'interact', 'investigate', 'think'];
    if (hasTargets) defaultPool.push('speak', 'interact');
    return defaultPool[Math.floor(Math.random() * defaultPool.length)];
  }

  private pickTarget(char: Character, others: Character[], action: string): string | null {
    if (others.length === 0) return null;

    // 对抗/挑战优先选关系差的人
    if (action === 'confront' || action === 'challenge') {
      const rivals = others.filter(o => {
        const rel = char.relationships.find(r => r.characterId === o.id);
        return rel && rel.conflict > 30;
      });
      if (rivals.length > 0) return rivals[Math.floor(Math.random() * rivals.length)].name;
    }

    // 互动/帮助优先选关系好的人
    if (action === 'interact' || action === 'help') {
      const friends = others.filter(o => {
        const rel = char.relationships.find(r => r.characterId === o.id);
        return rel && rel.affinity > 30;
      });
      if (friends.length > 0) return friends[Math.floor(Math.random() * friends.length)].name;
    }

    // 倾诉秘密选信任度高的人
    if (action === 'reveal_secret') {
      const trusted = others.filter(o => {
        const rel = char.relationships.find(r => r.characterId === o.id);
        return rel && rel.trust > 50;
      });
      if (trusted.length > 0) return trusted[Math.floor(Math.random() * trusted.length)].name;
    }

    return others[Math.floor(Math.random() * others.length)].name;
  }

  // 生成叙事总结
  generateNarrative(world: World, events: Event[], characters: Character[], tick: number): string {
    const timeStr = `${world.time.dayPeriod}，${world.time.season}天`;
    let narrative = `## Tick ${tick} — ${timeStr}\n\n`;

    const groupedByLoc = new Map<string, Event[]>();
    for (const evt of events) {
      const locId = evt.locationId || 'unknown';
      if (!groupedByLoc.has(locId)) groupedByLoc.set(locId, []);
      groupedByLoc.get(locId)!.push(evt);
    }

    for (const [locId, locEvents] of groupedByLoc) {
      const loc = world.locations.find(l => l.id === locId);
      narrative += `**${loc?.name || '某处'}** — `;

      for (const evt of locEvents) {
        if (evt.category === 'world-event') {
          narrative += `${evt.summary}`;
        } else if (evt.category === 'conflict') {
          narrative += `空气中弥漫着紧张的气氛。${evt.summary}`;
        } else if (evt.category === 'character-action' || evt.category === 'dialogue') {
          narrative += evt.description;
          if (evt.dialogue && evt.dialogue.length > 0) {
            for (const d of evt.dialogue) {
              if (!d.isInternalThought) {
                narrative += `\n> **${d.speakerName}**（${d.emotion}）："${d.content}"`;
              }
            }
            for (const d of evt.dialogue) {
              if (d.isInternalThought) {
                narrative += `\n> *${d.speakerName}心想：${d.content}*`;
              }
            }
          }
        }
      }
      narrative += '\n\n';
    }

    return narrative;
  }

  // 生成角色反思——总是产出新目标
  generateReflection(char: Character, recentEvents: Event[]): { lesson: string; newGoal?: string } {
    const significantEvents = recentEvents.filter(e =>
      e.participantIds.includes(char.id) && e.severity !== 'trivial'
    );

    // 根据性格和当前状态生成反思
    const lessons: string[] = [];

    if (significantEvents.length > 0) {
      const lastEvent = significantEvents[significantEvents.length - 1];
      if (lastEvent.category === 'conflict') {
        if (char.personality.agreeableness < 50) lessons.push('有些人就是欠教训，下次见面还要给他点颜色看看');
        else lessons.push('冲突解决不了问题，还是要靠沟通');
      }
    }

    // 性格驱动的反思
    if (char.personality.openness > 60) lessons.push('这个世界还有很多未知值得探索');
    if (char.personality.conscientiousness > 60) lessons.push('计划赶不上变化，但还是要坚持自己的路');
    if (char.personality.neuroticism > 65) lessons.push('总觉得有什么大事要发生了，必须做好准备');
    if (char.personality.extraversion < 35) lessons.push('独处的时间很重要，但也该试着多接触别人');
    if (char.energy < 30) lessons.push('必须先恢复精力，才能应付接下来的事');

    // 总是有反思
    lessons.push('无论发生什么，都要继续走下去');

    const lesson = lessons[Math.floor(Math.random() * lessons.length)];

    // 总是生成新目标
    const goals: string[] = [];
    if (significantEvents.some(e => e.category === 'conflict')) {
      goals.push('找机会和那个人把话说清楚');
      goals.push('弄清楚对方的真实意图');
    }
    if (char.secrets.some(s => !s.isRevealed)) {
      goals.push('找个可以信任的人倾诉秘密');
      goals.push('保护好自己的秘密，不能让人发现');
    }
    if (char.personality.openness > 60) {
      goals.push('探索这个世界的真相');
    }
    if (char.relationships.some(r => r.affinity > 60)) {
      goals.push('和重要的人加强联系');
    }
    if (char.relationships.some(r => r.conflict > 50)) {
      goals.push('解决和' + char.relationships.find(r => r.conflict > 50)?.characterId + '之间的恩怨');
    }

    // 总有基础目标
    goals.push('继续观察周围，寻找机会');
    goals.push('做自己认为对的事，不管别人怎么想');

    const newGoal = goals.length > 0 ? goals[Math.floor(Math.random() * goals.length)] : undefined;

    return { lesson, newGoal };
  }

  // 生成事件影响报告
  generateImpactReport(char: Character, events: Event[]): string[] {
    const reports: string[] = [];
    let energyChange = 0;
    const relationshipChanges: string[] = [];

    for (const evt of events) {
      if (!evt.participantIds.includes(char.id)) continue;
      energyChange -= this.getEnergyCost(evt);

      if (evt.category === 'conflict') {
        reports.push(`${char.name}卷入了一场冲突，情绪波动很大`);
        for (const pid of evt.participantIds) {
          if (pid !== char.id) {
            const other = char.relationships.find(r => r.characterId === pid);
            if (other) relationshipChanges.push(`与${other.characterId}的关系紧张了`);
          }
        }
      }
      if (evt.dialogue && evt.dialogue.length > 0) {
        const spokeTo = evt.dialogue.filter(d => d.speakerId === char.id);
        if (spokeTo.length > 0) reports.push(`${char.name}表达了自己的想法`);
      }
    }

    reports.push(`精力变化: ${energyChange > 0 ? '+' : ''}${energyChange}`);
    reports.push(...relationshipChanges);
    return reports;
  }

  private generateDialogue(char: Character, target: string | null, action: string, emotion: string): string {
    if (!target) {
      if (action === 'think' || action === 'rest' || action === 'observe') return '';
      target = '大家';
    }

    const dialogues: Record<string, string[]> = {
      'confront': [
        `${target}，我们之间的事，今天必须说清楚。`,
        `${target}，你别以为我不知道你做了什么。`,
        `${target}，你为什么这么做？给我一个解释。`,
        `你真是让我失望，${target}。`,
      ],
      'speak': [
        `${target}，你有没有觉得这个世界不太对劲？`,
        `${target}，我有话想对你说。`,
        `嘿，${target}，你听说过最近发生的事了吗？`,
        `${target}，我在想一件事……`,
        `你们知道吗？我刚刚发现了一些有意思的事。`,
      ],
      'reveal_secret': [
        `其实……我一直隐瞒着一件事。`,
        `${target}，我只告诉你一个人，你千万别告诉别人……`,
        `有一件事我憋在心里很久了，今天不吐不快。`,
        `好吧，我说实话……`,
      ],
      'interact': [
        `${target}，要不要一起走走？`,
        `${target}，你看起来有心事？`,
        `嘿，${target}，好久不见。`,
      ],
      'help': [
        `${target}，需要帮忙吗？`,
        `让我来吧，${target}，你一个人搞不定的。`,
      ],
      'challenge': [
        `${target}，你是在挑衅我吗？`,
        `哈，${target}，你也就这点本事了。`,
        `${target}，有本事你再说一遍？`,
      ],
    };

    const pool = dialogues[action] || dialogues['speak'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private getEmotionalShift(char: Character, action: string): string {
    if (action === 'confront' || action === 'challenge') return '愤怒';
    if (action === 'reveal_secret') return '焦虑';
    if (action === 'help') return '友好';
    if (action === 'interact') return '愉快';
    if (action === 'investigate') return '好奇';
    if (action === 'think') return char.personality.neuroticism > 60 ? '焦虑' : '平静';
    return char.emotionalState.primary;
  }

  private getEnergyCost(event: Event): number {
    const costs: Record<string, number> = {
      'conflict': 8, 'character-action': 4, 'dialogue': 2,
      'world-event': 1, 'internal-reflection': 1, 'user-intervention': 2
    };
    return costs[event.category] || 3;
  }
}
