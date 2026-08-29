// Elemental Mayhem - Traveling Projectile & Spellcast Animation Manager
import { ElementType } from '../types';

export interface Projectile {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  element: ElementType;
  color: string;
  durationMs: number;
  elapsedMs: number;
  progress: number;
  onArrival?: () => void;
}

export class ProjectileManager {
  private projectiles: Projectile[] = [];

  public spawnProjectile(
    start: { x: number; y: number },
    target: { x: number; y: number },
    element: ElementType,
    color: string,
    durationMs: number = 260,
    onArrival?: () => void
  ): string {
    const id = `proj_${Date.now()}_${Math.random()}`;
    this.projectiles.push({
      id,
      startX: start.x,
      startY: start.y,
      targetX: target.x,
      targetY: target.y,
      currentX: start.x,
      currentY: start.y,
      element,
      color,
      durationMs,
      elapsedMs: 0,
      progress: 0,
      onArrival,
    });
    return id;
  }

  public hasActiveProjectiles(): boolean {
    return this.projectiles.length > 0;
  }

  public getActiveProjectiles(): Projectile[] {
    return this.projectiles;
  }

  public update(deltaTimeMs: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.elapsedMs += deltaTimeMs;
      proj.progress = Math.min(1.0, proj.elapsedMs / proj.durationMs);

      // Interpolate with ease-out for natural flight
      const t = proj.progress;
      proj.currentX = proj.startX + (proj.targetX - proj.startX) * t;
      proj.currentY = proj.startY + (proj.targetY - proj.startY) * t;

      if (proj.progress >= 1.0) {
        this.projectiles.splice(i, 1);
        if (proj.onArrival) {
          proj.onArrival();
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const proj of this.projectiles) {
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = proj.color;

      // Projectile glowing orb
      ctx.beginPath();
      ctx.arc(proj.currentX, proj.currentY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Inner white core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(proj.currentX, proj.currentY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
