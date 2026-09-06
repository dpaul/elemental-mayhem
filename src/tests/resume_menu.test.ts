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

class MockElement {
  public id: string;
  public textContent: string = '';
  public innerHTML: string = '';
  public classList = {
    classes: new Set<string>(),
    add: (cls: string) => this.classList.classes.add(cls),
    remove: (cls: string) => this.classList.classes.delete(cls),
    contains: (cls: string) => this.classList.classes.has(cls),
  };

  constructor(id: string) {
    this.id = id;
    this.classList.add('hidden');
  }
}

describe('Main Menu Resume Game Tile', () => {
  let mockStorage: MockStorage;
  let saveManager: SaveManager;

  let resumeCard: MockElement;
  let resumeCta: MockElement;
  let iconEl: MockElement;
  let badgeEl: MockElement;
  let descEl: MockElement;
  let detailsEl: MockElement;

  const mockHero: Unit = {
    id: 'hero_pyro',
    name: 'Inferno Pyromancer',
    faction: 'Player',
    avatar: '🧙‍♂️',
    coord: { x: 1, y: 1 },
    level: 3,
    stats: {
      maxHp: 120,
      currentHp: 95,
      maxAp: 4,
      currentAp: 3,
      moveCostPerTile: 1,
      elementalAffinity: 'Fire',
    },
    abilities: [],
    statusEffects: [],
    isDead: false,
  };

  const mockSaveData: GameSaveData = {
    round: 4,
    selectedElement: 'Fire',
    hero: mockHero,
    enemies: [],
    zombies: [],
    lifeBeings: [],
    hazards: [],
    totalEssence: 250,
    totalXp: 500,
    turnPhase: 'PlayerTurn',
    logs: [],
    timestamp: 1700000000000,
  };

  // Helper simulating updateHomeResumeTile with mocked elements
  function updateTile(mgr: SaveManager) {
    const summary = mgr.getSaveSummary();
    if (!summary) {
      resumeCard.classList.add('hidden');
      resumeCta.classList.add('hidden');
      return;
    }

    resumeCard.classList.remove('hidden');
    iconEl.textContent = summary.heroAvatar || '⚔️';
    badgeEl.textContent = `Round ${summary.round.toLocaleString()}`;
    descEl.textContent = `${summary.heroName} (${summary.element}) • In-progress battle`;
    detailsEl.innerHTML = `HP: ${summary.heroCurrentHp}/${summary.heroMaxHp}, AP: ${summary.heroCurrentAp}/${summary.heroMaxAp}, Essence: ${summary.essence}`;

    resumeCta.classList.remove('hidden');
    resumeCta.innerHTML = `RESUME RUN (Round ${summary.round.toLocaleString()})`;
  }

  beforeEach(() => {
    mockStorage = new MockStorage();
    saveManager = new SaveManager(ACTIVE_RUN_STORAGE_KEY, mockStorage);

    resumeCard = new MockElement('home-btn-resume');
    resumeCta = new MockElement('home-btn-resume-cta');
    iconEl = new MockElement('home-resume-icon');
    badgeEl = new MockElement('home-resume-badge');
    descEl = new MockElement('home-resume-desc');
    detailsEl = new MockElement('home-resume-details');
  });

  it('should hide the resume tile and CTA button when no active save exists', () => {
    updateTile(saveManager);
    expect(resumeCard.classList.contains('hidden')).toBe(true);
    expect(resumeCta.classList.contains('hidden')).toBe(true);
  });

  it('should display and populate the resume tile when an active save exists', () => {
    saveManager.saveGame(mockSaveData);
    expect(saveManager.hasActiveSave()).toBe(true);

    updateTile(saveManager);

    expect(resumeCard.classList.contains('hidden')).toBe(false);
    expect(resumeCta.classList.contains('hidden')).toBe(false);
    expect(badgeEl.textContent).toBe('Round 4');
    expect(iconEl.textContent).toBe('🧙‍♂️');
    expect(descEl.textContent).toContain('Inferno Pyromancer (Fire)');
    expect(detailsEl.innerHTML).toContain('95/120');
    expect(detailsEl.innerHTML).toContain('250');
    expect(resumeCta.innerHTML).toContain('Round 4');
  });

  it('should immediately hide the resume tile and CTA when saved game is discarded', () => {
    saveManager.saveGame(mockSaveData);
    updateTile(saveManager);
    expect(resumeCard.classList.contains('hidden')).toBe(false);

    // Discard save
    saveManager.clearSave();
    expect(saveManager.hasActiveSave()).toBe(false);

    updateTile(saveManager);
    expect(resumeCard.classList.contains('hidden')).toBe(true);
    expect(resumeCta.classList.contains('hidden')).toBe(true);
  });

  it('should hide the tile if hero in saved data is dead', () => {
    const deadHeroSave: GameSaveData = {
      ...mockSaveData,
      hero: {
        ...mockHero,
        isDead: true,
        stats: { ...mockHero.stats, currentHp: 0 },
      },
    };
    saveManager.saveGame(deadHeroSave);
    updateTile(saveManager);

    expect(resumeCard.classList.contains('hidden')).toBe(true);
    expect(resumeCta.classList.contains('hidden')).toBe(true);
  });
});
