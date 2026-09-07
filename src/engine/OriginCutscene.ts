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
    badge: '🗿⚡ CHAPTER I • CLASH OF THE TITANS',
    title: 'When Titans Collided',
    subtitle: 'Two primeval giants wage war across the cosmos with reality-shattering fury.',
    narrative:
      'At the dawn of time, two colossal Titans clashed across the cosmic firmament—the Magma Colossus and the Void Leviathan. Their earth-shattering strikes shattered tectonic plates and caused the universe itself to tremble!',
    themeColor: '#f59e0b',
  },
  {
    id: 2,
    badge: '🌌🌀 CHAPTER II • THE COSMIC RIFT',
    title: 'The Dimensional Tear Opens',
    subtitle: 'Their titanic collision ripped open a cosmic vortex in spacetime.',
    narrative:
      'With a final catastrophic blow, their fists collided, violently ripping open a swirling Cosmic Rift! Space and time tore apart as a gravitational singularity began pulling in cosmic debris, stars, and wandering mortals alike!',
    themeColor: '#c084fc',
  },
  {
    id: 3,
    badge: '🌀🪐 CHAPTER III • THE FALL THROUGH WORLDS',
    title: 'Falling Through the Rift',
    subtitle: 'Devoured by the singularity, you tumble across dimensions to a small pocket world.',
    narrative:
      'Swept away by the gravitational vortex, you tumbled through dimensional wormholes at warp speed. After hurtling across reality, you crash-landed onto an uncharted, floating miniature world adrift in the stars.',
    themeColor: '#38bdf8',
  },
  {
    id: 4,
    badge: '🧙‍♂️✨ CHAPTER IV • THE WIZARD\'S POWER',
    title: 'The Grand Wizard\'s Blessing',
    subtitle: 'An ancient arch-wizard channels his ultimate elemental mastery into your soul.',
    narrative:
      'Emerging from the mystical ruins, an ancient Grand Wizard approached. Amazed that a mortal survived the cosmic fall, he chanted sacred rites and channeled his lifetime of godlike elemental powers directly into your hands!',
    themeColor: '#10b981',
  },
  {
    id: 5,
    badge: '😈⚡ CHAPTER V • THE POWER STOLEN!',
    title: 'Ambushed in the Shadows',
    subtitle: 'A shadowy nemesis ambushes you and violently steals your godlike power.',
    narrative:
      'Suddenly, the sky turned pitch black! The sinister Void Overlord struck from the shadows, violently siphoning the wizard\'s godlike power from your chest! The demon fled into the cosmos, leaving you with only the basic starter embers of Fire, Water, and Earth.',
    themeColor: '#ef4444',
  },
  {
    id: 6,
    badge: '⚔️👑 CHAPTER VI • MISSION: ROUND 1000',
    title: 'The Mission to Reclaim the Power',
    subtitle: 'Ascend through 1000 rounds and conquer the Ultimate Boss to reclaim your destiny!',
    narrative:
      'The weakened Wizard gasped: "Do not despair! You still hold the Three Starter Embers. Train, master the elements, and battle through the arenas to defeat the Ultimate Boss on Round 1000 and reclaim the stolen power!" Your mission begins now!',
    themeColor: '#fbbf24',
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

  // Video Chronicle Integration
  private videoEl: HTMLVideoElement | null = null;
  private videoContainerEl: HTMLElement | null = null;
  private videoProgressEl: HTMLElement | null = null;
  private modeBtnEl: HTMLElement | null = null;
  private viewMode: 'video' | 'stage' = 'video';

  // Callbacks
  public onEnterArena?: () => void;
  public onOpenSandbox?: () => void;
  public onWarpToVoidOverlord?: () => void;
  public onClose?: () => void;

  constructor(soundEngine: SoundEngine) {
    this.soundEngine = soundEngine;
  }

  public initDOM(): void {
    const overlay = document.getElementById('origin-cutscene-overlay');
    if (!overlay) return;

    // Elements
    this.videoEl = document.getElementById('cutscene-video-player') as HTMLVideoElement | null;
    this.videoContainerEl = document.getElementById('cutscene-video-container');
    this.videoProgressEl = document.getElementById('cutscene-video-progress');
    this.modeBtnEl = document.getElementById('cutscene-mode-btn');

    // Video events & sync
    if (this.videoEl) {
      this.videoEl.addEventListener('click', () => {
        this.togglePlayPause();
      });

      this.videoEl.addEventListener('timeupdate', () => {
        if (!this.videoEl) return;
        const dur = this.videoEl.duration || 30;
        const pct = (this.videoEl.currentTime / dur) * 100;
        if (this.videoProgressEl) {
          this.videoProgressEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
        }

        // Bi-directional sync: if video crosses 5s boundaries, sync narrative chapter
        if (this.viewMode === 'video' && this.isPlaying) {
          const expectedChapter = Math.min(
            CUTSCENE_CHAPTERS.length - 1,
            Math.max(0, Math.floor(this.videoEl.currentTime / 5))
          );
          if (expectedChapter !== this.currentChapterIndex) {
            this.goToChapter(expectedChapter, false);
          }
        }
      });

      this.videoEl.addEventListener('ended', () => {
        if (this.currentChapterIndex === CUTSCENE_CHAPTERS.length - 1) {
          this.pause();
        }
      });
    }

    // View mode toggle
    if (this.modeBtnEl) {
      this.modeBtnEl.addEventListener('click', () => {
        this.soundEngine.playClick();
        this.toggleViewMode();
      });
      this.updateModeBtn();
    }

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
          this.goToChapter(idx, true);
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
      this.goToChapter(CUTSCENE_CHAPTERS.length - 1, true);
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

    document.getElementById('cutscene-btn-warp-overlord')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.close();
      if (this.onWarpToVoidOverlord) this.onWarpToVoidOverlord();
    });

    document.getElementById('cutscene-btn-replay')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.goToChapter(0, true);
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
    this.setViewMode(this.viewMode);
    this.goToChapter(0, true);
    this.play();
  }

  public close(): void {
    if (typeof document !== 'undefined') {
      const overlay = document.getElementById('origin-cutscene-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
      }
    }
    if (this.videoEl) {
      this.videoEl.pause();
    }
    this.pause();
    this.stopAmbientAudio();
    if (this.onClose) this.onClose();
  }

  public toggleViewMode(): void {
    this.setViewMode(this.viewMode === 'video' ? 'stage' : 'video');
  }

  public setViewMode(mode: 'video' | 'stage'): void {
    this.viewMode = mode;
    this.updateModeBtn();
    if (this.videoContainerEl) {
      if (mode === 'video') {
        this.videoContainerEl.classList.remove('hidden');
        if (this.videoEl) {
          this.videoEl.currentTime = this.currentChapterIndex * 5;
          if (this.isPlaying) {
            this.videoEl.play().catch(() => {});
          }
        }
      } else {
        this.videoContainerEl.classList.add('hidden');
      }
    }
    this.updateSceneVisibility();
  }

  private updateModeBtn(): void {
    if (!this.modeBtnEl) return;
    if (this.viewMode === 'video') {
      this.modeBtnEl.textContent = '📹 Video Mode';
      this.modeBtnEl.classList.add('active-video');
      this.modeBtnEl.title = 'Current: Video Mode (Click for Interactive Stage)';
    } else {
      this.modeBtnEl.textContent = '🎭 Stage Mode';
      this.modeBtnEl.classList.remove('active-video');
      this.modeBtnEl.title = 'Current: Stage Mode (Click for Cinematic Video)';
    }
  }

  private updateSceneVisibility(): void {
    if (typeof document === 'undefined') return;
    for (let i = 1; i <= CUTSCENE_CHAPTERS.length; i++) {
      const sc = document.getElementById(`cutscene-scene-${i}`);
      if (sc) {
        if (this.viewMode === 'stage' && i === this.currentChapterIndex + 1) {
          sc.classList.remove('hidden');
        } else {
          sc.classList.add('hidden');
        }
      }
    }
  }

  public getCurrentChapterIndex(): number {
    return this.currentChapterIndex;
  }

  public goToChapter(index: number, seekVideo: boolean = true): void {
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

      // Update scene visuals based on current mode
      this.updateSceneVisibility();

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

    // Sync video timeline if requested
    if (seekVideo && this.videoEl) {
      this.videoEl.currentTime = index * 5;
      if (this.isPlaying) {
        this.videoEl.play().catch(() => {});
      }
    }

    // Sound cues per chapter
    this.triggerChapterSound(index);

    // Reset auto-advance timer if playing (in stage mode, or fallback)
    if (this.isPlaying && this.viewMode === 'stage') {
      this.scheduleNext();
    }
  }

  public nextChapter(): void {
    if (this.currentChapterIndex < CUTSCENE_CHAPTERS.length - 1) {
      this.goToChapter(this.currentChapterIndex + 1, true);
    } else {
      this.close();
    }
  }

  public prevChapter(): void {
    if (this.currentChapterIndex > 0) {
      this.goToChapter(this.currentChapterIndex - 1, true);
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
    if (this.videoEl) {
      this.videoEl.play().catch(() => {});
    }
    if (this.viewMode === 'stage') {
      this.scheduleNext();
    }
  }

  public pause(): void {
    this.isPlaying = false;
    if (typeof document !== 'undefined') {
      const btn = document.getElementById('cutscene-play-pause-btn');
      if (btn) btn.textContent = '▶ PLAY';
    }
    if (this.videoEl) {
      this.videoEl.pause();
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
    // Auto-advance after 5.5 seconds per chapter in stage mode
    this.autoAdvanceTimer = setTimeout(() => {
      if (this.isPlaying) {
        if (this.currentChapterIndex < CUTSCENE_CHAPTERS.length - 1) {
          this.nextChapter();
        } else {
          this.pause();
        }
      }
    }, 5500);
  }

  private toggleMute(btn?: HTMLElement): void {
    this.isMuted = !this.isMuted;
    if (btn) {
      btn.textContent = this.isMuted ? '🔇 Muted' : '🔊 Audio';
    }
    if (this.videoEl) {
      this.videoEl.muted = this.isMuted;
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
          // Chapter 1: Titans clash with earth shattering collisions
          this.soundEngine.playExplosion();
          setTimeout(() => this.soundEngine.playSpellCast('Earth'), 300);
          break;
        case 1:
          // Chapter 2: The Cosmic Rift tears open
          this.soundEngine.playWarp();
          setTimeout(() => this.soundEngine.playExplosion(), 250);
          break;
        case 2:
          // Chapter 3: Falling through the rift & landing on small world
          this.soundEngine.playWarp();
          setTimeout(() => this.soundEngine.playHit(), 600);
          break;
        case 3:
          // Chapter 4: Grand Wizard gives power
          this.soundEngine.playSpellCast('Fire');
          setTimeout(() => this.soundEngine.playSpellCast('Water'), 300);
          setTimeout(() => this.soundEngine.playSpellCast('Earth'), 600);
          setTimeout(() => this.soundEngine.playUnlock(), 900);
          break;
        case 4:
          // Chapter 5: Power gets stolen by Void Overlord
          this.soundEngine.playHeroDeathScream();
          setTimeout(() => this.soundEngine.playExplosion(), 400);
          break;
        case 5:
          // Chapter 6: The Mission: Round 1000 Ultimate Boss
          this.soundEngine.playVictoryFanfare();
          setTimeout(() => this.soundEngine.playLevelUp(), 700);
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
