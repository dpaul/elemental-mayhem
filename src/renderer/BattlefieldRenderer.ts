// Elemental Mayhem - Canvas Battlefield Renderer & Visual FX Engine
import { CombatEngine } from '../engine/CombatEngine';
import { ParticleEngine } from './ParticleEngine';
import { AnimationManager } from './AnimationManager';
import { ProjectileManager } from './ProjectileManager';
import { GridCoord, TileHazardType, ElementType } from '../types';
import { CORE_ELEMENTS } from '../constants/elements';

export class BattlefieldRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private combatEngine: CombatEngine;
  public particleEngine: ParticleEngine;
  public animManager: AnimationManager;
  public projManager: ProjectileManager;
  public tileSize: number = 72;
  public gridOffsetX: number = 40;
  public gridOffsetY: number = 40;
  public elapsedTotalTimeMs: number = 0;

  constructor(canvas: HTMLCanvasElement, combatEngine: CombatEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.combatEngine = combatEngine;
    this.particleEngine = new ParticleEngine();
    this.animManager = new AnimationManager();
    this.projManager = new ProjectileManager();
    this.calculateDimensions();
  }

  private calculateDimensions(): void {
    const size = Math.min(this.canvas.width, this.canvas.height);
    this.tileSize = Math.floor((size - 40) / this.combatEngine.grid.size);
    this.gridOffsetX = Math.floor((this.canvas.width - this.tileSize * this.combatEngine.grid.size) / 2);
    this.gridOffsetY = Math.floor((this.canvas.height - this.tileSize * this.combatEngine.grid.size) / 2);
  }

  public screenToGrid(clientX: number, clientY: number): GridCoord | null {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const gx = Math.floor((canvasX - this.gridOffsetX) / this.tileSize);
    const gy = Math.floor((canvasY - this.gridOffsetY) / this.tileSize);

    if (this.combatEngine.grid.isInBounds({ x: gx, y: gy })) {
      return { x: gx, y: gy };
    }
    return null;
  }

  public gridToScreen(coord: GridCoord): { x: number; y: number } {
    return {
      x: this.gridOffsetX + coord.x * this.tileSize + this.tileSize / 2,
      y: this.gridOffsetY + coord.y * this.tileSize + this.tileSize / 2,
    };
  }

  public renderCoordToScreen(coord: { x: number; y: number }): { x: number; y: number } {
    return {
      x: this.gridOffsetX + coord.x * this.tileSize + this.tileSize / 2,
      y: this.gridOffsetY + coord.y * this.tileSize + this.tileSize / 2,
    };
  }

  public triggerSpellImpact(
    targetCoord: GridCoord,
    element: ElementType,
    isCrit: boolean = false
  ): void {
    const pos = this.gridToScreen(targetCoord);
    const elemData = CORE_ELEMENTS[element] || CORE_ELEMENTS.Neutral;

    // 1. Shockwave
    this.particleEngine.addShockwave(pos.x, pos.y, elemData.color, isCrit ? 60 : 44, 4.0);

    // 2. High-density burst particles
    this.particleEngine.emit(pos.x, pos.y, elemData.color, isCrit ? 30 : 20, isCrit ? 4.5 : 3.0, 'spark');
    this.particleEngine.emit(pos.x, pos.y, '#ffffff', isCrit ? 12 : 6, 2.0, 'circle');

    // 3. Screen shake
    this.particleEngine.triggerScreenShake(isCrit ? 10 : 5, isCrit ? 300 : 200);
  }

  public update(deltaTimeMs: number): void {
    this.elapsedTotalTimeMs += deltaTimeMs;
    this.animManager.update(deltaTimeMs);
    this.projManager.update(deltaTimeMs);

    // Emit elemental tail particles for active projectiles
    for (const proj of this.projManager.getActiveProjectiles()) {
      this.particleEngine.emit(proj.currentX, proj.currentY, proj.color, 3, 1.2, 'spark');
    }

    this.particleEngine.update(deltaTimeMs);
  }

  public render(
    hoveredCoord: GridCoord | null,
    reachableTiles: GridCoord[],
    targetableTiles: GridCoord[],
    focusedUnitId: string | null = null
  ): void {
    const { ctx, canvas, combatEngine, tileSize, gridOffsetX, gridOffsetY } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Screen Shake offset
    const shake = this.particleEngine.getScreenShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // 1. Draw Battlefield Background Grid
    ctx.save();
    for (let x = 0; x < combatEngine.grid.size; x++) {
      for (let y = 0; y < combatEngine.grid.size; y++) {
        const px = gridOffsetX + x * tileSize;
        const py = gridOffsetY + y * tileSize;
        const tile = combatEngine.grid.getTile({ x, y })!;

        // Base Tile Floor
        ctx.fillStyle = (x + y) % 2 === 0 ? '#111722' : '#0c1017';
        ctx.fillRect(px, py, tileSize, tileSize);

        // Subtle Ambient Grid Line Glow
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, tileSize, tileSize);

        // Draw Animated Tile Hazards
        if (tile.hazard.type !== 'None') {
          this.renderHazard(ctx, px, py, tileSize, tile.hazard.type);
        }

        // Draw Obstacles
        if (tile.isObstacle) {
          this.renderObstacle(ctx, px, py, tileSize);
        }
      }
    }
    ctx.restore();

    // 2. Draw Movement Reachable Highlight Overlays with pulsing alpha
    const pulse = 0.5 + 0.5 * Math.sin(this.elapsedTotalTimeMs * 0.005);
    ctx.save();
    for (const rCoord of reachableTiles) {
      const rx = gridOffsetX + rCoord.x * tileSize;
      const ry = gridOffsetY + rCoord.y * tileSize;
      ctx.fillStyle = `rgba(56, 189, 248, ${0.12 + 0.08 * pulse})`;
      ctx.fillRect(rx + 2, ry + 2, tileSize - 4, tileSize - 4);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 + 0.25 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx + 2, ry + 2, tileSize - 4, tileSize - 4);
    }

    // 3. Draw Ability Targeting Overlays
    for (const tCoord of targetableTiles) {
      const tx = gridOffsetX + tCoord.x * tileSize;
      const ty = gridOffsetY + tCoord.y * tileSize;
      ctx.fillStyle = `rgba(239, 68, 68, ${0.16 + 0.08 * pulse})`;
      ctx.fillRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + 0.3 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
    }

    // 4. Draw Pending Reanimation Graves
    for (const p of this.combatEngine.pendingReanimations) {
      const px = gridOffsetX + p.coord.x * tileSize;
      const py = gridOffsetY + p.coord.y * tileSize;
      ctx.save();
      ctx.fillStyle = 'rgba(132, 204, 22, 0.25)';
      ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
      ctx.strokeStyle = '#84cc16';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚰️', px + tileSize / 2, py + tileSize / 2 - 4);
      ctx.font = 'bold 11px "Fira Code", monospace';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`${p.turnsRemaining}t`, px + tileSize / 2, py + tileSize / 2 + 14);
      ctx.restore();
    }

    // 5. Draw Hovered Tile Reticle
    if (hoveredCoord) {
      const hx = gridOffsetX + hoveredCoord.x * tileSize;
      const hy = gridOffsetY + hoveredCoord.y * tileSize;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.strokeRect(hx + 1, hy + 1, tileSize - 2, tileSize - 2);
    }
    ctx.restore();

    // 6. Draw Units (Hero, Allied Zombies, and Enemies with Breathing Animation)
    this.renderUnits(ctx, focusedUnitId);

    // 7. Draw Traveling Projectiles
    this.projManager.render(ctx);

    // 8. Draw Particle & Shockwave Layer
    this.particleEngine.render(ctx);

    ctx.restore(); // Restore screen shake translation
  }

  private renderHazard(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: TileHazardType): void {
    ctx.save();
    const t = this.elapsedTotalTimeMs * 0.003;
    const pulse = Math.sin(t);

    switch (type) {
      case 'Burning':
        ctx.fillStyle = `rgba(255, 107, 53, ${0.3 + 0.1 * pulse})`;
        ctx.fillRect(x, y, size, size);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔥', x + size / 2, y + size / 2 + Math.sin(t * 2) * 2);
        break;
      case 'Puddle':
        ctx.fillStyle = `rgba(0, 210, 255, ${0.25 + 0.05 * pulse})`;
        ctx.fillRect(x, y, size, size);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💧', x + size / 2, y + size / 2);
        break;
      case 'ElectrifiedPuddle':
        ctx.fillStyle = `rgba(255, 208, 0, ${0.3 + 0.15 * Math.sin(t * 5)})`;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#ffd000';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffd000';
        ctx.shadowBlur = 10;
        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', x + size / 2, y + size / 2);
        break;
      case 'ToxicMire':
        ctx.fillStyle = `rgba(34, 197, 94, ${0.3 + 0.1 * pulse})`;
        ctx.fillRect(x, y, size, size);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧪', x + size / 2, y + size / 2);
        break;
      case 'VoidRift':
        ctx.fillStyle = `rgba(217, 70, 239, ${0.35 + 0.15 * Math.sin(t * 3)})`;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌌', x + size / 2, y + size / 2);
        break;
      case 'LavaPool':
        ctx.fillStyle = `rgba(220, 38, 38, ${0.4 + 0.15 * pulse})`;
        ctx.fillRect(x, y, size, size);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌋', x + size / 2, y + size / 2 + Math.sin(t * 2) * 2);
        break;
      case 'IceSurface':
        ctx.fillStyle = `rgba(103, 232, 249, ${0.35 + 0.1 * pulse})`;
        ctx.fillRect(x, y, size, size);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❄️', x + size / 2, y + size / 2);
        break;
      case 'AcidPool':
        ctx.fillStyle = `rgba(132, 204, 22, ${0.35 + 0.1 * pulse})`;
        ctx.fillRect(x, y, size, size);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☣️', x + size / 2, y + size / 2);
        break;
      case 'CrystalSpikes':
        ctx.fillStyle = `rgba(168, 85, 247, ${0.35 + 0.1 * pulse})`;
        ctx.fillRect(x, y, size, size);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💎', x + size / 2, y + size / 2);
        break;
      case 'BonePile':
        ctx.fillStyle = `rgba(148, 163, 184, ${0.35 + 0.1 * pulse})`;
        ctx.fillRect(x, y, size, size);
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦴', x + size / 2, y + size / 2);
        break;
      default:
        break;
    }
    ctx.restore();
  }

  private renderObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
    ctx.font = `${Math.floor(size * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪨', x + size / 2, y + size / 2);
    ctx.restore();
  }

  private renderUnits(ctx: CanvasRenderingContext2D, focusedUnitId: string | null): void {
    const allUnits = [
      this.combatEngine.hero,
      ...this.combatEngine.zombies,
      ...this.combatEngine.lifeBeings,
      ...this.combatEngine.enemies,
    ];

    for (const unit of allUnits) {
      if (unit.isDead) continue;

      // Use interpolated render coordinate if unit is animating
      const animCoord = this.animManager.getUnitRenderCoord(unit.id);
      const rawPos = animCoord
        ? this.renderCoordToScreen(animCoord)
        : this.gridToScreen(unit.coord);

      // Subtle organic breathing float offset
      const floatOffset = animCoord
        ? 0
        : Math.sin(this.elapsedTotalTimeMs * 0.003 + unit.coord.x * 2) * 3;

      const screenPos = { x: rawPos.x, y: rawPos.y + floatOffset };

      const isPlayerHero = unit.faction === 'Player' && !unit.isZombie && !unit.isLifeBeing;
      const isZombie = !!unit.isZombie;
      const isLifeBeing = !!unit.isLifeBeing;
      const isFocused = unit.id === focusedUnitId;
      const isBoss = !!unit.isBoss;
      const radius = this.tileSize * (isBoss ? 0.44 : 0.38);

      ctx.save();

      // Emit glide particles if unit is moving
      if (animCoord) {
        this.particleEngine.emit(
          screenPos.x,
          screenPos.y + radius * 0.8,
          isPlayerHero
            ? 'rgba(56, 189, 248, 0.5)'
            : isZombie
            ? 'rgba(132, 204, 22, 0.6)'
            : isLifeBeing
            ? 'rgba(74, 222, 128, 0.7)'
            : isBoss
            ? 'rgba(245, 158, 11, 0.7)'
            : 'rgba(239, 68, 68, 0.5)',
          2,
          1.0,
          'spark'
        );
      }

      // Glowing Elemental Aura or Boss Aura or Focused Ring
      const elemData = CORE_ELEMENTS[unit.stats.elementalAffinity];
      const auraPulse = Math.sin(this.elapsedTotalTimeMs * 0.004) * 4;

      ctx.shadowColor = isBoss
        ? '#f59e0b'
        : isZombie
        ? '#84cc16'
        : isLifeBeing
        ? '#4ade80'
        : isFocused
        ? '#fef08a'
        : elemData
        ? elemData.glowColor
        : 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = (isBoss ? 26 : isZombie || isLifeBeing ? 20 : isFocused ? 22 : 14) + auraPulse;

      // Boss Orbital Runic Particles
      if (isBoss) {
        const orbitAngle = this.elapsedTotalTimeMs * 0.002;
        const orbitRadius = radius + 8;
        for (let i = 0; i < 3; i++) {
          const angle = orbitAngle + (i * Math.PI * 2) / 3;
          const ox = screenPos.x + Math.cos(angle) * orbitRadius;
          const oy = screenPos.y + Math.sin(angle) * orbitRadius;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(ox, oy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Unit Background Ring
      ctx.fillStyle = isPlayerHero
        ? '#0f172a'
        : isZombie
        ? '#14280f'
        : isLifeBeing
        ? '#064e3b'
        : isBoss
        ? '#31102f'
        : '#1e1b4b';
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Unit Border Ring
      ctx.strokeStyle = isBoss
        ? '#fbbf24'
        : isZombie
        ? '#84cc16'
        : isLifeBeing
        ? '#4ade80'
        : isFocused
        ? '#fef08a'
        : isPlayerHero
        ? '#38bdf8'
        : elemData
        ? elemData.color
        : '#ef4444';
      ctx.lineWidth = isBoss ? 5 : isZombie || isLifeBeing ? 3.5 : isFocused ? 4 : 3;
      ctx.stroke();

      // Avatar Icon
      ctx.shadowBlur = 0;
      ctx.font = `${Math.floor(radius * (isBoss ? 1.2 : 1.1))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unit.avatar, screenPos.x, screenPos.y + 2);

      // Health Bar above Unit
      const hpWidth = this.tileSize * (isBoss ? 0.9 : 0.75);
      const hpHeight = isBoss ? 7 : 5;
      const hpX = screenPos.x - hpWidth / 2;
      const hpY = screenPos.y - radius - (isBoss ? 16 : 10);
      const hpPct = Math.max(0, unit.stats.currentHp / unit.stats.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(hpX, hpY, hpWidth, hpHeight);
      ctx.fillStyle = isPlayerHero || isLifeBeing
        ? '#22c55e'
        : isZombie
        ? '#84cc16'
        : isBoss
        ? '#f59e0b'
        : '#ef4444';
      ctx.fillRect(hpX, hpY, hpWidth * hpPct, hpHeight);

      if (isBoss) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hpX, hpY, hpWidth, hpHeight);

        // Boss Crown indicator
        ctx.font = '12px sans-serif';
        ctx.fillText('👑', screenPos.x, hpY - 8);
      }

      // Unit Special Indicator
      if (isZombie && unit.zombieLifetime !== undefined) {
        ctx.font = 'bold 11px "Fira Code", monospace';
        ctx.fillStyle = '#a3e635';
        ctx.fillText(`[🧟 ${unit.zombieLifetime}t]`, screenPos.x, hpY - 6);
      } else if (isLifeBeing) {
        ctx.font = 'bold 10px "Fira Code", monospace';
        ctx.fillStyle = '#86efac';
        ctx.fillText('[Life Being]', screenPos.x, hpY - 6);
      } else if (unit.statusEffects.length > 0) {
        // Unit Status Indicator
        ctx.font = '10px "Fira Code", monospace';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(`[${unit.statusEffects[0].type}]`, screenPos.x, hpY - (isBoss ? 18 : 4));
      }

      ctx.restore();
    }
  }
}
