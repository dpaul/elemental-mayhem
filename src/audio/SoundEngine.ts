// Elemental Mayhem - Web Audio Synthesizer & Sound FX Engine
// Procedural audio: screams, combat impacts, elemental spells, and ambient audio

export class SoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  public masterVolume: number = 0.45;
  private lastZombieScreamTime: number = 0;
  private lastZombieSpawnTime: number = 0;

  constructor() {
    // Lazy initialize on first interaction to adhere to browser autoplay policy
  }

  private initContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    try {
      const g = typeof window !== 'undefined' ? (window as any) : (globalThis as any);
      const AudioContextClass = g.AudioContext || g.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    } catch {
      this.ctx = null;
    }

    return this.ctx;
  }

  public unlockAudio(): void {
    const ctx = this.initContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  private createGain(ctx: AudioContext, initialGain: number): GainNode {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(initialGain * (this.isMuted ? 0 : this.masterVolume), ctx.currentTime);
    gain.connect(ctx.destination);
    return gain;
  }

  // ==========================================
  // ZOMBIE SCREAMS & SCREAMER WAILS
  // ==========================================

  /**
   * Terrifying guttural zombie scream with pitch sweep and distorted harmonics
   */
  public playZombieScream(): void {
    const now = Date.now();
    if (now - this.lastZombieScreamTime < 100) return;
    this.lastZombieScreamTime = now;

    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.4);

    // Primary scream oscillator (descending pitch with vibrato)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.65);

    // Vibrato LFO for eerie undead throat tremor
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(28, t);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(45, t);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Formant filter (vocal tract simulation)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(4.0, t);

    // Distortion/Overdrive waveshaper
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(18) as any;

    // Envelope
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0.01, t);
    envGain.gain.linearRampToValueAtTime(0.5, t + 0.08);
    envGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(shaper);
    shaper.connect(filter);
    filter.connect(envGain);
    envGain.connect(masterGain);

    // Deep chest sub-rumble
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(45, t + 0.6);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.2, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    subOsc.connect(subGain);
    subGain.connect(masterGain);

    lfo.start(t);
    osc.start(t);
    subOsc.start(t);

    lfo.stop(t + 0.72);
    osc.stop(t + 0.72);
    subOsc.stop(t + 0.72);
  }

  /**
   * Piercing high-frequency ultrasonic Screamer Banshee Shriek
   */
  public playScreamerWail(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.45);

    // High screeching twin oscillators
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(950, t);
    osc1.frequency.linearRampToValueAtTime(1400, t + 0.2);
    osc1.frequency.exponentialRampToValueAtTime(320, t + 0.8);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(980, t);
    osc2.frequency.linearRampToValueAtTime(1450, t + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(310, t + 0.8);

    // Tremolo LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(35, t);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(60, t);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(400, t);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.6, t + 0.05);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(masterGain);

    lfo.start(t);
    osc1.start(t);
    osc2.start(t);

    lfo.stop(t + 0.9);
    osc1.stop(t + 0.9);
    osc2.stop(t + 0.9);
  }

  /**
   * Flesh tearing, visceral crunchy zombie bite sound
   */
  public playZombieBite(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.5);

    // Snap transient
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(oscGain);
    oscGain.connect(masterGain);

    // Crunch noise burst
    const noiseBuffer = this.createNoiseBuffer(ctx, 0.18);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(3.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.15);
    noise.stop(t + 0.18);
  }

  /**
   * Undead rising from earth moan
   */
  public playZombieSpawn(): void {
    const now = Date.now();
    if (now - this.lastZombieSpawnTime < 100) return;
    this.lastZombieSpawnTime = now;

    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.4);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.linearRampToValueAtTime(220, t + 0.35);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.8);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.4, t + 0.15);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    osc.connect(filter);
    filter.connect(env);
    env.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.9);
  }

  /**
   * Final undead collapse / death rattle scream
   */
  public playZombieDeathScream(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.4);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.linearRampToValueAtTime(150, t + 0.5);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.4, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(filter);
    filter.connect(env);
    env.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.58);
  }

  // ==========================================
  // COMBAT IMPACTS & DEATH SCREAMS
  // ==========================================

  /**
   * Defeated enemy agonizing death cry
   */
  public playEnemyDeathScream(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.45);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.linearRampToValueAtTime(620, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.7);

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(10) as any;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.06);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(shaper);
    shaper.connect(env);
    env.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.78);
  }

  /**
   * Dramatic hero death scream and ascending celestial chord
   */
  public playHeroDeathScream(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.5);

    // Initial dramatic cry
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.linearRampToValueAtTime(380, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.9);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.6, t + 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 1.0);

    // Ascending celestial soul chord notes (A minor / ethereal)
    const chordFreqs = [220, 261.63, 329.63, 440, 523.25];
    chordFreqs.forEach((freq, idx) => {
      const chordOsc = ctx.createOscillator();
      chordOsc.type = 'sine';
      chordOsc.frequency.setValueAtTime(freq, t + 0.2 + idx * 0.1);

      const chordGain = ctx.createGain();
      chordGain.gain.setValueAtTime(0.01, t + 0.2 + idx * 0.1);
      chordGain.gain.linearRampToValueAtTime(0.12, t + 0.35 + idx * 0.1);
      chordGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      chordOsc.connect(chordGain);
      chordGain.connect(masterGain);

      chordOsc.start(t + 0.2 + idx * 0.1);
      chordOsc.stop(t + 1.85);
    });
  }

  /**
   * Punchy physical/spell combat hit impact
   */
  public playHit(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.45);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.7, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    osc.connect(env);
    env.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Cataclysmic explosion with low bass boom and noise tail (Boomer / Boss death)
   */
  public playExplosion(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.55);

    // Deep sub boom
    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(130, t);
    boom.frequency.exponentialRampToValueAtTime(25, t + 0.7);

    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.8, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    boom.connect(boomGain);
    boomGain.connect(masterGain);

    // White noise explosion blast
    const noiseBuffer = this.createNoiseBuffer(ctx, 0.65);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.6);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    boom.start(t);
    noise.start(t);
    boom.stop(t + 0.8);
    noise.stop(t + 0.7);
  }

  // ==========================================
  // ELEMENTAL SPELL SOUNDS
  // ==========================================

  public playSpellCast(element: string): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.35);

    switch (element.toLowerCase()) {
      case 'fire':
      case 'flame':
      case 'magma': {
        // Fire whoosh and crackle
        const noiseBuffer = this.createNoiseBuffer(ctx, 0.4);
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.linearRampToValueAtTime(1200, t + 0.15);
        filter.frequency.linearRampToValueAtTime(300, t + 0.38);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.01, t);
        env.gain.linearRampToValueAtTime(0.6, t + 0.08);
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.38);

        noise.connect(filter);
        filter.connect(env);
        env.connect(masterGain);
        noise.start(t);
        noise.stop(t + 0.4);
        break;
      }

      case 'cold':
      case 'ice':
      case 'frost': {
        // Shimmering subzero crystal snap
        [600, 880, 1200].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.04);
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.25, t + idx * 0.04);
          env.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.3);
          osc.connect(env);
          env.connect(masterGain);
          osc.start(t + idx * 0.04);
          osc.stop(t + idx * 0.04 + 0.32);
        });
        break;
      }

      case 'lightning':
      case 'electricity':
      case 'thunder': {
        // High voltage electric zap & snap
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.linearRampToValueAtTime(2400, t + 0.05);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.6, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        osc.connect(env);
        env.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      }

      case 'sound': {
        // Supersonic sonic wave pulse
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.linearRampToValueAtTime(950, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.4);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.5, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

        osc.connect(env);
        env.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.45);
        break;
      }

      case 'poison':
      case 'acid': {
        // Toxic bubbling hiss
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, 0.35);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1400, t);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.01, t);
        env.gain.linearRampToValueAtTime(0.4, t + 0.08);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        noise.connect(filter);
        filter.connect(env);
        env.connect(masterGain);
        noise.start(t);
        noise.stop(t + 0.36);
        break;
      }

      default: {
        // Resonant arcane pulse
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.linearRampToValueAtTime(520, t + 0.12);
        osc.frequency.exponentialRampToValueAtTime(130, t + 0.35);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.4, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

        osc.connect(env);
        env.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.4);
        break;
      }
    }
  }

  /**
   * Rooted status skeletal chain snap sound
   */
  public playRoot(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.4);

    [400, 310, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.35, t + i * 0.05);
      env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.2);

      osc.connect(env);
      env.connect(masterGain);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.22);
    });
  }

  // ==========================================
  // FANFARES & UI SOUNDS
  // ==========================================

  public playVictoryFanfare(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.45);
    const notes = [261.63, 329.63, 392.0, 523.25]; // C, E, G, C5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.14);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.01, t + idx * 0.14);
      env.gain.linearRampToValueAtTime(0.35, t + idx * 0.14 + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.14 + 0.5);

      osc.connect(env);
      env.connect(masterGain);
      osc.start(t + idx * 0.14);
      osc.stop(t + idx * 0.14 + 0.55);
    });
  }

  public playUnlock(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.4);
    const notes = [440, 554.37, 659.25, 880];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.01, t + idx * 0.07);
      env.gain.linearRampToValueAtTime(0.28, t + idx * 0.07 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.35);

      osc.connect(env);
      env.connect(masterGain);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.38);
    });
  }

  public playWarp(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.45);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.45);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.1, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.25);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.52);
  }

  public playClick(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.25);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.3, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // ==========================================
  // HELPER SYNTHESIS BUFFERS
  // ==========================================

  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
