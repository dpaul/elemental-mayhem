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
});
