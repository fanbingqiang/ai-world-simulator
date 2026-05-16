import { create } from 'zustand';
import { World, Character, Event, TickResult } from '@ai-world/shared';

interface AppState {
  // 世界
  world: World | null;
  worlds: World[];
  setWorld: (w: World | null) => void;
  setWorlds: (ws: World[]) => void;

  // 角色
  characters: Character[];
  setCharacters: (cs: Character[]) => void;
  addCharacter: (c: Character) => void;
  updateCharacter: (id: string, data: Partial<Character>) => void;

  // 事件
  events: Event[];
  addEvents: (events: Event[]) => void;
  clearEvents: () => void;

  // 模拟
  isRunning: boolean;
  currentTick: number;
  setIsRunning: (v: boolean) => void;
  setCurrentTick: (t: number) => void;

  // UI
  activeTab: string;
  setActiveTab: (t: string) => void;
  selectedLocation: string | null;
  setSelectedLocation: (l: string | null) => void;
  showCreateWorld: boolean;
  setShowCreateWorld: (v: boolean) => void;
  showCreateChar: boolean;
  setShowCreateChar: (v: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  world: null,
  worlds: [],
  setWorld: (w) => set({ world: w }),
  setWorlds: (ws) => set({ worlds: ws }),

  characters: [],
  setCharacters: (cs) => set({ characters: cs }),
  addCharacter: (c) => set((s) => ({ characters: [...s.characters, c] })),
  updateCharacter: (id, data) => set((s) => ({
    characters: s.characters.map(c => c.id === id ? { ...c, ...data } as Character : c)
  })),

  events: [],
  addEvents: (events) => set((s) => ({ events: [...s.events, ...events].slice(-200) })),
  clearEvents: () => set({ events: [] }),

  isRunning: false,
  currentTick: 0,
  setIsRunning: (v) => set({ isRunning: v }),
  setCurrentTick: (t) => set({ currentTick: t }),

  activeTab: 'dashboard',
  setActiveTab: (t) => set({ activeTab: t }),
  selectedLocation: null,
  setSelectedLocation: (l) => set({ selectedLocation: l }),
  showCreateWorld: false,
  setShowCreateWorld: (v) => set({ showCreateWorld: v }),
  showCreateChar: false,
  setShowCreateChar: (v) => set({ showCreateChar: v }),
}));
