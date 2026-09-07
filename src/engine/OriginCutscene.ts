/**
 * OriginCutscene.ts
 * 
 * Manages the interactive cinematic cutscene revealing the lore of how the mortal
 * seeker obtained their elemental powers:
 *   Chapter 1: The Void & The Monolith (Mortal Wanderer)
 *   Chapter 2: The Primal Cataclysm (The Nexus Core Shatters)
 *   Chapter 3: The Three Starter Sparks (Fire, Water, Earth fuse into the soul)
 *   Chapter 4: The 50-Element Reaction Cascade (Steam, Magma, Plasma ignite)
 *   Chapter 5: The Sovereign Mandate (The Creator's Divine Ban Hammer & Destiny)
 *   Chapter 6: The Awakening (Hero rises, ready for the Mayhem tournament)
 */

import { SoundEngine } from '../audio/SoundEngine';

export interface CutsceneChapter {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  narrative: string;
  themeColor: string;
}

export const CUTSCENE_CHAPTERS: CutsceneChapter[] = [
  {
    id: 1,
    badge: '🌌 CHAPTER I • THE ASTRAL RUINS',
    title: 'The Mortal Seeker in the Void',
    subtitle: 'Before the Elemental Mayhem tournament, mortals possessed no magic.',
    narrative:
      'Long before the arenas were forged, humanity lived defenseless under the shadows of cosmic titans. Seeking salvation, you traversed the astral abyss and discovered the monolithic ruins of the Primal Nexus, where primordial secrets lay dormant.',
    themeColor: '#818cf8',
  },
  {
    id: 2,
    badge: '💥 CHAPTER II • THE CATACLYSM',
    title: 'The Shattering of the Core',
    subtitle: 'A single touch cracked the ancient seal of creation.',
    narrative:
      'Approaching the ancient altar, your hand brushed against the celestial sphere. In an instant, the Primal Core ruptured! Tectonic shockwaves tore through reality as raw elemental forces broke free from their cosmic prison in a blinding supernova.',
    themeColor: '#f43f5e',
  },
  {
    id: 3,
    badge: '🔥💧🪨 CHAPTER III • THE THREE STARTERS',
    title: 'The Three Primal Embers Awaken',
    subtitle: 'Fire, Water, and Earth chose you as their mortal host.',
    narrative:
      'Amidst the chaos of fifty unbound forces, three ancient embers spiraled down and bonded to your mortal soul: the consuming fury of Fire, the serene fluidity of Water, and the immovable foundation of Earth. The primal triad ignited within your veins!',
    themeColor: '#38bdf8',
  },
  {
    id: 4,
    badge: '⚡⚗️ CHAPTER IV • THE REACTION CASCADE',
    title: 'The 50 Elements Converge',
    subtitle: 'Combinations sparked. You were no longer mortal.',
    narrative:
      'Fire met Water, billowed into scorching Steam. Earth met Fire, erupting into molten Magma. Cold, Wind, Lightning, Poison, Light, and Void harmonized. The dormant 50-element cosmic matrix expanded inside your consciousness with infinite power!',
    themeColor: '#eab308',
  },
  {
    id: 5,
    badge: '👑 CHAPTER V • THE SOVEREIGN GAZE',
    title: 'The Eye of the Creator',
    subtitle: 'The supreme architect offered a divine destiny.',
    narrative:
      'High in the heavens, the mythical Sovereign Creator beheld your awakening. Brandishing the legendary Ban Hammer, the Creator decreed: "Ascend the tournament. Defeat the 15 Titans and the Void Archon, and supreme Admin authority shall be yours!"',
    themeColor: '#ec4899',
  },
  {
    id: 6,
    badge: '⚔️ CHAPTER VI • THE AWAKENING',
    title: 'Rise, Elemental Master',
    subtitle: 'The arena gates grind open. Glory awaits.',
    narrative:
      'You open your eyes. Primal flame, living water, and tectonic stone dance at your fingertips. The Elemental Mayhem tournament beckons. Step into the arena, champion—and carve your legend into the stars!',
    themeColor: '#34d399',
  },
];

export class OriginCutsceneManager {
  private soundEngine: SoundEngine;
  private currentChapterIndex: number = 0;
  private isPlaying: boolean = true;
  private autoAdvanceTimer: any = null;
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;

  // Callbacks
  public onEnterArena?: () => void;
  public onOpenSandbox?: () => void;
  public onClose?: () => void;

  constructor(soundEngine: SoundEngine) {
    this.soundEngine = soundEngine;
  }

  public initDOM(): void {
    const overlay = document.getElementById('origin-cutscene-overlay');
    if (!overlay) return;

    // Chapter indicator pips
    const pipsContainer = document.getElementById('cutscene-chapter-pips');
    if (pipsContainer) {
      pipsContainer.innerHTML = '';
      CUTSCENE_CHAPTERS.forEach((ch, idx) => {
        const pip = document.createElement('button');
        pip.className = `cutscene-pip ${idx === 0 ? 'active' : ''}`;
        pip.setAttribute('title', `Go to Chapter ${ch.id}: ${ch.title}`);
        pip.addEventListener('click', () => {
          this.soundEngine.playClick();
          this.goToChapter(idx);
        });
        pipsContainer.appendChild(pip);
      });
    }

    // Prev / Next / Play-Pause / Skip / Close
    document.getElementById('cutscene-prev-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.prevChapter();
    });

    document.getElementById('cutscene-next-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.nextChapter();
    });

    document.getElementById('cutscene-play-pause-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.togglePlayPause();
    });

    document.getElementById('cutscene-skip-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.goToChapter(CUTSCENE_CHAPTERS.length - 1);
    });

    document.getElementById('cutscene-close-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.close();
    });

    document.getElementById('cutscene-mute-btn')?.addEventListener('click', (e) => {
      this.soundEngine.playClick();
      this.toggleMute(e.currentTarget as HTMLElement);
    });

    // Final Chapter Action Buttons
    document.getElementById('cutscene-btn-enter-arena')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.close();
      if (this.onEnterArena) this.onEnterArena();
    });

    document.getElementById('cutscene-btn-sandbox')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.close();
      if (this.onOpenSandbox) this.onOpenSandbox();
    });

    document.getElementById('cutscene-btn-replay')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.goToChapter(0);
      this.play();
    });
  }

  public open(): void {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('origin-cutscene-overlay');
    if (!overlay) return;

    this.soundEngine.unlockAudio();
    overlay.classList.remove('hidden');
    this.startAmbientAudio();
    this.goToChapter(0);
    this.play();
  }

  public close(): void {
    if (typeof document !== 'undefined') {
      const overlay = document.getElementById('origin-cutscene-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
      }
    }
    this.pause();
    this.stopAmbientAudio();
    if (this.onClose) this.onClose();
  }

  public getCurrentChapterIndex(): number {
    return this.currentChapterIndex;
  }

  public goToChapter(index: number): void {
    if (index < 0 || index >= CUTSCENE_CHAPTERS.length) return;
    this.currentChapterIndex = index;
    const ch = CUTSCENE_CHAPTERS[index];

    if (typeof document !== 'undefined') {
      // Update text elements
      const badgeEl = document.getElementById('cutscene-chapter-badge');
      const titleEl = document.getElementById('cutscene-chapter-title');
      const narrativeEl = document.getElementById('cutscene-narrative-text');

      if (badgeEl) badgeEl.textContent = ch.badge;
      if (titleEl) {
        titleEl.textContent = ch.title;
        titleEl.style.color = ch.themeColor;
        titleEl.style.textShadow = `0 0 20px ${ch.themeColor}aa`;
      }
      if (narrativeEl) {
        narrativeEl.textContent = ch.narrative;
        narrativeEl.classList.remove('anim-narrative');
        void narrativeEl.offsetWidth; // trigger reflow
        narrativeEl.classList.add('anim-narrative');
      }

      // Update scene visuals (hide all, show active)
      for (let i = 1; i <= CUTSCENE_CHAPTERS.length; i++) {
        const sc = document.getElementById(`cutscene-scene-${i}`);
        if (sc) {
          if (i === index + 1) {
            sc.classList.remove('hidden');
          } else {
            sc.classList.add('hidden');
          }
        }
      }

      // Update pips
      const pips = document.querySelectorAll('.cutscene-pip');
      pips.forEach((pip, pIdx) => {
        pip.classList.toggle('active', pIdx === index);
      });

      // Update Prev / Next buttons
      const prevBtn = document.getElementById('cutscene-prev-btn') as HTMLButtonElement | null;
      const nextBtn = document.getElementById('cutscene-next-btn') as HTMLButtonElement | null;
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) {
        nextBtn.textContent = index === CUTSCENE_CHAPTERS.length - 1 ? 'FINISH 🏁' : 'NEXT ▶';
      }
    }

    // Sound cues per chapter
    this.triggerChapterSound(index);

    // Reset auto-advance timer if playing
    if (this.isPlaying) {
      this.scheduleNext();
    }
  }

  public nextChapter(): void {
    if (this.currentChapterIndex < CUTSCENE_CHAPTERS.length - 1) {
      this.goToChapter(this.currentChapterIndex + 1);
    } else {
      this.close();
    }
  }

  public prevChapter(): void {
    if (this.currentChapterIndex > 0) {
      this.goToChapter(this.currentChapterIndex - 1);
    }
  }

  public togglePlayPause(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play(): void {
    this.isPlaying = true;
    if (typeof document !== 'undefined') {
      const btn = document.getElementById('cutscene-play-pause-btn');
      if (btn) btn.textContent = '⏸ PAUSE';
    }
    this.scheduleNext();
  }

  public pause(): void {
    this.isPlaying = false;
    if (typeof document !== 'undefined') {
      const btn = document.getElementById('cutscene-play-pause-btn');
      if (btn) btn.textContent = '▶ PLAY';
    }
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  private scheduleNext(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
    }
    // Auto-advance after 7.5 seconds per chapter
    this.autoAdvanceTimer = setTimeout(() => {
      if (this.isPlaying) {
        if (this.currentChapterIndex < CUTSCENE_CHAPTERS.length - 1) {
          this.nextChapter();
        } else {
          this.pause();
        }
      }
    }, 7500);
  }

  private toggleMute(btn?: HTMLElement): void {
    this.isMuted = !this.isMuted;
    if (btn) {
      btn.textContent = this.isMuted ? '🔇 Muted' : '🔊 Audio';
    }
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.isMuted ? 0 : 0.12;
    }
  }

  /**
   * Triggers distinct procedural audio cues synchronized with the chapter lore
   */
  private triggerChapterSound(index: number): void {
    if (this.isMuted) return;

    try {
      switch (index) {
        case 0:
          // Chapter 1: Deep cosmic void hum
          this.soundEngine.playWarp();
          break;
        case 1:
          // Chapter 2: The Core Shatters
          this.soundEngine.playExplosion();
          break;
        case 2:
          // Chapter 3: Three Starter Sparks (Fire, Water, Earth)
          this.soundEngine.playSpellCast('Fire');
          setTimeout(() => this.soundEngine.playSpellCast('Water'), 350);
          setTimeout(() => this.soundEngine.playSpellCast('Earth'), 700);
          break;
        case 3:
          // Chapter 4: 50 Elements & Reactions cascade
          this.soundEngine.playSpellCast('Lightning');
          setTimeout(() => this.soundEngine.playUnlock(), 400);
          break;
        case 4:
          // Chapter 5: Sovereign Creator God's decree
          this.soundEngine.playVictoryFanfare();
          break;
        case 5:
          // Chapter 6: Final Awakening into the Arena
          this.soundEngine.playLevelUp();
          break;
      }
    } catch (err) {
      console.warn('Cutscene sound playback error:', err);
    }
  }

  /**
   * Procedural ethereal synth drone for dramatic cinematic atmosphere
   */
  private startAmbientAudio(): void {
    if (this.isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.stopAmbientAudio();

      const t = this.audioCtx.currentTime;
      this.ambientGain = this.audioCtx.createGain();
      this.ambientGain.gain.setValueAtTime(0.001, t);
      this.ambientGain.gain.linearRampToValueAtTime(0.12, t + 1.2);
      this.ambientGain.connect(this.audioCtx.destination);

      // Sub-drone 55 Hz (A1)
      this.ambientOsc1 = this.audioCtx.createOscillator();
      this.ambientOsc1.type = 'sawtooth';
      this.ambientOsc1.frequency.setValueAtTime(55, t);

      // Filter to make it warm and cinematic
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, t);
      this.ambientOsc1.connect(filter);
      filter.connect(this.ambientGain);

      // Ethereal chord harmonic (165 Hz - E3)
      this.ambientOsc2 = this.audioCtx.createOscillator();
      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.setValueAtTime(165, t);
      this.ambientOsc2.connect(this.ambientGain);

      this.ambientOsc1.start(t);
      this.ambientOsc2.start(t);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  private stopAmbientAudio(): void {
    if (this.ambientOsc1) {
      try {
        this.ambientOsc1.stop();
        this.ambientOsc1.disconnect();
      } catch {}
      this.ambientOsc1 = null;
    }
    if (this.ambientOsc2) {
      try {
        this.ambientOsc2.stop();
        this.ambientOsc2.disconnect();
      } catch {}
      this.ambientOsc2 = null;
    }
    if (this.ambientGain) {
      try {
        this.ambientGain.disconnect();
      } catch {}
      this.ambientGain = null;
    }
  }
}
