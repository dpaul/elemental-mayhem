// Elemental Mayhem - Enemy AI Decision Tree & Step Planning
import { CombatEngine } from './CombatEngine';
import { Unit, Ability, GridCoord } from '../types';

export type AIStep =
  | { type: 'move'; unit: Unit; path: GridCoord[]; destination: GridCoord }
  | { type: 'cast'; unit: Unit; ability: Ability; targetCoord: GridCoord };

export class EnemyAI {
  private combatEngine: CombatEngine;

  constructor(combatEngine: CombatEngine) {
    this.combatEngine = combatEngine;
  }

  public planTurnSteps(enemy: Unit, target: Unit): AIStep[] {
    const steps: AIStep[] = [];
    if (enemy.isDead || target.isDead) return steps;

    let simulatedAp = enemy.stats.currentAp;
    let simulatedCoord = { ...enemy.coord };

    let attempts = 0;
    while (simulatedAp > 0 && attempts < 5) {
      attempts++;
      const dist = this.combatEngine.grid.manhattanDistance(simulatedCoord, target.coord);

      // Check if any ability can hit target right now
      const usableAbility = enemy.abilities.find(
        (a) => a.apCost <= simulatedAp && a.currentCooldown === 0 && dist <= a.range
      );

      if (usableAbility && this.combatEngine.grid.hasLineOfSight(simulatedCoord, target.coord)) {
        steps.push({
          type: 'cast',
          unit: enemy,
          ability: usableAbility,
          targetCoord: { ...target.coord },
        });
        simulatedAp -= usableAbility.apCost;
      } else {
        // Find best ability we want to cast
        const targetAbility = enemy.abilities.find(
          (a) => a.currentCooldown === 0 && a.apCost <= simulatedAp
        );

        const fullPath = this.combatEngine.grid.findPath(simulatedCoord, target.coord);
        if (fullPath && fullPath.length > 1) {
          let desiredWalkDistance = fullPath.length - 1;

          if (targetAbility) {
            // Calculate how many tiles we need to step closer to enter ability range
            const tilesNeeded = Math.max(1, dist - targetAbility.range);
            const maxAffordableWalk = Math.max(0, simulatedAp - targetAbility.apCost);
            desiredWalkDistance = Math.min(tilesNeeded, maxAffordableWalk);
            if (desiredWalkDistance === 0) {
              desiredWalkDistance = Math.min(simulatedAp, fullPath.length - 1);
            }
          } else {
            desiredWalkDistance = Math.min(simulatedAp, fullPath.length - 1);
          }

          if (desiredWalkDistance > 0) {
            const walkPath = [simulatedCoord, ...fullPath.slice(0, desiredWalkDistance)];
            const destination = walkPath[walkPath.length - 1];

            steps.push({
              type: 'move',
              unit: enemy,
              path: walkPath,
              destination,
            });

            simulatedAp -= desiredWalkDistance * enemy.stats.moveCostPerTile;
            simulatedCoord = { ...destination };
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    return steps;
  }

  public takeTurn(enemy: Unit, target: Unit): string[] {
    const actionsTaken: string[] = [];
    const steps = this.planTurnSteps(enemy, target);

    for (const step of steps) {
      if (step.type === 'move') {
        if (this.combatEngine.moveUnit(enemy, step.destination)) {
          actionsTaken.push(`${enemy.name} moved towards (${step.destination.x}, ${step.destination.y})`);
        }
      } else if (step.type === 'cast') {
        const result = this.combatEngine.executeAbility(enemy, step.ability, step.targetCoord);
        if (result.success) {
          actionsTaken.push(`${enemy.name} used ${step.ability.name}`);
        }
      }
    }

    return actionsTaken;
  }
}
