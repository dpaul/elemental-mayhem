// Tests for Arena Placement Engine: Enemies, Walls, Hazards, and Eraser
import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { CombatEngine } from '../engine/CombatEngine';
import { PlacementManager } from '../engine/PlacementManager';
import { Unit } from '../types';

describe('PlacementManager (Arena Builder & Placement System)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;
  let hero: Unit;
  let combatEngine: CombatEngine;
  let placement: PlacementManager;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);
    hero = {
      id: 'test_hero',
      name: 'Test Hero',
      faction: 'Player',
      avatar: '🧙',
      coord: { x: 1, y: 1 },
      stats: {
        maxHp: 100,
        currentHp: 100,
        maxAp: 4,
        currentAp: 4,
        moveCostPerTile: 1,
        elementalAffinity: 'Fire',
      },
      abilities: [],
      statusEffects: [],
      isDead: false,
    };
    combatEngine = new CombatEngine(grid, hazardManager, hero, []);
    placement = new PlacementManager();
  });

  it('should initialize placement catalog with enemies, walls, hazards, and eraser', () => {
    const all = placement.getAllItems();
    expect(all.length).toBeGreaterThan(40);

    const walls = placement.getItemsByCategory('wall');
    expect(walls.length).toBeGreaterThanOrEqual(6);
    expect(walls.some((w) => w.name === 'Rock Pillar')).toBe(true);
    expect(walls.some((w) => w.name === 'Crystal Barrier')).toBe(true);

    const hazards = placement.getItemsByCategory('hazard');
    expect(hazards.length).toBeGreaterThanOrEqual(10);
    expect(hazards.some((h) => h.name === 'Lava Pool')).toBe(true);
    expect(hazards.some((h) => h.name === 'Electrified Puddle')).toBe(true);

    const enemies = placement.getItemsByCategory('enemy');
    expect(enemies.length).toBeGreaterThanOrEqual(25);
    expect(enemies.some((e) => e.name === 'Water Dummy')).toBe(true);
    expect(enemies.some((e) => e.name === 'Pyroclast Sorcerer')).toBe(true);
    expect(enemies.some((e) => e.name === 'Wizard Zombie')).toBe(true);
    expect(enemies.some((e) => e.name === 'THE VOID ARCHON (Supreme Boss)')).toBe(true);

    const eraser = placement.getItemById('tool_eraser');
    expect(eraser).toBeDefined();
    expect(eraser?.category).toBe('eraser');
  });

  it('should place walls with custom icons and block pathfinding', () => {
    const wallItem = placement.getItemById('wall_crystal')!;
    expect(wallItem).toBeDefined();

    const targetCoord = { x: 3, y: 3 };
    expect(grid.isWalkable(targetCoord)).toBe(true);

    const result = placement.executePlacement(wallItem, targetCoord, grid, hazardManager, combatEngine);
    expect(result.success).toBe(true);
    expect(grid.getTile(targetCoord)?.isObstacle).toBe(true);
    expect(grid.getTile(targetCoord)?.obstacleIcon).toBe('💎');
    expect(grid.isWalkable(targetCoord)).toBe(false);

    // Wall placement on occupied hero tile should fail
    const invalidResult = placement.executePlacement(wallItem, hero.coord, grid, hazardManager, combatEngine);
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.message).toContain('occupied');
  });

  it('should place tile hazards and trigger elemental surface interactions', () => {
    const puddleItem = placement.getItemById('hazard_puddle')!;
    const coord = { x: 4, y: 4 };

    const r1 = placement.executePlacement(puddleItem, coord, grid, hazardManager, combatEngine);
    expect(r1.success).toBe(true);
    expect(grid.getTile(coord)?.hazard.type).toBe('Puddle');

    // Applying lightning electrified puddle should react and electrify
    const electroItem = placement.getItemById('hazard_electrified')!;
    const r2 = placement.executePlacement(electroItem, coord, grid, hazardManager, combatEngine);
    expect(r2.success).toBe(true);
    expect(grid.getTile(coord)?.hazard.type).toBe('ElectrifiedPuddle');

    // Hazard placement on wall should fail
    grid.setObstacle({ x: 5, y: 5 }, true);
    const r3 = placement.executePlacement(puddleItem, { x: 5, y: 5 }, grid, hazardManager, combatEngine);
    expect(r3.success).toBe(false);
  });

  it('should place enemies at coordinates and add to combat engine', () => {
    const archonItem = placement.getItemById('boss_void_archon')!;
    expect(archonItem).toBeDefined();

    const coord = { x: 6, y: 6 };
    expect(combatEngine.getUnitAt(coord)).toBeNull();

    const result = placement.executePlacement(archonItem, coord, grid, hazardManager, combatEngine);
    expect(result.success).toBe(true);
    expect(result.spawnedUnit).toBeDefined();
    expect(result.spawnedUnit?.name).toContain('THE VOID ARCHON');
    expect(result.spawnedUnit?.isBoss).toBe(true);
    expect(combatEngine.getUnitAt(coord)?.id).toBe(result.spawnedUnit?.id);

    // Cannot place second enemy on same coordinate
    const wizardItem = placement.getItemById('undead_wizard')!;
    const blockedResult = placement.executePlacement(wizardItem, coord, grid, hazardManager, combatEngine);
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.message).toContain('occupied');
  });

  it('should support Tile Eraser to wipe units, walls, and hazards', () => {
    const eraser = placement.getItemById('tool_eraser')!;
    const coord = { x: 7, y: 7 };

    // 1. Setup enemy + wall + hazard
    const dummy = placement.getItemById('dummy_fire')!;
    placement.executePlacement(dummy, coord, grid, hazardManager, combatEngine);
    grid.setObstacle(coord, true);
    hazardManager.applyHazard(coord, 'Burning', 3, 10, 'Fire');

    expect(combatEngine.getUnitAt(coord)).not.toBeNull();
    expect(grid.getTile(coord)?.isObstacle).toBe(true);

    // 2. Erase tile
    const eraseResult = placement.executePlacement(eraser, coord, grid, hazardManager, combatEngine);
    expect(eraseResult.success).toBe(true);
    expect(combatEngine.getUnitAt(coord)).toBeNull();
    expect(grid.getTile(coord)?.isObstacle).toBe(false);
    expect(grid.getTile(coord)?.hazard.type).toBe('None');

    // 3. Ensure player hero cannot be erased
    const heroErase = placement.executePlacement(eraser, hero.coord, grid, hazardManager, combatEngine);
    expect(heroErase.success).toBe(false);
    expect(heroErase.message).toContain('Player Hero');
    expect(combatEngine.hero.isDead).toBe(false);
  });
});
