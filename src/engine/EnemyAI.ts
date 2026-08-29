// Elemental Mayhem - Enemy AI Decision Tree & Tactical Behavior
import { CombatEngine } from './CombatEngine';
import { Unit, GridCoord, Ability } from '../types';

export class EnemyAI {
  private combatEngine: CombatEngine;

  constructor(combatEngine: CombatEngine) {
    this.combatEngine = combatEngine;
  }

  public takeTurn(enemy: Unit, target: Unit): string[] {
    const actionsTaken: string[] = [];
    if (enemy.isDead || target.isDead) return actionsTaken;

    let attempts = 0;
    while (enemy.stats.currentAp > 0 && attempts < 5) {
      attempts++;
      const dist = this.combatEngine.grid.manhattanDistance(enemy.coord, target.coord);

      // Check if any ability can hit the target right now
      const usableAbility = enemy.abilities.find(
        (a) => a.apCost <= enemy.stats.currentAp && a.currentCooldown === 0 && dist <= a.range
      );

      if (usableAbility && this.combatEngine.grid.hasLineOfSight(enemy.coord, target.coord)) {
        // Cast ability
        const result = this.combatEngine.executeAbility(enemy, usableAbility, target.coord);
        if (result.success) {
          actionsTaken.push(`${enemy.name} used ${usableAbility.name}`);
        } else {
          break;
        }
      } else {
        // Find path to move closer to target
        const path = this.combatEngine.grid.findPath(enemy.coord, target.coord);
        if (path && path.length > 1) {
          // Next step along path
          const nextStep = path[0];
          if (this.combatEngine.moveUnit(enemy, nextStep)) {
            actionsTaken.push(`${enemy.name} moved towards (${nextStep.x}, ${nextStep.y})`);
          } else {
            // Cannot move further
            break;
          }
        } else {
          // Already adjacent or no path
          break;
        }
      }
    }

    return actionsTaken;
  }
}
