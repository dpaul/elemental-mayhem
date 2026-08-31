import { describe, it, expect, beforeEach } from 'vitest';
import { CombatEngine } from '../engine/CombatEngine';
import { TurnManager } from '../engine/TurnManager';
import { EnemyAI } from '../engine/EnemyAI';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit, Ability } from '../types';

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

  it('should reanimate an enemy killed by a Necromancer move as a Zombie with 4x HP and 3x Speed', () => {
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
    expect(zombie.stats.maxAp).toBe(4 * 3); // 12 (3x Speed)
    expect(zombie.zombieLifetime).toBe(4); // 4 turns lifetime
    expect(zombie.abilities[0].range).toBe(1); // Attacks only when adjacent
  });

  it('should create a 3-turn delayed reanimation when a Zombie attacks and kills an enemy', () => {
    // Spawn zombie directly next to enemy2
    const zombie = combatEngine.spawnZombie({ x: 3, y: 2 }, 30, 4);
    const bite = zombie.abilities[0];

    // Zombie bites enemy2 (20 HP vs 28 damage)
    const result = combatEngine.executeAbility(zombie, bite, { x: 3, y: 3 });
    expect(result.success).toBe(true);
    expect(enemy2.isDead).toBe(true);

    // Verify pending reanimation
    expect(combatEngine.pendingReanimations.length).toBe(1);
    expect(combatEngine.pendingReanimations[0].turnsRemaining).toBe(3);
    expect(combatEngine.pendingReanimations[0].victimName).toBe('Cultist Guard');

    // Tick 1
    combatEngine.tickZombies();
    expect(combatEngine.pendingReanimations[0].turnsRemaining).toBe(2);

    // Tick 2
    combatEngine.tickZombies();
    expect(combatEngine.pendingReanimations[0].turnsRemaining).toBe(1);

    // Tick 3: Reanimates as a new zombie!
    combatEngine.tickZombies();
    expect(combatEngine.pendingReanimations.length).toBe(0);
    expect(combatEngine.zombies.length).toBe(2); // Initial zombie + newly risen zombie
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
});
