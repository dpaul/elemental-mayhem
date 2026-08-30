// Elemental Mayhem - Tile Hazard & Ground Surface Engine
import { GridCoord, TileHazardType, ElementType } from '../types';
import { Grid } from './Grid';

export class TileHazardManager {
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  public applyHazard(
    coord: GridCoord,
    hazardType: TileHazardType,
    duration: number,
    damagePerTurn: number,
    element: ElementType
  ): string | null {
    const tile = this.grid.getTile(coord);
    if (!tile || tile.isObstacle) return null;

    const currentHazard = tile.hazard.type;

    // Check for ground hazard reactions
    // 1. Water Puddle + Fire -> Vaporized (clears puddle)
    if (currentHazard === 'Puddle' && hazardType === 'Burning') {
      tile.hazard = {
        type: 'None',
        duration: 0,
        damagePerTurn: 0,
        element: 'Neutral',
      };
      return 'Vaporized';
    }

    // 2. Burning + Water -> Vaporized
    if (currentHazard === 'Burning' && hazardType === 'Puddle') {
      tile.hazard = {
        type: 'None',
        duration: 0,
        damagePerTurn: 0,
        element: 'Neutral',
      };
      return 'Vaporized';
    }

    // 3. Water Puddle + Lightning -> Electrified Puddle
    if (currentHazard === 'Puddle' && (hazardType === 'ElectrifiedPuddle' || element === 'Lightning')) {
      tile.hazard = {
        type: 'ElectrifiedPuddle',
        duration: Math.max(duration, 2),
        damagePerTurn: Math.max(damagePerTurn, 15),
        element: 'Lightning',
      };
      return 'Electrified';
    }

    // 4. Toxic Mire + Fire -> Detonation (clears mire)
    if (currentHazard === 'ToxicMire' && hazardType === 'Burning') {
      tile.hazard = {
        type: 'Burning',
        duration: 2,
        damagePerTurn: 20,
        element: 'Fire',
      };
      return 'ToxicDetonation';
    }

    // Default overwrite / apply
    tile.hazard = {
      type: hazardType,
      duration,
      damagePerTurn,
      element,
    };

    return null;
  }

  public tickHazards(): { coord: GridCoord; hazard: TileHazardType; damage: number }[] {
    const activeDamagingHazards: { coord: GridCoord; hazard: TileHazardType; damage: number }[] = [];

    for (let x = 0; x < this.grid.size; x++) {
      for (let y = 0; y < this.grid.size; y++) {
        const tile = this.grid.getTile({ x, y });
        if (!tile || tile.hazard.type === 'None') continue;

        if (tile.hazard.damagePerTurn > 0) {
          activeDamagingHazards.push({
            coord: { x, y },
            hazard: tile.hazard.type,
            damage: tile.hazard.damagePerTurn,
          });
        }

        tile.hazard.duration -= 1;
        if (tile.hazard.duration <= 0) {
          tile.hazard = {
            type: 'None',
            duration: 0,
            damagePerTurn: 0,
            element: 'Neutral',
          };
        }
      }
    }

    return activeDamagingHazards;
  }

  public clearAllHazards(): void {
    for (let x = 0; x < this.grid.size; x++) {
      for (let y = 0; y < this.grid.size; y++) {
        const tile = this.grid.getTile({ x, y });
        if (tile) {
          tile.hazard = {
            type: 'None',
            duration: 0,
            damagePerTurn: 0,
            element: 'Neutral',
          };
        }
      }
    }
  }
}
