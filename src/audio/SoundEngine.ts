// Elemental Mayhem - Hybrid Realistic Audio Engine
// Combines authentic CC0 sampled audio with procedural Web Audio synthesis for fallback & layering

export class SoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  public masterVolume: number = 0.45;
  private lastZombieScreamTime: number = 0;
  private lastZombieSpawnTime: number = 0;
  private lastHumanScreamTime: number = 0;
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  private hasPreloaded: boolean = false;

  // Base path for public audio assets
  private basePath: string = './sounds/';

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
    this.preloadSamples();
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
  // REALISTIC SAMPLE LOADING & PLAYBACK
  // ==========================================

  public setSampleBuffer(key: string, buffer: AudioBuffer): void {
    this.sampleBuffers.set(key, buffer);
  }

  public hasSample(key: string): boolean {
    return this.sampleBuffers.has(key);
  }

  private async loadSample(key: string, fileName: string): Promise<void> {
    const ctx = this.initContext();
    if (!ctx || typeof fetch === 'undefined') return;

    try {
      const url = `${this.basePath}${fileName}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      ctx.decodeAudioData(
        arrayBuffer,
        (decoded) => {
          this.sampleBuffers.set(key, decoded);
        },
        () => {}
      );
    } catch {
      // Graceful fallback if offline or in mock test environment
    }
  }

  public preloadSamples(): void {
    if (this.hasPreloaded || typeof window === 'undefined') return;
    this.hasPreloaded = true;

    const samples: Array<[string, string]> = [
      ['click', 'click.ogg'],
      ['enemy_death', 'enemy_death.ogg'],
      ['explosion', 'explosion.ogg'],
      ['hero_death', 'hero_death.ogg'],
      ['hit_1', 'hit_1.ogg'],
      ['hit_2', 'hit_2.ogg'],
      ['hit_3', 'hit_3.ogg'],
      ['human_scream_1', 'human_scream_1.ogg'],
      ['human_scream_2', 'human_scream_2.ogg'],
      ['human_scream_3', 'human_scream_3.ogg'],
      ['root', 'root.ogg'],
      ['screamer_wail', 'screamer_wail.ogg'],
      ['slash', 'slash.ogg'],
      ['spell_arcane', 'spell_arcane.ogg'],
      ['spell_earth', 'spell_earth.ogg'],
      ['spell_fire', 'spell_fire.ogg'],
      ['spell_ice', 'spell_ice.ogg'],
      ['spell_light', 'spell_light.ogg'],
      ['spell_lightning', 'spell_lightning.ogg'],
      ['spell_poison', 'spell_poison.ogg'],
      ['spell_sound', 'spell_sound.ogg'],
      ['unlock', 'unlock.ogg'],
      ['victory_fanfare', 'victory_fanfare.ogg'],
      ['warp', 'warp.ogg'],
      ['zombie_bite', 'zombie_bite.ogg'],
      ['zombie_death', 'zombie_death.ogg'],
      ['zombie_scream_1', 'zombie_scream_1.ogg'],
      ['zombie_scream_2', 'zombie_scream_2.ogg'],
      ['zombie_scream_3', 'zombie_scream_3.ogg'],
      ['zombie_scream_4', 'zombie_scream_4.ogg'],
      ['zombie_spawn', 'zombie_spawn.ogg'],
      ['cutscene_titan_clash', 'cutscene_titan_clash.ogg'],
      ['cutscene_cosmic_rift', 'cutscene_cosmic_rift.ogg'],
      ['cutscene_wormhole_fall', 'cutscene_wormhole_fall.ogg'],
      ['cutscene_wizard_blessing', 'cutscene_wizard_blessing.ogg'],
      ['cutscene_power_stolen', 'cutscene_power_stolen.ogg'],
      ['cutscene_boss_braam', 'cutscene_boss_braam.ogg'],
      ['cutscene_pip_blip', 'cutscene_pip_blip.ogg'],
      ['cutscene_mode_switch', 'cutscene_mode_switch.ogg'],
    ];

    for (const [key, file] of samples) {
      this.loadSample(key, file);
    }
  }

  /**
   * Plays a preloaded audio buffer with organic pitch and gain variation
   */
  private playSample(
    sampleKey: string,
    volume: number = 1.0,
    pitchVariance: number = 0.05,
    filterType?: BiquadFilterType,
    filterFreq?: number
  ): boolean {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return false;

    const buffer = this.sampleBuffers.get(sampleKey);
    if (!buffer) return false;

    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Organic pitch variance for non-repetitive audio realism
    if (source.playbackRate && source.playbackRate.setValueAtTime) {
      const pitchOffset = (Math.random() * 2 - 1) * pitchVariance;
      source.playbackRate.setValueAtTime(Math.max(0.5, 1.0 + pitchOffset), t);
    }

    const masterGain = this.createGain(ctx, volume);

    if (filterType && filterFreq && ctx.createBiquadFilter) {
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, t);
      source.connect(filter);
      filter.connect(masterGain);
    } else {
      source.connect(masterGain);
    }

    source.start(t);
    return true;
  }

  // ==========================================
  // ZOMBIE SCREAMS & SCREAMER WAILS
  // ==========================================

  /**
   * Terrifying realistic guttural zombie scream with layered sub-rumble
   */
  public playZombieScream(): void {
    const now = Date.now();
    if (now - this.lastZombieScreamTime < 100) return;
    this.lastZombieScreamTime = now;

    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    // Pick from 4 realistic recorded zombie screams
    const screamVariants = ['zombie_scream_1', 'zombie_scream_2', 'zombie_scream_3', 'zombie_scream_4'];
    const chosenVariant = screamVariants[Math.floor(Math.random() * screamVariants.length)];

    const played = this.playSample(chosenVariant, 0.65, 0.1);

    // Deep sub rumble layer for visceral chest resonance
    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.25);
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(110, t);
    subOsc.frequency.exponentialRampToValueAtTime(45, t + 0.5);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.2, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.55);

    if (!played) {
      // Full procedural fallback
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.65);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(28, t);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(45, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.Q.setValueAtTime(4.0, t);

      const shaper = ctx.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(18) as any;

      const envGain = ctx.createGain();
      envGain.gain.setValueAtTime(0.01, t);
      envGain.gain.linearRampToValueAtTime(0.5, t + 0.08);
      envGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      osc.connect(shaper);
      shaper.connect(filter);
      filter.connect(envGain);
      envGain.connect(masterGain);

      lfo.start(t);
      osc.start(t);
      lfo.stop(t + 0.72);
      osc.stop(t + 0.72);
    }
  }

  /**
   * Piercing high-frequency ultrasonic Screamer Banshee Shriek
   */
  public playScreamerWail(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const played = this.playSample('screamer_wail', 0.65, 0.08, 'highpass', 450);

    if (!played) {
      const t = ctx.currentTime;
      const masterGain = this.createGain(ctx, 0.45);

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
  }

  /**
   * Flesh tearing, visceral crunchy zombie bite sound
   */
  public playZombieBite(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const played = this.playSample('zombie_bite', 0.8, 0.08);

    if (!played) {
      const t = ctx.currentTime;
      const masterGain = this.createGain(ctx, 0.5);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.7, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(oscGain);
      oscGain.connect(masterGain);

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
  }

  /**
   * Undead rising from earth groan
   */
  public playZombieSpawn(): void {
    const now = Date.now();
    if (now - this.lastZombieSpawnTime < 100) return;
    this.lastZombieSpawnTime = now;

    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const played = this.playSample('zombie_spawn', 0.6, 0.08);

    if (!played) {
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
  }

  /**
   * Final undead collapse / death rattle groan
   */
  public playZombieDeathScream(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const played = this.playSample('zombie_death', 0.6, 0.06);

    if (!played) {
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

    const played = this.playSample('enemy_death', 0.65, 0.07);

    if (!played) {
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
  }

  /**
   * Dramatic hero death scream and ascending celestial chord
   */
  public playHeroDeathScream(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.5);

    const played = this.playSample('hero_death', 0.7, 0.05);

    if (!played) {
      // Fallback dramatic cry
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
    }

    // Ascending celestial soul chord notes (A minor / ethereal harmonic release)
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
   * Loud, bloodcurdling human scream when eaten by zombies or facing agonizing trauma
   */
  public playHumanScream(volume: number = 1.0, bypassDebounce: boolean = false): void {
    const now = Date.now();
    if (!bypassDebounce && now - this.lastHumanScreamTime < 100) return;
    this.lastHumanScreamTime = now;

    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    // Pick between 3 realistic recorded human terror screams
    const screamVariants = ['human_scream_1', 'human_scream_2', 'human_scream_3'];
    const chosenVariant = screamVariants[Math.floor(Math.random() * screamVariants.length)];

    // Boosted volume for maximum dramatic shock (loud human scream)
    const played = this.playSample(chosenVariant, Math.min(1.0, volume * 1.05), 0.06);

    if (!played) {
      // High-realism procedural Web Audio human scream synthesis
      const t = ctx.currentTime;
      const masterGain = this.createGain(ctx, Math.min(1.0, volume * 0.95));

      // 1. Primary vocal tract oscillator (vocal folds open in terror)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, t); // High human scream pitch (A5)
      osc1.frequency.linearRampToValueAtTime(940, t + 0.1);
      osc1.frequency.exponentialRampToValueAtTime(380, t + 0.95);

      // 2. Harmonic rasp oscillator (minor third / dissonant multiphonic strain)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(1080, t);
      osc2.frequency.exponentialRampToValueAtTime(460, t + 0.9);

      // 3. Frequency Modulation (vocal fold jitter / terror tremor at 38 Hz)
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(38, t);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(45, t);
      lfoGain.gain.exponentialRampToValueAtTime(12, t + 0.85);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      // 4. Throat & Mouth Vocal Tract Formants (vowel "AHHH" resonance ~920 Hz & 2800 Hz)
      const formant1 = ctx.createBiquadFilter();
      formant1.type = 'bandpass';
      formant1.frequency.setValueAtTime(920, t);
      formant1.Q.setValueAtTime(3.5, t);

      const formant2 = ctx.createBiquadFilter();
      formant2.type = 'bandpass';
      formant2.frequency.setValueAtTime(2800, t);
      formant2.Q.setValueAtTime(2.5, t);

      // 5. Overdrive saturation for screaming vocal rasp
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(16) as any;

      // 6. White noise layer for breath rush / breathlessness
      const noiseBuffer = this.createNoiseBuffer(ctx, 0.9);
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2200, t);
      noiseFilter.Q.setValueAtTime(2.0, t);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, t);
      noiseGain.gain.linearRampToValueAtTime(0.35, t + 0.05);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      // Amplitude Envelope: Instant punchy scream, holding strong, trailing off
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.01, t);
      env.gain.linearRampToValueAtTime(0.9, t + 0.03);
      env.gain.setValueAtTime(0.85, t + 0.4);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

      osc1.connect(shaper);
      osc2.connect(shaper);
      shaper.connect(formant1);
      formant1.connect(formant2);
      formant2.connect(env);
      env.connect(masterGain);

      lfo.start(t);
      osc1.start(t);
      osc2.start(t);
      noise.start(t);

      lfo.stop(t + 0.95);
      osc1.stop(t + 0.95);
      osc2.stop(t + 0.95);
      noise.stop(t + 0.9);
    }
  }

  /**
   * Dedicated loud human scream trigger with maximum volume
   */
  public playLoudHumanScream(bypassDebounce: boolean = false): void {
    this.playHumanScream(1.0, bypassDebounce);
  }

  /**
   * Punchy physical/spell combat hit impact with randomized surface textures
   */
  public playHit(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    // Randomize between punch, bone, and plate strikes
    const hitVariants = ['hit_1', 'hit_2', 'hit_3'];
    const chosenVariant = hitVariants[Math.floor(Math.random() * hitVariants.length)];

    const played = this.playSample(chosenVariant, 0.7, 0.12);

    if (!played) {
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
  }

  /**
   * Cataclysmic explosion with realistic sub-bass boom and blast debris
   */
  public playExplosion(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.65);

    // Deep sub boom (chest feel)
    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(130, t);
    boom.frequency.exponentialRampToValueAtTime(25, t + 0.7);

    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.8, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    boom.connect(boomGain);
    boomGain.connect(masterGain);
    boom.start(t);
    boom.stop(t + 0.8);

    const played = this.playSample('explosion', 0.85, 0.06);

    if (!played) {
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

      noise.start(t);
      noise.stop(t + 0.7);
    }
  }

  // ==========================================
  // ELEMENTAL SPELL SOUNDS (50 Elements Support)
  // ==========================================

  public playSpellCast(element: string): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const elem = (element || '').toLowerCase();
    let sampleKey: string = 'spell_arcane';

    // Map 50 elements to authentic realistic samples
    if (['fire', 'flame', 'magma', 'heat', 'blast', 'brimstone'].includes(elem)) {
      sampleKey = 'spell_fire';
    } else if (['cold', 'ice', 'frost', 'glass', 'crystal'].includes(elem)) {
      sampleKey = 'spell_ice';
    } else if (['lightning', 'electricity', 'thunder', 'storm', 'plasma', 'energy'].includes(elem)) {
      sampleKey = 'spell_lightning';
    } else if (['sound', 'vibration', 'force', 'momentum', 'pressure'].includes(elem)) {
      sampleKey = 'spell_sound';
    } else if (['poison', 'acid', 'blood'].includes(elem)) {
      sampleKey = 'spell_poison';
    } else if (['earth', 'iron', 'metal', 'matter', 'obsidian', 'gravity'].includes(elem)) {
      sampleKey = 'spell_earth';
    } else if (['light', 'life', 'order', 'soul', 'spirit', 'love'].includes(elem)) {
      sampleKey = 'spell_light';
    } else if (['war', 'rage', 'titan'].includes(elem)) {
      sampleKey = 'slash';
    } else if (['sky', 'wind', 'space'].includes(elem)) {
      sampleKey = 'spell_sound';
    } else if (['darkness', 'death', 'void', 'chaos', 'radiation', 'magnetism', 'time'].includes(elem)) {
      sampleKey = 'spell_arcane';
    }

    const played = this.playSample(sampleKey, 0.6, 0.08);

    if (!played) {
      // Procedural synthesis fallback
      const t = ctx.currentTime;
      const masterGain = this.createGain(ctx, 0.35);

      switch (elem) {
        case 'fire':
        case 'flame':
        case 'magma':
        case 'heat':
        case 'blast':
        case 'brimstone': {
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
        case 'frost':
        case 'glass':
        case 'crystal': {
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
        case 'thunder':
        case 'storm':
        case 'plasma':
        case 'energy': {
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

        case 'sound':
        case 'vibration':
        case 'force':
        case 'momentum':
        case 'pressure': {
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
        case 'acid':
        case 'blood': {
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
  }

  /**
   * Rooted status heavy iron chains locking sound
   */
  public playRoot(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const played = this.playSample('root', 0.65, 0.06);

    if (!played) {
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
  }

  // ==========================================
  // FANFARES & UI SOUNDS
  // ==========================================

  public playVictoryFanfare(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const played = this.playSample('victory_fanfare', 0.7, 0.02);

    if (!played) {
      const t = ctx.currentTime;
      const masterGain = this.createGain(ctx, 0.45);
      const notes = [261.63, 329.63, 392.0, 523.25];

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
  }

  public playUnlock(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const played = this.playSample('unlock', 0.65, 0.04);

    if (!played) {
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
  }

  public playLevelUp(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    // Triumphant 5-chord celestial arpeggio: G4 -> C5 -> E5 -> G5 -> C6
    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.5);
    const chord = [392.0, 523.25, 659.25, 783.99, 1046.5];

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.01, t + idx * 0.08);
      env.gain.linearRampToValueAtTime(0.35, t + idx * 0.08 + 0.03);
      env.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.55);

      osc.connect(env);
      env.connect(masterGain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.6);
    });
  }

  public playWarp(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const played = this.playSample('warp', 0.65, 0.05);

    if (!played) {
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
  }

  public playDarkCloudsWhirl(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.6);

    // Swirling frequency sweep (pitch rises, whirls, then drops)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.9);
    osc.frequency.linearRampToValueAtTime(1400, t + 1.4);
    osc.frequency.exponentialRampToValueAtTime(60, t + 2.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);
    filter.frequency.linearRampToValueAtTime(3000, t + 1.3);
    filter.frequency.exponentialRampToValueAtTime(200, t + 2.2);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.05, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.6);
    env.gain.linearRampToValueAtTime(0.7, t + 1.4);
    env.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

    osc.connect(filter);
    filter.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 2.25);

    // Heavy Thunder Boom & Rumble as the vortex collapses into the clouds
    setTimeout(() => {
      this.playSpellCast('thunder');
      this.playEarthquakeRumble();
    }, 1200);
  }

  public playClick(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const played = this.playSample('click', 0.45, 0.08);

    if (!played) {
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
  }

  // ==========================================
  // CINEMATIC CUTSCENE AUDIO GENERATORS
  // ==========================================

  public playEarthquakeRumble(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;
    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.48);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(48, t);
    osc.frequency.linearRampToValueAtTime(30, t + 1.4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, t);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.45, t + 0.18);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    osc.connect(filter);
    filter.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 1.45);
  }

  public playCosmicSingularity(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;
    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.42);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.exponentialRampToValueAtTime(820, t + 0.85);
    osc.frequency.exponentialRampToValueAtTime(110, t + 1.8);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(360, t);
    filter.Q.setValueAtTime(4.5, t);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.4, t + 0.45);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    osc.connect(filter);
    filter.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 1.85);
  }

  public playMagicSurge(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;
    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.38);

    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.001, t + idx * 0.06);
      env.gain.linearRampToValueAtTime(0.28, t + idx * 0.06 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.65);

      osc.connect(env);
      env.connect(masterGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.7);
    });
  }

  public playDarkSiphon(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;
    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.46);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(220, t);
    osc1.frequency.exponentialRampToValueAtTime(75, t + 1.25);

    osc2.frequency.setValueAtTime(228, t);
    osc2.frequency.exponentialRampToValueAtTime(70, t + 1.25);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.42, t + 0.1);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.25);

    osc1.connect(env);
    osc2.connect(env);
    env.connect(masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.3);
    osc2.stop(t + 1.3);
  }

  public playBossWarhorn(): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;
    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.52);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(73.4, t); // D2
    osc2.frequency.setValueAtTime(110.0, t); // A2

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);
    filter.frequency.linearRampToValueAtTime(580, t + 0.35);
    filter.frequency.linearRampToValueAtTime(220, t + 1.8);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.48, t + 0.2);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.85);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.9);
    osc2.stop(t + 1.9);
  }

  public playCutsceneTitanClash(): void {
    if (this.isMuted) return;
    const played = this.playSample('cutscene_titan_clash', 0.9, 0.02);
    this.playEarthquakeRumble();
    if (!played) {
      this.playExplosion();
    }
  }

  public playCutsceneCosmicRift(): void {
    if (this.isMuted) return;
    const played = this.playSample('cutscene_cosmic_rift', 0.88, 0.02);
    this.playCosmicSingularity();
    if (!played) {
      this.playWarp();
    }
  }

  public playCutsceneWormholeFall(): void {
    if (this.isMuted) return;
    const played = this.playSample('cutscene_wormhole_fall', 0.88, 0.02);
    if (!played) {
      this.playWarp();
      this.playEarthquakeRumble();
    }
  }

  public playCutsceneWizardBlessing(): void {
    if (this.isMuted) return;
    const played = this.playSample('cutscene_wizard_blessing', 0.92, 0.01);
    this.playMagicSurge();
    if (!played) {
      this.playLevelUp();
    }
  }

  public playCutscenePowerStolen(): void {
    if (this.isMuted) return;
    const played = this.playSample('cutscene_power_stolen', 0.9, 0.02);
    this.playDarkSiphon();
    if (!played) {
      this.playScreamerWail();
    }
  }

  public playCutsceneBossBraam(): void {
    if (this.isMuted) return;
    const played = this.playSample('cutscene_boss_braam', 0.95, 0.01);
    this.playBossWarhorn();
    if (!played) {
      this.playVictoryFanfare();
    }
  }

  public playCutscenePipBlip(): void {
    if (this.isMuted) return;
    const played = this.playSample('cutscene_pip_blip', 0.55, 0.04);
    if (!played) {
      this.playClick();
    }
  }

  public playCutsceneModeSwitch(): void {
    if (this.isMuted) return;
    const played = this.playSample('cutscene_mode_switch', 0.7, 0.03);
    if (!played) {
      this.playWarp();
    }
  }

  public playCharacterVocalTone(speakerId: string): void {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return;

    const t = ctx.currentTime;
    const masterGain = this.createGain(ctx, 0.4);

    if (speakerId === 'titan_magma') {
      // Deep tectonic magma monster formant (sub-bass 48Hz + overdriven 110Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(52, t);
      osc1.frequency.exponentialRampToValueAtTime(42, t + 0.35);
      osc2.frequency.setValueAtTime(104, t);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, t);
      filter.Q.value = 4.0;

      const waveshaper = ctx.createWaveShaper();
      waveshaper.curve = this.makeDistortionCurve(60) as any;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.01, t);
      env.gain.linearRampToValueAtTime(0.45, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(waveshaper);
      waveshaper.connect(env);
      env.connect(masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.42);
      osc2.stop(t + 0.42);
    } else if (speakerId === 'titan_void') {
      // Eerie cosmic abyss resonance (78Hz descending with modulated sine)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.45);

      const mod = ctx.createOscillator();
      mod.type = 'triangle';
      mod.frequency.setValueAtTime(14, t);

      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(25, t);
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.01, t);
      env.gain.linearRampToValueAtTime(0.4, t + 0.03);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(env);
      env.connect(masterGain);

      osc.start(t);
      mod.start(t);
      osc.stop(t + 0.48);
      mod.stop(t + 0.48);
    } else if (speakerId === 'wizard') {
      // Mystical ancient elder arch-mage chord (A3 + C#4 + E4)
      const freqs = [220.0, 277.18, 329.63];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + i * 0.02);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.01, t + i * 0.02);
        env.gain.linearRampToValueAtTime(0.22, t + i * 0.02 + 0.03);
        env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.02 + 0.42);

        osc.connect(env);
        env.connect(masterGain);
        osc.start(t + i * 0.02);
        osc.stop(t + i * 0.02 + 0.45);
      });
    } else if (speakerId === 'void_overlord') {
      // Sinister demonic tritone rasp (D2 73.4Hz + G#2 103.8Hz) with heavy overdrive
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(73.4, t);
      osc1.frequency.linearRampToValueAtTime(58.0, t + 0.4);
      osc2.frequency.setValueAtTime(103.83, t);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, t);
      filter.Q.value = 3.5;

      const waveshaper = ctx.createWaveShaper();
      waveshaper.curve = this.makeDistortionCurve(100) as any;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.01, t);
      env.gain.linearRampToValueAtTime(0.5, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(waveshaper);
      waveshaper.connect(env);
      env.connect(masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.48);
      osc2.stop(t + 0.48);
    } else if (speakerId === 'seeker') {
      // Bright, energetic mortal seeker pulse (F4 349Hz -> A4 440Hz)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(349.23, t);
      osc.frequency.exponentialRampToValueAtTime(440.0, t + 0.22);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.01, t);
      env.gain.linearRampToValueAtTime(0.3, t + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(env);
      env.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.32);
    } else {
      // Narrator / Chronicler - Clear celestial chime (C4 261.6Hz + G4 392Hz)
      [261.63, 392.0].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.01, t);
        env.gain.linearRampToValueAtTime(0.25, t + 0.03);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

        osc.connect(env);
        env.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    }
  }

  /**
   * Procedural rhythmic character speech babble for animated voice acting
   */
  public playCharacterSpeechBabble(speakerId: string, durationMs: number): { stop: () => void } {
    const ctx = this.initContext();
    if (!ctx || this.isMuted) return { stop: () => {} };

    let isStopped = false;
    let timer: any = null;
    const intervalMs =
      speakerId === 'titan_magma' ? 175 :
      speakerId === 'titan_void' ? 180 :
      speakerId === 'wizard' ? 140 :
      speakerId === 'void_overlord' ? 145 :
      speakerId === 'seeker' ? 115 : 135;

    const stop = () => {
      if (isStopped) return;
      isStopped = true;
      if (timer) clearInterval(timer);
    };

    const playSyllable = () => {
      if (isStopped || this.isMuted) return;
      try {
        const t = ctx.currentTime;
        const syllableGain = this.createGain(ctx, 0.18);

        if (speakerId === 'titan_magma') {
          // Deep volcanic throat grunt (50Hz-70Hz with distortion)
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          const f = 50 + (Math.random() * 20);
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.09);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(180, t);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, t);
          env.gain.linearRampToValueAtTime(0.35, t + 0.015);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

          osc.connect(filter);
          filter.connect(env);
          env.connect(syllableGain);
          osc.start(t);
          osc.stop(t + 0.11);
        } else if (speakerId === 'titan_void') {
          // Cosmic low abyssal echo (75Hz-110Hz)
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const f = 75 + (Math.random() * 25);
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.linearRampToValueAtTime(f + (Math.random() * 15 - 7), t + 0.1);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, t);
          env.gain.linearRampToValueAtTime(0.28, t + 0.02);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

          osc.connect(env);
          env.connect(syllableGain);
          osc.start(t);
          osc.stop(t + 0.13);
        } else if (speakerId === 'wizard') {
          // Ancient resonant chanting vowel (220Hz-330Hz)
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          const notes = [220, 246.9, 277.2, 329.6];
          const f = notes[Math.floor(Math.random() * notes.length)];
          osc.frequency.setValueAtTime(f, t);

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(f * 1.5, t);
          filter.Q.value = 2.5;

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, t);
          env.gain.linearRampToValueAtTime(0.24, t + 0.018);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

          osc.connect(filter);
          filter.connect(env);
          env.connect(syllableGain);
          osc.start(t);
          osc.stop(t + 0.11);
        } else if (speakerId === 'void_overlord') {
          // Sinister robotic rasping dark voice (80Hz-130Hz sawtooth)
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          const f = 85 + (Math.random() * 35);
          osc.frequency.setValueAtTime(f, t);

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(360, t);
          filter.Q.value = 4.0;

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, t);
          env.gain.linearRampToValueAtTime(0.38, t + 0.015);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

          osc.connect(filter);
          filter.connect(env);
          env.connect(syllableGain);
          osc.start(t);
          osc.stop(t + 0.1);
        } else if (speakerId === 'seeker') {
          // Bright heroic vocal syllable (320Hz-440Hz)
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          const notes = [329.6, 349.2, 392.0, 440.0];
          const f = notes[Math.floor(Math.random() * notes.length)];
          osc.frequency.setValueAtTime(f, t);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, t);
          env.gain.linearRampToValueAtTime(0.2, t + 0.01);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

          osc.connect(env);
          env.connect(syllableGain);
          osc.start(t);
          osc.stop(t + 0.09);
        } else {
          // Celestial narrator chime syllable (220Hz-293Hz)
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const notes = [220.0, 261.6, 293.7];
          const f = notes[Math.floor(Math.random() * notes.length)];
          osc.frequency.setValueAtTime(f, t);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, t);
          env.gain.linearRampToValueAtTime(0.22, t + 0.015);
          env.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

          osc.connect(env);
          env.connect(syllableGain);
          osc.start(t);
          osc.stop(t + 0.11);
        }
      } catch {}
    };

    // Play immediate first syllable
    playSyllable();

    // Rhythmic chatter loop
    timer = setInterval(playSyllable, intervalMs);

    // Auto-stop at duration
    setTimeout(stop, durationMs);

    return { stop };
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
