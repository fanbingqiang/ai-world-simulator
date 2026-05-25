import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { World, Character, Event } from '@ai-world/shared';

interface AppState {
  world: World | null;
  worlds: World[];
  setWorld: (w: World | null) => void;
  setWorlds: (ws: World[]) => void;

  characters: Character[];
  setCharacters: (cs: Character[]) => void;
  addCharacter: (c: Character) => void;
  updateCharacter: (id: string, data: Partial<Character>) => void;

  events: Event[];
  addEvents: (events: Event[]) => void;
  setEvents: (events: Event[]) => void;
  clearEvents: () => void;

  isRunning: boolean;
  currentTick: number;
  setIsRunning: (v: boolean) => void;
  setCurrentTick: (t: number) => void;

  activeTab: string;
  setActiveTab: (t: string) => void;
  selectedLocation: string | null;
  setSelectedLocation: (l: string | null) => void;
  selectedCharacterId: string | null;
  setSelectedCharacterId: (id: string | null) => void;
  showCreateWorld: boolean;
  setShowCreateWorld: (v: boolean) => void;
  showCreateChar: boolean;
  setShowCreateChar: (v: boolean) => void;

  personalityChanges: Record<string, any>;
  setPersonalityChanges: (v: Record<string, any>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
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
      setEvents: (events) => set({ events }),
      clearEvents: () => set({ events: [] }),

      isRunning: false,
      currentTick: 0,
      setIsRunning: (v) => set({ isRunning: v }),
      setCurrentTick: (t) => set({ currentTick: t }),

      activeTab: 'dashboard',
      setActiveTab: (t) => set({ activeTab: t }),
      selectedLocation: null,
      setSelectedLocation: (l) => set({ selectedLocation: l }),
      selectedCharacterId: null,
      setSelectedCharacterId: (id) => set({ selectedCharacterId: id }),
      showCreateWorld: false,
      setShowCreateWorld: (v) => set({ showCreateWorld: v }),
      showCreateChar: false,
      setShowCreateChar: (v) => set({ showCreateChar: v }),

      personalityChanges: {},
      setPersonalityChanges: (v) => set({ personalityChanges: v }),
    }),
    {
      name: 'ai-world-store',
      partialize: (state) => ({
        world: state.world,
        worlds: state.worlds,
        characters: state.characters,
        currentTick: state.currentTick,
        activeTab: state.activeTab,
        selectedLocation: state.selectedLocation,
        selectedCharacterId: state.selectedCharacterId,
      }),
    }
  )
);
