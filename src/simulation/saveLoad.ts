import { SAVE_KEY } from '../data/constants';
import type { GameState } from '../entities/types';

interface PersistedPayload {
  version: number;
  state: GameState;
}

const SAVE_VERSION = 1;

export function saveGame(state: GameState): void {
  const payload: PersistedPayload = {
    version: SAVE_VERSION,
    state,
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage can fail in private mode or if quota is exceeded.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }
    const payload = JSON.parse(raw) as PersistedPayload;
    if (!payload || payload.version !== SAVE_VERSION || !payload.state) {
      return null;
    }
    return payload.state;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage errors.
  }
}
