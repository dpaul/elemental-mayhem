// Elemental Mayhem - Combat Performance Scorer & Essence Calculator
import { PerformanceStats } from '../types';

export interface RoundReward {
  essence: number;
  xp: number;
  breakdown: string[];
}

export class PerformanceScorer {
  public calculateRoundRewards(stats: PerformanceStats, heroLevel: number = 0): RoundReward {
    let essence = 50; // Base completion essence
    let xp = 100;     // Base completion XP
    const breakdown: string[] = ['Base Victory: +50 Essence, +100 XP'];

    // Bonus for reaction combos
    if (stats.reactionsTriggered > 0) {
      const reactionBonus = stats.reactionsTriggered * 15;
      essence += reactionBonus;
      xp += reactionBonus;
      breakdown.push(`Reactions Triggered (${stats.reactionsTriggered}): +${reactionBonus} Essence & XP`);
    }

    // Turn efficiency bonus (under 5 turns)
    if (stats.turnsUsed <= 5) {
      const speedBonus = 25;
      essence += speedBonus;
      xp += speedBonus;
      breakdown.push(`Tactical Speed Bonus: +${speedBonus} Essence & XP`);
    }

    // Flawless bonus (no damage taken)
    if (stats.flawlessBonus) {
      const flawlessBonus = 35;
      essence += flawlessBonus;
      xp += flawlessBonus;
      breakdown.push(`Flawless Defense: +${flawlessBonus} Essence & XP`);
    }

    // Level-based essence amplification (+10% per level above 0)
    if (heroLevel > 0) {
      const levelMultiplier = 1 + heroLevel * 0.1;
      const bonusPct = Math.round(heroLevel * 10);
      essence = Math.round(essence * levelMultiplier);
      xp = Math.round(xp * levelMultiplier);
      breakdown.push(`Level ${heroLevel} Essence Amplification: +${bonusPct}% Bonus`);
    }

    return {
      essence,
      xp,
      breakdown,
    };
  }
}
