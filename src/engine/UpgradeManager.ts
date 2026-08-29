// Elemental Mayhem - Upgrade & Armory Progression Manager
import { Unit, Ability, PassiveRelic } from '../types';

export class UpgradeManager {
  public upgradeAbility(hero: Unit, abilityId: string): boolean {
    const ability = hero.abilities.find((a) => a.id === abilityId);
    if (!ability) return false;

    ability.level += 1;
    ability.baseDamage = Math.round(ability.baseDamage * 1.3);
    if (ability.level % 2 === 0 && ability.range < 6) {
      ability.range += 1;
    }
    return true;
  }

  public unlockAbility(hero: Unit, newAbility: Ability): boolean {
    if (hero.abilities.some((a) => a.id === newAbility.id)) return false;
    hero.abilities.push({ ...newAbility });
    return true;
  }

  public applyRelic(hero: Unit, relic: PassiveRelic): void {
    relic.applied = true;
    relic.effect(hero);
  }
}
