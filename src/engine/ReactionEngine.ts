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

    // 2. Superconduct: Lightning / Electricity on Wet
    if ((incomingElement === 'Lightning' || incomingElement === 'Electricity') && currentStatus === 'Wet') {
      return {
        reactionName: 'Superconduct',
        elementA: 'Water',
        elementB: 'Lightning',
        bonusDamage: 18,
        statusApplied: 'Shocked',
        description: 'Superconduct! Electrified charge shocks the target, lowering AP next turn.',
      };
    }

    // 3. Toxic Explosion: Fire / Magma on Poisoned or Corroded
    if ((incomingElement === 'Fire' || incomingElement === 'Magma') && (currentStatus === 'Poisoned' || currentStatus === 'Corroded')) {
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

    // 4. Petrify: Earth / Crystal on Wet or Poisoned
    if ((incomingElement === 'Earth' || incomingElement === 'Crystal') && (currentStatus === 'Wet' || currentStatus === 'Poisoned')) {
      return {
        reactionName: 'Petrify',
        elementA: currentStatus === 'Wet' ? 'Water' : 'Poison',
        elementB: 'Earth',
        bonusDamage: 12,
        statusApplied: 'Rooted',
        description: 'Petrify! Solidifying minerals encase target in stone, rooting them in place.',
      };
    }

    // 5. Melt: Fire / Magma / Heat on Frozen
    if ((incomingElement === 'Fire' || incomingElement === 'Magma' || incomingElement === 'Heat') && currentStatus === 'Frozen') {
      return {
        reactionName: 'Melt',
        elementA: 'Ice',
        elementB: 'Fire',
        bonusDamage: 32,
        description: 'Melt! Intense thermal shock liquefies ice, dealing massive melt damage.',
      };
    }

    // 6. Shatter: Metal / Force / Sound / Thunder on Frozen or Rooted
    if (
      (incomingElement === 'Metal' || incomingElement === 'Force' || incomingElement === 'Sound' || incomingElement === 'Thunder') &&
      (currentStatus === 'Frozen' || currentStatus === 'Rooted')
    ) {
      return {
        reactionName: 'Shatter',
        elementA: 'Ice',
        elementB: incomingElement,
        bonusDamage: 28,
        description: 'Shatter! Heavy kinetic bludgeon shatters brittle crystalline defenses.',
      };
    }

    // 7. Firestorm: Wind / Storm on Burning
    if ((incomingElement === 'Wind' || incomingElement === 'Storm' || incomingElement === 'Sky') && currentStatus === 'Burning') {
      return {
        reactionName: 'Firestorm',
        elementA: 'Fire',
        elementB: 'Wind',
        bonusDamage: 22,
        aoeRadius: 1,
        hazardCreated: 'Burning',
        description: 'Firestorm! Roaring gusts fan flames into an uncontrollable inferno.',
      };
    }

    // 8. Annihilation: Light on Darkness or Darkness on Blinded
    if ((incomingElement === 'Light' || incomingElement === 'Darkness') && (currentStatus === 'VoidMarked' || currentStatus === 'Blinded')) {
      return {
        reactionName: 'Annihilation',
        elementA: 'Light',
        elementB: 'Darkness',
        bonusDamage: 35,
        description: 'Annihilation! Absolute contrast collision unleashes antimatter destruction.',
      };
    }

    // 9. Void Collapse: Void / Chaos on any elemental status
    if ((incomingElement === 'Void' || incomingElement === 'Chaos') && currentStatus) {
      return {
        reactionName: 'Void Collapse',
        elementA: 'Void',
        elementB: incomingElement,
        bonusDamage: 20,
        statusApplied: 'VoidMarked',
        description: 'Void Collapse! Cosmic entropy pulls energy from active debuffs for bonus rupture damage.',
      };
    }

    return null;
  }
}
