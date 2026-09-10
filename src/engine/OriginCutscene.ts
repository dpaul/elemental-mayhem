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
import { CutsceneVoiceManager } from './CutsceneVoiceManager';
import { CutsceneMusicEngine } from '../audio/CutsceneMusicEngine';

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
    badge: '⚔️ CHAPTER I • THE TITANS',
    title: 'When Titans Collided',
    subtitle: 'Two primeval titans clashed across the fabric of spacetime!',
    narrative:
      'In the beginning, before elements took form, the Magma Colossus and the Void Leviathan fought an apocalyptic battle across the heavens! The clash shook the cosmos and fractured reality itself.',
    themeColor: '#f97316',
  },
  {
    id: 2,
    badge: '🌌 CHAPTER II • THE DIMENSIONAL RIFT',
    title: 'The Dimensional Tear Opens',
    subtitle: 'A colossal dimensional wormhole tore across the heavens, pulling wandering mortals inside!',
    narrative:
      'The sheer force of their elemental impact ripped open an abyssal spacetime rift! A swirling gravitational wormhole opened above, devouring wandering mortals and pulling you into the cosmic void.',
    themeColor: '#a855f7',
  },
  {
    id: 3,
    badge: '🌀 CHAPTER III • FALLING THROUGH',
    title: 'Falling Through the Rift',
    subtitle: 'Tumbling through hyperspace before crash-landing upon a mysterious miniature world.',
    narrative:
      'Spiraling through the blinding hyperspace tunnel, you hurtled through fractured element streams before crashing down onto the mystical miniature world of the Arena!',
    themeColor: '#06b6d4',
  },
  {
    id: 4,
    badge: '✨ CHAPTER IV • THE WIZARD GIVING MAGIC',
    title: "The Grand Wizard's Blessing",
    subtitle: 'An ancient Grand Arch-Wizard bestowed godlike elemental power upon you!',
    narrative:
      'An ancient Grand Arch-Wizard greeted you among glowing runes: "Take my power, young wanderer!" He channeled the fundamental reaction cascade into your soul, granting mastery over all fifty elements!',
    themeColor: '#10b981',
  },
  {
    id: 5,
    badge: '🌑 CHAPTER V • STEALING THE MAGIC',
    title: 'The Void Overlord Steals the Magic',
    subtitle: 'The sinister Void Overlord struck from the dark and violently stole your powers away!',
    narrative:
      'Suddenly, an ominous shadow descended! The Void Overlord struck without warning, siphoning the wizard\'s godlike power from your chest and fleeing into the cosmos, leaving you only the three basic starter embers of Fire, Water, and Earth!',
    themeColor: '#ef4444',
  },
  {
    id: 6,
    badge: '☁️👑 CHAPTER VI • THE OVERLORD IN THE DARK CLOUDS',
    title: 'The Void Overlord in the Dark Clouds',
    subtitle: 'The sinister Void Overlord looms within the dark cosmic storm clouds!',
    narrative:
      'High above the realms, shrouded in swirling dark storm clouds, the sinister Void Overlord awaits! Wielding your stolen godlike magic, he challenges you to conquer all 1000 rounds and face him in the dark clouds to take back your elemental power!',
    themeColor: '#8b5cf6',
  },
];

export class OriginCutsceneManager {
  private soundEngine: SoundEngine;
  private currentChapterIndex: number = 0;
  private isPlaying: boolean = true;
  private autoAdvanceTimer: any = null;
  private isMuted: boolean = false;
  private chapterSoundTimers: any[] = [];

  // Voice Dialogue Manager
  public voiceManager: CutsceneVoiceManager;

  // Fast, Soft, Cool & Scary Cutscene Music Engine
  public musicEngine: CutsceneMusicEngine;

  // Video Chronicle Integration
  private videoEl: HTMLVideoElement | null = null;
  private videoContainerEl: HTMLElement | null = null;
  private videoProgressEl: HTMLElement | null = null;
  private modeBtnEl: HTMLElement | null = null;
  private viewMode: 'video' | 'stage' = 'video';

  // Progress & Duration tracking for remaining time
  private progressTimer: any = null;
  private chapterStartTime: number = Date.now();
  private isPausedTime: number = 0;
  private accumulatedPausedMs: number = 0;

  // Callbacks
  public onEnterArena?: () => void;
  public onOpenSandbox?: () => void;
  public onWarpToVoidOverlord?: () => void;
  public onClose?: () => void;

  constructor(soundEngine: SoundEngine) {
    this.soundEngine = soundEngine;
    this.voiceManager = new CutsceneVoiceManager(soundEngine);
    this.musicEngine = new CutsceneMusicEngine();
  }

  public initDOM(): void {
    const overlay = document.getElementById('origin-cutscene-overlay');
    if (!overlay) return;

    // Initialize Spoken Dialogue System & Hook Completion for Auto-Advance
    this.voiceManager.initDOM();
    this.voiceManager.onChapterDialogueComplete = (chapterIdx) => {
      if (this.isPlaying && chapterIdx === this.currentChapterIndex) {
        if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
        // Savor the completed scene for 1.8s before moving to next chapter
        this.autoAdvanceTimer = setTimeout(() => {
          if (this.isPlaying && chapterIdx === this.currentChapterIndex) {
            if (this.currentChapterIndex < CUTSCENE_CHAPTERS.length - 1) {
              this.nextChapter();
            } else {
              this.pause();
            }
          }
        }, 1800);
      }
    };

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

        // In Video Mode, smoothly transition chapters in sequence as video advances (5 seconds per chapter)
        if (this.viewMode === 'video' && this.isPlaying) {
          const curSec = this.videoEl.currentTime;
          if (curSec >= 29.8) {
            if (this.currentChapterIndex !== CUTSCENE_CHAPTERS.length - 1) {
              this.goToChapter(CUTSCENE_CHAPTERS.length - 1, false);
            }
            this.pause();
            return;
          }
          const targetChapter = Math.min(CUTSCENE_CHAPTERS.length - 1, Math.max(0, Math.floor(curSec / 5)));
          if (targetChapter !== this.currentChapterIndex) {
            this.goToChapter(targetChapter, false);
          }
        }
        this.updateProgressUI();
      });

      this.videoEl.addEventListener('ended', () => {
        this.goToChapter(CUTSCENE_CHAPTERS.length - 1, false);
        this.pause();
      });
    }

    // Video Center Play Button
    document.getElementById('video-center-play-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.soundEngine.playClick();
      this.togglePlayPause();
    });

    // Video HUD Controls
    document.getElementById('video-hud-play-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.togglePlayPause();
    });

    document.getElementById('video-hud-rewind-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.prevChapter();
    });

    document.getElementById('video-hud-forward-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.nextChapter();
    });

    document.getElementById('video-hud-theater-btn')?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.toggleTheaterMode();
    });

    // Interactive Video Timeline Scrubber
    const scrubber = document.getElementById('cutscene-video-scrubber');
    scrubber?.addEventListener('click', (e: MouseEvent) => {
      const rect = scrubber.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      const targetChapter = Math.min(CUTSCENE_CHAPTERS.length - 1, Math.floor(pct * CUTSCENE_CHAPTERS.length));
      this.soundEngine.playCutscenePipBlip();
      this.goToChapter(targetChapter, true);
    });

    // Full Cutscene Overall Bottom Timeline Bar Click Scrub
    const bottomTimeline = document.getElementById('cutscene-overall-timeline-wrap');
    bottomTimeline?.addEventListener('click', (e: MouseEvent) => {
      const bar = document.getElementById('cutscene-overall-timeline-bar') || bottomTimeline;
      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      const targetChapter = Math.min(CUTSCENE_CHAPTERS.length - 1, Math.floor(pct * CUTSCENE_CHAPTERS.length));
      this.soundEngine.playCutscenePipBlip();
      this.goToChapter(targetChapter, true);
    });

    // Start Real-Time Cutscene Progress Loop for Remaining Duration
    if (!this.progressTimer && typeof window !== 'undefined') {
      this.progressTimer = setInterval(() => this.updateProgressUI(), 60);
    }

    // View mode toggle
    if (this.modeBtnEl) {
      this.modeBtnEl.addEventListener('click', () => {
        this.soundEngine.playCutsceneModeSwitch();
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
          this.soundEngine.playCutscenePipBlip();
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
    this.musicEngine.start();
    this.musicEngine.setChapter(0);
    this.setViewMode(this.viewMode);

    this.chapterStartTime = Date.now();
    this.accumulatedPausedMs = 0;
    this.isPausedTime = 0;
    if (!this.progressTimer && typeof window !== 'undefined') {
      this.progressTimer = setInterval(() => this.updateProgressUI(), 60);
    }

    this.goToChapter(0, true);
    this.play();
  }

  public close(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    if (typeof document !== 'undefined') {
      const overlay = document.getElementById('origin-cutscene-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
      }
    }
    if (this.videoEl) {
      this.videoEl.pause();
    }
    this.clearChapterSoundTimers();
    this.pause();
    this.voiceManager.stopAll();
    this.musicEngine.stop();
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
        if (this.isPlaying) {
          this.scheduleNext();
        }
      }
    }
    this.updateSceneVisibility();
    this.updateProgressUI();
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

      // Show in-video cinematic chapter title card
      this.showChapterTitleCard(index);

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
    this.musicEngine.setChapter(index);

    // Track chapter timeline and remaining duration
    this.chapterStartTime = Date.now();
    this.accumulatedPausedMs = 0;
    this.isPausedTime = 0;
    this.updateProgressUI();

    // Trigger multi-voice character dialogue (speaks all narrative and dialogue lines)
    this.voiceManager.playChapter(index);

    // Reset auto-advance timer if playing
    if (this.isPlaying) {
      this.scheduleNext();
    }
  }

  public getChapterDurationMs(_index: number): number {
    return 5000;
  }

  public updateProgressUI(): void {
    if (typeof document === 'undefined') return;

    let elapsedSec = 0;
    const totalDurationSec = 30;

    if (this.videoEl && this.viewMode === 'video' && !isNaN(this.videoEl.currentTime)) {
      elapsedSec = Math.min(totalDurationSec, Math.max(0, this.videoEl.currentTime));
    } else {
      const now = this.isPlaying ? Date.now() : (this.isPausedTime || Date.now());
      const elapsedInChapter = Math.max(0, now - this.chapterStartTime - this.accumulatedPausedMs);
      const subProgress = Math.min(1.0, elapsedInChapter / 5000);
      elapsedSec = Math.min(totalDurationSec, (this.currentChapterIndex + subProgress) * 5);
    }

    const overallPct = Math.min(100, Math.max(0, (elapsedSec / totalDurationSec) * 100));
    const remainingSec = Math.max(0, totalDurationSec - elapsedSec);

    const pad = (num: number) => String(Math.floor(num)).padStart(2, '0');
    const elapsedStr = `00:${pad(elapsedSec)}`;
    const remainingStr = `00:${String(Math.ceil(remainingSec)).padStart(2, '0')}`;
    const totalStr = `00:${pad(totalDurationSec)}`;

    // 1. Update Video Player HUD Progress & Timestamps
    if (this.videoProgressEl) {
      this.videoProgressEl.style.width = `${overallPct}%`;
    }
    const hudTimeDisplay = document.getElementById('video-hud-time-display');
    if (hudTimeDisplay) {
      hudTimeDisplay.textContent = `${elapsedStr} / ${totalStr} (-${remainingStr})`;
    }
    const videoTimeTag = document.getElementById('video-time-tag');
    if (videoTimeTag) {
      videoTimeTag.textContent = `${elapsedStr} / ${totalStr} • ⏳ ${remainingStr} REMAINING`;
    }

    // 2. Update Bottom Overall Cutscene Timeline Bar & Badges
    const overallFill = document.getElementById('cutscene-overall-progress-fill');
    if (overallFill) {
      overallFill.style.width = `${overallPct}%`;
    }
    const remainingText = document.getElementById('cutscene-overall-remaining-text');
    if (remainingText) {
      remainingText.textContent = `${remainingStr} remaining`;
    }
    const elapsedText = document.getElementById('cutscene-overall-elapsed-text');
    if (elapsedText) {
      elapsedText.textContent = `${elapsedStr} / ${totalStr} • Chapter ${this.currentChapterIndex + 1} of ${CUTSCENE_CHAPTERS.length}`;
    }
  }

  public showChapterTitleCard(index: number): void {
    const cardEl = document.getElementById('video-chapter-title-card');
    const superEl = document.getElementById('video-title-card-super');
    const mainEl = document.getElementById('video-title-card-main');
    const subEl = document.getElementById('video-title-card-sub');
    if (!cardEl || !superEl || !mainEl || !subEl) return;

    const ch = CUTSCENE_CHAPTERS[index];
    if (!ch) return;

    const romanNumerals = ['CHAPTER I', 'CHAPTER II', 'CHAPTER III', 'CHAPTER IV', 'CHAPTER V', 'CHAPTER VI'];
    superEl.textContent = romanNumerals[index] || `CHAPTER ${index + 1}`;
    mainEl.textContent = ch.title.toUpperCase();
    mainEl.style.textShadow = `0 2px 10px rgba(0, 0, 0, 0.9), 0 0 25px ${ch.themeColor}aa`;
    subEl.textContent = ch.badge;

    cardEl.classList.remove('show-title-card');
    void cardEl.offsetWidth; // trigger reflow
    cardEl.classList.add('show-title-card');
  }

  private isTheaterMode: boolean = false;

  public toggleTheaterMode(): boolean {
    this.isTheaterMode = !this.isTheaterMode;
    if (this.videoContainerEl) {
      this.videoContainerEl.classList.toggle('theater-mode', this.isTheaterMode);
    }
    const theaterBtn = document.getElementById('video-hud-theater-btn');
    if (theaterBtn) {
      theaterBtn.classList.toggle('active', this.isTheaterMode);
      theaterBtn.textContent = this.isTheaterMode ? '⛶ Default' : '⛶ Theater';
    }
    return this.isTheaterMode;
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
    if (this.isPausedTime > 0) {
      this.accumulatedPausedMs += (Date.now() - this.isPausedTime);
      this.isPausedTime = 0;
    }
    if (typeof document !== 'undefined') {
      const btn = document.getElementById('cutscene-play-pause-btn');
      if (btn) btn.textContent = '⏸ PAUSE';
      const hudPlayBtn = document.getElementById('video-hud-play-btn');
      if (hudPlayBtn) hudPlayBtn.textContent = '⏸';
      const centerPlayBtn = document.getElementById('video-center-play-btn');
      if (centerPlayBtn) centerPlayBtn.classList.remove('show');
    }
    if (this.videoEl) {
      this.videoEl.play().catch(() => {});
    }
    this.musicEngine.resume();
    this.voiceManager.replayCurrentChapterDialogue();
    this.scheduleNext();
    this.updateProgressUI();
  }

  public pause(): void {
    this.isPlaying = false;
    this.isPausedTime = Date.now();
    this.musicEngine.pause();
    this.voiceManager.stopAll();
    if (typeof document !== 'undefined') {
      const btn = document.getElementById('cutscene-play-pause-btn');
      if (btn) btn.textContent = '▶ PLAY';
      const hudPlayBtn = document.getElementById('video-hud-play-btn');
      if (hudPlayBtn) hudPlayBtn.textContent = '▶';
      const centerPlayBtn = document.getElementById('video-center-play-btn');
      if (centerPlayBtn) centerPlayBtn.classList.add('show');
    }
    if (this.videoEl && typeof this.videoEl.pause === 'function') {
      this.videoEl.pause();
    }
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.updateProgressUI();
  }

  private scheduleNext(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }

    // In Stage Mode (or if video isn't loaded), smoothly advance chapters in order every 5 seconds
    if (this.viewMode === 'stage' || !this.videoEl) {
      this.autoAdvanceTimer = setTimeout(() => {
        if (this.isPlaying) {
          if (this.currentChapterIndex < CUTSCENE_CHAPTERS.length - 1) {
            this.nextChapter();
          } else {
            this.pause();
          }
        }
      }, 5000);
    }
  }

  private toggleMute(btn?: HTMLElement): void {
    this.isMuted = !this.isMuted;
    if (btn) {
      btn.textContent = this.isMuted ? '🔇 Muted' : '🔊 Audio';
    }
    if (this.videoEl) {
      this.videoEl.muted = this.isMuted;
    }
    this.musicEngine.setMuted(this.isMuted);
  }

  private clearChapterSoundTimers(): void {
    this.chapterSoundTimers.forEach((t) => clearTimeout(t));
    this.chapterSoundTimers = [];
  }

  private scheduleSound(fn: () => void, delayMs: number): void {
    if (this.isMuted) return;
    const timer = setTimeout(() => {
      if (!this.isMuted) {
        try {
          fn();
        } catch (err) {
          console.warn('Cutscene sound playback error:', err);
        }
      }
    }, delayMs);
    this.chapterSoundTimers.push(timer);
  }

  /**
   * Triggers rich multi-layered procedural audio cues synchronized across each scene
   */
  private triggerChapterSound(index: number): void {
    this.clearChapterSoundTimers();
    if (this.isMuted) return;

    try {
      switch (index) {
        case 0:
          // Chapter 1: Titans clash with earth shattering collisions & rumble
          this.soundEngine.playCutsceneTitanClash();
          this.scheduleSound(() => this.soundEngine.playSpellCast('Earth'), 350);
          this.scheduleSound(() => {
            this.soundEngine.playHit();
            this.soundEngine.playSpellCast('Fire');
          }, 1100);
          this.scheduleSound(() => this.soundEngine.playCutsceneTitanClash(), 1800);
          this.scheduleSound(() => {
            this.soundEngine.playSpellCast('Lightning');
            this.soundEngine.playExplosion();
          }, 2700);
          this.scheduleSound(() => this.soundEngine.playEarthquakeRumble(), 3600);
          break;

        case 1:
          // Chapter 2: The Cosmic Rift tears open with gravitational singularity
          this.soundEngine.playCutsceneCosmicRift();
          this.scheduleSound(() => this.soundEngine.playSpellCast('Void'), 700);
          this.scheduleSound(() => this.soundEngine.playWarp(), 1400);
          this.scheduleSound(() => this.soundEngine.playCosmicSingularity(), 2100);
          this.scheduleSound(() => this.soundEngine.playSpellCast('Lightning'), 2900);
          this.scheduleSound(() => this.soundEngine.playSpellCast('Sound'), 3700);
          break;

        case 2:
          // Chapter 3: Falling through the rift & crash landing on small world
          this.soundEngine.playCutsceneWormholeFall();
          this.scheduleSound(() => this.soundEngine.playWarp(), 600);
          this.scheduleSound(() => this.soundEngine.playSpellCast('Sound'), 1300);
          this.scheduleSound(() => this.soundEngine.playEarthquakeRumble(), 2000);
          this.scheduleSound(() => this.soundEngine.playSpellCast('Arcane'), 2800);
          this.scheduleSound(() => this.soundEngine.playHit(), 3500);
          break;

        case 3:
          // Chapter 4: Grand Wizard channels godlike elemental magic
          this.soundEngine.playCutsceneWizardBlessing();
          this.scheduleSound(() => this.soundEngine.playSpellCast('Arcane'), 600);
          this.scheduleSound(() => {
            this.soundEngine.playUnlock();
            this.soundEngine.playSpellCast('Fire');
          }, 1300);
          this.scheduleSound(() => {
            this.soundEngine.playMagicSurge();
            this.soundEngine.playSpellCast('Water');
          }, 2000);
          this.scheduleSound(() => {
            this.soundEngine.playLevelUp();
            this.soundEngine.playSpellCast('Earth');
          }, 2800);
          this.scheduleSound(() => this.soundEngine.playSpellCast('Light'), 3500);
          break;

        case 4:
          // Chapter 5: Ambushed! Power violently stolen by Void Overlord
          this.soundEngine.playCutscenePowerStolen();
          this.scheduleSound(() => this.soundEngine.playDarkSiphon(), 500);
          this.scheduleSound(() => this.soundEngine.playHeroDeathScream(), 1200);
          this.scheduleSound(() => {
            this.soundEngine.playExplosion();
            this.soundEngine.playDarkSiphon();
          }, 2000);
          this.scheduleSound(() => this.soundEngine.playSpellCast('Fire'), 2700);
          this.scheduleSound(() => this.soundEngine.playSpellCast('Water'), 3300);
          this.scheduleSound(() => this.soundEngine.playSpellCast('Earth'), 3800);
          break;

        case 5:
          // Chapter 6: Mission: Round 1000 Ultimate Boss!
          this.soundEngine.playCutsceneBossBraam();
          this.scheduleSound(() => this.soundEngine.playBossWarhorn(), 800);
          this.scheduleSound(() => this.soundEngine.playVictoryFanfare(), 1500);
          this.scheduleSound(() => this.soundEngine.playLevelUp(), 2300);
          this.scheduleSound(() => this.soundEngine.playCutsceneBossBraam(), 3000);
          this.scheduleSound(() => this.soundEngine.playVictoryFanfare(), 3900);
          break;
      }
    } catch (err) {
      console.warn('Cutscene sound playback error:', err);
    }
  }
}
