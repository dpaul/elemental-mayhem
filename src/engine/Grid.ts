// Elemental Mayhem - 10x10 Tactical Grid & A* Pathfinding Engine
import { GridCoord, TileState } from '../types';

export class Grid {
  public readonly size: number;
  private tiles: TileState[][];

  constructor(size: number = 10) {
    this.size = size;
    this.tiles = [];
    this.initGrid();
  }

  private initGrid(): void {
    this.tiles = [];
    for (let x = 0; x < this.size; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < this.size; y++) {
        this.tiles[x][y] = {
          coord: { x, y },
          isObstacle: false,
          hazard: {
            type: 'None',
            duration: 0,
            damagePerTurn: 0,
            element: 'Neutral',
          },
        };
      }
    }
  }

  public isInBounds(coord: GridCoord): boolean {
    return coord.x >= 0 && coord.x < this.size && coord.y >= 0 && coord.y < this.size;
  }

  public getTile(coord: GridCoord): TileState | null {
    if (!this.isInBounds(coord)) return null;
    return this.tiles[coord.x][coord.y];
  }

  public setObstacle(coord: GridCoord, isObstacle: boolean): void {
    const tile = this.getTile(coord);
    if (tile) {
      tile.isObstacle = isObstacle;
    }
  }

  public isWalkable(coord: GridCoord): boolean {
    const tile = this.getTile(coord);
    return tile !== null && !tile.isObstacle;
  }

  public manhattanDistance(a: GridCoord, b: GridCoord): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  public chebyshevDistance(a: GridCoord, b: GridCoord): number {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  public getNeighbors(coord: GridCoord): GridCoord[] {
    const directions: GridCoord[] = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 },  // East
      { x: 0, y: 1 },  // South
      { x: -1, y: 0 }, // West
    ];

    const neighbors: GridCoord[] = [];
    for (const dir of directions) {
      const neighbor: GridCoord = { x: coord.x + dir.x, y: coord.y + dir.y };
      if (this.isInBounds(neighbor)) {
        neighbors.push(neighbor);
      }
    }
    return neighbors;
  }

  public findPath(start: GridCoord, target: GridCoord): GridCoord[] | null {
    if (!this.isInBounds(start) || !this.isInBounds(target)) return null;
    if (!this.isWalkable(target)) return null;

    interface Node {
      coord: GridCoord;
      g: number;
      h: number;
      f: number;
      parent: Node | null;
    }

    const startKey = `${start.x},${start.y}`;
    const targetKey = `${target.x},${target.y}`;
    if (startKey === targetKey) return [];

    const openList: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
      coord: start,
      g: 0,
      h: this.manhattanDistance(start, target),
      f: this.manhattanDistance(start, target),
      parent: null,
    };
    openList.push(startNode);

    while (openList.length > 0) {
      // Find node with lowest f
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;
      const currentKey = `${current.coord.x},${current.coord.y}`;

      if (currentKey === targetKey) {
        // Reconstruct path
        const path: GridCoord[] = [];
        let curr: Node | null = current;
        while (curr && curr.parent !== null) {
          path.unshift(curr.coord);
          curr = curr.parent;
        }
        return path;
      }

      closedSet.add(currentKey);

      for (const neighbor of this.getNeighbors(current.coord)) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(neighborKey)) continue;
        if (!this.isWalkable(neighbor)) continue;

        const g = current.g + 1;
        const h = this.manhattanDistance(neighbor, target);
        const f = g + h;

        const existing = openList.find(
          (n) => n.coord.x === neighbor.x && n.coord.y === neighbor.y
        );
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = f;
            existing.parent = current;
          }
        } else {
          openList.push({
            coord: neighbor,
            g,
            h,
            f,
            parent: current,
          });
        }
      }
    }

    return null; // No path found
  }

  public getReachableTiles(start: GridCoord, maxRange: number): GridCoord[] {
    const reachable: GridCoord[] = [];
    const visited = new Set<string>();
    const queue: { coord: GridCoord; dist: number }[] = [{ coord: start, dist: 0 }];
    visited.add(`${start.x},${start.y}`);

    while (queue.length > 0) {
      const { coord, dist } = queue.shift()!;
      if (dist > 0) {
        reachable.push(coord);
      }

      if (dist < maxRange) {
        for (const neighbor of this.getNeighbors(coord)) {
          const key = `${neighbor.x},${neighbor.y}`;
          if (!visited.has(key) && this.isWalkable(neighbor)) {
            visited.add(key);
            queue.push({ coord: neighbor, dist: dist + 1 });
          }
        }
      }
    }

    return reachable;
  }

  public hasLineOfSight(start: GridCoord, target: GridCoord): boolean {
    if (start.x === target.x && start.y === target.y) return true;

    // Bresenham's Line Algorithm
    let x0 = start.x;
    let y0 = start.y;
    const x1 = target.x;
    const y1 = target.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }

      // If reaching target, LoS is clear
      if (x0 === x1 && y0 === y1) break;

      // Check if intermediate tile is an obstacle
      const tile = this.getTile({ x: x0, y: y0 });
      if (tile?.isObstacle) {
        return false;
      }
    }

    return true;
  }

  public getAllTiles(): TileState[][] {
    return this.tiles;
  }
}
