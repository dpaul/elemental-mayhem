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

export interface WalkCycleState {
  isMoving: boolean;
  walkPhase: number;
  bobOffset: number;
  leftStride: number;
  rightStride: number;
  leftLift: number;
  rightLift: number;
  armSwing: number;
  torsoSway: number;
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

  /**
   * Computes the current walking cycle animation state (stepping legs, arm swing, gait bounce, torso tilt)
   */
  public getUnitWalkState(unitId: string, currentTimeMs: number = 0): WalkCycleState {
    const anim = this.activeMovements.get(unitId);
    if (anim) {
      // 2 complete steps (left and right) per tile traversal
      const totalSteps = (anim.currentSegmentIndex + anim.segmentProgress) * 2;
      const walkPhase = totalSteps * Math.PI;

      // Vertical bipedal gait bounce (peaks at mid-stride)
      const bobOffset = -Math.abs(Math.sin(walkPhase)) * 5.5;

      // Stride distance forward/back
      const strideDist = 8;
      const leftStride = (Math.sin(walkPhase) * strideDist) || 0;
      const rightStride = (-Math.sin(walkPhase) * strideDist) || 0;

      // Foot vertical lift during forward step swing
      const leftLift = Math.max(0, -Math.cos(walkPhase)) * 5;
      const rightLift = Math.max(0, Math.cos(walkPhase)) * 5;

      // Arm swing in natural counter-motion to legs
      const armSwing = Math.sin(walkPhase) * 0.4;

      // Rhythmic torso sway with walking cadence
      const torsoSway = Math.sin(walkPhase) * 0.08;

      return {
        isMoving: true,
        walkPhase,
        bobOffset,
        leftStride,
        rightStride,
        leftLift,
        rightLift,
        armSwing,
        torsoSway,
      };
    }

    // Idle stance - subtle breathing and alert presence
    const idlePhase = currentTimeMs * 0.003;
    return {
      isMoving: false,
      walkPhase: 0,
      bobOffset: Math.sin(idlePhase) * 1.5,
      leftStride: 0,
      rightStride: 0,
      leftLift: 0,
      rightLift: 0,
      armSwing: Math.sin(idlePhase * 0.6) * 0.04,
      torsoSway: Math.sin(idlePhase * 0.4) * 0.02,
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
