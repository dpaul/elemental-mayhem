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
  private scoreAbility(
    ability: Ability,
    target: Unit,
    caster?: Unit,
    simulatedShielded: boolean = false
  ): number {
    // 1. Self-targeted abilities (e.g. Shields & Defensive Wards)
    if (ability.targeting === 'Self') {
      if (ability.appliesStatus === 'Shielded') {
        if (simulatedShielded || (caster && caster.statusEffects.some((s) => s.type === 'Shielded'))) {
          return 0; // Already shielded, avoid wasteful recast
        }
        const hpMissing = caster ? caster.stats.maxHp - caster.stats.currentHp : 0;
        const maxHp = caster ? caster.stats.maxHp : 100;
        // Prioritize shields when damaged or to absorb incoming player punishment
        return 35 + (hpMissing / maxHp) * 45;
      }
      return 25;
    }

    let score = ability.baseDamage;

    // 2. Check if this ability triggers an elemental reaction with player's active status
    const targetStatus = target.statusEffects.length > 0 ? target.statusEffects[0].type : null;
    if (targetStatus) {
      const reaction = this.combatEngine.reactionEngine.evaluateUnitReaction(ability.element, targetStatus);
      if (reaction) {
        score += reaction.bonusDamage * 1.5; // Highly prioritize reaction triggers
      }
    }

    // 3. Bonus for applying debilitating status effects if target has no active status
    if (ability.appliesStatus && target.statusEffects.length === 0) {
      score += 15;
    }

    // 4. Bonus for AoE spells
    if (ability.aoeRadius > 0) {
      score += 10;
    }

    // 5. Multiplier if enemy has elemental affinity advantage
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

    // Confusion mechanic: high chance to target allied CPUs, or stumble/target self!
    let effectiveTarget = target;
    const isConfused = enemy.statusEffects.some((s) => s.type === 'Confused');
    if (isConfused) {
      const allies = this.combatEngine.enemies.filter(
        (u) => !u.isDead && u.id !== enemy.id
      );
      if (allies.length > 0 && Math.random() < 0.65) {
        effectiveTarget = allies[Math.floor(Math.random() * allies.length)];
      } else if (Math.random() < 0.5) {
        effectiveTarget = enemy; // Target self!
      }
    }

    let simulatedAp = enemy.stats.currentAp;
    let simulatedCoord = { ...enemy.coord };
    const usedAbilitiesInTurn = new Set<string>();
    let simulatedShielded = enemy.statusEffects.some((s) => s.type === 'Shielded');

    let attempts = 0;
    while (simulatedAp > 0 && attempts < 12) {
      attempts++;
      const dist = this.combatEngine.grid.manhattanDistance(simulatedCoord, effectiveTarget.coord);

      // Find all usable abilities right now
      const usableAbilities = enemy.abilities.filter((a) => {
        if (a.apCost > simulatedAp) return false;
        if (a.currentCooldown > 0) return false;
        if (a.cooldown > 0 && usedAbilitiesInTurn.has(a.id)) return false;

        if (a.targeting === 'Self') {
          if (a.appliesStatus === 'Shielded' && simulatedShielded) return false;
          return true;
        }

        return dist <= a.range && this.combatEngine.grid.hasLineOfSight(simulatedCoord, effectiveTarget.coord);
      });

      if (usableAbilities.length > 0) {
        // Pick best ability based on tactical score
        usableAbilities.sort((a, b) => {
          return (
            this.scoreAbility(b, effectiveTarget, enemy, simulatedShielded) -
            this.scoreAbility(a, effectiveTarget, enemy, simulatedShielded)
          );
        });

        const chosenAbility = usableAbilities[0];
        const isSelf = chosenAbility.targeting === 'Self';
        const targetCoord = isSelf ? { ...simulatedCoord } : { ...effectiveTarget.coord };

        if (isSelf && chosenAbility.appliesStatus === 'Shielded') {
          simulatedShielded = true;
        }

        if (chosenAbility.cooldown > 0) {
          usedAbilitiesInTurn.add(chosenAbility.id);
        }

        steps.push({
          type: 'cast',
          unit: enemy,
          ability: chosenAbility,
          targetCoord,
        });
        simulatedAp -= chosenAbility.apCost;
      } else {
        // If Rooted, unit is bound to the spot and cannot move!
        if (this.combatEngine.statusManager.hasStatus(enemy, 'Rooted')) {
          break;
        }

        // Find best ability we would LIKE to cast if we get in range
        const potentialAbilities = enemy.abilities
          .filter(
            (a) =>
              a.currentCooldown === 0 &&
              !usedAbilitiesInTurn.has(a.id) &&
              a.apCost <= simulatedAp &&
              a.targeting !== 'Self'
          )
          .sort(
            (a, b) =>
              this.scoreAbility(b, effectiveTarget, enemy, simulatedShielded) -
              this.scoreAbility(a, effectiveTarget, enemy, simulatedShielded)
          );

        const targetAbility = potentialAbilities[0];

        const fullPath = this.combatEngine.grid.findPath(simulatedCoord, effectiveTarget.coord);
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
    const isConfused = enemy.statusEffects.some((s) => s.type === 'Confused');
    if (isConfused) {
      actionsTaken.push(`🌀 ${enemy.name} is disoriented by Confusion!`);
    }

    const steps = this.planTurnSteps(enemy, target);

    for (const step of steps) {
      if (step.type === 'move') {
        if (this.combatEngine.moveUnit(enemy, step.destination)) {
          actionsTaken.push(`${enemy.name} moved towards (${step.destination.x}, ${step.destination.y})`);
        }
      } else if (step.type === 'cast') {
        const targetUnit = this.combatEngine.getUnitAt(step.targetCoord);
        const result = this.combatEngine.executeAbility(enemy, step.ability, step.targetCoord);
        if (result.success) {
          if (isConfused && targetUnit && targetUnit.faction === enemy.faction && targetUnit.id !== enemy.id) {
            actionsTaken.push(`🌀 ${enemy.name} attacked fellow CPU ${targetUnit.name} in Confusion!`);
          } else if (isConfused && targetUnit && targetUnit.id === enemy.id) {
            actionsTaken.push(`🌀 ${enemy.name} attacked itself in Confusion!`);
          } else {
            actionsTaken.push(`${enemy.name} used ${step.ability.name}`);
          }
        }
      }
    }

    return actionsTaken;
  }
}
