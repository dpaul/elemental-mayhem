// Elemental Mayhem - Elemental Matrix & Affinity Calculator
import { ElementType } from '../types';
import { CORE_ELEMENTS } from '../constants/elements';

export const STARTER_ELEMENTS: ElementType[] = ['Earth', 'Fire', 'Water'];

export function isStarterElement(element: ElementType): boolean {
  return element === 'Earth' || element === 'Fire' || element === 'Water';
}

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
    let multiplier = this.getAffinityMultiplier(attacker, defender);

    // Starter elements (Earth, Fire, Water) are the weakest foundational elements:
    // - Starters deal 0.85x damage against advanced unlockable elements
    // - Advanced unlockable elements deal 1.25x damage against starter elements
    // - Neutral is unaligned / non-elemental and is unaffected
    if (attacker !== 'Neutral' && defender !== 'Neutral') {
      if (isStarterElement(attacker) && !isStarterElement(defender)) {
        multiplier *= 0.85;
      } else if (!isStarterElement(attacker) && isStarterElement(defender)) {
        multiplier *= 1.25;
      }
    }

    return Math.round(baseDamage * multiplier);
  }
}
