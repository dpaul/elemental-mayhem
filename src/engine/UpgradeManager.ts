import { Unit, Ability, PassiveRelic } from '../types';
import { HERO_CLASSES } from '../constants/classes';
import { getOrderedWeakestAbilities } from './CrystalManager';

export interface LevelUpResult {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  hpGain: number;
  apGain: number;
  title: string;
}

export interface EssenceProgress {
  currentLevel: number;
  nextLevel: number;
  title: string;
  currentLevelThreshold: number;
  nextLevelThreshold: number;
  essenceIntoLevel: number;
  essenceNeededForNext: number;
  percentage: number;
}

export class UpgradeManager {
  /**
   * Cumulative essence required to reach a specific level.
   * Level 0 starts at 0 essence.
   * Level 1: 50, Level 2: 120, Level 3: 210, Level 4: 320, Level 5: 450...
   */
  public getEssenceRequiredForLevel(targetLevel: number): number {
    if (targetLevel <= 0) return 0;
    return 10 * targetLevel * targetLevel + 40 * targetLevel;
  }

  /**
   * Calculates current level from total accumulated essence.
   */
  public getLevelFromEssence(totalEssence: number): number {
    if (totalEssence < 50) return 0;
    let level = 0;
    while (this.getEssenceRequiredForLevel(level + 1) <= totalEssence) {
      level++;
    }
    return level;
  }

  /**
   * Returns complete progress details towards next level for UI meters and badges.
   */
  public getEssenceProgress(totalEssence: number): EssenceProgress {
    const currentLevel = this.getLevelFromEssence(totalEssence);
    const nextLevel = currentLevel + 1;
    const title = this.getLevelTitle(currentLevel);
    const currentThreshold = this.getEssenceRequiredForLevel(currentLevel);
    const nextThreshold = this.getEssenceRequiredForLevel(nextLevel);
    const range = Math.max(1, nextThreshold - currentThreshold);
    const currentInto = Math.max(0, totalEssence - currentThreshold);
    const needed = Math.max(0, nextThreshold - totalEssence);
    const percentage = Math.min(100, Math.round((currentInto / range) * 100));

    return {
      currentLevel,
      nextLevel,
      title,
      currentLevelThreshold: currentThreshold,
      nextLevelThreshold: nextThreshold,
      essenceIntoLevel: currentInto,
      essenceNeededForNext: needed,
      percentage,
    };
  }

  /**
   * Returns a flavorful title based on character level.
   */
  public getLevelTitle(level: number): string {
    if (level <= 0) return 'Initiate';
    if (level === 1) return 'Apprentice';
    if (level === 2) return 'Adept';
    if (level === 3) return 'Mage';
    if (level === 4) return 'Archmage';
    if (level === 5) return 'Grand Magus';
    if (level === 6) return 'Master Arcanist';
    if (level === 7) return 'High Sage';
    if (level === 8) return 'Prismatic Lord';
    if (level === 9) return 'Elemental Sovereign';
    return 'Cosmic Ascendant';
  }

  /**
   * Essence Resonance Multiplier:
   * Levels grant +15% spell damage per level.
   * Current essence grants +5% bonus damage per 100 essence (capped at +50%).
   */
  public calculateEssenceResonanceMultiplier(level: number, currentEssence: number = 0): number {
    const safeLevel = Math.max(0, level);
    const levelBonus = safeLevel * 0.15;
    const essenceAttunement = Math.min(0.5, Math.floor(Math.max(0, currentEssence) / 100) * 0.05);
    return Math.round((1 + levelBonus + essenceAttunement) * 100) / 100;
  }

  /**
   * Evaluates hero level vs total essence, applying stat upgrades upon ascending.
   */
  public checkAndApplyLevelUp(hero: Unit, totalEssence: number): LevelUpResult {
    const oldLevel = hero.level ?? 0;
    const targetLevel = this.getLevelFromEssence(totalEssence);

    if (targetLevel <= oldLevel) {
      return {
        leveledUp: false,
        oldLevel,
        newLevel: oldLevel,
        hpGain: 0,
        apGain: 0,
        title: this.getLevelTitle(oldLevel),
      };
    }

    const levelDiff = targetLevel - oldLevel;
    const hpGain = levelDiff * 25;
    hero.stats.maxHp += hpGain;
    hero.stats.currentHp = Math.min(hero.stats.maxHp, hero.stats.currentHp + hpGain);

    let apGain = 0;
    for (let l = oldLevel + 1; l <= targetLevel; l++) {
      if (l % 2 === 0) {
        apGain += 1;
      }
    }
    hero.stats.maxAp += apGain;
    hero.stats.currentAp += apGain;
    hero.level = targetLevel;

    return {
      leveledUp: true,
      oldLevel,
      newLevel: targetLevel,
      hpGain,
      apGain,
      title: this.getLevelTitle(targetLevel),
    };
  }

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

  public unlockNextElementalPower(hero: Unit): Ability | null {
    if (!hero || !hero.abilities) return null;
    if (hero.stats.elementalAffinity === 'Admin') return null;
    if (hero.abilities.length >= 10) return null;

    const config = HERO_CLASSES[hero.stats.elementalAffinity] || HERO_CLASSES.Fire;
    const fullAbilities = config.abilities.slice(0, 10);
    const ordered = getOrderedWeakestAbilities(fullAbilities);

    const nextAbility = ordered.find((candidate) => !hero.abilities.some((a) => a.id === candidate.id));
    if (!nextAbility) return null;

    const unlocked: Ability = {
      ...nextAbility,
      currentCooldown: 0,
    };
    hero.abilities.push(unlocked);

    // Enforce strict 10 powers maximum cap
    if (hero.abilities.length > 10) {
      hero.abilities = hero.abilities.slice(0, 10);
    }

    return unlocked;
  }

  public applyRelic(hero: Unit, relic: PassiveRelic): Ability | null {
    relic.applied = true;
    relic.effect(hero);
    return this.unlockNextElementalPower(hero);
  }
}
