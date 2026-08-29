import { describe, it, expect, beforeEach } from 'vitest';
import { EnemyAI } from '../engine/EnemyAI';
import { CombatEngine } from '../engine/CombatEngine';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit, Ability } from '../types';

describe('EnemyAI Discrete Step Planning (TDD Red -> Green)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let combatEngine: CombatEngine;
  let ai: EnemyAI;
  let hero: Unit;
  let enemy: Unit;
  let fireball: Ability;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);

    fireball = {
      id: 'fireball',
      name: 'Fireball',
      element: 'Fire',
      icon: '🔥',
      apCost: 2,
      cooldown: 0,
      currentCooldown: 0,
      range: 3,
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
      id: 'enemy_1',
      name: 'Enemy Adept',
      faction: 'Enemy',
      avatar: '👾',
      coord: { x: 5, y: 9 }, // 4 tiles away (out of range 3)
      stats: {
        maxHp: 50,
        currentHp: 50,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [fireball],
      statusEffects: [],
      isDead: false,
    };

    combatEngine = new CombatEngine(grid, hazardManager, hero, [enemy]);
    ai = new EnemyAI(combatEngine);
  });

  it('should plan discrete steps: move within range, then cast ability', () => {
    const steps = ai.planTurnSteps(enemy, hero);
    expect(steps.length).toBeGreaterThan(0);

    // First step should be move closer
    const moveStep = steps.find((s) => s.type === 'move');
    expect(moveStep).toBeDefined();
    if (moveStep && moveStep.type === 'move') {
      expect(moveStep.path.length).toBeGreaterThan(1);
    }

    // Subsequent step should be cast
    const castStep = steps.find((s) => s.type === 'cast');
    expect(castStep).toBeDefined();
  });
});
