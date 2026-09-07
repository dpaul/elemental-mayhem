import { describe, it, expect, beforeEach } from 'vitest';
import { UpgradeManager } from '../engine/UpgradeManager';
import { CombatEngine } from '../engine/CombatEngine';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit } from '../types';

describe('Essence & Level Up Progression (Making You More Powerful)', () => {
  let upgradeManager: UpgradeManager;
  let hero: Unit;

  beforeEach(() => {
    upgradeManager = new UpgradeManager();
    hero = {
      id: 'test_hero',
      name: 'Archmage Dave',
      faction: 'Player',
      avatar: '🔥',
      coord: { x: 1, y: 1 },
      level: 0,
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [
        {
          id: 'pyro_blast',
          name: 'Pyro Blast',
          element: 'Fire',
          icon: '🔥',
          apCost: 2,
          cooldown: 0,
          currentCooldown: 0,
          range: 4,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 50,
          description: 'Hurls a searing sphere of flame.',
          level: 1,
        },
      ],
      statusEffects: [],
      isDead: false,
    };
  });

  it('should calculate accurate level thresholds from accumulated essence', () => {
    expect(upgradeManager.getLevelFromEssence(0)).toBe(0);
    expect(upgradeManager.getLevelFromEssence(49)).toBe(0);
    expect(upgradeManager.getLevelFromEssence(50)).toBe(1); // Lv 1 Apprentice
    expect(upgradeManager.getLevelFromEssence(119)).toBe(1);
    expect(upgradeManager.getLevelFromEssence(120)).toBe(2); // Lv 2 Adept
    expect(upgradeManager.getLevelFromEssence(210)).toBe(3); // Lv 3 Mage
    expect(upgradeManager.getLevelFromEssence(320)).toBe(4); // Lv 4 Archmage
    expect(upgradeManager.getLevelFromEssence(450)).toBe(5); // Lv 5 Grand Magus
    expect(upgradeManager.getLevelFromEssence(600)).toBe(6); // Lv 6 Master Arcanist
  });

  it('should return complete essence progress information for UI meters', () => {
    // 0 essence -> Lv 0, next is Lv 1 (50)
    const p0 = upgradeManager.getEssenceProgress(0);
    expect(p0.currentLevel).toBe(0);
    expect(p0.nextLevel).toBe(1);
    expect(p0.title).toBe('Initiate');
    expect(p0.nextLevelThreshold).toBe(50);
    expect(p0.percentage).toBe(0);

    // 25 essence -> 50% into Lv 1
    const p25 = upgradeManager.getEssenceProgress(25);
    expect(p25.currentLevel).toBe(0);
    expect(p25.percentage).toBe(50);
    expect(p25.essenceNeededForNext).toBe(25);

    // 155 essence -> Lv 2 Adept (threshold 120, next 210, diff 90, into 35)
    const p155 = upgradeManager.getEssenceProgress(155);
    expect(p155.currentLevel).toBe(2);
    expect(p155.title).toBe('Adept');
    expect(p155.percentage).toBe(Math.round((35 / 90) * 100));
  });

  it('should apply stat boosts upon leveling up (+25 Max HP per level, +AP every 2 levels)', () => {
    // Level up to Lv 1 (50 essence)
    const res1 = upgradeManager.checkAndApplyLevelUp(hero, 50);
    expect(res1.leveledUp).toBe(true);
    expect(res1.newLevel).toBe(1);
    expect(res1.title).toBe('Apprentice');
    expect(res1.hpGain).toBe(25);
    expect(hero.stats.maxHp).toBe(125);
    expect(hero.stats.currentHp).toBe(125);
    expect(hero.level).toBe(1);

    // Level up to Lv 2 (120 essence) -> gains +25 HP and +1 AP!
    const res2 = upgradeManager.checkAndApplyLevelUp(hero, 120);
    expect(res2.leveledUp).toBe(true);
    expect(res2.newLevel).toBe(2);
    expect(res2.title).toBe('Adept');
    expect(hero.stats.maxHp).toBe(150);
    expect(hero.stats.maxAp).toBe(7);
  });

  it('should calculate Essence Resonance spell power multiplier (+15% per level, +5% per 100 essence)', () => {
    // Lv 0, 0 essence: 1.0x
    expect(upgradeManager.calculateEssenceResonanceMultiplier(0, 0)).toBe(1.0);

    // Lv 1 (50 essence): 1.0 + 0.15 + 0 = 1.15x
    expect(upgradeManager.calculateEssenceResonanceMultiplier(1, 50)).toBe(1.15);

    // Lv 2 (150 essence): 1.0 + 0.30 + 0.05 = 1.35x
    expect(upgradeManager.calculateEssenceResonanceMultiplier(2, 150)).toBe(1.35);

    // Lv 4 (350 essence): 1.0 + 0.60 + 0.15 = 1.75x
    expect(upgradeManager.calculateEssenceResonanceMultiplier(4, 350)).toBe(1.75);
  });

  it('should amplify combat spell damage via Essence Resonance', () => {
    const grid = new Grid(10);
    const hazardManager = new TileHazardManager(grid);
    const enemy: Unit = {
      id: 'enemy_dummy',
      name: 'Target Dummy',
      faction: 'Enemy',
      avatar: '🎯',
      coord: { x: 1, y: 3 },
      stats: {
        maxHp: 500,
        currentHp: 500,
        maxAp: 5,
        currentAp: 5,
        moveCostPerTile: 1,
        elementalAffinity: 'Neutral',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    const engine = new CombatEngine(grid, hazardManager, hero, [enemy]);

    // Base damage without multiplier: 50 base DMG vs Neutral = 50 DMG
    engine.executeAbility(hero, hero.abilities[0], enemy.coord);
    expect(enemy.stats.currentHp).toBe(450); // 500 - 50 = 450

    // Now empower hero to Level 3 with 250 essence:
    hero.level = 3;
    engine.getEssenceResonanceMultiplier = (caster) => {
      return upgradeManager.calculateEssenceResonanceMultiplier(caster.level || 0, 250);
    };

    // Multiplier for Lv 3 (45%) + 250 essence (10%) = 1.55x!
    // 50 * 1.55 = 77.5 -> 78 damage!
    enemy.stats.currentHp = 500;
    engine.executeAbility(hero, hero.abilities[0], enemy.coord);
    expect(enemy.stats.currentHp).toBe(500 - 78);
  });

  it('should harvest essence upon enemy defeat and trigger callback', () => {
    const grid = new Grid(10);
    const hazardManager = new TileHazardManager(grid);
    const enemy: Unit = {
      id: 'weak_foe',
      name: 'Goblin Scout',
      faction: 'Enemy',
      avatar: '👺',
      coord: { x: 1, y: 2 },
      stats: {
        maxHp: 20,
        currentHp: 20,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: 'Neutral',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    const engine = new CombatEngine(grid, hazardManager, hero, [enemy]);
    let callbackEarned = 0;
    engine.onEssenceEarned = (amt) => {
      callbackEarned += amt;
    };

    // Attack to kill (50 damage > 20 HP)
    engine.executeAbility(hero, hero.abilities[0], enemy.coord);
    expect(enemy.isDead).toBe(true);
    expect(callbackEarned).toBeGreaterThanOrEqual(25);
    expect(engine.performance.earnedEssence).toBeGreaterThanOrEqual(25);
  });
});
