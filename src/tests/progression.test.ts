import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceScorer } from '../engine/PerformanceScorer';
import { UpgradeManager } from '../engine/UpgradeManager';
import { EscalationManager } from '../engine/EscalationManager';
import { UnlockManager } from '../engine/UnlockManager';
import { Unit, Ability } from '../types';

describe('PerformanceScorer (TDD Red -> Green)', () => {
  let scorer: PerformanceScorer;

  beforeEach(() => {
    scorer = new PerformanceScorer();
  });

  it('should calculate base essence and xp with combo/reaction bonus', () => {
    const score = scorer.calculateRoundRewards({
      turnsUsed: 4,
      damageDealt: 120,
      damageTaken: 0,
      reactionsTriggered: 3,
      enemiesKilled: 2,
      flawlessBonus: true,
      earnedEssence: 0,
      earnedXp: 0,
    });

    expect(score.essence).toBeGreaterThanOrEqual(80); // Base 50 + 3*10 reactions + 20 flawless
    expect(score.xp).toBeGreaterThanOrEqual(150);
  });
});

describe('UpgradeManager (TDD Red -> Green)', () => {
  let upgradeManager: UpgradeManager;
  let hero: Unit;

  beforeEach(() => {
    upgradeManager = new UpgradeManager();

    const fireball: Ability = {
      id: 'fireball',
      name: 'Fireball',
      element: 'Fire',
      icon: '🔥',
      apCost: 2,
      cooldown: 0,
      currentCooldown: 0,
      range: 4,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 25,
      description: 'Hurls fire.',
      level: 1,
    };

    hero = {
      id: 'hero',
      name: 'Hero',
      faction: 'Player',
      avatar: '🧙‍♂️',
      coord: { x: 1, y: 1 },
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [fireball],
      statusEffects: [],
      isDead: false,
    };
  });

  it('should upgrade ability damage and level upon purchase', () => {
    const success = upgradeManager.upgradeAbility(hero, 'fireball');
    expect(success).toBe(true);
    expect(hero.abilities[0].level).toBe(2);
    expect(hero.abilities[0].baseDamage).toBeGreaterThan(25);
  });

  it('should unlock a new elemental ability for the hero', () => {
    const newAbility: Ability = {
      id: 'void_rupture',
      name: 'Void Rupture',
      element: 'Void',
      icon: '🌌',
      apCost: 3,
      cooldown: 1,
      currentCooldown: 0,
      range: 4,
      aoeRadius: 1,
      targeting: 'SingleUnit',
      baseDamage: 30,
      description: 'Ruptures void space.',
      level: 1,
    };

    upgradeManager.unlockAbility(hero, newAbility);
    expect(hero.abilities.length).toBe(2);
    expect(hero.abilities.some((a) => a.id === 'void_rupture')).toBe(true);
  });

  it('should apply passive relic stat bonuses to hero', () => {
    const relic = {
      id: 'arcane_battery',
      name: 'Arcane Battery',
      icon: '🔋',
      description: '+2 Max AP',
      costEssence: 50,
      costXp: 50,
      applied: false,
      effect: (h: Unit) => {
        h.stats.maxAp += 2;
        h.stats.currentAp += 2;
      },
    };

    upgradeManager.applyRelic(hero, relic);
    expect(hero.stats.maxAp).toBe(8);
    expect(hero.stats.currentAp).toBe(8);
  });
});

describe('EscalationManager & Boss Gauntlet (TDD Red -> Green)', () => {
  let escalationManager: EscalationManager;

  beforeEach(() => {
    escalationManager = new EscalationManager();
  });

  it('should generate balanced non-boss squads for standard rounds', () => {
    const r1 = escalationManager.generateRoundEnemies(1);
    expect(r1.length).toBe(2);
    expect(r1.some((e) => e.isBoss)).toBe(false);

    const r2 = escalationManager.generateRoundEnemies(2);
    expect(r2.length).toBe(3);
    expect(r2.some((e) => e.isBoss)).toBe(false);

    const r4 = escalationManager.generateRoundEnemies(4);
    expect(r4.length).toBe(3);
    expect(r4.some((e) => e.isBoss)).toBe(false);

    const r9 = escalationManager.generateRoundEnemies(9);
    expect(r9.length).toBeGreaterThanOrEqual(3);
    expect(r9.some((e) => e.isBoss)).toBe(false);
  });

  it('should generate Tier 1 Boss (IGNIS COLOSSUS) at Round 5', () => {
    const r5 = escalationManager.generateRoundEnemies(5);
    const boss = r5.find((e) => e.isBoss);
    expect(boss).toBeDefined();
    expect(boss?.name).toContain('IGNIS COLOSSUS');
    expect(boss?.stats.maxHp).toBeGreaterThanOrEqual(240);
    expect(r5.length).toBe(3); // Boss + 2 Wisps
  });

  it('should generate Tier 2 Boss (STORM SOVEREIGN) at Round 10', () => {
    const r10 = escalationManager.generateRoundEnemies(10);
    const boss = r10.find((e) => e.isBoss);
    expect(boss).toBeDefined();
    expect(boss?.name).toContain('STORM SOVEREIGN');
    expect(boss?.stats.maxHp).toBeGreaterThanOrEqual(350);
    expect(r10.length).toBe(3); // Boss + 2 Elementals
  });

  it('should generate Tier 3 Final Boss (THE VOID ARCHON) at Round 15', () => {
    const r15 = escalationManager.generateRoundEnemies(15);
    const boss = r15.find((e) => e.isBoss);
    expect(boss).toBeDefined();
    expect(boss?.name).toContain('THE VOID ARCHON');
    expect(boss?.stats.maxHp).toBeGreaterThanOrEqual(480);
    expect(r15.length).toBe(3); // Boss + 2 Reapers
  });

  it('should procedurally generate scaled Boss encounters for rounds beyond 15 at multiples of 5', () => {
    const r20 = escalationManager.generateRoundEnemies(20);
    const boss20 = r20.find((e) => e.isBoss);
    expect(boss20).toBeDefined();
    expect(boss20?.stats.maxHp).toBeGreaterThan(350);

    const r17 = escalationManager.generateRoundEnemies(17);
    expect(r17.some((e) => e.isBoss)).toBe(false);
  });

  it('should provide an expanded armory of elemental abilities and relics', () => {
    const upgrades = escalationManager.getAvailableUpgrades();
    expect(upgrades.abilities.length).toBeGreaterThanOrEqual(6);
    expect(upgrades.relics.length).toBeGreaterThanOrEqual(5);
    expect(upgrades.abilities.some((a) => a.id === 'inferno_pillar')).toBe(true);
    expect(upgrades.abilities.some((a) => a.id === 'chain_overload')).toBe(true);
    expect(upgrades.abilities.some((a) => a.id === 'glacial_burst')).toBe(true);
    expect(upgrades.relics.some((r) => r.id === 'phoenix_feather')).toBe(true);
  });
});

describe('UnlockManager & Boss Elemental Progression (TDD Red -> Green)', () => {
  let unlockManager: UnlockManager;

  beforeEach(() => {
    unlockManager = new UnlockManager();
    unlockManager.resetUnlocks();
  });

  it('should start with default starter elements (Fire, Water, Earth, Nature, Light) and Wind/other elements locked', () => {
    expect(unlockManager.isElementUnlocked('Fire')).toBe(true);
    expect(unlockManager.isElementUnlocked('Water')).toBe(true);
    expect(unlockManager.isElementUnlocked('Earth')).toBe(true);
    expect(unlockManager.isElementUnlocked('Nature')).toBe(true);
    expect(unlockManager.isElementUnlocked('Light')).toBe(true);
    expect(unlockManager.isElementUnlocked('Wind')).toBe(false); // Wind is the final unlock
    expect(unlockManager.isElementUnlocked('Ice')).toBe(false);
    expect(unlockManager.isElementUnlocked('Poison')).toBe(false);
    expect(unlockManager.isElementUnlocked('Lightning')).toBe(false);
    expect(unlockManager.isElementUnlocked('Void')).toBe(false);
  });

  it('should unlock Tier 1 elements (Ice, Magma, Crystal, Poison, Acid, Sky, Undead) when defeating Round 5 Boss', () => {
    const unlocked = unlockManager.checkBossDefeatUnlocks(5);
    expect(unlocked).toContain('Ice');
    expect(unlocked).toContain('Magma');
    expect(unlocked).toContain('Crystal');
    expect(unlocked).toContain('Poison');
    expect(unlocked).toContain('Acid');
    expect(unlocked).toContain('Undead');
    expect(unlockManager.isElementUnlocked('Ice')).toBe(true);
    expect(unlockManager.isElementUnlocked('Magma')).toBe(true);
    expect(unlockManager.isElementUnlocked('Undead')).toBe(true);
    expect(unlockManager.isElementUnlocked('Lightning')).toBe(false);
  });

  it('should unlock Tier 2 elements (Lightning, Thunder, Storm, Metal, Magnetism, Sound, Force, Energy) when defeating Round 10 Boss', () => {
    const unlocked = unlockManager.checkBossDefeatUnlocks(10);
    expect(unlocked).toContain('Lightning');
    expect(unlocked).toContain('Thunder');
    expect(unlocked).toContain('Storm');
    expect(unlocked).toContain('Metal');
    expect(unlocked).toContain('Sound');
    expect(unlockManager.isElementUnlocked('Lightning')).toBe(true);
    expect(unlockManager.isElementUnlocked('Storm')).toBe(true);
  });

  it('should unlock Tier 3 elements including Wind when defeating Round 15 Final Boss', () => {
    const unlocked = unlockManager.checkBossDefeatUnlocks(15);
    expect(unlocked).toContain('Void');
    expect(unlocked).toContain('Time');
    expect(unlocked).toContain('Love');
    expect(unlocked).toContain('Death');
    expect(unlocked).toContain('Chaos');
    expect(unlocked).toContain('Wind');
    expect(unlockManager.isElementUnlocked('Void')).toBe(true);
    expect(unlockManager.isElementUnlocked('Time')).toBe(true);
    expect(unlockManager.isElementUnlocked('Wind')).toBe(true);
  });

  it('should not unlock elements on non-boss rounds or if already unlocked', () => {
    const un3 = unlockManager.checkBossDefeatUnlocks(3);
    expect(un3.length).toBe(0);

    // Unlocking round 5 once
    unlockManager.checkBossDefeatUnlocks(5);
    // Unlocking round 5 again should return empty array because they are already unlocked
    const duplicate = unlockManager.checkBossDefeatUnlocks(5);
    expect(duplicate.length).toBe(0);
  });
});
