// Elemental Mayhem - Combat Performance Scorer & Essence Calculator
import { PerformanceStats } from '../types';

export interface RoundReward {
  essence: number;
  xp: number;
  breakdown: string[];
}

export class PerformanceScorer {
  public calculateRoundRewards(stats: PerformanceStats): RoundReward {
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

    return {
      essence,
      xp,
      breakdown,
    };
  }
}
