// ===== 类型定义 =====

export interface Personality {
  openness: number;           // 开放性 0-100
  conscientiousness: number;  // 尽责性 0-100
  extraversion: number;       // 外向性 0-100
  agreeableness: number;      // 宜人性 0-100
  neuroticism: number;        // 神经质 0-100
}

export interface Value {
  dimension: string;
  weight: number;       // 0-1
  description: string;
}

export interface Secret {
  content: string;
  knownBy: string[];
  importance: number;   // 0-100
  isRevealed: boolean;
}

export interface CharacterGoal {
  id: string;
  description: string;
  priority: number;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  origin: 'ai-generated' | 'user-defined' | 'event-triggered';
}

export interface Memory {
  id: string;
  eventId: string;
  tick: number;
  title: string;
  description: string;
  emotionalImpact: string;
  emotionalIntensity: number;
  importance: number;
  salience: number;
  isCoreMemory: boolean;
  tags: string[];
}

export interface Relationship {
  characterId: string;
  type: 'friendship' | 'rivalry' | 'romance' | 'family' | 'mentor' | 'alliance' | 'enmity' | 'acquaintance';
  affinity: number;     // -100 to 100
  trust: number;        // 0-100
  conflict: number;     // 0-100
  lastInteractionTick: number;
}

export interface PivotalMoment {
  eventId: string;
  tick: number;
  description: string;
  personalityDelta: Partial<Personality>;
}

export interface Character {
  id: string;
  worldId: string;
  name: string;
  age: number;
  role: string;
  avatarUrl: string;
  backstory: string;
  personality: Personality;
  traits: string[];
  values: Value[];
  moralAlignment: string;
  secrets: Secret[];
  relationships: Relationship[];
  memories: Memory[];
  currentLocation: string;
  emotionalState: { primary: string; secondary: string; intensity: number };
  energy: number;
  health: number;
  currentGoals: CharacterGoal[];
  growthArc: { initialPersonality: Personality; pivotalMoments: PivotalMoment[]; arcProgress: number };
  isActive: boolean;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  type: 'urban' | 'wilderness' | 'dungeon' | 'safe-zone' | 'home';
  connectedLocations: string[];
  charactersPresent: string[];
  tags: string[];
}

export interface World {
  id: string;
  name: string;
  description: string;
  rules: string[];
  tone: string;
  locations: Location[];
  time: { tick: number; era: string; year: number; season: string; dayPeriod: string; ticksPerDay: number };
  settings: { simulationSpeed: number; autoAdvance: boolean; aiTemperature: number; maxCharacters: number };
  createdAt: string;
}

export interface DialogueLine {
  speakerId: string;
  speakerName: string;
  content: string;
  emotion: string;
  isInternalThought: boolean;
}

export interface Event {
  id: string;
  worldId: string;
  tick: number;
  category: 'character-action' | 'character-interaction' | 'dialogue' | 'world-event' | 'conflict' | 'internal-reflection' | 'user-intervention' | 'random-occurrence';
  severity: 'trivial' | 'minor' | 'significant' | 'major' | 'pivotal';
  title: string;
  summary: string;
  description: string;
  initiatorId: string | null;
  participantIds: string[];
  locationId: string;
  dialogue: DialogueLine[];
  consequences: { relationshipDeltas: Record<string, Record<string, number>>; characterStateChanges: Record<string, any> };
  tags: string[];
  createdAt: string;
}

export interface StoryArc {
  id: string;
  worldId: string;
  name: string;
  description: string;
  arcType: 'character' | 'world' | 'relationship' | 'mystery' | 'war';
  status: 'dormant' | 'active' | 'climax' | 'resolved';
  primaryCharacterIds: string[];
  acts: { actNumber: number; name: string; summary: string; eventIds: string[]; status: string }[];
  themes: string[];
  progress: number;
  createdAt: string;
}

export interface TickResult {
  tick: number;
  worldState: Partial<World>;
  events: Event[];
  characterUpdates: Record<string, any>;
  relationshipUpdates: Record<string, any>;
  personalityChanges: Record<string, any>;
}
