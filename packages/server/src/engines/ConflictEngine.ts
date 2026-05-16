import { Character } from '@ai-world/shared';

interface ConflictSeed {
  characterA: string;
  characterB: string;
  tension: number;
  type: 'personality-clash' | 'value-opposition' | 'relationship-imbalance' | 'secret-threat';
  description: string;
}

export class ConflictEngine {
  // 扫描所有角色对，检测潜在冲突
  scan(characters: Character[]): ConflictSeed[] {
    const seeds: ConflictSeed[] = [];
    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const seed = this.evaluatePair(characters[i], characters[j]);
        if (seed) seeds.push(seed);
      }
    }
    return seeds.sort((a, b) => b.tension - a.tension);
  }

  // 评估一对角色之间的 tension
  private evaluatePair(a: Character, b: Character): ConflictSeed | null {
    let totalTension = 0;
    let dominantType: ConflictSeed['type'] = 'personality-clash';
    let description = '';

    // 1. 性格冲突
    const personalityClash = this.calcPersonalityClash(a.personality, b.personality);
    totalTension += personalityClash;

    // 2. 价值观对立
    const valueOpposition = this.calcValueOpposition(a.values, b.values);
    totalTension += valueOpposition;

    // 3. 关系不平衡
    const relA = a.relationships.find(r => r.characterId === b.id);
    const relB = b.relationships.find(r => r.characterId === a.id);
    if (relA && relB) {
      const imbalance = Math.abs(relA.affinity - relB.affinity);
      totalTension += imbalance * 0.5;
      if (relA.conflict > 50) totalTension += relA.conflict * 0.3;
    }

    // 4. 秘密威胁
    const secretThreat = a.secrets.filter(s => !s.isRevealed).length * 10 +
                         b.secrets.filter(s => !s.isRevealed).length * 10;
    totalTension += secretThreat;

    if (totalTension > 50) {
      if (valueOpposition > personalityClash) dominantType = 'value-opposition';
      if (relA && Math.abs(relA.affinity - (relB?.affinity || 0)) > 40) dominantType = 'relationship-imbalance';
      if (secretThreat > 30) dominantType = 'secret-threat';
      description = `${a.name} 和 ${b.name} 之间存在潜在的${this.getTypeLabel(dominantType)}（tension: ${Math.round(totalTension)}）`;
    }

    return totalTension > 50 ? {
      characterA: a.id, characterB: b.id, tension: Math.round(totalTension), type: dominantType, description
    } : null;
  }

  // 计算性格冲突分数
  private calcPersonalityClash(a: any, b: any): number {
    let clash = 0;
    clash += Math.abs(a.agreeableness - b.agreeableness) * 0.4;
    clash += Math.abs(a.neuroticism - b.neuroticism) * 0.3;
    clash += Math.abs(a.extraversion - b.extraversion) * 0.2;
    clash += Math.abs(a.openness - b.openness) * 0.1;
    return clash;
  }

  // 计算价值观对立
  private calcValueOpposition(a: any[], b: any[]): number {
    let opposition = 0;
    for (const va of a) {
      for (const vb of b) {
        if (va.dimension === vb.dimension) {
          opposition += Math.abs(va.weight - vb.weight) * 30;
        }
      }
    }
    return Math.min(opposition, 50);
  }

  private getTypeLabel(type: ConflictSeed['type']): string {
    const labels: Record<string, string> = {
      'personality-clash': '性格冲突',
      'value-opposition': '价值观对立',
      'relationship-imbalance': '关系不平衡',
      'secret-threat': '秘密威胁'
    };
    return labels[type];
  }
}
