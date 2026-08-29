import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from '../engine/Grid';
import { TileHazardManager } from '../engine/TileHazardManager';
import { GridCoord } from '../types';

describe('Grid & Pathfinding Engine (TDD Red -> Green)', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid(10);
  });

  it('should initialize a 10x10 grid with empty, non-obstacle tiles', () => {
    expect(grid.size).toBe(10);
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const tile = grid.getTile({ x, y });
        expect(tile).toBeDefined();
        expect(tile?.isObstacle).toBe(false);
        expect(tile?.hazard.type).toBe('None');
      }
    }
  });

  it('should calculate Manhattan and Chebyshev distances correctly', () => {
    const a: GridCoord = { x: 2, y: 3 };
    const b: GridCoord = { x: 5, y: 7 };
    expect(grid.manhattanDistance(a, b)).toBe(7); // |5-2| + |7-3| = 3 + 4 = 7
    expect(grid.chebyshevDistance(a, b)).toBe(4); // max(3, 4) = 4
  });

  it('should identify valid in-bound coords and out-of-bound coords', () => {
    expect(grid.isInBounds({ x: 0, y: 0 })).toBe(true);
    expect(grid.isInBounds({ x: 9, y: 9 })).toBe(true);
    expect(grid.isInBounds({ x: -1, y: 0 })).toBe(false);
    expect(grid.isInBounds({ x: 0, y: 10 })).toBe(false);
  });

  it('should find optimal path with A* avoiding obstacles', () => {
    // Place a vertical obstacle wall between (2,0) and (2,2)
    grid.setObstacle({ x: 2, y: 0 }, true);
    grid.setObstacle({ x: 2, y: 1 }, true);
    grid.setObstacle({ x: 2, y: 2 }, true);

    const start: GridCoord = { x: 1, y: 1 };
    const target: GridCoord = { x: 3, y: 1 };

    const path = grid.findPath(start, target);
    expect(path).not.toBeNull();
    expect(path?.length).toBeGreaterThan(0);
    // Target should be the end of the path
    expect(path?.[path.length - 1]).toEqual(target);
    // Path should not pass through any obstacle
    path?.forEach((coord) => {
      expect(grid.isWalkable(coord)).toBe(true);
    });
  });

  it('should return reachable tiles given maximum movement points', () => {
    const start: GridCoord = { x: 5, y: 5 };
    const reachable = grid.getReachableTiles(start, 2);
    expect(reachable.length).toBeGreaterThan(0);
    reachable.forEach((coord) => {
      expect(grid.manhattanDistance(start, coord)).toBeLessThanOrEqual(2);
    });
  });

  it('should check line-of-sight correctly across obstacles', () => {
    const a: GridCoord = { x: 1, y: 1 };
    const b: GridCoord = { x: 4, y: 1 };
    expect(grid.hasLineOfSight(a, b)).toBe(true);

    grid.setObstacle({ x: 2, y: 1 }, true);
    expect(grid.hasLineOfSight(a, b)).toBe(false);
  });
});

describe('TileHazardManager (TDD Red -> Green)', () => {
  let grid: Grid;
  let hazardManager: TileHazardManager;

  beforeEach(() => {
    grid = new Grid(10);
    hazardManager = new TileHazardManager(grid);
  });

  it('should apply and tick hazard states on tiles', () => {
    const coord: GridCoord = { x: 3, y: 3 };
    hazardManager.applyHazard(coord, 'Burning', 2, 10, 'Fire');

    const tile = grid.getTile(coord);
    expect(tile?.hazard.type).toBe('Burning');
    expect(tile?.hazard.duration).toBe(2);

    // Tick 1
    hazardManager.tickHazards();
    expect(grid.getTile(coord)?.hazard.duration).toBe(1);

    // Tick 2 (should expire back to None)
    hazardManager.tickHazards();
    expect(grid.getTile(coord)?.hazard.type).toBe('None');
  });

  it('should handle hazard reaction transitions (Fire on Water = Puddle evaporates)', () => {
    const coord: GridCoord = { x: 4, y: 4 };
    hazardManager.applyHazard(coord, 'Puddle', 3, 0, 'Water');
    expect(grid.getTile(coord)?.hazard.type).toBe('Puddle');

    // Apply Burning to Puddle -> Vaporize (clears puddle)
    const reaction = hazardManager.applyHazard(coord, 'Burning', 2, 10, 'Fire');
    expect(reaction).toBe('Vaporized');
    expect(grid.getTile(coord)?.hazard.type).toBe('None');
  });

  it('should electrify puddle when lightning is applied to water tile', () => {
    const coord: GridCoord = { x: 5, y: 5 };
    hazardManager.applyHazard(coord, 'Puddle', 3, 0, 'Water');
    const reaction = hazardManager.applyHazard(coord, 'ElectrifiedPuddle', 2, 15, 'Lightning');
    expect(reaction).toBe('Electrified');
    expect(grid.getTile(coord)?.hazard.type).toBe('ElectrifiedPuddle');
  });
});
