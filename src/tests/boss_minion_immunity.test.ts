import { describe, it, expect, beforeEach } from 'vitest';
import { CombatEngine } from '../engine/CombatEngine';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit } from '../types';

describe('Boss Immunity against Zombies & Beings of Life', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let combatEngine: CombatEngine;
  let hero: Unit;
  let boss: Unit;
  let regularEnemy: Unit;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);

    hero = {
      id: 'hero_1',
      name: 'Necromancer Champion',
      faction: 'Player',
      avatar: '🧙‍♂️',
      coord: { x: 1, y: 1 },
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 8,
        currentAp: 8,
        moveCostPerTile: 1,
        elementalAffinity: 'Undead',
      },
      abilities: [
        {
          id: 'death_strike',
          name: 'Death Strike',
          element: 'Undead',
          icon: '💀',
          apCost: 2,
          cooldown: 0,
          currentCooldown: 0,
          range: 3,
          aoeRadius: 0,
          targeting: 'SingleUnit',
          baseDamage: 500,
          description: 'Lethal undead strike.',
          level: 1,
        },
        {
          id: 'unzombify_burst',
          name: 'Unzombify Burst',
          element: 'Life',
          icon: '✨',
          apCost: 2,
          cooldown: 0,
          currentCooldown: 0,
          range: 3,
          aoeRadius: 1,
          targeting: 'SingleUnit',
          baseDamage: 0,
          description: 'Purifies zombies and explodes in life energy.',
          level: 1,
        },
      ],
      statusEffects: [],
      isDead: false,
    };

    boss = {
      id: 'boss_1',
      name: 'Infernal Archon',
      faction: 'Enemy',
      avatar: '👹',
      coord: { x: 3, y: 1 },
      isBoss: true,
      stats: {
        maxHp: 500,
        currentHp: 500,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    regularEnemy = {
      id: 'enemy_grunt',
      name: 'Skeleton Grunt',
      faction: 'Enemy',
      avatar: '💀',
      coord: { x: 2, y: 2 },
      isBoss: false,
      stats: {
        maxHp: 40,
        currentHp: 40,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: 'Neutral',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    combatEngine = new CombatEngine(grid, hazardManager, hero, [boss, regularEnemy]);
  });

  it('Boss takes 0 damage and is completely unaffected when attacked by a Zombie', () => {
    const zombie = combatEngine.spawnZombie({ x: 3, y: 2 }, 100, 4, 'Player');
    const zombieBite = zombie.abilities.find((a) => a.id === 'zombie_bite')!;

    const result = combatEngine.executeAbility(zombie, zombieBite, boss.coord);
    expect(result.success).toBe(true);
    expect(boss.stats.currentHp).toBe(500); // No damage taken
    expect(boss.isDead).toBe(false);

    // Verify boss immunity log was emitted
    const immunityLog = combatEngine.logs.find(
      (l) => l.message.includes('[BOSS IMMUNITY]') && l.message.includes(boss.name)
    );
    expect(immunityLog).toBeDefined();

    // Verify boss was not infected with pending reanimations
    expect(combatEngine.pendingReanimations.length).toBe(0);
  });

  it('Boss takes 0 damage and is completely unaffected when attacked by a Being of Life', () => {
    const lifeBeing = combatEngine.spawnLifeBeing({ x: 3, y: 2 }, 'Player');
    const vitalSpark = lifeBeing.abilities.find((a) => a.id === 'vital_spark')!;

    const result = combatEngine.executeAbility(lifeBeing, vitalSpark, boss.coord);
    expect(result.success).toBe(true);
    expect(boss.stats.currentHp).toBe(500); // 0 damage

    const immunityLog = combatEngine.logs.find(
      (l) => l.message.includes('[BOSS IMMUNITY]') && l.message.includes(boss.name)
    );
    expect(immunityLog).toBeDefined();
  });

  it('Boss is immune to Unzombify Explosion splash damage', () => {
    // Spawn a zombie adjacent to the boss
    const zombie = combatEngine.spawnZombie({ x: 3, y: 2 }, 100, 4, 'Enemy');
    expect(boss.stats.currentHp).toBe(500);

    const unzombify = hero.abilities.find((a) => a.id === 'unzombify_burst')!;
    combatEngine.executeAbility(hero, unzombify, zombie.coord);

    // Zombie should be unzombified/killed
    expect(zombie.isDead).toBe(true);

    // Boss was adjacent to explosion, but must remain at full 500 HP
    expect(boss.stats.currentHp).toBe(500);

    const immunityLog = combatEngine.logs.find(
      (l) => l.message.includes('[BOSS IMMUNITY]') && l.message.includes(boss.name)
    );
    expect(immunityLog).toBeDefined();
  });

  it('Boss cannot be transmuted with Touch of Life', () => {
    const lifeBeing = combatEngine.spawnLifeBeing({ x: 3, y: 2 }, 'Player');
    const touchOfLife = lifeBeing.abilities.find((a) => a.id === 'transmute_zombie')!;

    // Even if isZombie was somehow set on boss, boss immunity blocks it
    boss.isZombie = true;
    const result = combatEngine.executeAbility(lifeBeing, touchOfLife, boss.coord);
    expect(result.success).toBe(false);
    expect(boss.isDead).toBe(false);

    const immunityLog = combatEngine.logs.find(
      (l) => l.message.includes('[BOSS IMMUNITY]') && l.message.includes(boss.name)
    );
    expect(immunityLog).toBeDefined();
  });

  it('Boss defeated by Necromancer NEVER rises as a Zombie', () => {
    const deathStrike = hero.abilities.find((a) => a.id === 'death_strike')!;
    boss.stats.currentHp = 100;
    combatEngine.executeAbility(hero, deathStrike, boss.coord);
    expect(boss.stats.currentHp).toBe(0);
    expect(boss.isDead).toBe(true);

    // Normal enemies slain by Necromancer rise as zombies, but Boss must NEVER rise as zombie!
    expect(combatEngine.zombies.length).toBe(0);
  });

  it('Regular non-boss enemy is normally damaged and affected by Zombies', () => {
    const zombie = combatEngine.spawnZombie({ x: 2, y: 1 }, 100, 4, 'Player');
    const zombieBite = zombie.abilities.find((a) => a.id === 'zombie_bite')!;

    combatEngine.executeAbility(zombie, zombieBite, regularEnemy.coord);
    // Regular enemy has 40 HP and takes 25 base damage
    expect(regularEnemy.stats.currentHp).toBeLessThan(40);
  });
});
