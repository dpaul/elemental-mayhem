// Elemental Mayhem - Cinematic Cutscene Music Engine
// Fast, soft, cool, and scary procedural darkwave synth engine with adaptive tension per chapter

export class CutsceneMusicEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private padOsc1: OscillatorNode | null = null;
  private padOsc2: OscillatorNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private padGain: GainNode | null = null;
  private padLfo: OscillatorNode | null = null;
  private padLfoGain: GainNode | null = null;

  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private currentChapter: number = 0;
  private schedulerTimer: any = null;
  private nextNoteTime: number = 0;
  private currentStep: number = 0;

  // Fast, driving 154 BPM tempo for suspenseful momentum
  public readonly tempo: number = 154;
  private readonly stepDuration: number = 60 / 154 / 4; // 16th note (~97.4ms)

  // Atmospheric, eerie harmonic scales tailored for each story chapter
  // Crafted with minor-seconds, tritones, and diminished intervals for spine-chilling suspense
  private readonly chapterArpPatterns: number[][] = [
    // Chapter 1: Titans Collide - D Minor / Diminished (Menacing subterranean clash)
    [146.83, 174.61, 207.65, 220.0, 293.66, 207.65, 174.61, 146.83, 138.59, 174.61, 207.65, 220.0, 261.63, 220.0, 174.61, 138.59],
    // Chapter 2: Cosmic Rift Opens - G Locrian / Abyssal Rift (Alien chromatic vortex)
    [196.0, 207.65, 246.94, 277.18, 329.63, 277.18, 207.65, 196.0, 185.0, 207.65, 277.18, 329.63, 392.0, 277.18, 207.65, 185.0],
    // Chapter 3: Falling Through Hyperspace - C Minor with Tritone Vertigo (Tumbling descent)
    [261.63, 311.13, 369.99, 392.0, 466.16, 369.99, 311.13, 261.63, 246.94, 293.66, 349.23, 369.99, 440.0, 349.23, 293.66, 246.94],
    // Chapter 4: Grand Wizard Blessing - E Phrygian Dominant (Ancient arcane occult power)
    [164.81, 207.65, 246.94, 261.63, 329.63, 261.63, 207.65, 164.81, 174.61, 220.0, 261.63, 329.63, 392.0, 329.63, 220.0, 174.61],
    // Chapter 5: Ambushed in the Shadows - B Diminished 7th (Horror chase & siphoned terror)
    [246.94, 293.66, 349.23, 415.30, 493.88, 415.30, 349.23, 293.66, 261.63, 311.13, 369.99, 440.0, 493.88, 440.0, 369.99, 261.63],
    // Chapter 6: Mission to Round 1000 - D Phrygian (Gothic dark destiny vs Void Overlord)
    [146.83, 155.56, 185.0, 220.0, 293.66, 220.0, 185.0, 155.56, 146.83, 185.0, 220.0, 277.18, 293.66, 277.18, 220.0, 185.0],
  ];

  // Base drone frequencies [root, darkInterval] per chapter
  private readonly chapterDronePitches: [number, number][] = [
    [73.42, 110.0],   // Ch 1: D2, A2
    [98.0, 138.59],   // Ch 2: G2, Db3 (Tritone devil's chord!)
    [65.41, 92.5],    // Ch 3: C2, F#2
    [82.41, 123.47],  // Ch 4: E2, B2
    [61.74, 87.31],   // Ch 5: B1, F2 (Diminished horror)
    [73.42, 103.83],  // Ch 6: D2, G#2 (Menacing tritone)
  ];

  constructor() {
    // Lazy initialized when cutscene opens
  }

  private initAudioContext(): AudioContext | null {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    }

    try {
      const g = typeof window !== 'undefined' ? (window as any) : (globalThis as any);
      const AudioContextClass = g.AudioContext || g.webkitAudioContext;
      if (!AudioContextClass) return null;

      const ctx = new AudioContextClass();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Master Gain: Soft, intimate, and never overpowering spoken dialogue
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.12, ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.masterGain = masterGain;

      // Stereo Delay Line for that ultra-cool cinematic dark synth vibe
      const delayNode = ctx.createDelay();
      delayNode.delayTime.setValueAtTime(this.stepDuration * 3, ctx.currentTime); // Dotted 8th delay
      this.delayNode = delayNode;

      const delayGain = ctx.createGain();
      delayGain.gain.setValueAtTime(0.26, ctx.currentTime);

      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.setValueAtTime(900, ctx.currentTime);

      // Delay feedback loop
      delayNode.connect(delayFilter);
      delayFilter.connect(delayGain);
      delayGain.connect(delayNode);
      delayGain.connect(masterGain);

      return ctx;
    } catch {
      return null;
    }
  }

  public start(): void {
    const ctx = this.initAudioContext();
    if (!ctx) return;

    this.stop();
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;

    // Start eerie ghostly background pad
    this.startGhostlyPad(ctx);

    // Start precision Web Audio clock scheduler loop
    this.schedulerTimer = setInterval(() => {
      this.scheduleLoop();
    }, 25);
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.stopGhostlyPad();
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.08);
    }
  }

  public resume(): void {
    if (!this.isPlaying) {
      if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.12, this.audioCtx.currentTime, 0.1);
      }
      this.start();
    }
  }

  public setChapter(index: number): void {
    this.currentChapter = Math.max(0, Math.min(5, index));
    if (!this.audioCtx) return;

    const t = this.audioCtx.currentTime;
    const drone = this.chapterDronePitches[this.currentChapter] || this.chapterDronePitches[0];

    // Smoothly glide the eerie pad to the new chapter's scary root
    if (this.padOsc1) {
      this.padOsc1.frequency.setTargetAtTime(drone[0], t, 0.4);
    }
    if (this.padOsc2) {
      this.padOsc2.frequency.setTargetAtTime(drone[1], t, 0.4);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.12, this.audioCtx.currentTime, 0.05);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentChapter(): number {
    return this.currentChapter;
  }

  /**
   * Lookahead note scheduler that queues audio events accurately into the future
   */
  private scheduleLoop(): void {
    if (!this.audioCtx || !this.isPlaying || this.isMuted) return;

    const scheduleAheadTime = 0.14; // Schedule 140ms ahead
    while (this.nextNoteTime < this.audioCtx.currentTime + scheduleAheadTime) {
      this.playStep(this.nextNoteTime, this.currentStep);
      this.nextNoteTime += this.stepDuration;
      this.currentStep++;
    }
  }

  /**
   * Renders a single 16th-note step with layered fast, soft, and scary synthesis
   */
  private playStep(time: number, step: number): void {
    if (!this.audioCtx || !this.masterGain) return;

    const pattern = this.chapterArpPatterns[this.currentChapter] || this.chapterArpPatterns[0];
    const noteFreq = pattern[step % pattern.length];

    // 1. FAST & SOFT ARPEGGIATOR PLUCK (Silky triangle synth through resonant lowpass)
    const osc = this.audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(noteFreq, time);

    const noteGain = this.audioCtx.createGain();
    const noteFilter = this.audioCtx.createBiquadFilter();
    noteFilter.type = 'lowpass';

    // Slightly brighten accents every 4th step for driving, cool rhythm
    const isBeat = step % 4 === 0;
    const filterCutoff = isBeat ? 1350 : 950;
    noteFilter.frequency.setValueAtTime(filterCutoff, time);
    noteFilter.Q.setValueAtTime(2.2, time);

    // Soft velvety envelope: zero clicks, fast gentle attack, smooth decay
    const peakVol = isBeat ? 0.08 : 0.055;
    noteGain.gain.setValueAtTime(0.0001, time);
    noteGain.gain.linearRampToValueAtTime(peakVol, time + 0.006);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

    osc.connect(noteFilter);
    noteFilter.connect(noteGain);
    noteGain.connect(this.masterGain);

    // Send a fraction to the stereo delay for spacious horror dimension
    if (this.delayNode) {
      noteGain.connect(this.delayNode);
    }

    osc.start(time);
    osc.stop(time + 0.14);

    // 2. SOFT FAST HEARTBEAT PULSE (Every 2nd step / 8th note for relentless forward suspense)
    if (step % 2 === 0) {
      const pulseOsc = this.audioCtx.createOscillator();
      pulseOsc.type = 'sine';
      // Pitch drop: 52 Hz -> 32 Hz
      pulseOsc.frequency.setValueAtTime(52, time);
      pulseOsc.frequency.exponentialRampToValueAtTime(32, time + 0.06);

      const pulseGain = this.audioCtx.createGain();
      const pulseVol = step % 4 === 0 ? 0.055 : 0.035;
      pulseGain.gain.setValueAtTime(0.0001, time);
      pulseGain.gain.linearRampToValueAtTime(pulseVol, time + 0.004);
      pulseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);

      pulseOsc.connect(pulseGain);
      pulseGain.connect(this.masterGain);

      pulseOsc.start(time);
      pulseOsc.stop(time + 0.08);
    }

    // 3. EERIE SPECTRAL SHIMMER (Delicate spooky high bell ping floating in the dark)
    // Plays on specific offbeats (steps 6 & 14) for hair-raising horror accents
    if (step % 16 === 6 || (this.currentChapter === 4 && step % 8 === 4)) {
      const shimmerOsc = this.audioCtx.createOscillator();
      shimmerOsc.type = 'sine';

      // Chilling tritone high shimmer note
      const shimmerFreq = (noteFreq * 4) * (step % 16 === 6 ? 1.059 : 1.414);
      shimmerOsc.frequency.setValueAtTime(shimmerFreq, time);

      const shimmerGain = this.audioCtx.createGain();
      shimmerGain.gain.setValueAtTime(0.0001, time);
      shimmerGain.gain.linearRampToValueAtTime(0.022, time + 0.01);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(this.masterGain);
      if (this.delayNode) shimmerGain.connect(this.delayNode);

      shimmerOsc.start(time);
      shimmerOsc.stop(time + 0.38);
    }
  }

  /**
   * Starts an unsettling, low-frequency atmospheric drone with creepy vibrato LFO
   */
  private startGhostlyPad(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const drone = this.chapterDronePitches[this.currentChapter] || this.chapterDronePitches[0];

    this.padGain = ctx.createGain();
    this.padGain.gain.setValueAtTime(0.0001, t);
    this.padGain.gain.linearRampToValueAtTime(0.09, t + 1.2);

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.setValueAtTime(260, t);

    // Osc 1: Deep root
    this.padOsc1 = ctx.createOscillator();
    this.padOsc1.type = 'sawtooth';
    this.padOsc1.frequency.setValueAtTime(drone[0], t);

    // Osc 2: Detuned tritone/fifth
    this.padOsc2 = ctx.createOscillator();
    this.padOsc2.type = 'sawtooth';
    this.padOsc2.frequency.setValueAtTime(drone[1], t);
    this.padOsc2.detune.setValueAtTime(7, t);

    // Creepy LFO pitch wobble (3.6 Hz vibrato)
    this.padLfo = ctx.createOscillator();
    this.padLfo.frequency.setValueAtTime(3.6, t);

    this.padLfoGain = ctx.createGain();
    this.padLfoGain.gain.setValueAtTime(4.5, t); // 4.5 Hz pitch waver

    this.padLfo.connect(this.padLfoGain);
    this.padLfoGain.connect(this.padOsc1.frequency);
    this.padLfoGain.connect(this.padOsc2.frequency);

    this.padOsc1.connect(this.padFilter);
    this.padOsc2.connect(this.padFilter);
    this.padFilter.connect(this.padGain);

    if (this.masterGain) {
      this.padGain.connect(this.masterGain);
    }

    this.padOsc1.start(t);
    this.padOsc2.start(t);
    this.padLfo.start(t);
  }

  private stopGhostlyPad(): void {
    if (this.padOsc1) {
      try {
        this.padOsc1.stop();
        this.padOsc1.disconnect();
      } catch {}
      this.padOsc1 = null;
    }
    if (this.padOsc2) {
      try {
        this.padOsc2.stop();
        this.padOsc2.disconnect();
      } catch {}
      this.padOsc2 = null;
    }
    if (this.padLfo) {
      try {
        this.padLfo.stop();
        this.padLfo.disconnect();
      } catch {}
      this.padLfo = null;
    }
    if (this.padGain) {
      try {
        this.padGain.disconnect();
      } catch {}
      this.padGain = null;
    }
  }
}
