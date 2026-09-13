import { describe, it, expect, beforeEach } from 'vitest';
import { CombatEngine } from '../engine/CombatEngine';
import { EscalationManager } from '../engine/EscalationManager';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { Unit } from '../types';

describe('Round 100 Void Overlord Zombie Usurpation Dominion', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let hero: Unit;
  let escalationManager: EscalationManager;
  let combatEngine: CombatEngine;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);
    escalationManager = new EscalationManager();

    hero = {
      id: 'hero',
      name: 'Arch-Mage',
      faction: 'Player',
      avatar: '🧙',
      coord: { x: 1, y: 1 },
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

    combatEngine = new CombatEngine(grid, hazardManager, hero, []);
  });

  it('should verify EscalationManager designates Round 100 boss as THE VOID OVERLORD (Tier 20 Boss)', () => {
    const enemies = escalationManager.generateRoundEnemies(100);
    expect(enemies.length).toBeGreaterThan(0);
    const overlord = enemies.find((e) => e.id === 'boss_void_overlord_r100');
    expect(overlord).toBeDefined();
    expect(overlord?.name).toContain('VOID OVERLORD');
    expect(overlord?.stats.elementalAffinity).toBe('Void');
  });

  it('should instantly convert any spawned Player zombie to Enemy faction on Round 100', () => {
    combatEngine.currentRound = 100;
    expect(combatEngine.isVoidOverlordZombieUsurpationActive()).toBe(true);

    // Attempt to spawn a Player zombie on Round 100
    const zombie = combatEngine.spawnZombie({ x: 3, y: 3 }, 50, 4, 'Player', 'Walker', true);

    // Must be usurped by the Void Overlord into an Enemy
    expect(zombie.faction).toBe('Enemy');
    expect(zombie.isVoidUsurped).toBe(true);
    expect(combatEngine.zombies.length).toBe(1);

    // Player allies list must NOT include the usurped zombie
    const allies = combatEngine.getAllAllies();
    expect(allies.find((a) => a.id === zombie.id)).toBeUndefined();

    // Verify combat log records the usurpation
    const usurpLog = combatEngine.logs.find((l) => l.message.includes('Void Overlord usurped this zombie instantly'));
    expect(usurpLog).toBeDefined();
  });

  it('should instantly usurp pre-existing Player zombies when entering Round 100', () => {
    // Spawn zombie during Round 99
    combatEngine.currentRound = 99;
    const zombie = combatEngine.spawnZombie({ x: 2, y: 2 }, 50, 4, 'Player', 'Walker', true);
    expect(zombie.faction).toBe('Player');
    expect(combatEngine.getAllAllies().find((a) => a.id === zombie.id)).toBeDefined();

    // Enter Round 100
    combatEngine.currentRound = 100;
    const usurpedCount = combatEngine.usurpPlayerZombiesForVoidOverlord();

    expect(usurpedCount).toBe(1);
    expect(zombie.faction).toBe('Enemy');
    expect(zombie.isVoidUsurped).toBe(true);

    // Player allies list must NOT include the usurped zombie
    expect(combatEngine.getAllAllies().find((a) => a.id === zombie.id)).toBeUndefined();
  });

  it('should also enforce zombie usurpation on Round 1000 and whenever Void Overlord is present', () => {
    // Round 1000
    combatEngine.currentRound = 1000;
    expect(combatEngine.isVoidOverlordZombieUsurpationActive()).toBe(true);
    const z1000 = combatEngine.spawnZombie({ x: 4, y: 4 }, 50, 4, 'Player');
    expect(z1000.faction).toBe('Enemy');
    expect(z1000.isVoidUsurped).toBe(true);

    // Custom round where Void Overlord unit is an enemy
    combatEngine.currentRound = 45;
    combatEngine.enemies = [
      {
        id: 'boss_void_overlord_custom',
        name: 'THE VOID OVERLORD',
        faction: 'Enemy',
        avatar: '😈',
        coord: { x: 8, y: 5 },
        stats: {
          maxHp: 2000,
          currentHp: 2000,
          maxAp: 6,
          currentAp: 6,
          moveCostPerTile: 1,
          elementalAffinity: 'Void',
        },
        abilities: [],
        statusEffects: [],
        isDead: false,
      },
    ];
    expect(combatEngine.isVoidOverlordZombieUsurpationActive()).toBe(true);

    const zBoss = combatEngine.spawnZombie({ x: 5, y: 5 }, 50, 4, 'Player');
    expect(zBoss.faction).toBe('Enemy');
    expect(zBoss.isVoidUsurped).toBe(true);
  });

  it('should allow normal Player zombies on ordinary non-Void rounds (e.g. Round 1, 5, 20)', () => {
    combatEngine.currentRound = 5;
    combatEngine.enemies = [
      {
        id: 'boss_r5',
        name: 'Pyroclast Golem',
        faction: 'Enemy',
        avatar: '🗿',
        coord: { x: 8, y: 5 },
        stats: {
          maxHp: 500,
          currentHp: 500,
          maxAp: 4,
          currentAp: 4,
          moveCostPerTile: 1,
          elementalAffinity: 'Fire',
        },
        abilities: [],
        statusEffects: [],
        isDead: false,
      },
    ];

    expect(combatEngine.isVoidOverlordZombieUsurpationActive()).toBe(false);

    const normalZombie = combatEngine.spawnZombie({ x: 3, y: 2 }, 50, 4, 'Player');
    expect(normalZombie.faction).toBe('Player');
    expect(normalZombie.isVoidUsurped).toBeFalsy();
    expect(combatEngine.getAllAllies().find((a) => a.id === normalZombie.id)).toBeDefined();
  });
});
