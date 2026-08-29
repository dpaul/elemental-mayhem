import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceScorer } from '../engine/PerformanceScorer';
import { UpgradeManager } from '../engine/UpgradeManager';
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
