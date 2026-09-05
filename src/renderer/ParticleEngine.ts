// Elemental Mayhem - Advanced Canvas Particle, Shockwave & Death FX Engine
import { ElementType, Unit } from '../types';
import { CORE_ELEMENTS } from '../constants/elements';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  life: number;
  shape?: 'circle' | 'spark' | 'ring' | 'star' | 'crystal' | 'skull';
  rotation?: number;
  vRot?: number;
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
  size: number;
  scale: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  speed: number;
  lineWidth: number;
}

export interface BeamEffect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  alpha: number;
  durationMs: number;
  elapsedMs: number;
}

export interface AscendingSoul {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  alpha: number;
  color: string;
  avatar: string;
  scale: number;
  isBoss?: boolean;
  isPlayer?: boolean;
}

export class ParticleEngine {
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private shockwaves: Shockwave[] = [];
  private beams: BeamEffect[] = [];
  private ascendingSouls: AscendingSoul[] = [];

  // Screen Flash & Vignette System (Player Death & Cataclysms)
  public deathFlashAlpha: number = 0;
  public deathFlashColor: string = '#ffffff';
  public deathVignetteAlpha: number = 0;
  public deathVignetteColor: string = '#ef4444';

  // Screen Shake system
  private shakeIntensity: number = 0;
  private shakeDurationMs: number = 0;
  private shakeElapsedMs: number = 0;

  public triggerScreenShake(intensity: number = 6, durationMs: number = 240): void {
    this.shakeIntensity = intensity;
    this.shakeDurationMs = durationMs;
    this.shakeElapsedMs = 0;
  }

  public getScreenShakeOffset(): { x: number; y: number } {
    if (this.shakeElapsedMs >= this.shakeDurationMs || this.shakeIntensity <= 0) {
      return { x: 0, y: 0 };
    }
    const decay = 1.0 - this.shakeElapsedMs / this.shakeDurationMs;
    const currentMag = this.shakeIntensity * decay;
    return {
      x: (Math.random() * 2 - 1) * currentMag,
      y: (Math.random() * 2 - 1) * currentMag,
    };
  }

  public emit(
    x: number,
    y: number,
    color: string,
    count: number = 15,
    speed: number = 2.5,
    shape: 'circle' | 'spark' | 'ring' | 'star' | 'crystal' | 'skull' = 'circle'
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * speed + 0.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 5 + 2,
        color,
        alpha: 1.0,
        decay: Math.random() * 0.025 + 0.015,
        life: 1.0,
        shape,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  public addShockwave(x: number, y: number, color: string, maxRadius: number = 48, speed: number = 3.5): void {
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius,
      color,
      alpha: 1.0,
      speed,
      lineWidth: 3,
    });
  }

  public addBeam(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string,
    width: number = 6,
    durationMs: number = 250
  ): void {
    this.beams.push({
      startX,
      startY,
      endX,
      endY,
      color,
      width,
      alpha: 1.0,
      durationMs,
      elapsedMs: 0,
    });
  }

  public addFloatingText(
    text: string,
    x: number,
    y: number,
    color: string = '#f8fafc',
    size: number = 18
  ): void {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1.0,
      vy: -1.4,
      size,
      scale: 1.3,
    });
  }

  /**
   * Triggers an extraordinary element-specific death animation sequence with
   * ascending spirit, custom particle physics, slow-motion shockwaves, and death text!
   */
  public triggerDeathAnimation(
    unit: Unit,
    x: number,
    y: number,
    killerElement?: ElementType
  ): void {
    const elem = killerElement || unit.stats.elementalAffinity || 'Fire';
    const elemData = CORE_ELEMENTS[elem] || CORE_ELEMENTS.Fire;
    const isBoss = !!unit.isBoss;
    const isPlayer = unit.faction === 'Player' || unit.id === 'hero';

    // 1. Epic Screen Shake (Player, Boss, and CPU)
    this.triggerScreenShake(isPlayer ? 28 : isBoss ? 28 : 22, isPlayer ? 1400 : isBoss ? 1300 : 950);

    // 2. Fullscreen Flash & Radial Death Vignette for CPUs, Bosses, and Players
    this.deathFlashAlpha = isPlayer ? 0.9 : isBoss ? 0.85 : 0.75;
    this.deathFlashColor = elemData.color || '#ffffff';
    this.deathVignetteAlpha = isPlayer ? 1.0 : isBoss ? 0.95 : 0.85;
    this.deathVignetteColor = isPlayer ? '#dc2626' : isBoss ? '#f59e0b' : elemData.color || '#9333ea';

    // 3. 4-Tier Concentric Shockwaves for All Units
    this.addShockwave(x, y, '#ffffff', isPlayer ? 140 : isBoss ? 130 : 110, 8.5);
    this.addShockwave(x, y, elemData.color, isPlayer ? 240 : isBoss ? 220 : 190, 5.5);
    this.addShockwave(x, y, elemData.glowColor || '#ffd000', isPlayer ? 340 : isBoss ? 310 : 270, 4.0);
    this.addShockwave(x, y, isBoss ? '#f59e0b' : isPlayer ? '#ef4444' : elemData.color, isPlayer ? 420 : isBoss ? 390 : 340, 2.8);

    // 4. Ascending Soul Spirit with Celestial Halo & Trailing Stardust
    this.ascendingSouls.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: isPlayer ? -1.1 : isBoss ? -1.2 : -1.25,
      rotation: 0,
      vRot: (Math.random() - 0.5) * 0.03,
      alpha: 1.0,
      color: elemData.color,
      avatar: unit.avatar,
      scale: isPlayer ? 1.7 : isBoss ? 1.6 : 1.45,
      isBoss,
      isPlayer,
    });

    // 5. Radial Elemental Energy Beams (8 Cardinal Directions)
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const dist = isPlayer ? 180 : isBoss ? 170 : 145;
      const bx = x + Math.cos(angle) * dist;
      const by = y + Math.sin(angle) * dist;
      this.addBeam(x, y, bx, by, elemData.color, isPlayer ? 8 : 6.5, isPlayer ? 850 : 750);
    }

    // 6. Custom Elemental Death Explosions & Typography
    const elemName = elem.toString().toLowerCase();

    // Dense High-Impact Particle Burst
    this.emit(x, y, elemData.color, isPlayer ? 55 : isBoss ? 50 : 45, 6.0, 'star');
    this.emit(x, y, '#ffffff', 35, 5.0, 'spark');
    this.emit(x, y, elemData.glowColor || '#ffd000', 30, 4.5, 'crystal');
    this.emit(x, y, isBoss ? '#f59e0b' : isPlayer ? '#ef4444' : elemData.color, 25, 3.5, 'ring');

    if (isPlayer) {
      this.addFloatingText('💀 CHAMPION FALLEN!', x, y - 50, '#f43f5e', 32);
      this.addFloatingText(`✨ ${elem.toUpperCase()} ESSENCE EXTINGUISHED`, x, y - 18, elemData.color, 20);
    } else if (isBoss) {
      this.addFloatingText('👑 TITAN FELLED!', x, y - 48, '#fbbf24', 30);
      this.addFloatingText(`✨ ${elem.toUpperCase()} TITAN ESSENCE EXTRACTED`, x, y - 18, elemData.color, 20);
    } else {
      this.addFloatingText('💀 CPU OBLITERATED!', x, y - 48, '#fb7185', 28);
      this.addFloatingText(`✨ ${elem.toUpperCase()} ESSENCE HARVESTED`, x, y - 18, elemData.color, 20);
    }

    // Elemental Specialization FX
    if (elemName.includes('fire') || elemName.includes('magma') || elemName.includes('heat')) {
      this.emit(x, y, '#ff6b35', 35, 4.5, 'spark');
      this.emit(x, y, '#fbbf24', 20, 3.5, 'circle');
      this.emit(x, y, '#78716c', 15, 2.0, 'circle'); // Smoke embers
      this.addFloatingText('🔥 INCINERATED!', x, y + 16, '#ff6b35', 22);
    } else if (elemName.includes('lightning') || elemName.includes('storm') || elemName.includes('electric') || elemName.includes('thunder')) {
      this.emit(x, y, '#ffd000', 40, 5.5, 'spark');
      this.emit(x, y, '#38bdf8', 25, 4.0, 'spark');
      // Cross lightning beams
      this.addBeam(x - 30, y - 30, x + 30, y + 30, '#ffd000', 4, 300);
      this.addBeam(x + 30, y - 30, x - 30, y + 30, '#38bdf8', 4, 300);
      this.addFloatingText('⚡ VAPORIZED!', x, y + 16, '#ffd000', 22);
    } else if (elemName.includes('ice') || elemName.includes('cold') || elemName.includes('frost')) {
      this.emit(x, y, '#67e8f9', 45, 4.0, 'crystal');
      this.emit(x, y, '#e0f2fe', 20, 2.5, 'spark');
      this.addFloatingText('❄️ SHATTERED!', x, y + 16, '#67e8f9', 22);
    } else if (elemName.includes('undead') || elemName.includes('death') || elemName.includes('dark') || elemName.includes('void')) {
      this.emit(x, y, '#a855f7', 35, 4.0, 'spark');
      this.emit(x, y, '#22c55e', 20, 3.0, 'skull');
      this.emit(x, y, '#1e1b4b', 20, 2.0, 'circle');
      this.addFloatingText('💀 SOUL SHATTERED!', x, y + 16, '#c084fc', 22);
    } else if (elemName.includes('life') || elemName.includes('light') || elemName.includes('nature') || elemName.includes('love')) {
      this.emit(x, y, '#4ade80', 35, 4.0, 'star');
      this.emit(x, y, '#fef08a', 25, 3.5, 'circle');
      this.addBeam(x, y + 20, x, y - 60, '#fef08a', 8, 350);
      this.addFloatingText('🌸 PURIFIED!', x, y + 16, '#4ade80', 22);
    } else if (elemName.includes('earth') || elemName.includes('metal') || elemName.includes('force')) {
      this.emit(x, y, '#ca8a04', 35, 4.0, 'crystal');
      this.emit(x, y, '#94a3b8', 25, 3.0, 'spark');
      this.addFloatingText('🪨 CRUSHED!', x, y + 16, '#ca8a04', 22);
    }
  }

  public update(deltaTimeMs: number = 16): void {
    // Screen shake update
    if (this.shakeElapsedMs < this.shakeDurationMs) {
      this.shakeElapsedMs += deltaTimeMs;
    }

    // Fade screen flash and vignette
    if (this.deathFlashAlpha > 0) {
      this.deathFlashAlpha = Math.max(0, this.deathFlashAlpha - deltaTimeMs * 0.0014);
    }
    if (this.deathVignetteAlpha > 0) {
      this.deathVignetteAlpha = Math.max(0, this.deathVignetteAlpha - deltaTimeMs * 0.0004);
    }

    // Update ascending souls
    for (let i = this.ascendingSouls.length - 1; i >= 0; i--) {
      const soul = this.ascendingSouls[i];
      soul.x += soul.vx;
      soul.y += soul.vy;
      soul.rotation += soul.vRot;
      soul.alpha -= 0.007;

      // Emit trailing spirit stardust for all souls
      if (Math.random() < 0.65) {
        this.emit(soul.x, soul.y + 10, soul.color, 2, 1.0, 'star');
      }
      if (Math.random() < 0.4) {
        this.emit(soul.x, soul.y + 8, '#ffffff', 1, 0.6, 'spark');
      }

      if (soul.alpha <= 0) {
        this.ascendingSouls.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.rotation !== undefined && p.vRot !== undefined) {
        p.rotation += p.vRot;
      }
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.018;
      ft.scale = Math.max(1.0, ft.scale - 0.02);
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha = Math.max(0, 1.0 - sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update beams
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const beam = this.beams[i];
      beam.elapsedMs += deltaTimeMs;
      beam.alpha = Math.max(0, 1.0 - beam.elapsedMs / beam.durationMs);
      if (beam.elapsedMs >= beam.durationMs) {
        this.beams.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 1. Render Beams
    for (const beam of this.beams) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, beam.alpha);
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = beam.width;
      ctx.shadowColor = beam.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(beam.startX, beam.startY);
      ctx.lineTo(beam.endX, beam.endY);
      ctx.stroke();

      // Inner intense core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, beam.width * 0.4);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Render Shockwaves
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Render Ascending Ghostly Souls
    for (const soul of this.ascendingSouls) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, soul.alpha);
      ctx.translate(soul.x, soul.y);
      ctx.rotate(soul.rotation);
      ctx.scale(soul.scale, soul.scale);

      // Ethereal Aura
      ctx.shadowColor = soul.color;
      ctx.shadowBlur = soul.isPlayer ? 32 : soul.isBoss ? 28 : 24;
      ctx.font = `${soul.isPlayer ? 42 : soul.isBoss ? 38 : 34}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(soul.avatar, 0, 0);

      // Celestial halo for player & CPUs, Spirit crown for boss
      ctx.save();
      ctx.strokeStyle = soul.isBoss ? '#f59e0b' : soul.isPlayer ? '#ffd000' : (soul.color || '#38bdf8');
      ctx.lineWidth = 2.5;
      ctx.shadowColor = soul.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.ellipse(0, -32, 22, 7, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '16px sans-serif';
      ctx.fillText(soul.isBoss ? '👑' : soul.isPlayer ? '✨' : '⭐', 0, -33);
      ctx.restore();

      ctx.restore();
    }

    // 4. Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      if (p.shape === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.shape === 'star') {
        ctx.translate(p.x, p.y);
        if (p.rotation) ctx.rotate(p.rotation);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          ctx.lineTo(Math.cos(((18 + i * 72) * Math.PI) / 180) * p.size, -Math.sin(((18 + i * 72) * Math.PI) / 180) * p.size);
          ctx.lineTo(Math.cos(((54 + i * 72) * Math.PI) / 180) * (p.size / 2), -Math.sin(((54 + i * 72) * Math.PI) / 180) * (p.size / 2));
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'crystal') {
        ctx.translate(p.x, p.y);
        if (p.rotation) ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size / 2, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size / 2, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Render Floating Texts
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${Math.floor(ft.size * ft.scale)}px "Outfit", sans-serif`;

      // Glow outline
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#050811';
      ctx.strokeText(ft.text, ft.x, ft.y);

      // Text fill
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 6. Fullscreen Death Flash & Vignette
    if (this.deathFlashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.deathFlashAlpha);
      ctx.fillStyle = this.deathFlashColor;
      ctx.fillRect(-100, -100, 1000, 1000);
      ctx.restore();
    }

    if (this.deathVignetteAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.deathVignetteAlpha);
      const grad = ctx.createRadialGradient(400, 400, 160, 400, 400, 520);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.65, 'rgba(220, 38, 38, 0.4)');
      grad.addColorStop(1.0, 'rgba(15, 23, 42, 0.92)');
      ctx.fillStyle = grad;
      ctx.fillRect(-100, -100, 1000, 1000);
      ctx.restore();
    }

    ctx.restore();
  }
}
