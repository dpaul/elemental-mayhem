// Elemental Mayhem - Emergent Elemental Reaction Engine
import { ElementType, StatusEffectType, ReactionResult } from '../types';

export class ReactionEngine {
  public evaluateUnitReaction(
    incomingElement: ElementType,
    currentStatus: StatusEffectType | null
  ): ReactionResult | null {
    if (!currentStatus || incomingElement === 'Neutral') return null;

    // 1. Vaporize: Fire on Wet
    if (incomingElement === 'Fire' && currentStatus === 'Wet') {
      return {
        reactionName: 'Vaporize',
        elementA: 'Water',
        elementB: 'Fire',
        bonusDamage: 25,
        description: 'Vaporize! High-pressure steam deals 25 bonus damage and cleanses wet.',
      };
    }

    // 2. Superconduct: Lightning on Wet
    if (incomingElement === 'Lightning' && currentStatus === 'Wet') {
      return {
        reactionName: 'Superconduct',
        elementA: 'Water',
        elementB: 'Lightning',
        bonusDamage: 15,
        statusApplied: 'Shocked',
        description: 'Superconduct! Electrified charge shocks the target, lowering AP next turn.',
      };
    }

    // 3. Toxic Explosion: Fire on Poisoned
    if (incomingElement === 'Fire' && currentStatus === 'Poisoned') {
      return {
        reactionName: 'Toxic Explosion',
        elementA: 'Poison',
        elementB: 'Fire',
        bonusDamage: 30,
        aoeRadius: 1,
        hazardCreated: 'Burning',
        description: 'Toxic Explosion! Venom ignites into a violent explosion affecting adjacent tiles.',
      };
    }

    // 4. Petrify: Earth on Wet or Poisoned
    if (incomingElement === 'Earth' && (currentStatus === 'Wet' || currentStatus === 'Poisoned')) {
      return {
        reactionName: 'Petrify',
        elementA: currentStatus === 'Wet' ? 'Water' : 'Poison',
        elementB: 'Earth',
        bonusDamage: 10,
        statusApplied: 'Rooted',
        description: 'Petrify! Solidifying minerals encase target in stone, rooting them in place.',
      };
    }

    // 5. Void Collapse: Void on any elemental status
    if (incomingElement === 'Void' && currentStatus) {
      return {
        reactionName: 'Void Collapse',
        elementA: 'Void',
        elementB: 'Void',
        bonusDamage: 20,
        statusApplied: 'VoidMarked',
        description: 'Void Collapse! Cosmic entropy pulls energy from active debuffs for bonus rupture damage.',
      };
    }

    return null;
  }
}
