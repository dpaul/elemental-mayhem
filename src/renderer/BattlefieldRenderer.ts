// Elemental Mayhem - Canvas Battlefield Renderer & Visual FX Engine
import { CombatEngine } from '../engine/CombatEngine';
import { ParticleEngine } from './ParticleEngine';
import { AnimationManager } from './AnimationManager';
import { ProjectileManager } from './ProjectileManager';
import { GridCoord, TileHazardType, ElementType, Unit } from '../types';
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
  public partnerHoverCoord: GridCoord | null = null;
  public activePings: { coord: GridCoord; label: string; playerNum: 1 | 2; age: number; maxAge: number }[] = [];
  public activePlacementPreview: {
    icon: string;
    name: string;
    category: string;
    color?: string;
    isValid?: boolean;
  } | null = null;
  public isDarkCloudsTheme: boolean = false;

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

  public triggerDeathAnimation(unit: Unit, killerElement?: ElementType): void {
    const pos = this.gridToScreen(unit.coord);
    this.particleEngine.triggerDeathAnimation(unit, pos.x, pos.y, killerElement);
  }

  public update(deltaTimeMs: number): void {
    this.elapsedTotalTimeMs += deltaTimeMs;
    this.animManager.update(deltaTimeMs);
    this.projManager.update(deltaTimeMs);

    // Emit elemental tail particles for active projectiles
    for (const proj of this.projManager.getActiveProjectiles()) {
      this.particleEngine.emit(proj.currentX, proj.currentY, proj.color, 3, 1.2, 'spark');
    }

    // Update active tactical pings
    for (let i = this.activePings.length - 1; i >= 0; i--) {
      this.activePings[i].age += deltaTimeMs;
      if (this.activePings[i].age >= this.activePings[i].maxAge) {
        this.activePings.splice(i, 1);
      }
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

    // 0. Draw Heavy Ancient Stone Arena Curb / Border
    this.renderArenaBorder(ctx, gridOffsetX, gridOffsetY, combatEngine.grid.size, tileSize);

    // 1. Draw Battlefield Background Grid
    ctx.save();
    for (let x = 0; x < combatEngine.grid.size; x++) {
      for (let y = 0; y < combatEngine.grid.size; y++) {
        const px = gridOffsetX + x * tileSize;
        const py = gridOffsetY + y * tileSize;
        const tile = combatEngine.grid.getTile({ x, y })!;

        // Realistic Stone Flagstone Floor
        this.renderRealisticTile(ctx, px, py, tileSize, x, y);

        // Draw Animated Realistic Tile Hazards
        if (tile.hazard.type !== 'None') {
          this.renderHazard(ctx, px, py, tileSize, tile.hazard.type, x, y);
        }

        // Draw 3D-Shaded Realistic Obstacles
        if (tile.isObstacle) {
          this.renderObstacle(ctx, px, py, tileSize, tile.obstacleIcon || '🪨', x, y);
        }
      }
    }

    // Atmospheric Dark Clouds Pass over the battlefield grid
    if (this.isDarkCloudsTheme) {
      this.renderDarkCloudsAtmosphere(ctx);
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

      // 5a. Draw Ghost Placement Preview if in placement mode
      if (this.activePlacementPreview) {
        const preview = this.activePlacementPreview;
        const isValid = preview.isValid !== false;

        ctx.save();
        if (isValid) {
          ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
          ctx.strokeStyle = '#34d399';
          ctx.shadowColor = '#10b981';
        } else {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.strokeStyle = '#ef4444';
          ctx.shadowColor = '#dc2626';
        }
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.shadowBlur = 10;
        ctx.fillRect(hx + 2, hy + 2, tileSize - 4, tileSize - 4);
        ctx.strokeRect(hx + 2, hy + 2, tileSize - 4, tileSize - 4);

        // Preview Icon
        ctx.font = `${Math.floor(tileSize * 0.48)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.88;
        ctx.fillText(preview.icon, hx + tileSize / 2, hy + tileSize / 2);

        if (!isValid) {
          ctx.font = 'bold 15px sans-serif';
          ctx.fillStyle = '#ef4444';
          ctx.fillText('🚫', hx + tileSize - 12, hy + 14);
        }
        ctx.restore();
      }
    }

    // 5b. Draw Partner Ghost Hover Reticle (Co-op)
    if (this.partnerHoverCoord) {
      const phx = gridOffsetX + this.partnerHoverCoord.x * tileSize;
      const phy = gridOffsetY + this.partnerHoverCoord.y * tileSize;
      ctx.save();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.strokeRect(phx + 2, phy + 2, tileSize - 4, tileSize - 4);
      ctx.font = 'bold 9px "Fira Code", monospace';
      ctx.fillStyle = '#f3e8ff';
      ctx.textAlign = 'right';
      ctx.fillText('ALLY', phx + tileSize - 4, phy + 12);
      ctx.restore();
    }

    // 5c. Draw Tactical Pings
    for (const ping of this.activePings) {
      const px = gridOffsetX + ping.coord.x * tileSize + tileSize / 2;
      const py = gridOffsetY + ping.coord.y * tileSize + tileSize / 2;
      const progress = ping.age / ping.maxAge;
      const pingRadius = (tileSize / 2) * (0.4 + progress * 0.9);
      const alpha = Math.max(0, 1 - progress);

      ctx.save();
      ctx.strokeStyle = ping.playerNum === 1 ? `rgba(56, 189, 248, ${alpha})` : `rgba(168, 85, 247, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = ping.playerNum === 1 ? '#38bdf8' : '#c084fc';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px, py, pingRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📍', px, py - 6);
      if (ping.label) {
        ctx.font = 'bold 10px "Fira Code", monospace';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(ping.label, px, py + 12);
      }
      ctx.restore();
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

  private renderDarkCloudsAtmosphere(ctx: CanvasRenderingContext2D): void {
    const t = this.elapsedTotalTimeMs * 0.001;
    ctx.save();

    // Drifting dark storm clouds over the floor
    const cloudGradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    const pulseA = Math.sin(t * 0.8) * 0.04 + 0.08;
    const pulseB = Math.cos(t * 0.6) * 0.04 + 0.12;
    cloudGradient.addColorStop(0, `rgba(88, 28, 135, ${pulseA})`);
    cloudGradient.addColorStop(0.5, `rgba(15, 10, 30, ${pulseB})`);
    cloudGradient.addColorStop(1, `rgba(59, 130, 246, ${pulseA * 0.7})`);
    ctx.fillStyle = cloudGradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Periodic distant lightning flash illuminating the cloudscape
    const lightningCycle = this.elapsedTotalTimeMs % 3600;
    if (lightningCycle < 140 || (lightningCycle > 200 && lightningCycle < 280)) {
      const flashAlpha =
        lightningCycle < 140
          ? (1 - lightningCycle / 140) * 0.28
          : (1 - (lightningCycle - 200) / 80) * 0.38;
      ctx.fillStyle = `rgba(224, 231, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx.restore();
  }

  /**
   * Renders the heavy ancient stone curb framing the 10x10 elemental battlefield arena.
   */
  private renderArenaBorder(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    gridSize: number,
    tileSize: number
  ): void {
    const totalW = gridSize * tileSize;
    const totalH = gridSize * tileSize;
    const curb = 8;
    const x = offsetX - curb;
    const y = offsetY - curb;
    const w = totalW + curb * 2;
    const h = totalH + curb * 2;

    ctx.save();
    // Drop shadow under arena border
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x + 4, y + 4, w, h);

    // Outer stone curb body
    if (this.isDarkCloudsTheme) {
      ctx.fillStyle = '#140c24';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
    } else {
      ctx.fillStyle = '#0f1724';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
    }

    // Inner recessed border groove
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, totalW, totalH);

    // Corner decorative metal / stone brackets
    const bracketSize = 14;
    const corners = [
      { bx: x, by: y },
      { bx: x + w - bracketSize, by: y },
      { bx: x, by: y + h - bracketSize },
      { bx: x + w - bracketSize, by: y + h - bracketSize },
    ];
    for (const c of corners) {
      ctx.fillStyle = this.isDarkCloudsTheme ? '#3b1c6e' : '#334155';
      ctx.fillRect(c.bx, c.by, bracketSize, bracketSize);
      ctx.strokeStyle = this.isDarkCloudsTheme ? '#c084fc' : '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(c.bx, c.by, bracketSize, bracketSize);
    }
    ctx.restore();
  }

  /**
   * Renders realistic stone flagstone pavers with 3D beveling, natural fissures,
   * deterministic weathering, and runic veins for Dark Clouds mode.
   */
  private renderRealisticTile(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    size: number,
    gx: number,
    gy: number
  ): void {
    ctx.save();

    // Inset by 1px for deep recessed mortar joint
    const inset = 1;
    const tx = px + inset;
    const ty = py + inset;
    const ts = size - inset * 2;

    // Recessed dark mortar bed behind the pavers
    ctx.fillStyle = '#060a10';
    ctx.fillRect(px, py, size, size);

    // Coordinate-based deterministic pseudorandom seed
    const seed = ((gx * 83 + gy * 47 + 29) % 1000) / 1000;
    const isEven = (gx + gy) % 2 === 0;

    if (this.isDarkCloudsTheme) {
      // Abyssal obsidian paver
      const baseGrad = ctx.createLinearGradient(tx, ty, tx + ts, ty + ts);
      if (isEven) {
        baseGrad.addColorStop(0, '#1c1032');
        baseGrad.addColorStop(1, '#0f071e');
      } else {
        baseGrad.addColorStop(0, '#150a27');
        baseGrad.addColorStop(1, '#0a0414');
      }
      ctx.fillStyle = baseGrad;
      ctx.fillRect(tx, ty, ts, ts);

      // 3D Bevel: top/left specular rim, bottom/right deep shadow
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, ty + ts);
      ctx.lineTo(tx, ty);
      ctx.lineTo(tx + ts, ty);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.moveTo(tx + ts, ty);
      ctx.lineTo(tx + ts, ty + ts);
      ctx.lineTo(tx, ty + ts);
      ctx.stroke();

      // Pulsing ethereal purple runic energy creeping through stone fractures
      const veinPulse = 0.5 + 0.5 * Math.sin(this.elapsedTotalTimeMs * 0.003 + (gx + gy) * 0.8);
      ctx.strokeStyle = `rgba(168, 85, 247, ${0.12 + 0.18 * veinPulse})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const fx1 = tx + ts * (0.2 + 0.6 * seed);
      const fy1 = ty;
      const fmx = tx + ts * 0.5;
      const fmy = ty + ts * 0.5;
      const fx2 = tx + ts * (0.8 - 0.5 * seed);
      const fy2 = ty + ts;
      ctx.moveTo(fx1, fy1);
      ctx.lineTo(fmx, fmy);
      ctx.lineTo(fx2, fy2);
      ctx.stroke();
    } else {
      // Ancient Slate & Granite paver
      const baseGrad = ctx.createLinearGradient(tx, ty, tx + ts, ty + ts);
      if (isEven) {
        baseGrad.addColorStop(0, '#151e2b');
        baseGrad.addColorStop(1, '#0e141d');
      } else {
        baseGrad.addColorStop(0, '#111822');
        baseGrad.addColorStop(1, '#0a0e16');
      }
      ctx.fillStyle = baseGrad;
      ctx.fillRect(tx, ty, ts, ts);

      // 3D Bevel: Top & Left stone highlight edge
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.075)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty + ts);
      ctx.lineTo(tx, ty);
      ctx.lineTo(tx + ts, ty);
      ctx.stroke();

      // 3D Bevel: Bottom & Right cast shadow bevel
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx + ts, ty);
      ctx.lineTo(tx + ts, ty + ts);
      ctx.lineTo(tx, ty + ts);
      ctx.stroke();

      // Stone fissures & mineral aging on select flagstones
      if (seed > 0.4) {
        // Natural crack fracture
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cx1 = tx + ts * (0.15 + 0.3 * seed);
        const cy1 = ty + ts * (0.1 + 0.2 * seed);
        const cmx = tx + ts * (0.45 + 0.1 * seed);
        const cmy = ty + ts * (0.48 + 0.15 * seed);
        const cx2 = tx + ts * (0.75 + 0.15 * seed);
        const cy2 = ty + ts * (0.8 + 0.1 * seed);
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cmx, cmy);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();

        // 1px parallel specular highlight on the crack edge
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.beginPath();
        ctx.moveTo(cx1 + 0.7, cy1);
        ctx.lineTo(cmx + 0.7, cmy);
        ctx.lineTo(cx2 + 0.7, cy2);
        ctx.stroke();
      }

      // Fine stone texture stipples / flecks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fillRect(tx + ts * 0.25, ty + ts * 0.35, 1.5, 1.5);
      ctx.fillRect(tx + ts * 0.7, ty + ts * 0.65, 1.5, 1.5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(tx + ts * 0.35, ty + ts * 0.75, 1.5, 1.5);
    }

    ctx.restore();
  }

  private drawSafeEllipse(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number = 0
  ): void {
    if (ctx.ellipse) {
      ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2);
    } else {
      ctx.arc(x, y, Math.max(0.1, (rx + ry) / 2), 0, Math.PI * 2);
    }
  }

  /**
   * Renders dynamic animated procedural elemental hazards without static emoji placeholders.
   */
  private renderHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    type: TileHazardType,
    gx: number = 0,
    gy: number = 0
  ): void {
    ctx.save();
    const t = this.elapsedTotalTimeMs * 0.003;
    const tileSeed = ((gx * 31 + gy * 17) % 100) / 100;

    switch (type) {
      case 'Burning':
        this.renderRealisticFireHazard(ctx, x, y, size, t, tileSeed);
        break;
      case 'Puddle':
        this.renderRealisticPuddleHazard(ctx, x, y, size, t, tileSeed, false);
        break;
      case 'ElectrifiedPuddle':
        this.renderRealisticPuddleHazard(ctx, x, y, size, t, tileSeed, true);
        break;
      case 'ToxicMire':
        this.renderRealisticToxicMireHazard(ctx, x, y, size, t, tileSeed);
        break;
      case 'VoidRift':
        this.renderRealisticVoidRiftHazard(ctx, x, y, size, t);
        break;
      case 'LavaPool':
        this.renderRealisticLavaPoolHazard(ctx, x, y, size, t, tileSeed);
        break;
      case 'IceSurface':
        this.renderRealisticIceSurfaceHazard(ctx, x, y, size, tileSeed);
        break;
      case 'AcidPool':
        this.renderRealisticAcidPoolHazard(ctx, x, y, size, t, tileSeed);
        break;
      case 'CrystalSpikes':
        this.renderRealisticCrystalSpikesHazard(ctx, x, y, size, t, tileSeed);
        break;
      case 'BonePile':
        this.renderRealisticBonePileHazard(ctx, x, y, size, tileSeed);
        break;
      default:
        break;
    }
    ctx.restore();
  }

  private renderRealisticFireHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    t: number,
    seed: number
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    // 1. Warm radial ambient ground glow
    const glow = ctx.createRadialGradient(cx, cy + size * 0.1, 4, cx, cy, size * 0.55);
    glow.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
    glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, size, size);

    // 2. Charred ground scorch mark
    ctx.fillStyle = 'rgba(15, 7, 5, 0.55)';
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx, cy + size * 0.22, size * 0.35, size * 0.18);
    ctx.fill();

    // 3. Procedural flame tongues (layered depths)
    // Outer flame (scarlet / crimson)
    ctx.fillStyle = 'rgba(234, 88, 12, 0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.32, cy + size * 0.25);
    ctx.quadraticCurveTo(
      cx - size * 0.38 + Math.sin(t * 8) * 3,
      cy - size * 0.05,
      cx + Math.sin(t * 7) * 4,
      cy - size * 0.36
    );
    ctx.quadraticCurveTo(
      cx + size * 0.38 + Math.cos(t * 8) * 3,
      cy - size * 0.05,
      cx + size * 0.32,
      cy + size * 0.25
    );
    ctx.closePath();
    ctx.fill();

    // Mid flame (vibrant amber)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.22, cy + size * 0.24);
    ctx.quadraticCurveTo(
      cx - size * 0.25 + Math.cos(t * 9) * 2,
      cy,
      cx + Math.cos(t * 10) * 3,
      cy - size * 0.26
    );
    ctx.quadraticCurveTo(
      cx + size * 0.25 + Math.sin(t * 9) * 2,
      cy,
      cx + size * 0.22,
      cy + size * 0.24
    );
    ctx.closePath();
    ctx.fill();

    // Inner white-hot flame heart
    ctx.fillStyle = 'rgba(254, 240, 138, 0.95)';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.12, cy + size * 0.22);
    ctx.quadraticCurveTo(cx - size * 0.1, cy + size * 0.05, cx, cy - size * 0.12);
    ctx.quadraticCurveTo(cx + size * 0.1, cy + size * 0.05, cx + size * 0.12, cy + size * 0.22);
    ctx.closePath();
    ctx.fill();

    // 4. Rising glowing embers
    for (let i = 0; i < 5; i++) {
      const emberProgress = (t * 1.5 + i * 0.22 + seed) % 1;
      const emberY = cy + size * 0.2 - emberProgress * size * 0.75;
      const emberX = cx + Math.sin(t * 6 + i * 2.3) * (size * 0.25);
      const emberAlpha = Math.sin(emberProgress * Math.PI) * 0.9;
      ctx.fillStyle = `rgba(253, 224, 71, ${emberAlpha})`;
      ctx.fillRect(emberX, emberY, 2, 2);
    }
  }

  private renderRealisticPuddleHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    t: number,
    seed: number,
    isElectrified: boolean
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    // 1. Fluid organic water pool
    const poolGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.44);
    if (isElectrified) {
      poolGrad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
      poolGrad.addColorStop(0.7, 'rgba(14, 116, 144, 0.75)');
      poolGrad.addColorStop(1, 'rgba(3, 44, 75, 0.3)');
    } else {
      poolGrad.addColorStop(0, 'rgba(14, 165, 233, 0.5)');
      poolGrad.addColorStop(0.75, 'rgba(3, 105, 161, 0.7)');
      poolGrad.addColorStop(1, 'rgba(2, 44, 75, 0.2)');
    }
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx, cy, size * 0.42, size * 0.32);
    ctx.fill();

    // 2. Concentric dynamic ripples
    for (let r = 0; r < 2; r++) {
      const ripProg = (t * 1.1 + r * 0.5 + seed) % 1;
      const ripRadiusX = ripProg * size * 0.36;
      const ripRadiusY = ripProg * size * 0.26;
      const ripAlpha = (1 - ripProg) * 0.45;
      ctx.strokeStyle = isElectrified
        ? `rgba(254, 240, 138, ${ripAlpha})`
        : `rgba(224, 242, 254, ${ripAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      this.drawSafeEllipse(ctx, cx, cy, ripRadiusX, ripRadiusY);
      ctx.stroke();
    }

    // 3. Specular surface water sheen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - size * 0.12, cy - size * 0.08, size * 0.16, -Math.PI * 0.7, -Math.PI * 0.2);
    ctx.stroke();

    // 4. Crackling procedural lightning forks (if electrified)
    if (isElectrified) {
      const cycle = Math.floor(t * 18);
      const randSeed = (cycle * 9301 + 49297) % 233280;
      const rVal = randSeed / 233280;

      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      const startX = cx - size * 0.25 + rVal * size * 0.1;
      const startY = cy + (rVal - 0.5) * size * 0.3;
      ctx.moveTo(startX, startY);

      const midX1 = cx - size * 0.08 + (rVal * 2 % 1) * 4;
      const midY1 = cy - size * 0.15 + (rVal * 3 % 1) * 6;
      ctx.lineTo(midX1, midY1);

      const midX2 = cx + size * 0.08 - (rVal * 4 % 1) * 4;
      const midY2 = cy + size * 0.12 - (rVal * 5 % 1) * 6;
      ctx.lineTo(midX2, midY2);

      const endX = cx + size * 0.28;
      const endY = cy + (rVal * 7 % 1 - 0.5) * size * 0.25;
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Glowing core spark
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(midX1 - 1, midY1 - 1, 3, 3);
      ctx.fillRect(midX2 - 1, midY2 - 1, 3, 3);
      ctx.restore();
    }
  }

  private renderRealisticToxicMireHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    t: number,
    seed: number
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    // 1. Murky virulent sludge pool
    const mireGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.44);
    mireGrad.addColorStop(0, 'rgba(22, 101, 52, 0.8)');
    mireGrad.addColorStop(0.7, 'rgba(20, 83, 45, 0.9)');
    mireGrad.addColorStop(1, 'rgba(5, 46, 22, 0.4)');
    ctx.fillStyle = mireGrad;
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx, cy, size * 0.44, size * 0.36);
    ctx.fill();

    // 2. Slime bubble blisters swelling and popping
    const bubbleOffsets = [
      { dx: -0.15, dy: -0.1, maxR: 0.09 },
      { dx: 0.12, dy: -0.14, maxR: 0.08 },
      { dx: 0.16, dy: 0.1, maxR: 0.07 },
      { dx: -0.1, dy: 0.14, maxR: 0.06 },
    ];
    for (let i = 0; i < bubbleOffsets.length; i++) {
      const b = bubbleOffsets[i];
      const phase = (t * 2 + i * 1.5 + seed) % Math.PI;
      const r = Math.sin(phase) * (size * b.maxR);
      if (r > 1) {
        const bx = cx + size * b.dx;
        const by = cy + size * b.dy;
        ctx.fillStyle = 'rgba(74, 222, 128, 0.8)';
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();

        // Bubble crest highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(bx - r * 0.3, by - r * 0.3, 1.5, 1.5);
      }
    }

    // 3. Faint rising toxic fume wisps
    for (let i = 0; i < 3; i++) {
      const fumeProg = (t * 0.8 + i * 0.33) % 1;
      const fx = cx + Math.sin(t * 4 + i * 2) * (size * 0.15);
      const fy = cy - fumeProg * size * 0.5;
      const fAlpha = (1 - fumeProg) * 0.3;
      ctx.fillStyle = `rgba(134, 239, 172, ${fAlpha})`;
      ctx.beginPath();
      ctx.arc(fx, fy, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderRealisticVoidRiftHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    t: number
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const rot = t * 1.8;

    // 1. Swirling cosmic accretion glow
    const riftGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.44);
    riftGrad.addColorStop(0, 'rgba(10, 5, 20, 0.95)');
    riftGrad.addColorStop(0.5, 'rgba(124, 58, 237, 0.5)');
    riftGrad.addColorStop(1, 'rgba(217, 70, 239, 0)');
    ctx.fillStyle = riftGrad;
    ctx.fillRect(x, y, size, size);

    // 2. Gravitational event horizon (deep cosmic void sphere)
    ctx.fillStyle = '#020208';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 3. Ultraviolet event horizon boundary ring
    ctx.save();
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.21, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4. Rotating accretion spiral arms
    for (let arm = 0; arm < 3; arm++) {
      const armAngle = rot + arm * ((Math.PI * 2) / 3);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.34, armAngle, armAngle + 1.2);
      ctx.stroke();
    }

    // 5. Infalling cosmic particles
    for (let p = 0; p < 4; p++) {
      const distProg = (t * 0.9 + p * 0.25) % 1;
      const pDist = size * (0.38 - distProg * 0.18);
      const pAngle = rot * 2 + p * 1.6;
      const px = cx + Math.cos(pAngle) * pDist;
      const py = cy + Math.sin(pAngle) * pDist;
      ctx.fillStyle = '#e9d5ff';
      ctx.fillRect(px, py, 1.5, 1.5);
    }
  }

  private renderRealisticLavaPoolHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    t: number,
    seed: number
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    // 1. Incandescent molten magma base
    const lavaGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.44);
    lavaGrad.addColorStop(0, '#fef08a');
    lavaGrad.addColorStop(0.25, '#ea580c');
    lavaGrad.addColorStop(0.75, '#b91c1c');
    lavaGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = lavaGrad;
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx, cy, size * 0.44, size * 0.36);
    ctx.fill();

    // 2. Floating cooled basalt crust plates with drifting translation
    const drift = Math.sin(t * 1.5 + seed) * 1.5;
    const plates = [
      { px: cx - size * 0.22 + drift, py: cy - size * 0.15, w: size * 0.2, h: size * 0.18 },
      { px: cx + size * 0.08 - drift, py: cy - size * 0.18, w: size * 0.22, h: size * 0.2 },
      { px: cx - size * 0.18 - drift, py: cy + size * 0.08, w: size * 0.24, h: size * 0.18 },
      { px: cx + size * 0.12 + drift, py: cy + size * 0.1, w: size * 0.18, h: size * 0.16 },
    ];
    for (const pl of plates) {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(pl.px, pl.py, pl.w, pl.h);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 1;
      ctx.strokeRect(pl.px, pl.py, pl.w, pl.h);
    }

    // 3. Popping molten sparks
    for (let s = 0; s < 3; s++) {
      const sparkProg = (t * 2 + s * 0.33 + seed) % 1;
      const sx = cx + Math.sin(t * 5 + s * 2) * (size * 0.25);
      const sy = cy - sparkProg * size * 0.4;
      ctx.fillStyle = `rgba(254, 240, 138, ${1 - sparkProg})`;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  private renderRealisticIceSurfaceHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    seed: number
  ): void {
    // 1. Translucent glacial ice sheet overlay
    ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // 2. High specular icy sheen
    const sheen = ctx.createLinearGradient(x, y, x + size, y + size);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    sheen.addColorStop(0.5, 'rgba(186, 230, 253, 0.15)');
    sheen.addColorStop(1, 'rgba(56, 189, 248, 0.35)');
    ctx.fillStyle = sheen;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // 3. Sharp internal stress fracture lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const cx1 = x + size * (0.2 + 0.2 * seed);
    const cy1 = y + size * 0.15;
    const cmx = x + size * 0.52;
    const cmy = y + size * 0.48;
    const cx2 = x + size * (0.8 - 0.2 * seed);
    const cy2 = y + size * 0.85;
    ctx.moveTo(cx1, cy1);
    ctx.lineTo(cmx, cmy);
    ctx.lineTo(cx2, cy2);

    // Secondary fracture branch
    ctx.moveTo(cmx, cmy);
    ctx.lineTo(x + size * 0.25, y + size * 0.75);
    ctx.stroke();

    // 4. Crystalline frost border
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
  }

  private renderRealisticAcidPoolHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    t: number,
    seed: number
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    // 1. Caustic effervescent bright lime liquid
    const acidGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.42);
    acidGrad.addColorStop(0, '#bef264');
    acidGrad.addColorStop(0.7, '#84cc16');
    acidGrad.addColorStop(1, '#3f6212');
    ctx.fillStyle = acidGrad;
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx, cy, size * 0.42, size * 0.34);
    ctx.fill();

    // 2. Rapidly fizzing effervescence micro-bubbles
    for (let b = 0; b < 6; b++) {
      const bPhase = (t * 3.5 + b * 0.8 + seed) % 1;
      const bx = cx + Math.sin(b * 1.7 + seed) * (size * 0.28);
      const by = cy + (bPhase - 0.5) * (size * 0.35);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(bx, by, 1.5, 1.5);
    }

    // 3. Sizzling caustic edge ring
    ctx.strokeStyle = 'rgba(190, 242, 100, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx, cy, size * 0.42, size * 0.34);
    ctx.stroke();
  }

  private renderRealisticCrystalSpikesHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    t: number,
    seed: number
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    // 1. Drop shadow cast on flagstone
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx + size * 0.05, cy + size * 0.22, size * 0.32, size * 0.12);
    ctx.fill();

    // 2. 3D-shaded faceted crystal spires
    const spires = [
      { sx: cx - size * 0.14, sy: cy + size * 0.18, peakX: cx - size * 0.18, peakY: cy - size * 0.25, w: size * 0.1 },
      { sx: cx, sy: cy + size * 0.2, peakX: cx, peakY: cy - size * 0.38, w: size * 0.13 },
      { sx: cx + size * 0.16, sy: cy + size * 0.18, peakX: cx + size * 0.18, peakY: cy - size * 0.28, w: size * 0.11 },
    ];
    for (const sp of spires) {
      // Lit left facet
      ctx.fillStyle = '#d8b4fe';
      ctx.beginPath();
      ctx.moveTo(sp.sx - sp.w, sp.sy);
      ctx.lineTo(sp.peakX, sp.peakY);
      ctx.lineTo(sp.sx, sp.sy);
      ctx.closePath();
      ctx.fill();

      // Shadowed right facet
      ctx.fillStyle = '#7e22ce';
      ctx.beginPath();
      ctx.moveTo(sp.sx, sp.sy);
      ctx.lineTo(sp.peakX, sp.peakY);
      ctx.lineTo(sp.sx + sp.w, sp.sy);
      ctx.closePath();
      ctx.fill();

      // Sharp specular glint on crystal tip with subtle magical shimmer
      const shimmer = 0.8 + 0.2 * Math.sin(t * 4 + seed * 5);
      ctx.fillStyle = `rgba(255, 255, 255, ${shimmer})`;
      ctx.fillRect(sp.peakX - 1, sp.peakY - 1, 2, 2);
    }
  }

  private renderRealisticBonePileHazard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    seed: number
  ): void {
    const cx = x + size / 2;
    const cy = y + size / 2;

    // 1. Soft cast shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx, cy + size * 0.15, size * 0.35, size * 0.16);
    ctx.fill();

    // 2. Crossed long femur bones
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    // Bone 1
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.25, cy - size * 0.15);
    ctx.lineTo(cx + size * 0.25, cy + size * 0.15);
    ctx.stroke();
    // Bone 2
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.25, cy + size * 0.15);
    ctx.lineTo(cx + size * 0.25, cy - size * 0.15);
    ctx.stroke();

    // Rounded bone condyle ends
    ctx.fillStyle = '#e2e8f0';
    const condyles = [
      { x: cx - size * 0.25, y: cy - size * 0.15 },
      { x: cx + size * 0.25, y: cy + size * 0.15 },
      { x: cx - size * 0.25, y: cy + size * 0.15 },
      { x: cx + size * 0.25, y: cy - size * 0.15 },
    ];
    for (const cd of condyles) {
      ctx.beginPath();
      ctx.arc(cd.x, cd.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Weathered cranium / skull center with seed-based rotation angle
    const skullAngle = (seed - 0.5) * 0.3;
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx, cy - size * 0.05, size * 0.16, size * 0.14, skullAngle);
    ctx.fill();

    // Hollow eye sockets & nasal cavity
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx - size * 0.06, cy - size * 0.05, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.06, cy - size * 0.05, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 1, cy, 2, 3);
    ctx.restore();
  }

  /**
   * Renders 3D-shaded realistic stone obstacles and themed barricades.
   */
  private renderObstacle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    icon: string = '🪨',
    gx: number = 0,
    gy: number = 0
  ): void {
    ctx.save();
    const cx = x + size / 2;
    const cy = y + size / 2;
    const seed = ((gx * 67 + gy * 31 + 13) % 100) / 100;

    if (icon === '🪨' || !icon) {
      this.renderRealisticBoulder(ctx, cx, cy, size, seed);
    } else if (icon === '🪵') {
      this.renderRealisticBarricade(ctx, cx, cy, size, seed);
    } else if (icon === '💎') {
      this.renderRealisticCrystalMonolith(ctx, cx, cy, size, seed);
    } else {
      // Architectural 3D stone plinth pedestal with embossed icon
      this.renderEmbossedStonePlinth(ctx, cx, cy, size, icon);
    }

    ctx.restore();
  }

  private renderRealisticBoulder(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    seed: number
  ): void {
    // 1. Ground contact drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx + size * 0.06, cy + size * 0.28, size * 0.38, size * 0.18, 0.2);
    ctx.fill();

    // 2. Rugged organic boulder silhouette
    const r = size * 0.36;
    const var1 = (seed - 0.5) * 4;
    const var2 = (seed * 3 % 1 - 0.5) * 4;

    const rockGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rockGrad.addColorStop(0, '#64748b');
    rockGrad.addColorStop(0.5, '#334155');
    rockGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = rockGrad;

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.8, cy + r * 0.4);
    ctx.lineTo(cx - r * 0.95, cy - r * 0.1 + var1);
    ctx.lineTo(cx - r * 0.5, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.2 + var2, cy - r * 0.95);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.95, cy + r * 0.35);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.85);
    ctx.lineTo(cx - r * 0.4, cy + r * 0.8);
    ctx.closePath();
    ctx.fill();

    // 3. Lit top-left faceted stone ridge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r * 0.85);
    ctx.lineTo(cx + r * 0.2 + var2, cy - r * 0.95);
    ctx.lineTo(cx, cy - r * 0.2);
    ctx.closePath();
    ctx.fill();

    // 4. Shadowed bottom-right facet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.2);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.95, cy + r * 0.35);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.85);
    ctx.closePath();
    ctx.fill();

    // 5. Stone fracture crevices
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.3, cy - r * 0.4);
    ctx.lineTo(cx - r * 0.05, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.25, cy + r * 0.35);
    ctx.stroke();

    // Crevice highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.3 + 1, cy - r * 0.4);
    ctx.lineTo(cx - r * 0.05 + 1, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.25 + 1, cy + r * 0.35);
    ctx.stroke();

    // 6. Natural moss / lichen speckle in crevices
    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
    ctx.fillRect(cx - r * 0.4, cy + r * 0.45, 3, 2);
    ctx.fillRect(cx - r * 0.2, cy + r * 0.55, 2, 2);
  }

  private renderRealisticBarricade(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    seed: number
  ): void {
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx, cy + size * 0.25, size * 0.36, size * 0.15);
    ctx.fill();

    // Heavy timber cross logs
    ctx.save();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = size * 0.12;

    // Log 1
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.3, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.2);
    ctx.stroke();

    // Log 2
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.3, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.2);
    ctx.stroke();

    // Sharpened stake highlights with seed knot variation
    const knotOffset = (seed - 0.5) * 4;
    ctx.fillStyle = '#b45309';
    ctx.fillRect(cx - 3 + knotOffset, cy - 3, 6, 6);

    // Iron binding strapping
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - size * 0.08, cy - size * 0.08, size * 0.16, size * 0.16);
    ctx.restore();
  }

  private renderRealisticCrystalMonolith(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    seed: number
  ): void {
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    this.drawSafeEllipse(ctx, cx + size * 0.05, cy + size * 0.28, size * 0.32, size * 0.14);
    ctx.fill();

    // Massive faceted amethyst / diamond crystal obelisk with height variation
    const h = size * (0.38 + seed * 0.05);
    const w = size * 0.18;

    // Left facet
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.moveTo(cx - w, cy + size * 0.2);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx, cy + size * 0.25);
    ctx.closePath();
    ctx.fill();

    // Right facet
    ctx.fillStyle = '#6b21a8';
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.25);
    ctx.lineTo(cx, cy - h);
    ctx.lineTo(cx + w, cy + size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Specular edge highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.25);
    ctx.lineTo(cx, cy - h);
    ctx.stroke();
  }

  private renderEmbossedStonePlinth(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    icon: string
  ): void {
    const s = size * 0.72;
    const px = cx - s / 2;
    const py = cy - s / 2;

    // Plinth drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(px + 4, py + 4, s, s);

    // Stone plinth body
    const plinthGrad = ctx.createLinearGradient(px, py, px + s, py + s);
    plinthGrad.addColorStop(0, '#334155');
    plinthGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = plinthGrad;
    ctx.fillRect(px, py, s, s);

    // Bevel highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, s, s);

    // Embossed icon
    ctx.font = `${Math.floor(size * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy);
  }

  private renderUnits(ctx: CanvasRenderingContext2D, focusedUnitId: string | null): void {
    const allUnits = [
      this.combatEngine.hero,
      ...(this.combatEngine.coopHero ? [this.combatEngine.coopHero] : []),
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
      const isWizardZombie = isZombie && unit.zombieClass === 'Wizard';
      const isRooted = unit.statusEffects.some((s) => s.type === 'Rooted');

      let zombieGlow = '#84cc16';
      let zombieBorder = '#84cc16';
      let zombieBg = '#14280f';

      if (isZombie) {
        switch (unit.zombieClass) {
          case 'Wizard':
            zombieGlow = '#c084fc';
            zombieBorder = '#c084fc';
            zombieBg = '#2e1065';
            break;
          case 'Boomer':
            zombieGlow = '#f97316';
            zombieBorder = '#fb923c';
            zombieBg = '#431407';
            break;
          case 'Frostbite':
            zombieGlow = '#38bdf8';
            zombieBorder = '#7dd3fc';
            zombieBg = '#082f49';
            break;
          case 'DeathKnight':
            zombieGlow = '#ef4444';
            zombieBorder = '#f87171';
            zombieBg = '#450a0a';
            break;
          case 'Screamer':
            zombieGlow = '#f472b6';
            zombieBorder = '#f472b6';
            zombieBg = '#500724';
            break;
          case 'PlagueBearer':
            zombieGlow = '#84cc16';
            zombieBorder = '#a3e635';
            zombieBg = '#14532d';
            break;
          case 'Electro':
            zombieGlow = '#eab308';
            zombieBorder = '#fde047';
            zombieBg = '#422006';
            break;
          case 'Brute':
            zombieGlow = '#d97706';
            zombieBorder = '#fbbf24';
            zombieBg = '#292524';
            break;
          case 'Runner':
            zombieGlow = '#84cc16';
            zombieBorder = '#bef264';
            zombieBg = '#14280f';
            break;
          case 'Spitter':
            zombieGlow = '#10b981';
            zombieBorder = '#34d399';
            zombieBg = '#064e3b';
            break;
        }
      }

      ctx.shadowColor = isBoss
        ? '#f59e0b'
        : isZombie
        ? zombieGlow
        : isLifeBeing
        ? '#4ade80'
        : isFocused
        ? '#fef08a'
        : elemData
        ? elemData.glowColor
        : 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = (isBoss || isWizardZombie ? 26 : isZombie || isLifeBeing ? 20 : isFocused ? 22 : 14) + auraPulse;

      // Boss or Wizard Zombie Orbital Runic Particles
      if (isBoss || isWizardZombie) {
        const orbitAngle = this.elapsedTotalTimeMs * (isWizardZombie ? 0.003 : 0.002);
        const orbitRadius = radius + (isWizardZombie ? 6 : 8);
        const count = isWizardZombie ? 4 : 3;
        for (let i = 0; i < count; i++) {
          const angle = orbitAngle + (i * Math.PI * 2) / count;
          const ox = screenPos.x + Math.cos(angle) * orbitRadius;
          const oy = screenPos.y + Math.sin(angle) * orbitRadius;
          ctx.fillStyle = isWizardZombie ? '#d8b4fe' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(ox, oy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Unit Background Ring
      ctx.fillStyle = isPlayerHero
        ? '#0f172a'
        : isZombie
        ? zombieBg
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
        ? zombieBorder
        : isLifeBeing
        ? '#4ade80'
        : isFocused
        ? '#fef08a'
        : isPlayerHero
        ? '#38bdf8'
        : '#818cf8';
      ctx.lineWidth = isBoss || isWizardZombie ? 4.5 : isZombie || isLifeBeing ? 3.5 : isFocused ? 4 : 3;
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
        : isWizardZombie
        ? '#c084fc'
        : isZombie
        ? zombieBorder
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

      // Co-op P1 / P2 Indicator
      if (this.combatEngine.coopHero) {
        if (unit.id === this.combatEngine.hero.id) {
          ctx.font = 'bold 10px "Fira Code", monospace';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('P1 🧙', screenPos.x, hpY - 7);
        } else if (unit.id === this.combatEngine.coopHero.id) {
          ctx.font = 'bold 10px "Fira Code", monospace';
          ctx.fillStyle = '#c084fc';
          ctx.fillText('P2 🧙', screenPos.x, hpY - 7);
        }
      }

      // Unit Special Indicator
      if (isRooted) {
        ctx.font = 'bold 10px "Fira Code", monospace';
        ctx.fillStyle = '#c084fc';
        ctx.fillText('[⛓️ ROOTED]', screenPos.x, hpY - (isBoss ? 18 : 6));
      } else if (isZombie && unit.zombieLifetime !== undefined) {
        ctx.font = 'bold 11px "Fira Code", monospace';
        let label = `[🧟 Walker ${unit.zombieLifetime}t]`;
        let labelColor = '#a3e635';

        switch (unit.zombieClass) {
          case 'Wizard':
            label = `[🧙‍♂️ Wizard ${unit.zombieLifetime}t]`;
            labelColor = '#d8b4fe';
            break;
          case 'Brute':
            label = `[🛡️ Brute ${unit.zombieLifetime}t]`;
            labelColor = '#fbbf24';
            break;
          case 'Runner':
            label = `[⚡ Runner ${unit.zombieLifetime}t]`;
            labelColor = '#bef264';
            break;
          case 'Spitter':
            label = `[🧪 Spitter ${unit.zombieLifetime}t]`;
            labelColor = '#34d399';
            break;
          case 'Boomer':
            label = `[💣 Boomer ${unit.zombieLifetime}t]`;
            labelColor = '#fdba74';
            break;
          case 'Frostbite':
            label = `[❄️ Frostbite ${unit.zombieLifetime}t]`;
            labelColor = '#7dd3fc';
            break;
          case 'DeathKnight':
            label = `[⚔️ Knight ${unit.zombieLifetime}t]`;
            labelColor = '#fca5a5';
            break;
          case 'Screamer':
            label = `[😱 Screamer ${unit.zombieLifetime}t]`;
            labelColor = '#f472b6';
            break;
          case 'PlagueBearer':
            label = `[🦠 Plague ${unit.zombieLifetime}t]`;
            labelColor = '#86efac';
            break;
          case 'Electro':
            label = `[⚡ Electro ${unit.zombieLifetime}t]`;
            labelColor = '#fde047';
            break;
        }
        ctx.fillStyle = labelColor;
        ctx.fillText(label, screenPos.x, hpY - 6);
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
