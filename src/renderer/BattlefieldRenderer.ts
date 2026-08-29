import { CombatEngine } from '../engine/CombatEngine';
import { ParticleEngine } from './ParticleEngine';
import { AnimationManager } from './AnimationManager';
import { ProjectileManager } from './ProjectileManager';
import { GridCoord, TileHazardType } from '../types';
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

  public update(deltaTimeMs: number): void {
    this.animManager.update(deltaTimeMs);
    this.projManager.update(deltaTimeMs);

    // Emit elemental tail particles for active projectiles
    for (const proj of this.projManager.getActiveProjectiles()) {
      this.particleEngine.emit(proj.currentX, proj.currentY, proj.color, 2, 1.2);
    }

    this.particleEngine.update();
  }

  public render(
    hoveredCoord: GridCoord | null,
    reachableTiles: GridCoord[],
    targetableTiles: GridCoord[],
    focusedUnitId: string | null = null
  ): void {
    const { ctx, canvas, combatEngine, tileSize, gridOffsetX, gridOffsetY } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

        // Tile Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, tileSize, tileSize);

        // Draw Tile Hazards
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

    // 2. Draw Movement Reachable Highlight Overlays
    ctx.save();
    for (const rCoord of reachableTiles) {
      const rx = gridOffsetX + rCoord.x * tileSize;
      const ry = gridOffsetY + rCoord.y * tileSize;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(rx + 2, ry + 2, tileSize - 4, tileSize - 4);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx + 2, ry + 2, tileSize - 4, tileSize - 4);
    }

    // 3. Draw Ability Targeting Overlays
    for (const tCoord of targetableTiles) {
      const tx = gridOffsetX + tCoord.x * tileSize;
      const ty = gridOffsetY + tCoord.y * tileSize;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
    }

    // 4. Draw Hovered Tile Reticle
    if (hoveredCoord) {
      const hx = gridOffsetX + hoveredCoord.x * tileSize;
      const hy = gridOffsetY + hoveredCoord.y * tileSize;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx + 1, hy + 1, tileSize - 2, tileSize - 2);
    }
    ctx.restore();

    // 5. Draw Units (Hero and Enemies)
    this.renderUnits(ctx, focusedUnitId);

    // 6. Draw Traveling Projectiles
    this.projManager.render(ctx);

    // 7. Draw Particle Layer
    this.particleEngine.render(ctx);
  }

  private renderHazard(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: TileHazardType): void {
    ctx.save();
    switch (type) {
      case 'Burning':
        ctx.fillStyle = 'rgba(255, 107, 53, 0.35)';
        ctx.fillRect(x, y, size, size);
        ctx.font = '18px sans-serif';
        ctx.fillText('🔥', x + size / 2 - 8, y + size / 2 + 6);
        break;
      case 'Puddle':
        ctx.fillStyle = 'rgba(0, 210, 255, 0.3)';
        ctx.fillRect(x, y, size, size);
        ctx.font = '18px sans-serif';
        ctx.fillText('💧', x + size / 2 - 8, y + size / 2 + 6);
        break;
      case 'ElectrifiedPuddle':
        ctx.fillStyle = 'rgba(255, 208, 0, 0.35)';
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = '#ffd000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
        ctx.font = '18px sans-serif';
        ctx.fillText('⚡', x + size / 2 - 8, y + size / 2 + 6);
        break;
      case 'ToxicMire':
        ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.fillRect(x, y, size, size);
        ctx.font = '18px sans-serif';
        ctx.fillText('🧪', x + size / 2 - 8, y + size / 2 + 6);
        break;
      case 'VoidRift':
        ctx.fillStyle = 'rgba(217, 70, 239, 0.35)';
        ctx.fillRect(x, y, size, size);
        ctx.font = '18px sans-serif';
        ctx.fillText('🌌', x + size / 2 - 8, y + size / 2 + 6);
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
    const allUnits = [this.combatEngine.hero, ...this.combatEngine.enemies];
    for (const unit of allUnits) {
      if (unit.isDead) continue;

      // Use interpolated render coordinate if unit is animating
      const animCoord = this.animManager.getUnitRenderCoord(unit.id);
      const screenPos = animCoord
        ? this.renderCoordToScreen(animCoord)
        : this.gridToScreen(unit.coord);

      const isPlayer = unit.faction === 'Player';
      const isFocused = unit.id === focusedUnitId;
      const radius = this.tileSize * 0.38;

      ctx.save();

      // Emit glide particles if unit is moving
      if (animCoord) {
        this.particleEngine.emit(
          screenPos.x,
          screenPos.y + radius * 0.8,
          isPlayer ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          1,
          0.8
        );
      }

      // Glowing Elemental Aura or Focused Ring
      const elemData = CORE_ELEMENTS[unit.stats.elementalAffinity];
      ctx.shadowColor = isFocused ? '#fef08a' : (elemData ? elemData.glowColor : 'rgba(255,255,255,0.3)');
      ctx.shadowBlur = isFocused ? 20 : 12;

      // Unit Background Ring
      ctx.fillStyle = isPlayer ? '#0f172a' : '#1e1b4b';
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Unit Border Ring
      ctx.strokeStyle = isFocused ? '#fef08a' : (isPlayer ? '#38bdf8' : (elemData ? elemData.color : '#ef4444'));
      ctx.lineWidth = isFocused ? 4 : 3;
      ctx.stroke();

      // Avatar Icon
      ctx.shadowBlur = 0;
      ctx.font = `${Math.floor(radius * 1.1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unit.avatar, screenPos.x, screenPos.y + 2);

      // Mini Health Bar above Unit
      const hpWidth = this.tileSize * 0.75;
      const hpHeight = 5;
      const hpX = screenPos.x - hpWidth / 2;
      const hpY = screenPos.y - radius - 10;
      const hpPct = Math.max(0, unit.stats.currentHp / unit.stats.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(hpX, hpY, hpWidth, hpHeight);
      ctx.fillStyle = isPlayer ? '#22c55e' : '#ef4444';
      ctx.fillRect(hpX, hpY, hpWidth * hpPct, hpHeight);

      // Unit Status Indicator
      if (unit.statusEffects.length > 0) {
        ctx.font = '10px "Fira Code", monospace';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(`[${unit.statusEffects[0].type}]`, screenPos.x, hpY - 4);
      }

      ctx.restore();
    }
  }
}
