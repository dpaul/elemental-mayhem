import { describe, it, expect } from 'vitest';
import { createSandboxHero, getAllElementalAbilities, HERO_CLASSES } from '../constants/classes';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { CombatEngine } from '../engine/CombatEngine';
import { ElementType, Unit } from '../types';

describe('Elemental Sandbox Mode', () => {
  it('should create a sandbox hero with 999 HP, 99 AP, and all 500+ abilities', () => {
    const hero = createSandboxHero('Fire');
    expect(hero).toBeDefined();
    expect(hero.stats.maxHp).toBe(999);
    expect(hero.stats.currentHp).toBe(999);
    expect(hero.stats.maxAp).toBe(99);
    expect(hero.stats.currentAp).toBe(99);
    expect(hero.stats.elementalAffinity).toBe('Fire');
    expect(hero.abilities.length).toBeGreaterThan(450);
  });

  it('should contain abilities covering all 50 unique elements', () => {
    const hero = createSandboxHero('Water');
    const abilityElements = new Set(hero.abilities.map((a) => a.element));

    const allClasses = Object.keys(HERO_CLASSES) as ElementType[];
    expect(allClasses.length).toBe(50);

    allClasses.forEach((elem) => {
      expect(abilityElements.has(elem)).toBe(true);
    });
  });

  it('getAllElementalAbilities should return every spell with zero initial cooldown', () => {
    const allSpells = getAllElementalAbilities();
    expect(allSpells.length).toBeGreaterThan(450);
    allSpells.forEach((ability) => {
      expect(ability.currentCooldown).toBe(0);
    });
  });

  it('should allow dynamic elemental affinity switching', () => {
    const hero = createSandboxHero('Ice');
    expect(hero.stats.elementalAffinity).toBe('Ice');

    // Switch to Void
    hero.stats.elementalAffinity = 'Void';
    hero.avatar = HERO_CLASSES.Void?.avatar || '🌌';
    expect(hero.stats.elementalAffinity).toBe('Void');
    expect(hero.avatar).toBe('🌌');

    // Switch to Titan
    hero.stats.elementalAffinity = 'Titan';
    hero.avatar = HERO_CLASSES.Titan?.avatar || '🗿';
    expect(hero.stats.elementalAffinity).toBe('Titan');
    expect(hero.avatar).toBe('🗿');
  });

  it('should support spawning elemental target dummies with custom HP and affinities', () => {
    const grid = new Grid(10);
    const hazardManager = new TileHazardManager(grid);
    const hero = createSandboxHero('Fire');
    const enemies: Unit[] = [];
    const combatEngine = new CombatEngine(grid, hazardManager, hero, enemies);

    // Spawn a Water dummy with 500 HP within spell range of hero at (1, 1)
    const dummy: Unit = {
      id: 'test_dummy_water',
      name: 'Water Dummy',
      faction: 'Enemy',
      avatar: '💧',
      coord: { x: 3, y: 1 },
      stats: {
        maxHp: 500,
        currentHp: 500,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: 'Water',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };
    combatEngine.enemies.push(dummy);

    expect(combatEngine.getUnitAt({ x: 3, y: 1 })).toBe(dummy);
    expect(dummy.stats.elementalAffinity).toBe('Water');
    expect(dummy.stats.currentHp).toBe(500);

    // Apply Freeze status and hit with Fire ability to test reaction in sandbox
    dummy.statusEffects.push({
      type: 'Frozen',
      stacks: 1,
      duration: 2,
    });

    const fireSpell = hero.abilities.find((a) => a.id === 'fireball')!;
    expect(fireSpell).toBeDefined();

    const logCountBefore = combatEngine.logs.length;
    const result = combatEngine.executeAbility(hero, fireSpell, { x: 3, y: 1 });
    expect(result.success).toBe(true);

    const newLogs = combatEngine.logs.slice(logCountBefore);
    const meltLog = newLogs.find((l) => l.message.includes('Melt') || l.type === 'reaction');
    expect(meltLog).toBeDefined();
  });
});
