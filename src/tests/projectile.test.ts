import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectileManager } from '../renderer/ProjectileManager';

describe('ProjectileManager (TDD Red -> Green)', () => {
  let projManager: ProjectileManager;

  beforeEach(() => {
    projManager = new ProjectileManager();
  });

  it('should spawn, fly, and trigger onArrival callback upon reaching target', () => {
    let arrived = false;

    projManager.spawnProjectile(
      { x: 100, y: 100 },
      { x: 300, y: 300 },
      'Fire',
      '#ff6b35',
      200, // 200ms duration
      () => {
        arrived = true;
      }
    );

    expect(projManager.hasActiveProjectiles()).toBe(true);

    // Initial state
    const projs1 = projManager.getActiveProjectiles();
    expect(projs1.length).toBe(1);
    expect(projs1[0].currentX).toBe(100);
    expect(projs1[0].currentY).toBe(100);

    // Advance 100ms (halfway)
    projManager.update(100);
    expect(projs1[0].currentX).toBeCloseTo(200, 1);
    expect(projs1[0].currentY).toBeCloseTo(200, 1);
    expect(arrived).toBe(false);

    // Advance 100ms more (reaches destination)
    projManager.update(100);
    expect(arrived).toBe(true);
    expect(projManager.hasActiveProjectiles()).toBe(false);
  });
});
