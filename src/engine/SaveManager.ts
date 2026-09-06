// Elemental Mayhem - Persistent Game State & Save/Resume Manager
import { Unit, ElementType, GridCoord, TileHazard, CombatLogEntry } from '../types';

export interface SavedHazardTile {
  coord: GridCoord;
  hazard: TileHazard;
}

export interface GameSaveData {
  round: number;
  selectedElement: ElementType;
  hero: Unit;
  enemies: Unit[];
  zombies: Unit[];
  lifeBeings: Unit[];
  hazards: SavedHazardTile[];
  totalEssence: number;
  totalXp: number;
  turnPhase: string;
  logs: CombatLogEntry[];
  timestamp: number;
}

export interface SaveSummary {
  round: number;
  element: ElementType;
  heroName: string;
  heroAvatar: string;
  heroCurrentHp: number;
  heroMaxHp: number;
  heroCurrentAp: number;
  heroMaxAp: number;
  enemiesAlive: number;
  zombiesAlive: number;
  essence: number;
  timestamp: number;
}

export const ACTIVE_RUN_STORAGE_KEY = 'ELEMENTAL_MAYHEM_ACTIVE_RUN';

export class SaveManager {
  private storageKey: string;
  private storage?: Storage;

  constructor(storageKey: string = ACTIVE_RUN_STORAGE_KEY, storage?: Storage) {
    this.storageKey = storageKey;
    this.storage = storage;
  }

  private getStorage(): Storage | null {
    if (this.storage) return this.storage;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
    return null;
  }

  public saveGame(data: GameSaveData): boolean {
    const storage = this.getStorage();
    if (!storage) {
      return false;
    }
    try {
      const payload = JSON.stringify(data);
      storage.setItem(this.storageKey, payload);
      return true;
    } catch (e) {
      console.warn('Failed to auto-save game state to localStorage:', e);
      return false;
    }
  }

  public hasActiveSave(): boolean {
    const save = this.loadGame();
    if (!save) return false;
    // An active save must have a living hero and valid round
    if (!save.hero || save.hero.isDead || save.hero.stats.currentHp <= 0) {
      this.clearSave();
      return false;
    }
    return true;
  }

  public loadGame(): GameSaveData | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    try {
      const raw = storage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameSaveData;
      if (!parsed || typeof parsed.round !== 'number' || !parsed.hero) {
        return null;
      }
      return parsed;
    } catch (e) {
      console.warn('Failed to parse saved game data from localStorage:', e);
      return null;
    }
  }

  public clearSave(): void {
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem(this.storageKey);
      } catch (e) {
        console.warn('Failed to remove saved game data from localStorage:', e);
      }
    }
  }

  public getSaveSummary(): SaveSummary | null {
    const save = this.loadGame();
    if (!save || !save.hero || save.hero.isDead) return null;

    const aliveEnemies = (save.enemies || []).filter((e) => !e.isDead && e.stats.currentHp > 0).length;
    const aliveZombies = (save.zombies || []).filter((z) => !z.isDead && z.stats.currentHp > 0).length;

    return {
      round: save.round,
      element: save.selectedElement || save.hero.stats.elementalAffinity || 'Fire',
      heroName: save.hero.name,
      heroAvatar: save.hero.avatar || '🧙‍♂️',
      heroCurrentHp: save.hero.stats.currentHp,
      heroMaxHp: save.hero.stats.maxHp,
      heroCurrentAp: save.hero.stats.currentAp,
      heroMaxAp: save.hero.stats.maxAp,
      enemiesAlive: aliveEnemies,
      zombiesAlive: aliveZombies,
      essence: save.totalEssence || 0,
      timestamp: save.timestamp || Date.now(),
    };
  }
}
