// Elemental Mayhem - Elemental Matrix & Affinity Calculator
import { ElementType } from '../types';
import { CORE_ELEMENTS } from '../constants/elements';

export class ElementalMatrix {
  public getAffinityMultiplier(attacker: ElementType, defender: ElementType): number {
    if (attacker === 'Neutral' || defender === 'Neutral') {
      return 1.0;
    }

    if (attacker === 'Admin' && defender === 'Admin') {
      return 1.0;
    }
    if (attacker === 'Admin') {
      return 1.5; // Admin deals 1.5x damage against all affinities
    }
    if (defender === 'Admin') {
      return 0.75; // Admin resists all incoming elements
    }

    const attackerData = CORE_ELEMENTS[attacker];
    if (!attackerData) return 1.0;

    if (attackerData.strongAgainst.includes(defender)) {
      return 1.5; // 50% bonus damage
    }

    if (attackerData.weakAgainst.includes(defender)) {
      return 0.75; // 25% damage reduction
    }

    return 1.0;
  }

  public calculateDamage(baseDamage: number, attacker: ElementType, defender: ElementType): number {
    const multiplier = this.getAffinityMultiplier(attacker, defender);
    return Math.round(baseDamage * multiplier);
  }
}
