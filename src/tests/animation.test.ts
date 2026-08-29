import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationManager } from '../renderer/AnimationManager';
import { GridCoord } from '../types';

describe('AnimationManager (TDD Red -> Green)', () => {
  let animManager: AnimationManager;

  beforeEach(() => {
    animManager = new AnimationManager();
  });

  it('should queue and interpolate unit movement along path waypoints', () => {
    const path: GridCoord[] = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ];

    let completed = false;
    animManager.animateMovement('hero', path, 100, () => {
      completed = true;
    });

    expect(animManager.isUnitMoving('hero')).toBe(true);
    expect(animManager.hasActiveAnimations()).toBe(true);

    // Initial position
    let pos = animManager.getUnitRenderCoord('hero');
    expect(pos).toEqual({ x: 1, y: 1 });

    // Advance 50ms (halfway to (2,1))
    animManager.update(50);
    pos = animManager.getUnitRenderCoord('hero');
    expect(pos?.x).toBeCloseTo(1.5, 1);
    expect(pos?.y).toBe(1);
    expect(completed).toBe(false);

    // Advance 50ms more (at (2,1))
    animManager.update(50);
    pos = animManager.getUnitRenderCoord('hero');
    expect(pos?.x).toBeCloseTo(2.0, 1);

    // Advance 100ms (completed at (3,1))
    animManager.update(100);
    expect(completed).toBe(true);
    expect(animManager.isUnitMoving('hero')).toBe(false);
    expect(animManager.hasActiveAnimations()).toBe(false);
  });
});
