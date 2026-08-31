// Elemental Mayhem - Tactical Enemy AI Decision Tree & Step Planning
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

  /**
   * Evaluates the tactical priority of an ability against a target.
   * Higher score = higher priority to cast.
   */
  private scoreAbility(ability: Ability, target: Unit): number {
    let score = ability.baseDamage;

    // 1. Check if this ability triggers an elemental reaction with player's active status
    const targetStatus = target.statusEffects.length > 0 ? target.statusEffects[0].type : null;
    if (targetStatus) {
      const reaction = this.combatEngine.reactionEngine.evaluateUnitReaction(ability.element, targetStatus);
      if (reaction) {
        score += reaction.bonusDamage * 1.5; // Highly prioritize reaction triggers
      }
    }

    // 2. Bonus for applying debilitating status effects if target has no active status
    if (ability.appliesStatus && target.statusEffects.length === 0) {
      score += 15;
    }

    // 3. Bonus for AoE spells
    if (ability.aoeRadius > 0) {
      score += 10;
    }

    // 4. Multiplier if enemy has elemental affinity advantage
    const multiplier = this.combatEngine.matrix.getAffinityMultiplier(
      ability.element,
      target.stats.elementalAffinity
    );
    score *= multiplier;

    return score;
  }

  public planTurnSteps(enemy: Unit, target: Unit): AIStep[] {
    const steps: AIStep[] = [];
    if (enemy.isDead || target.isDead) return steps;

    let simulatedAp = enemy.stats.currentAp;
    let simulatedCoord = { ...enemy.coord };

    let attempts = 0;
    while (simulatedAp > 0 && attempts < 6) {
      attempts++;
      const dist = this.combatEngine.grid.manhattanDistance(simulatedCoord, target.coord);

      // Find all usable abilities right now
      const usableAbilities = enemy.abilities.filter(
        (a) => a.apCost <= simulatedAp && a.currentCooldown === 0 && dist <= a.range
      );

      if (usableAbilities.length > 0 && this.combatEngine.grid.hasLineOfSight(simulatedCoord, target.coord)) {
        // Pick best ability based on tactical score
        usableAbilities.sort((a, b) => {
          return this.scoreAbility(b, target) - this.scoreAbility(a, target);
        });

        const chosenAbility = usableAbilities[0];
        steps.push({
          type: 'cast',
          unit: enemy,
          ability: chosenAbility,
          targetCoord: { ...target.coord },
        });
        simulatedAp -= chosenAbility.apCost;
      } else {
        // Find best ability we would LIKE to cast if we get in range
        const potentialAbilities = enemy.abilities
          .filter((a) => a.currentCooldown === 0 && a.apCost <= simulatedAp)
          .sort((a, b) => this.scoreAbility(b, target) - this.scoreAbility(a, target));

        const targetAbility = potentialAbilities[0];

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
