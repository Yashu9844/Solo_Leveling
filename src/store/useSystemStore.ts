// Thin orchestration shell over the engine. Owns the clock and id
// generator — the engine never reads them ambiently — and holds the
// derived EngineState for the UI to read. No domain logic lives here;
// it only wires db <-> engine <-> React.
import { create } from 'zustand';
import { v7 as uuidv7 } from 'uuid';
import { applyEvents, DEFAULT_CONFIG, type EngineDeps, type EngineState } from '../engine';
import { getAllEvents } from '../db/events';

const deps: EngineDeps = {
  now: () => new Date().toISOString(),
  newId: () => uuidv7(),
};

interface SystemStore {
  deps: EngineDeps;
  state: EngineState | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
}

export const useSystemStore = create<SystemStore>((set) => ({
  deps,
  state: null,
  hydrated: false,
  hydrate: async () => {
    const events = await getAllEvents();
    // applyEvents only handles the empty-log case until Slice 2 — Phase 0
    // has no writers yet, so the store stays un-hydrated rather than
    // crashing if a later slice's data is present during development.
    try {
      const state = applyEvents(events, DEFAULT_CONFIG);
      set({ state, hydrated: true });
    } catch {
      set({ hydrated: false });
    }
  },
}));
