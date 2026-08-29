// Elemental Mayhem - Unit Movement & Interpolation Animation Manager
import { GridCoord } from '../types';

export interface MovementAnimation {
  unitId: string;
  path: GridCoord[];
  currentSegmentIndex: number;
  segmentProgress: number; // 0.0 to 1.0
  durationPerTile: number; // in milliseconds
  elapsedInSegment: number;
  onComplete?: () => void;
}

export class AnimationManager {
  private activeMovements: Map<string, MovementAnimation> = new Map();

  public animateMovement(
    unitId: string,
    path: GridCoord[],
    durationPerTile: number = 160,
    onComplete?: () => void
  ): void {
    if (path.length <= 1) {
      if (onComplete) onComplete();
      return;
    }

    this.activeMovements.set(unitId, {
      unitId,
      path,
      currentSegmentIndex: 0,
      segmentProgress: 0,
      durationPerTile,
      elapsedInSegment: 0,
      onComplete,
    });
  }

  public isUnitMoving(unitId: string): boolean {
    return this.activeMovements.has(unitId);
  }

  public hasActiveAnimations(): boolean {
    return this.activeMovements.size > 0;
  }

  public getUnitRenderCoord(unitId: string): { x: number; y: number } | null {
    const anim = this.activeMovements.get(unitId);
    if (!anim) return null;

    const from = anim.path[anim.currentSegmentIndex];
    const to = anim.path[anim.currentSegmentIndex + 1];
    if (!to) return { x: from.x, y: from.y };

    const t = anim.segmentProgress;
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
  }

  public update(deltaTimeMs: number): void {
    for (const [unitId, anim] of Array.from(this.activeMovements.entries())) {
      anim.elapsedInSegment += deltaTimeMs;
      anim.segmentProgress = Math.min(1.0, anim.elapsedInSegment / anim.durationPerTile);

      if (anim.segmentProgress >= 1.0) {
        anim.currentSegmentIndex += 1;
        anim.elapsedInSegment = 0;
        anim.segmentProgress = 0;

        // Check if full path completed
        if (anim.currentSegmentIndex >= anim.path.length - 1) {
          this.activeMovements.delete(unitId);
          if (anim.onComplete) {
            anim.onComplete();
          }
        }
      }
    }
  }
}
