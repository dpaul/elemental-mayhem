import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager, GameSaveData, ACTIVE_RUN_STORAGE_KEY } from '../engine/SaveManager';
import { Unit } from '../types';

class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('SaveManager', () => {
  let mockStorage: MockStorage;
  let saveManager: SaveManager;

  const mockHero: Unit = {
    id: 'hero_1',
    name: 'Inferno Pyromancer',
    faction: 'Player',
    avatar: '🧙‍♂️',
    coord: { x: 2, y: 3 },
    level: 2,
    stats: {
      maxHp: 100,
      currentHp: 85,
      maxAp: 4,
      currentAp: 3,
      moveCostPerTile: 1,
      elementalAffinity: 'Fire',
    },
    abilities: [],
    statusEffects: [],
    isDead: false,
  };

  const mockEnemy: Unit = {
    id: 'enemy_1',
    name: 'Frost Ghoul',
    faction: 'Enemy',
    avatar: '🧟',
    coord: { x: 5, y: 5 },
    level: 1,
    stats: {
      maxHp: 50,
      currentHp: 30,
      maxAp: 3,
      currentAp: 0,
      moveCostPerTile: 1,
      elementalAffinity: 'Ice',
    },
    abilities: [],
    statusEffects: [],
    isDead: false,
  };

  const mockDeadEnemy: Unit = {
    ...mockEnemy,
    id: 'enemy_2',
    isDead: true,
    stats: { ...mockEnemy.stats, currentHp: 0 },
  };

  const mockSaveData: GameSaveData = {
    round: 3,
    selectedElement: 'Fire',
    hero: mockHero,
    enemies: [mockEnemy, mockDeadEnemy],
    zombies: [],
    lifeBeings: [],
    hazards: [
      {
        coord: { x: 4, y: 4 },
        hazard: { type: 'Burning', element: 'Fire', duration: 2, damagePerTurn: 10 },
      },
    ],
    totalEssence: 75,
    totalXp: 150,
    turnPhase: 'PlayerTurn',
    logs: [{ id: 'log_1', turn: 1, type: 'system', message: 'Hero moved.', timestamp: 1700000000000 }],
    timestamp: 1700000000000,
  };

  beforeEach(() => {
    mockStorage = new MockStorage();
    saveManager = new SaveManager(ACTIVE_RUN_STORAGE_KEY, mockStorage);
  });

  it('should save game state to storage successfully', () => {
    const success = saveManager.saveGame(mockSaveData);
    expect(success).toBe(true);
    expect(mockStorage.getItem(ACTIVE_RUN_STORAGE_KEY)).not.toBeNull();
  });

  it('should load saved game data accurately', () => {
    saveManager.saveGame(mockSaveData);
    const loaded = saveManager.loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.round).toBe(3);
    expect(loaded?.selectedElement).toBe('Fire');
    expect(loaded?.hero.stats.currentHp).toBe(85);
    expect(loaded?.enemies.length).toBe(2);
    expect(loaded?.hazards.length).toBe(1);
    expect(loaded?.totalEssence).toBe(75);
  });

  it('hasActiveSave should return true when a valid alive hero save exists', () => {
    saveManager.saveGame(mockSaveData);
    expect(saveManager.hasActiveSave()).toBe(true);
  });

  it('hasActiveSave should return false and clear save when hero is dead', () => {
    const deadHeroSave: GameSaveData = {
      ...mockSaveData,
      hero: {
        ...mockHero,
        isDead: true,
        stats: { ...mockHero.stats, currentHp: 0 },
      },
    };
    saveManager.saveGame(deadHeroSave);
    expect(saveManager.hasActiveSave()).toBe(false);
    expect(saveManager.loadGame()).toBeNull();
  });

  it('hasActiveSave should return false when no save exists', () => {
    expect(saveManager.hasActiveSave()).toBe(false);
  });

  it('clearSave should remove active save from storage', () => {
    saveManager.saveGame(mockSaveData);
    expect(saveManager.hasActiveSave()).toBe(true);
    saveManager.clearSave();
    expect(saveManager.hasActiveSave()).toBe(false);
    expect(mockStorage.getItem(ACTIVE_RUN_STORAGE_KEY)).toBeNull();
  });

  it('getSaveSummary should produce accurate summary information', () => {
    saveManager.saveGame(mockSaveData);
    const summary = saveManager.getSaveSummary();
    expect(summary).not.toBeNull();
    expect(summary?.round).toBe(3);
    expect(summary?.element).toBe('Fire');
    expect(summary?.heroName).toBe('Inferno Pyromancer');
    expect(summary?.heroCurrentHp).toBe(85);
    expect(summary?.heroMaxHp).toBe(100);
    expect(summary?.enemiesAlive).toBe(1);
    expect(summary?.zombiesAlive).toBe(0);
    expect(summary?.essence).toBe(75);
  });

  it('should gracefully handle corrupted JSON in storage', () => {
    mockStorage.setItem(ACTIVE_RUN_STORAGE_KEY, '{ invalid json');
    expect(saveManager.loadGame()).toBeNull();
    expect(saveManager.hasActiveSave()).toBe(false);
  });
});
