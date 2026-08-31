// Elemental Mayhem - Advanced Canvas Particle, Shockwave & FX Engine

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
  shape?: 'circle' | 'spark' | 'ring' | 'star';
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

export class ParticleEngine {
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private shockwaves: Shockwave[] = [];
  private beams: BeamEffect[] = [];

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
    shape: 'circle' | 'spark' | 'ring' | 'star' = 'circle'
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

  public update(deltaTimeMs: number = 16): void {
    // Screen shake update
    if (this.shakeElapsedMs < this.shakeDurationMs) {
      this.shakeElapsedMs += deltaTimeMs;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
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

    // 3. Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      if (p.shape === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
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

    // 4. Render Floating Texts
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

    ctx.restore();
  }
}
