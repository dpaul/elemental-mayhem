import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatEngine } from '../engine/CombatEngine';
import { TurnManager } from '../engine/TurnManager';
import { EnemyAI } from '../engine/EnemyAI';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit, Ability } from '../types';
import { HERO_CLASSES, createHeroForElement } from '../constants/classes';

describe('CombatEngine & TurnManager (TDD Red -> Green)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let turnManager: TurnManager;
  let combatEngine: CombatEngine;
  let hero: Unit;
  let enemy: Unit;
  let fireball: Ability;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);
    turnManager = new TurnManager();

    fireball = {
      id: 'fireball_1',
      name: 'Fireball',
      element: 'Fire',
      icon: '🔥',
      apCost: 2,
      cooldown: 0,
      currentCooldown: 0,
      range: 4,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 20,
      description: 'Hurls a fiery blast.',
      appliesStatus: 'Burning',
      statusDuration: 2,
      createsHazard: 'Burning',
      hazardDuration: 2,
      level: 1,
    };

    hero = {
      id: 'hero_1',
      name: 'Arch-Elementalist',
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

    enemy = {
      id: 'enemy_1',
      name: 'Water Sprite',
      faction: 'Enemy',
      avatar: '💧',
      coord: { x: 3, y: 1 },
      stats: {
        maxHp: 40,
        currentHp: 40,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: 'Water',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    combatEngine = new CombatEngine(grid, hazardManager, hero, [enemy]);
  });

  it('should move hero on grid and deduct AP based on path distance', () => {
    const success = combatEngine.moveUnit(hero, { x: 2, y: 1 });
    expect(success).toBe(true);
    expect(hero.coord).toEqual({ x: 2, y: 1 });
    expect(hero.stats.currentAp).toBe(5); // 6 - 1 = 5
  });

  it('should prevent moving if not enough AP', () => {
    hero.stats.currentAp = 0;
    const success = combatEngine.moveUnit(hero, { x: 2, y: 1 });
    expect(success).toBe(false);
    expect(hero.coord).toEqual({ x: 1, y: 1 });
  });

  it('should execute ability on target, apply damage, affinity, status, and hazard', () => {
    const result = combatEngine.executeAbility(hero, fireball, { x: 3, y: 1 });
    expect(result.success).toBe(true);
    expect(hero.stats.currentAp).toBe(4); // 6 - 2 = 4
    expect(enemy.stats.currentHp).toBeLessThan(40); // took damage
    expect(enemy.statusEffects.some((s) => s.type === 'Burning')).toBe(true);
    expect(grid.getTile({ x: 3, y: 1 })?.hazard.type).toBe('Burning');
  });

  it('should advance turns and reset AP on turn transition', () => {
    hero.stats.currentAp = 1;
    turnManager.endPlayerTurn();
    expect(turnManager.getCurrentPhase()).toBe('ENEMY_TURN');

    turnManager.startPlayerTurn([hero]);
    expect(turnManager.getCurrentPhase()).toBe('PLAYER_TURN');
    expect(hero.stats.currentAp).toBe(hero.stats.maxAp);
  });

  it('should clear all battlefield hazards when clearAllHazards is called', () => {
    hazardManager.applyHazard({ x: 2, y: 2 }, 'Burning', 3, 10, 'Fire');
    hazardManager.applyHazard({ x: 5, y: 5 }, 'Puddle', 2, 0, 'Water');
    expect(grid.getTile({ x: 2, y: 2 })?.hazard.type).toBe('Burning');
    expect(grid.getTile({ x: 5, y: 5 })?.hazard.type).toBe('Puddle');

    hazardManager.clearAllHazards();
    expect(grid.getTile({ x: 2, y: 2 })?.hazard.type).toBe('None');
    expect(grid.getTile({ x: 5, y: 5 })?.hazard.type).toBe('None');
  });

  it('should fully restore hero health and AP, clear status effects, reset cooldowns, and clear hazards on resetRoundState', () => {
    // Damage hero, use AP, apply cooldown, apply status effect, and apply tile hazard
    hero.stats.currentHp = 35;
    hero.stats.currentAp = 1;
    hero.statusEffects = [{ type: 'Burning', stacks: 2, duration: 3 }];
    fireball.currentCooldown = 2;
    hazardManager.applyHazard({ x: 1, y: 1 }, 'ToxicMire', 3, 10, 'Poison');

    combatEngine.resetRoundState();

    expect(hero.stats.currentHp).toBe(hero.stats.maxHp);
    expect(hero.stats.currentAp).toBe(hero.stats.maxAp);
    expect(hero.statusEffects.length).toBe(0);
    expect(fireball.currentCooldown).toBe(0);
    expect(grid.getTile({ x: 1, y: 1 })?.hazard.type).toBe('None');
    expect(combatEngine.logs[0].message).toContain('Round completed! Hero restored');
  });
});

describe('EnemyAI (TDD Red -> Green)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let combatEngine: CombatEngine;
  let ai: EnemyAI;
  let hero: Unit;
  let enemy: Unit;
  let waterBlast: Ability;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);

    waterBlast = {
      id: 'water_blast',
      name: 'Water Blast',
      element: 'Water',
      icon: '💧',
      apCost: 2,
      cooldown: 0,
      currentCooldown: 0,
      range: 3,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 15,
      description: 'Shoots water.',
      appliesStatus: 'Wet',
      statusDuration: 2,
      level: 1,
    };

    hero = {
      id: 'hero',
      name: 'Hero',
      faction: 'Player',
      avatar: '🧙‍♂️',
      coord: { x: 5, y: 5 },
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    enemy = {
      id: 'enemy',
      name: 'Enemy Adept',
      faction: 'Enemy',
      avatar: '👾',
      coord: { x: 5, y: 8 },
      stats: {
        maxHp: 50,
        currentHp: 50,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: 'Water',
      },
      abilities: [waterBlast],
      statusEffects: [],
      isDead: false,
    };

    combatEngine = new CombatEngine(grid, hazardManager, hero, [enemy]);
    ai = new EnemyAI(combatEngine);
  });

  it('should decide and take tactical AI turn (move within range and cast ability)', () => {
    const actions = ai.takeTurn(enemy, hero);
    expect(actions.length).toBeGreaterThan(0);
    // Either moved closer or cast ability
    expect(enemy.stats.currentAp).toBeLessThan(4);
  });

  it('should prioritize reaction-triggering abilities over standard abilities', () => {
    // Give hero Burning status
    hero.statusEffects = [{ type: 'Burning', stacks: 1, duration: 3 }];
    hero.coord = { x: 5, y: 7 }; // distance 1

    const basicPunch: Ability = {
      id: 'punch',
      name: 'Basic Punch',
      element: 'Neutral',
      icon: '👊',
      apCost: 1,
      cooldown: 0,
      currentCooldown: 0,
      range: 1,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 12,
      description: 'Quick neutral punch.',
      level: 1,
    };

    const windGust: Ability = {
      id: 'wind_gust',
      name: 'Wind Gust',
      element: 'Wind', // Wind + Burning = Firestorm reaction!
      icon: '💨',
      apCost: 2,
      cooldown: 0,
      currentCooldown: 0,
      range: 3,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 15,
      description: 'Gust of wind fanning flames.',
      level: 1,
    };

    enemy.abilities = [basicPunch, windGust];
    enemy.stats.currentAp = 4;

    const steps = ai.planTurnSteps(enemy, hero);
    // The first cast should prioritize Wind Gust due to Firestorm reaction bonus
    expect(steps.length).toBeGreaterThan(0);
    const firstCast = steps.find((s) => s.type === 'cast');
    expect(firstCast).toBeDefined();
    if (firstCast && firstCast.type === 'cast') {
      expect(firstCast.ability.name).toBe('Wind Gust');
    }
  });
});

describe('Necromancer Reanimation & Zombie Lifecycles (TDD Red -> Green)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let combatEngine: CombatEngine;
  let necromancer: Unit;
  let enemy1: Unit;
  let enemy2: Unit;
  let graveStrike: Ability;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);

    graveStrike = {
      id: 'grave_strike',
      name: 'Grave Strike',
      element: 'Undead',
      icon: '🦴',
      apCost: 1,
      cooldown: 0,
      currentCooldown: 0,
      range: 2,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 50,
      description: 'Strikes with cold bony hand.',
      level: 1,
    };

    necromancer = {
      id: 'hero_necro',
      name: 'Necromancer',
      faction: 'Player',
      avatar: '🧟‍♂️',
      coord: { x: 2, y: 2 },
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Undead',
      },
      abilities: [graveStrike],
      statusEffects: [],
      isDead: false,
    };

    enemy1 = {
      id: 'enemy_1',
      name: 'Cultist Initiate',
      faction: 'Enemy',
      avatar: '👤',
      coord: { x: 2, y: 3 },
      stats: {
        maxHp: 40,
        currentHp: 40,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: 'Water',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    enemy2 = {
      id: 'enemy_2',
      name: 'Cultist Guard',
      faction: 'Enemy',
      avatar: '🛡️',
      coord: { x: 3, y: 3 },
      stats: {
        maxHp: 20,
        currentHp: 20,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: 'Earth',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };

    combatEngine = new CombatEngine(grid, hazardManager, necromancer, [enemy1, enemy2]);
  });

  it('should reanimate an enemy killed by a Necromancer move as a Zombie with 4x HP and Half Speed', () => {
    // Cast Grave Strike to kill enemy1 (40 HP vs 50 base damage)
    const result = combatEngine.executeAbility(necromancer, graveStrike, { x: 2, y: 3 });
    expect(result.success).toBe(true);
    expect(enemy1.isDead).toBe(true);

    // Verify allied zombie spawn
    expect(combatEngine.zombies.length).toBe(1);
    const zombie = combatEngine.zombies[0];
    expect(zombie.faction).toBe('Player');
    expect(zombie.isZombie).toBe(true);
    expect(zombie.stats.maxHp).toBe(40 * 4); // 160 (4x HP)
    expect(zombie.stats.currentHp).toBe(160);
    expect(zombie.stats.maxAp).toBe(2); // Half Speed (floor(4 * 0.5))
    expect(zombie.zombieLifetime).toBe(4); // 4 turns lifetime
    expect(zombie.abilities[0].range).toBe(1); // Attacks only when adjacent
  });

  it('should immediately reanimate an enemy when killed by a Zombie', () => {
    // Spawn zombie directly next to enemy2
    const zombie = combatEngine.spawnZombie({ x: 3, y: 2 }, 30, 4);
    const bite = zombie.abilities[0];

    // Zombie bites enemy2 to death (20 HP vs 28 damage)
    const result = combatEngine.executeAbility(zombie, bite, { x: 3, y: 3 });
    expect(result.success).toBe(true);
    expect(enemy2.isDead).toBe(true);

    // Should immediately reanimate as an allied zombie!
    expect(combatEngine.zombies.length).toBe(2); // Initial zombie + newly risen zombie
  });

  it('should reanimate an enemy in 1 turn if it was damaged but survived a Zombie attack', () => {
    // enemy1 has 40 HP, Zombie bite deals 28 damage -> enemy1 survives with 12 HP
    const zombie = combatEngine.spawnZombie({ x: 2, y: 2 }, 30, 4);
    const bite = zombie.abilities[0];

    const result = combatEngine.executeAbility(zombie, bite, { x: 2, y: 3 });
    expect(result.success).toBe(true);
    expect(enemy1.isDead).toBe(false);
    expect(enemy1.stats.currentHp).toBe(12);

    // Infection pending reanimation in 1 turn
    expect(combatEngine.pendingReanimations.length).toBe(1);
    expect(combatEngine.pendingReanimations[0].turnsRemaining).toBe(1);

    // After 1 turn tick: rises as a zombie!
    combatEngine.tickZombies();
    expect(combatEngine.pendingReanimations.length).toBe(0);
    expect(combatEngine.zombies.length).toBe(2); // Initial zombie + new zombie
  });

  it('should raise 4 zombies adjacent to the Necromancer using the 5th move Raise Undead Horde', () => {
    const raiseHorde = {
      id: 'raise_undead_horde',
      name: 'Raise Undead Horde',
      element: 'Undead' as const,
      icon: '⚰️',
      apCost: 3,
      cooldown: 2,
      currentCooldown: 0,
      range: 1,
      aoeRadius: 1,
      targeting: 'Self' as const,
      baseDamage: 0,
      description: 'Raises 4 zombies.',
      level: 1,
    };

    const result = combatEngine.executeAbility(necromancer, raiseHorde, necromancer.coord);
    expect(result.success).toBe(true);
    expect(combatEngine.zombies.length).toBe(4);
    combatEngine.zombies.forEach((z) => {
      expect(z.isZombie).toBe(true);
      expect(z.faction).toBe('Player');
      expect(z.stats.maxHp).toBe(50 * 4); // 200 HP
      expect(z.stats.maxAp).toBe(2); // 2 AP (Half Speed)
    });
  });

  it('should expire a Zombie after 4 turns, leave a bone pile, and grant the Necromancer +3 AP', () => {
    const zombie = combatEngine.spawnZombie({ x: 4, y: 4 }, 25, 4);
    expect(zombie.zombieLifetime).toBe(4);
    necromancer.stats.currentAp = 2; // Necromancer at 2 AP

    // Turn 1
    combatEngine.tickZombies();
    expect(zombie.zombieLifetime).toBe(3);

    // Turn 2
    combatEngine.tickZombies();
    expect(zombie.zombieLifetime).toBe(2);

    // Turn 3
    combatEngine.tickZombies();
    expect(zombie.zombieLifetime).toBe(1);

    // Turn 4: Zombie collapses into bones and grants +3 AP
    combatEngine.tickZombies();
    expect(combatEngine.zombies.length).toBe(0);
    expect(grid.getTile({ x: 4, y: 4 })?.hazard.type).toBe('BonePile');
    expect(necromancer.stats.currentAp).toBe(5); // 2 + 3 = 5 AP
  });

  it('should ensure nothing can 1-tap a zombie by capping single-hit damage to 50% max HP and preventing 1-shot from full HP', () => {
    // Spawn an enemy zombie with 120 HP (30 * 4)
    const enemyZombie = combatEngine.spawnZombie({ x: 5, y: 5 }, 30, 4, 'Enemy');
    expect(enemyZombie.stats.currentHp).toBe(120);
    expect(enemyZombie.stats.maxHp).toBe(120);

    // Overpowered nuclear attack that would normally deal 999 damage (1-tap)
    const megaNuke: Ability = {
      id: 'mega_nuke',
      name: 'Cataclysm Nuke',
      element: 'Fire',
      icon: '💥',
      apCost: 1,
      cooldown: 0,
      currentCooldown: 0,
      range: 10,
      aoeRadius: 0,
      targeting: 'SingleUnit',
      baseDamage: 999,
      description: 'Lethal 999 damage strike.',
      level: 1,
    };

    // Attack the zombie with the 999-damage strike
    const result = combatEngine.executeAbility(necromancer, megaNuke, { x: 5, y: 5 });
    expect(result.success).toBe(true);

    // Zombie must NOT be dead (impossible to 1-tap!)
    expect(enemyZombie.isDead).toBe(false);
    // Damage should have been capped to 50% max HP (60 damage max)
    expect(enemyZombie.stats.currentHp).toBe(60); // 120 - 60 = 60 HP remaining
  });
});

describe('Life Element Unzombify, Cascade Explosions & Being of Life (TDD Red -> Green)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let combatEngine: CombatEngine;
  let biomancer: Unit;
  let enemyZombie1: Unit;
  let enemyZombie2: Unit;
  let unzombifyBurst: Ability;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);

    unzombifyBurst = {
      id: 'unzombify_burst',
      name: 'Unzombify Explosion',
      element: 'Life',
      icon: '🌟',
      apCost: 3,
      cooldown: 2,
      currentCooldown: 0,
      range: 6,
      aoeRadius: 1, // 3x3 area
      targeting: 'AnyTile',
      baseDamage: 25,
      description: 'Unzombifies all zombies in 3x3 area.',
      level: 1,
    };

    biomancer = {
      id: 'hero_bio',
      name: 'Biomancer',
      faction: 'Player',
      avatar: '🌱',
      coord: { x: 1, y: 1 },
      stats: {
        maxHp: 120,
        currentHp: 120,
        maxAp: 6,
        currentAp: 6,
        moveCostPerTile: 1,
        elementalAffinity: 'Life',
      },
      abilities: [unzombifyBurst],
      statusEffects: [],
      isDead: false,
    };

    combatEngine = new CombatEngine(grid, hazardManager, biomancer, []);

    // Spawn 2 zombies in adjacent tiles to test chain reaction
    enemyZombie1 = combatEngine.spawnZombie({ x: 4, y: 4 }, 25, 4, 'Enemy');
    enemyZombie2 = combatEngine.spawnZombie({ x: 5, y: 4 }, 25, 4, 'Enemy');
  });

  it('should unzombify zombies in 3x3 area, trigger cascading explosion, and summon a Being of Life with 3x Speed', () => {
    expect(combatEngine.zombies.length).toBe(2);

    // Cast Unzombify Explosion at (4,4)
    const result = combatEngine.executeAbility(biomancer, unzombifyBurst, { x: 4, y: 4 });
    expect(result.success).toBe(true);

    // Both zombies should have exploded and perished in the chain reaction
    expect(enemyZombie1.isDead).toBe(true);
    expect(enemyZombie2.isDead).toBe(true);

    // Being of Life should be summoned with 3x Speed (12 AP)
    expect(combatEngine.lifeBeings.length).toBe(1);
    const lifeBeing = combatEngine.lifeBeings[0];
    expect(lifeBeing.avatar).toBe('🧚');
    expect(lifeBeing.isLifeBeing).toBe(true);
    expect(lifeBeing.stats.maxAp).toBe(12); // 3x speed
    expect(lifeBeing.stats.currentAp).toBe(12);
  });

  it('should transmute a targeted Zombie directly into an allied Being of Life', () => {
    const lifeBeing = combatEngine.spawnLifeBeing({ x: 1, y: 2 }, 'Player');
    const transmuteSpell = lifeBeing.abilities.find((a) => a.id === 'transmute_zombie')!;
    expect(transmuteSpell).toBeDefined();

    // Spawn target zombie at (3,2)
    const targetZombie = combatEngine.spawnZombie({ x: 3, y: 2 }, 30, 4, 'Enemy');
    expect(combatEngine.zombies.length).toBe(3); // 2 from beforeEach + 1 target
    expect(combatEngine.lifeBeings.length).toBe(1);

    // Transmute the zombie
    const result = combatEngine.executeAbility(lifeBeing, transmuteSpell, { x: 3, y: 2 });
    expect(result.success).toBe(true);
    expect(targetZombie.isDead).toBe(true);

    // Should spawn a new allied Being of Life at that position
    expect(combatEngine.lifeBeings.length).toBe(2);
    const newBeing = combatEngine.lifeBeings[1];
    expect(newBeing.coord).toEqual({ x: 3, y: 2 });
    expect(newBeing.faction).toBe('Player');
    expect(newBeing.avatar).toBe('🧚');
    expect(newBeing.stats.maxAp).toBe(12);
  });

  it('should verify that all elements have exactly 10 spells and at least 1 dedicated shield spell', () => {
    const classes = Object.values(HERO_CLASSES) as any[];

    expect(classes.length).toBeGreaterThanOrEqual(42);

    classes.forEach((cls) => {
      if (cls.element === 'Admin') {
        expect(cls.abilities.length).toBeGreaterThanOrEqual(10);
      } else {
        expect(cls.abilities.length).toBe(10);
      }
      const shieldSpell = cls.abilities.find(
        (a: any) =>
          a.appliesStatus === 'Shielded' ||
          a.name.toLowerCase().includes('shield') ||
          a.name.toLowerCase().includes('barrier') ||
          a.name.toLowerCase().includes('aegis') ||
          a.name.toLowerCase().includes('ward') ||
          a.name.toLowerCase().includes('bulwark')
      );
      expect(shieldSpell).toBeDefined();
    });
  });

  it('should absorb incoming damage when a unit has the Shielded status active', () => {
    const target = enemyZombie1;
    combatEngine.statusManager.applyStatus(target, {
      type: 'Shielded',
      stacks: 1,
      duration: 3,
    });

    const initialHp = target.stats.currentHp;
    const strike = {
      id: 'test_strike',
      name: 'Test Strike',
      element: 'Neutral' as const,
      icon: '⚔️',
      apCost: 1,
      cooldown: 0,
      currentCooldown: 0,
      range: 5,
      aoeRadius: 0,
      targeting: 'SingleUnit' as const,
      baseDamage: 30,
      description: 'Test blow.',
      level: 1,
    };

    combatEngine.executeAbility(biomancer, strike, target.coord);
    // 30 base damage - 35 absorbed = 0 damage taken!
    expect(target.stats.currentHp).toBe(initialHp);
    expect(target.isDead).toBe(false);
  });

  it('should ensure all created hero characters have 10 max AP and 10 current AP', () => {
    const fireHero = createHeroForElement('Fire');
    expect(fireHero.stats.maxAp).toBe(10);
    expect(fireHero.stats.currentAp).toBe(10);

    const waterHero = createHeroForElement('Water');
    expect(waterHero.stats.maxAp).toBe(10);
    expect(waterHero.stats.currentAp).toBe(10);

    const timeHero = createHeroForElement('Time');
    expect(timeHero.stats.maxAp).toBe(10);
    expect(timeHero.stats.currentAp).toBe(10);
  });

  it('should verify every single element (all 50) has a dedicated Confusion move that applies Confused status', () => {
    const elements = Object.keys(HERO_CLASSES) as any[];
    expect(elements.length).toBe(50);

    elements.forEach((elem) => {
      const cls = HERO_CLASSES[elem as keyof typeof HERO_CLASSES];
      const confusionMove = cls.abilities.find((a) => a.appliesStatus === 'Confused');
      expect(confusionMove, `Element ${elem} is missing a Confusion move!`).toBeDefined();
      expect(confusionMove!.appliesStatus).toBe('Confused');
      expect(confusionMove!.statusDuration).toBe(2);
      expect(confusionMove!.icon).toBe('🌀');
    });
  });

  it('should support the 3 martial elements (Iron, War, Rage) with complete 10-spell kits, shields, and combat execution', () => {
    // 1. Iron Juggernaut
    const ironHero = createHeroForElement('Iron');
    expect(ironHero.name).toBe('Iron Juggernaut');
    expect(ironHero.avatar).toBe('🦾');
    expect(ironHero.stats.elementalAffinity).toBe('Iron');
    expect(ironHero.stats.maxHp).toBe(130);
    expect(ironHero.abilities.length).toBe(10);
    const ironShield = ironHero.abilities.find((a) => a.id === 'iron_bulwark');
    expect(ironShield).toBeDefined();
    expect(ironShield?.appliesStatus).toBe('Shielded');
    const ironConfusion = ironHero.abilities.find((a) => a.id === 'iron_concussion');
    expect(ironConfusion).toBeDefined();
    expect(ironConfusion?.appliesStatus).toBe('Confused');

    // 2. Warmaster
    const warHero = createHeroForElement('War');
    expect(warHero.name).toBe('Warmaster');
    expect(warHero.avatar).toBe('⚔️');
    expect(warHero.stats.elementalAffinity).toBe('War');
    expect(warHero.stats.maxHp).toBe(115);
    expect(warHero.abilities.length).toBe(10);
    const warShield = warHero.abilities.find((a) => a.id === 'war_phalanx_shield');
    expect(warShield).toBeDefined();
    expect(warShield?.appliesStatus).toBe('Shielded');
    const warConfusion = warHero.abilities.find((a) => a.id === 'war_tactical_disarray');
    expect(warConfusion).toBeDefined();
    expect(warConfusion?.appliesStatus).toBe('Confused');

    // 3. Berserker (Rage)
    const rageHero = createHeroForElement('Rage');
    expect(rageHero.name).toBe('Berserker');
    expect(rageHero.avatar).toBe('👹');
    expect(rageHero.stats.elementalAffinity).toBe('Rage');
    expect(rageHero.stats.maxHp).toBe(125);
    expect(rageHero.abilities.length).toBe(10);
    const rageShield = rageHero.abilities.find((a) => a.id === 'rage_barrier');
    expect(rageShield).toBeDefined();
    expect(rageShield?.appliesStatus).toBe('Shielded');
    const rageConfusion = rageHero.abilities.find((a) => a.id === 'rage_blind_frenzy');
    expect(rageConfusion).toBeDefined();
    expect(rageConfusion?.appliesStatus).toBe('Confused');

    // Execute combat ability with Iron Hero
    const testEnemy = combatEngine.spawnZombie({ x: 2, y: 1 }, 50, 4, 'Enemy');
    const anvilToss = ironHero.abilities.find((a) => a.id === 'iron_anvil_toss')!;
    const hitResult = combatEngine.executeAbility(ironHero, anvilToss, testEnemy.coord);
    expect(hitResult.success).toBe(true);
    expect(testEnemy.stats.currentHp).toBe(170); // 200 HP - 30 damage = 170
  });

  it('should support the 2 new forces elements (Titan, Blast) with complete 10-spell kits, shields, and combat execution', () => {
    // 1. Titan Colossus
    const titanHero = createHeroForElement('Titan');
    expect(titanHero.name).toBe('Titan Colossus');
    expect(titanHero.avatar).toBe('🗿');
    expect(titanHero.stats.elementalAffinity).toBe('Titan');
    expect(titanHero.stats.maxHp).toBe(140);
    expect(titanHero.abilities.length).toBe(10);
    const titanShield = titanHero.abilities.find((a) => a.id === 'titan_colossus_aegis');
    expect(titanShield).toBeDefined();
    expect(titanShield?.appliesStatus).toBe('Shielded');
    const titanConfusion = titanHero.abilities.find((a) => a.id === 'titan_tectonic_stupor');
    expect(titanConfusion).toBeDefined();
    expect(titanConfusion?.appliesStatus).toBe('Confused');

    // 2. Demolitionist (Blast)
    const blastHero = createHeroForElement('Blast');
    expect(blastHero.name).toBe('Demolitionist');
    expect(blastHero.avatar).toBe('💥');
    expect(blastHero.stats.elementalAffinity).toBe('Blast');
    expect(blastHero.stats.maxHp).toBe(110);
    expect(blastHero.abilities.length).toBe(10);
    const blastShield = blastHero.abilities.find((a) => a.id === 'blast_dampener_field');
    expect(blastShield).toBeDefined();
    expect(blastShield?.appliesStatus).toBe('Shielded');
    const blastConfusion = blastHero.abilities.find((a) => a.id === 'blast_flashbang');
    expect(blastConfusion).toBeDefined();
    expect(blastConfusion?.appliesStatus).toBe('Confused');

    // Execute combat ability with Titan Colossus
    const enemyUnit = combatEngine.spawnZombie({ x: 3, y: 1 }, 50, 4, 'Enemy');
    const boulderToss = titanHero.abilities.find((a) => a.id === 'titan_mountain_toss')!;
    const titanHit = combatEngine.executeAbility(titanHero, boulderToss, enemyUnit.coord);
    expect(titanHit.success).toBe(true);
    expect(enemyUnit.stats.currentHp).toBe(168); // 200 HP - 32 damage = 168

    // Execute combat ability with Demolitionist - verifying explosive AoE radius hits multiple enemies
    const enemyUnit2 = combatEngine.spawnZombie({ x: 4, y: 1 }, 50, 4, 'Enemy'); // Adjacent to { x: 3, y: 1 }
    expect(enemyUnit2.stats.currentHp).toBe(200);

    const fragGrenade = blastHero.abilities.find((a) => a.id === 'blast_grenade')!;
    expect(fragGrenade.aoeRadius).toBe(2); // Explosive range 2
    const blastHit = combatEngine.executeAbility(blastHero, fragGrenade, enemyUnit.coord);
    expect(blastHit.success).toBe(true);

    // Both enemyUnit and enemyUnit2 in the explosive radius took 28 damage!
    expect(enemyUnit.stats.currentHp).toBe(140); // 168 HP - 28 damage = 140
    expect(enemyUnit2.stats.currentHp).toBe(172); // 200 HP - 28 damage = 172

    // Verify all offensive Blast abilities have an explosive aoeRadius >= 1
    const offensiveMoves = blastHero.abilities.filter((a) => a.targeting !== 'Self');
    expect(offensiveMoves.length).toBe(9);
    offensiveMoves.forEach((move) => {
      expect(move.aoeRadius).toBeGreaterThanOrEqual(1);
    });
  });

  it('should apply Confused status effect to an enemy and cause confusion in combat', () => {
    const heroUnit = createHeroForElement('Fire');
    const confusionAbility = heroUnit.abilities.find((a) => a.appliesStatus === 'Confused')!;
    expect(confusionAbility).toBeDefined();

    const enemyUnit = combatEngine.spawnZombie({ x: 2, y: 1 }, 50, 4, 'Enemy');
    expect(enemyUnit.statusEffects.length).toBe(0);

    // Cast confusion ability
    const result = combatEngine.executeAbility(heroUnit, confusionAbility, enemyUnit.coord);
    expect(result.success).toBe(true);
    expect(enemyUnit.statusEffects.some((s) => s.type === 'Confused')).toBe(true);

    // Verify tick status effect handles confusion
    const tickLogs = combatEngine.statusManager.tickStatusEffects(enemyUnit);
    expect(tickLogs.some((l) => l.includes('Confusion'))).toBe(true);
  });

  it('should support multiple zombie classes with distinct avatars, stats, and abilities when spawned on their required floor hazards', () => {
    const walker = combatEngine.spawnZombie({ x: 1, y: 1 }, 25, 4, 'Player', 'Walker');
    expect(walker.zombieClass).toBe('Walker');
    expect(walker.avatar).toBe('🧟');
    expect(walker.abilities.some((a) => a.id === 'zombie_bite')).toBe(true);

    // Runner requires Puddle
    combatEngine.hazardManager.applyHazard({ x: 2, y: 1 }, 'Puddle', 3, 0, 'Water');
    const runner = combatEngine.spawnZombie({ x: 2, y: 1 }, 25, 4, 'Player', 'Runner');
    expect(runner.zombieClass).toBe('Runner');
    expect(runner.avatar).toBe('🧟⚡');
    expect(runner.abilities.some((a) => a.id === 'runner_frenzied_pounce')).toBe(true);

    // Brute requires MudWall
    combatEngine.hazardManager.applyHazard({ x: 3, y: 1 }, 'MudWall', 3, 0, 'Earth');
    const brute = combatEngine.spawnZombie({ x: 3, y: 1 }, 25, 4, 'Player', 'Brute');
    expect(brute.zombieClass).toBe('Brute');
    expect(brute.avatar).toBe('🧟🛡️');
    expect(brute.stats.maxHp).toBe(25 * 4); // 100 (4x HP)
    expect(brute.abilities.some((a) => a.id === 'brute_ground_slam')).toBe(true);

    // Spitter requires AcidPool
    combatEngine.hazardManager.applyHazard({ x: 4, y: 1 }, 'AcidPool', 3, 0, 'Acid');
    const spitter = combatEngine.spawnZombie({ x: 4, y: 1 }, 25, 4, 'Player', 'Spitter');
    expect(spitter.zombieClass).toBe('Spitter');
    expect(spitter.avatar).toBe('🧟🧪');
    expect(spitter.abilities.some((a) => a.id === 'spitter_toxic_bile')).toBe(true);

    // Boomer requires LavaPool or Burning
    combatEngine.hazardManager.applyHazard({ x: 5, y: 1 }, 'LavaPool', 3, 0, 'Fire');
    const boomer = combatEngine.spawnZombie({ x: 5, y: 1 }, 25, 4, 'Player', 'Boomer');
    expect(boomer.zombieClass).toBe('Boomer');
    expect(boomer.avatar).toBe('🧟💣');
    expect(boomer.stats.elementalAffinity).toBe('Fire');
    expect(boomer.abilities.some((a) => a.id === 'boomer_detonation')).toBe(true);

    // Frostbite requires IceSurface
    combatEngine.hazardManager.applyHazard({ x: 6, y: 1 }, 'IceSurface', 3, 0, 'Cold');
    const frostbite = combatEngine.spawnZombie({ x: 6, y: 1 }, 25, 4, 'Player', 'Frostbite');
    expect(frostbite.zombieClass).toBe('Frostbite');
    expect(frostbite.avatar).toBe('🧟❄️');
    expect(frostbite.stats.elementalAffinity).toBe('Cold');
    expect(frostbite.abilities.some((a) => a.id === 'frostbite_freeze')).toBe(true);

    // DeathKnight requires BonePile
    combatEngine.hazardManager.applyHazard({ x: 7, y: 1 }, 'BonePile', 3, 0, 'Death');
    const deathKnight = combatEngine.spawnZombie({ x: 7, y: 1 }, 25, 4, 'Player', 'DeathKnight');
    expect(deathKnight.zombieClass).toBe('DeathKnight');
    expect(deathKnight.avatar).toBe('🧟⚔️');
    expect(deathKnight.stats.elementalAffinity).toBe('Metal');
    expect(deathKnight.abilities.some((a) => a.id === 'deathknight_cleave')).toBe(true);
    expect(deathKnight.abilities.some((a) => a.id === 'deathknight_shield')).toBe(true);

    // Screamer requires CrystalSpikes
    combatEngine.hazardManager.applyHazard({ x: 8, y: 1 }, 'CrystalSpikes', 3, 0, 'Crystal');
    const screamer = combatEngine.spawnZombie({ x: 8, y: 1 }, 25, 4, 'Player', 'Screamer');
    expect(screamer.zombieClass).toBe('Screamer');
    expect(screamer.avatar).toBe('🧟😱');
    expect(screamer.stats.elementalAffinity).toBe('Sound');
    expect(screamer.abilities.some((a) => a.id === 'screamer_wail')).toBe(true);

    // PlagueBearer requires ToxicMire
    combatEngine.hazardManager.applyHazard({ x: 9, y: 1 }, 'ToxicMire', 3, 0, 'Poison');
    const plague = combatEngine.spawnZombie({ x: 9, y: 1 }, 25, 4, 'Player', 'PlagueBearer');
    expect(plague.zombieClass).toBe('PlagueBearer');
    expect(plague.avatar).toBe('🧟🦠');
    expect(plague.stats.elementalAffinity).toBe('Poison');
    expect(plague.abilities.some((a) => a.id === 'plague_contagion')).toBe(true);

    // Electro requires ElectrifiedPuddle
    combatEngine.hazardManager.applyHazard({ x: 0, y: 1 }, 'ElectrifiedPuddle', 3, 0, 'Lightning');
    const electro = combatEngine.spawnZombie({ x: 0, y: 1 }, 25, 4, 'Player', 'Electro');
    expect(electro.zombieClass).toBe('Electro');
    expect(electro.avatar).toBe('🧟⚡');
    expect(electro.stats.elementalAffinity).toBe('Lightning');
    expect(electro.abilities.some((a) => a.id === 'electro_shock')).toBe(true);
  });

  it('should require floor hazards for specialized zombies (e.g. Frostbite needs IceSurface) and downgrade to Walker on bare ground', () => {
    // Attempting to spawn Frostbite on clean floor without IceSurface
    const bareTileCoord = { x: 5, y: 5 };
    const cleanTile = combatEngine.grid.getTile(bareTileCoord);
    expect(cleanTile?.hazard.type).toBe('None');

    const downgradedZombie = combatEngine.spawnZombie(bareTileCoord, 25, 4, 'Player', 'Frostbite');
    // Without frost on the floor, it cannot manifest as Frostbite and falls back to Walker
    expect(downgradedZombie.zombieClass).toBe('Walker');
    expect(downgradedZombie.avatar).toBe('🧟');

    // Now apply frost (IceSurface) to the tile
    combatEngine.hazardManager.applyHazard(bareTileCoord, 'IceSurface', 4, 10, 'Cold');
    expect(combatEngine.grid.getTile(bareTileCoord)?.hazard.type).toBe('IceSurface');

    // Now spawning Frostbite on the ice succeeds!
    const frostZombie = combatEngine.spawnZombie(bareTileCoord, 25, 4, 'Player', 'Frostbite');
    expect(frostZombie.zombieClass).toBe('Frostbite');
    expect(frostZombie.avatar).toBe('🧟❄️');
    expect(frostZombie.stats.elementalAffinity).toBe('Cold');

    // Natural emergence on IceSurface also spontaneously creates Frostbite
    const iceTile2 = { x: 5, y: 6 };
    combatEngine.hazardManager.applyHazard(iceTile2, 'IceSurface', 4, 10, 'Cold');
    const naturalFrostZombie = combatEngine.spawnZombie(iceTile2, 25, 4, 'Player');
    expect(naturalFrostZombie.zombieClass).toBe('Frostbite');
    expect(naturalFrostZombie.avatar).toBe('🧟❄️');

    // Verify native floor immunity: Frostbite zombie does not take hazard damage on IceSurface
    const initialHp = frostZombie.stats.currentHp;
    const destIce = { x: 5, y: 7 };
    combatEngine.hazardManager.applyHazard(destIce, 'IceSurface', 4, 15, 'Cold');
    combatEngine.moveUnit(frostZombie, destIce);
    expect(frostZombie.coord).toEqual(destIce);
    expect(frostZombie.stats.currentHp).toBe(initialHp); // Zero hazard damage due to native ice immunity!
  });

  it('should spawn a legendary Wizard Zombie that can attack from afar and bind target to the spot', () => {
    // Apply required VoidRift floor hazard
    combatEngine.hazardManager.applyHazard({ x: 1, y: 2 }, 'VoidRift', 5, 20, 'Void');
    const wizard = combatEngine.spawnZombie({ x: 1, y: 2 }, 30, 4, 'Player', 'Wizard');
    expect(wizard.zombieClass).toBe('Wizard');
    expect(wizard.name).toBe('Wizard Zombie');
    expect(wizard.avatar).toBe('🧟🧙‍♂️');
    expect(wizard.stats.maxAp).toBe(6);

    // Can attack from afar: Range 7 Necrotic Shadow Bolt
    const shadowBolt = wizard.abilities.find((a) => a.id === 'wizard_zombie_shadow_bolt')!;
    expect(shadowBolt).toBeDefined();
    expect(shadowBolt.range).toBe(7);
    expect(shadowBolt.baseDamage).toBe(36);

    // Can bind someone to the spot so they cannot run away: Range 6 Grave Binding
    const graveBind = wizard.abilities.find((a) => a.id === 'wizard_zombie_grave_bind')!;
    expect(graveBind).toBeDefined();
    expect(graveBind.range).toBe(6);
    expect(graveBind.appliesStatus).toBe('Rooted');
    expect(graveBind.statusDuration).toBe(3);

    // Spawn an enemy 5 tiles away (from afar)
    const enemyTarget = combatEngine.spawnZombie({ x: 6, y: 2 }, 30, 4, 'Enemy', 'Walker');
    expect(enemyTarget.statusEffects.length).toBe(0);

    // Cast Grave Binding from afar
    const bindResult = combatEngine.executeAbility(wizard, graveBind, enemyTarget.coord);
    expect(bindResult.success).toBe(true);
    expect(enemyTarget.statusEffects.some((s) => s.type === 'Rooted')).toBe(true);

    // Verify target is now bound to the spot and cannot move
    const moveResult = combatEngine.moveUnit(enemyTarget, { x: 6, y: 3 });
    expect(moveResult).toBe(false); // Move blocked by Rooted!
  });

  it('should verify natural spawn uses 1 out of 10,000 probability for Wizard Zombie', () => {
    // Test random roll logic: when Math.random() < 0.0001 it rolls Wizard
    const randomSpy = vi.spyOn(Math, 'random');
    
    // Simulate rolling < 0.0001 (1 out of 10,000)
    randomSpy.mockReturnValueOnce(0.00005);
    const rolledWizard = combatEngine.spawnZombie({ x: 2, y: 3 }, 25, 4, 'Player');
    expect(rolledWizard.zombieClass).toBe('Wizard');
    expect(rolledWizard.avatar).toBe('🧟🧙‍♂️');

    // Simulate rolling standard (> 0.0001)
    randomSpy.mockReturnValueOnce(0.5);
    const standardZombie = combatEngine.spawnZombie({ x: 3, y: 3 }, 25, 4, 'Player');
    expect(standardZombie.zombieClass).not.toBe('Wizard');

    randomSpy.mockRestore();
  });

  it('should support spawning an apocalyptic legion of 1000 Wizard Zombies', () => {
    const initialCount = combatEngine.zombies.length;
    const toSpawn = 1000;

    for (let i = 0; i < toSpawn; i++) {
      combatEngine.spawnZombie({ x: i % 10, y: Math.floor(i / 10) % 10 }, 70, 6, 'Player', 'Wizard', true);
    }

    expect(combatEngine.zombies.length).toBe(initialCount + 1000);
    const sampleWizard = combatEngine.zombies[combatEngine.zombies.length - 1];
    expect(sampleWizard.zombieClass).toBe('Wizard');
    expect(sampleWizard.avatar).toBe('🧟🧙‍♂️');
    expect(sampleWizard.stats.maxAp).toBe(6);
    expect(sampleWizard.abilities.some((a) => a.id === 'wizard_zombie_shadow_bolt')).toBe(true);
    expect(sampleWizard.abilities.some((a) => a.id === 'wizard_zombie_grave_bind')).toBe(true);
  });
});
