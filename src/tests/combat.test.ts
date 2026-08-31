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
});
