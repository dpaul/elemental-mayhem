// Elemental Mayhem - Unit Status Effect Manager
import { Unit, StatusEffect } from '../types';

export class StatusEffectManager {
  public applyStatus(unit: Unit, status: StatusEffect): void {
    const existing = unit.statusEffects.find((s) => s.type === status.type);
    if (existing) {
      existing.stacks += status.stacks;
      existing.duration = Math.max(existing.duration, status.duration);
      if (status.tickDamage) {
        existing.tickDamage = Math.max(existing.tickDamage || 0, status.tickDamage);
      }
    } else {
      unit.statusEffects.push({ ...status });
    }
  }

  public removeStatus(unit: Unit, type: string): void {
    unit.statusEffects = unit.statusEffects.filter((s) => s.type !== type);
  }

  public hasStatus(unit: Unit, type: string): boolean {
    return unit.statusEffects.some((s) => s.type === type);
  }

  public tickStatusEffects(unit: Unit): string[] {
    const logs: string[] = [];
    if (unit.isDead) return logs;

    const remaining: StatusEffect[] = [];

    for (const status of unit.statusEffects) {
      if (status.tickDamage && status.tickDamage > 0) {
        const totalTick = status.tickDamage * status.stacks;
        unit.stats.currentHp = Math.max(0, unit.stats.currentHp - totalTick);
        logs.push(`${unit.name} suffers ${totalTick} damage from ${status.type} (${status.stacks} stacks).`);

        if (unit.stats.currentHp === 0) {
          unit.isDead = true;
          logs.push(`${unit.name} was slain by ${status.type}!`);
        }
      }

      status.duration -= 1;
      if (status.duration > 0 && !unit.isDead) {
        remaining.push(status);
      }
    }

    unit.statusEffects = remaining;
    return logs;
  }
}
