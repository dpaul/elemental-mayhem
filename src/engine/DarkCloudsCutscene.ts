// Elemental Mayhem - Saga of the Void Overlord / Ascent to the Dark Clouds Cutscene
// Interactive cinematic chronicle revealing the lore of the Void Overlord:
//   Chapter 1: The Primordial Singularity (Birth in the cosmic abyss)
//   Chapter 2: The Stolen Sparks (Ambush on the Grand Wizard and theft of 47 elements)
//   Chapter 3: The Tempest Citadel (The Overlord's throne in the dark storm clouds)
//   Chapter 4: The 1,000 Arena Trials (The Overlord's decree testing mortals)
//   Chapter 5: Ascension into the Tempest (Round 1,000 rift tears the arena)
//   Chapter 6: The Final Reckoning (Confronting the colossal Void Overlord)

import { SoundEngine } from '../audio/SoundEngine';
import {
  CutsceneVoiceManager,
  CutsceneDialogueLine,
  VoiceSpeakerProfile,
} from './CutsceneVoiceManager';
import { CutsceneMusicEngine } from '../audio/CutsceneMusicEngine';

export interface DarkCloudsChapter {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  narrative: string;
  themeColor: string;
  glowColor: string;
  durationEstimateMs: number;
}

// Backwards compatibility alias
export type DarkCloudsPhase = DarkCloudsChapter;

export const DARK_CLOUDS_CHAPTERS: DarkCloudsChapter[] = [
  {
    id: 1,
    badge: '🌌 CHAPTER I • THE PRIMORDIAL SINGULARITY',
    title: 'Birth of the Void Overlord',
    subtitle: 'Before time and elements existed, an ancient darkness watched the cosmos.',
    narrative:
      'Long before the arenas were carved, the Void Overlord ruled the silent cosmic abyss. Born from the anti-matter core between colliding titans, his hunger for pure elemental energy was insatiable!',
    themeColor: '#9333ea',
    glowColor: 'rgba(147, 51, 234, 0.85)',
    durationEstimateMs: 6500,
  },
  {
    id: 2,
    badge: '⚡ CHAPTER II • THE STOLEN SPARKS',
    title: 'The Grand Wizard Ambushed',
    subtitle: 'Striking from the cosmic shadows to siphon forty-seven elemental reaction cascades!',
    narrative:
      'When the Grand Arch-Wizard bestowed godhood upon you, the Void Overlord struck! In a blinding flash of cosmic lightning, he ripped forty-seven elements from your soul, leaving you only the starter embers of Fire, Water, and Earth!',
    themeColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    durationEstimateMs: 7000,
  },
  {
    id: 3,
    badge: '🌩️ CHAPTER III • THE TEMPEST CITADEL',
    title: 'Domain of the Dark Clouds',
    subtitle: 'High above mortal reach, the Overlord forged an empire within turbulent thunderheads.',
    narrative:
      'High above the mortal planes, shrouded within supercharged dark storm clouds, the Overlord forged his celestial throne. Orbiting stars of stolen fire, ice, magma, and radiation fueled his growing cosmic tyranny!',
    themeColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.85)',
    durationEstimateMs: 7000,
  },
  {
    id: 4,
    badge: '⚔️ CHAPTER IV • THE 1,000 ARENA TRIALS',
    title: "The Overlord's Decree",
    subtitle: 'Conquer one thousand battlefields, or perish in the elemental dust.',
    narrative:
      'The Void Overlord cast down an ominous challenge to all existence: "Prove your worth across 1,000 tactical gauntlets! Only a master of elements may pierce the dark clouds to face me!"',
    themeColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.85)',
    durationEstimateMs: 6500,
  },
  {
    id: 5,
    badge: '🌪️ CHAPTER V • ASCENSION INTO THE TEMPEST',
    title: 'The Sky Sunders at Round 1,000',
    subtitle: 'After 999 arena victories, the battlefield fractures into an abyssal wormhole!',
    narrative:
      'At the dawn of Round 1,000, the arena floor tears open! Gale-force vortex winds lift your body skyward, surging past howling thunderheads and jagged violet lightning toward the dark clouds!',
    themeColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.85)',
    durationEstimateMs: 7000,
  },
  {
    id: 6,
    badge: '👑 CHAPTER VI • THE FINAL RECKONING',
    title: 'Confronting the Void Overlord',
    subtitle: "Breaking through the storm's eye to reclaim the stolen godlike elements!",
    narrative:
      'You breach the tranquil, terrifying eye of the storm. The colossal Void Overlord looms above his celestial vortex, crown radiating dark matter! The final reckoning for the elemental universe begins now!',
    themeColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.9)',
    durationEstimateMs: 7500,
  },
];

// Backwards compatibility alias for phases
export const DARK_CLOUDS_PHASES = DARK_CLOUDS_CHAPTERS;

export const DARK_CLOUDS_CHAPTER_DIALOGUE: Record<number, CutsceneDialogueLine[]> = {
  0: [
    {
      id: 'dc_ch1_1',
      speakerId: 'narrator',
      text: 'Before stars were forged, a primordial singularity coalesced in the deep abyss...',
      durationEstimateMs: 4200,
    },
    {
      id: 'dc_ch1_2',
      speakerId: 'void_overlord',
      text: 'I am the void that swallows all light. All elemental energy belongs to me!',
      durationEstimateMs: 4600,
    },
  ],
  1: [
    {
      id: 'dc_ch2_1',
      speakerId: 'wizard',
      text: 'Beware! The shadow of the Overlord strikes when our guard is lowest!',
      durationEstimateMs: 4000,
    },
    {
      id: 'dc_ch2_2',
      speakerId: 'seeker',
      text: 'My godlike magic... He is ripping forty-seven elements straight from my chest!',
      durationEstimateMs: 4500,
    },
    {
      id: 'dc_ch2_3',
      speakerId: 'void_overlord',
      text: 'Your powers are mine, mortal! Keep your petty starter sparks and weep!',
      durationEstimateMs: 4400,
    },
  ],
  2: [
    {
      id: 'dc_ch3_1',
      speakerId: 'narrator',
      text: 'Fleeing beyond the troposphere, the Overlord wove a fortress of perpetual dark storms.',
      durationEstimateMs: 4500,
    },
    {
      id: 'dc_ch3_2',
      speakerId: 'void_overlord',
      text: 'None shall pierce my tempest! Here in the dark clouds, my throne is eternal!',
      durationEstimateMs: 4300,
    },
  ],
  3: [
    {
      id: 'dc_ch4_1',
      speakerId: 'void_overlord',
      text: 'You wish to reclaim your magic? Then conquer all 1,000 arena rounds or rot in oblivion!',
      durationEstimateMs: 4600,
    },
    {
      id: 'dc_ch4_2',
      speakerId: 'seeker',
      text: 'I will master every round. I will climb to the dark clouds and take my elements back!',
      durationEstimateMs: 4400,
    },
  ],
  4: [
    {
      id: 'dc_ch5_1',
      speakerId: 'narrator',
      text: 'Round 1,000 arrives! The arena sunders as a colossal vortex lifts you into the heavens!',
      durationEstimateMs: 4600,
    },
    {
      id: 'dc_ch5_2',
      speakerId: 'seeker',
      text: 'Supersonic winds and purple lightning... I am ascending straight into the Overlord\'s clouds!',
      durationEstimateMs: 4500,
    },
  ],
  5: [
    {
      id: 'dc_ch6_1',
      speakerId: 'void_overlord',
      text: 'Impossible! A mere mortal survived all one thousand rounds?! No matter, you die here!',
      durationEstimateMs: 4800,
    },
    {
      id: 'dc_ch6_2',
      speakerId: 'wizard',
      text: 'Draw upon your mastery, hero! Slay the Void Overlord and reclaim the fifty elements!',
      durationEstimateMs: 4500,
    },
    {
      id: 'dc_ch6_3',
      speakerId: 'seeker',
      text: 'Your reign of darkness ends today, Void Overlord! Prepare yourself!',
      durationEstimateMs: 4300,
    },
  ],
};

// Flattened dialogue for backwards compatibility
export const DARK_CLOUDS_DIALOGUE: CutsceneDialogueLine[] = [
  ...DARK_CLOUDS_CHAPTER_DIALOGUE[0],
  ...DARK_CLOUDS_CHAPTER_DIALOGUE[1],
  ...DARK_CLOUDS_CHAPTER_DIALOGUE[2],
  ...DARK_CLOUDS_CHAPTER_DIALOGUE[3],
  ...DARK_CLOUDS_CHAPTER_DIALOGUE[4],
  ...DARK_CLOUDS_CHAPTER_DIALOGUE[5],
];

// Realistic Vector Sigils for Character Dialogue
export const CHARACTER_SIGILS: Record<string, string> = {
  void_overlord: `<svg viewBox="0 0 40 40" class="speaker-sigil sigil-void"><circle cx="20" cy="20" r="16" fill="#0f021f" stroke="#ec4899" stroke-width="2"/><path d="M20 6 L23 15 L32 12 L26 20 L34 26 L24 26 L20 34 L16 26 L6 26 L14 20 L8 12 L17 15 Z" fill="#9333ea" stroke="#f472b6" stroke-width="1.2"/><circle cx="20" cy="20" r="4.5" fill="#ffffff" stroke="#c084fc" stroke-width="2"/></svg>`,
  wizard: `<svg viewBox="0 0 40 40" class="speaker-sigil sigil-wizard"><circle cx="20" cy="20" r="16" fill="#1e1302" stroke="#fbbf24" stroke-width="2"/><polygon points="20,7 24,16 33,20 24,24 20,33 16,24 7,20 16,16" fill="#f59e0b" stroke="#fef08a" stroke-width="1"/><circle cx="20" cy="20" r="6" fill="none" stroke="#67e8f9" stroke-width="1.5"/></svg>`,
  seeker: `<svg viewBox="0 0 40 40" class="speaker-sigil sigil-seeker"><circle cx="20" cy="20" r="16" fill="#041f17" stroke="#34d399" stroke-width="2"/><path d="M20 8 L29 28 L11 28 Z" fill="none" stroke="#38bdf8" stroke-width="2"/><circle cx="20" cy="18" r="3" fill="#ff4500"/><circle cx="16" cy="25" r="3" fill="#38bdf8"/><circle cx="24" cy="25" r="3" fill="#10b981"/></svg>`,
  narrator: `<svg viewBox="0 0 40 40" class="speaker-sigil sigil-chronicler"><circle cx="20" cy="20" r="16" fill="#081426" stroke="#818cf8" stroke-width="2"/><ellipse cx="20" cy="20" rx="14" ry="6" fill="none" stroke="#c084fc" stroke-width="1.5" transform="rotate(-30 20 20)"/><circle cx="20" cy="20" r="4" fill="#60a5fa"/></svg>`,
};

export class DarkCloudsCutsceneManager {
  private soundEngine: SoundEngine;
  public voiceManager: CutsceneVoiceManager;
  public musicEngine: CutsceneMusicEngine;

  private currentChapterIndex: number = 0;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private autoAdvanceTimer: any = null;
  private sfxTimers: any[] = [];
  private viewMode: 'video' | 'stage' = 'video';
  private isTheaterMode: boolean = false;

  // DOM Elements
  private overlayEl: HTMLElement | null = null;
  private chapterBadgeEl: HTMLElement | null = null;
  private chapterTitleEl: HTMLElement | null = null;
  private chapterSubtitleEl: HTMLElement | null = null;
  private chapterNarrativeEl: HTMLElement | null = null;
  private sceneImageEl: HTMLImageElement | null = null;
  private visualFrameEl: HTMLElement | null = null;
  private heroAscensionEl: HTMLElement | null = null;
  private bossSilhouetteEl: HTMLElement | null = null;
  private lightningEl: HTMLElement | null = null;
  private lightningCanvasEl: HTMLCanvasElement | null = null;
  private anamorphicStreakEl: HTMLElement | null = null;
  private stolenElementsEl: HTMLElement | null = null;

  // Title Card
  private titleCardEl: HTMLElement | null = null;
  private titleCardSuperEl: HTMLElement | null = null;
  private titleCardMainEl: HTMLElement | null = null;
  private titleCardSubEl: HTMLElement | null = null;

  // Subtitles / Dialogue Elements
  private subtitleCardEl: HTMLElement | null = null;
  private subtitleTextEl: HTMLElement | null = null;
  private speakerBadgeEl: HTMLElement | null = null;
  private speakerNameEl: HTMLElement | null = null;
  private speakerAvatarEl: HTMLElement | null = null;
  private equalizerEl: HTMLElement | null = null;

  // Scrubbers & Pips
  private chapterPipsEl: HTMLElement | null = null;
  private videoProgressEl: HTMLElement | null = null;
  private videoScrubberEl: HTMLElement | null = null;
  private timeDisplayEl: HTMLElement | null = null;

  // Action / Control Buttons
  private centerPlayBtn: HTMLElement | null = null;
  private centerPlayIcon: HTMLElement | null = null;
  private playPauseBtn: HTMLElement | null = null;
  private prevBtn: HTMLElement | null = null;
  private nextBtn: HTMLElement | null = null;
  private muteBtn: HTMLElement | null = null;
  private skipBtn: HTMLElement | null = null;
  private closeBtn: HTMLElement | null = null;
  private confrontBtn: HTMLElement | null = null;
  private modeBtn: HTMLElement | null = null;
  private voicesBtn: HTMLElement | null = null;
  private subtitlesBtn: HTMLElement | null = null;
  private theaterBtn: HTMLElement | null = null;

  // Callbacks
  public onComplete?: () => void;

  constructor(soundEngine: SoundEngine) {
    this.soundEngine = soundEngine;
    this.voiceManager = new CutsceneVoiceManager(soundEngine);
    this.musicEngine = new CutsceneMusicEngine();
  }

  public initDOM(): void {
    if (typeof document === 'undefined') return;

    this.overlayEl = document.getElementById('dark-clouds-cutscene-overlay');
    this.chapterBadgeEl = document.getElementById('dc-cutscene-badge');
    this.chapterTitleEl = document.getElementById('dc-cutscene-title');
    this.chapterSubtitleEl = document.getElementById('dc-cutscene-subtitle');
    this.chapterNarrativeEl = document.getElementById('dc-cutscene-narrative');
    this.sceneImageEl = document.getElementById('dc-cutscene-bg-img') as HTMLImageElement;
    this.visualFrameEl = document.getElementById('dc-visual-frame');
    this.heroAscensionEl = document.getElementById('dc-hero-ascension');
    this.bossSilhouetteEl = document.getElementById('dc-boss-silhouette');
    this.lightningEl = document.getElementById('dc-lightning-flash');
    this.lightningCanvasEl = document.getElementById('dc-lightning-canvas') as HTMLCanvasElement;
    this.anamorphicStreakEl = document.getElementById('dc-anamorphic-streak');
    this.stolenElementsEl = document.getElementById('dc-stolen-elements');

    // Title Card
    this.titleCardEl = document.getElementById('dc-title-card');
    this.titleCardSuperEl = document.getElementById('dc-title-card-super');
    this.titleCardMainEl = document.getElementById('dc-title-card-main');
    this.titleCardSubEl = document.getElementById('dc-title-card-sub');

    // Subtitles
    this.subtitleCardEl = document.getElementById('dc-video-subtitles');
    this.subtitleTextEl = document.getElementById('dc-subtitle-text');
    this.speakerBadgeEl = document.getElementById('dc-speaker-badge');
    this.speakerNameEl = document.getElementById('dc-speaker-name');
    this.speakerAvatarEl = document.getElementById('dc-speaker-avatar');
    this.equalizerEl = document.getElementById('dc-sub-equalizer');

    // Scrubber & Pips
    this.chapterPipsEl = document.getElementById('dc-chapter-pips');
    this.videoProgressEl = document.getElementById('dc-video-progress');
    this.videoScrubberEl = document.getElementById('dc-video-scrubber');
    this.timeDisplayEl = document.getElementById('dc-time-display');

    // Buttons
    this.centerPlayBtn = document.getElementById('dc-center-play-btn');
    this.centerPlayIcon = document.getElementById('dc-center-play-icon');
    this.playPauseBtn = document.getElementById('dc-btn-play-pause');
    this.prevBtn = document.getElementById('dc-btn-prev');
    this.nextBtn = document.getElementById('dc-btn-next');
    this.muteBtn = document.getElementById('dc-btn-mute');
    this.skipBtn = document.getElementById('dc-btn-skip');
    this.closeBtn = document.getElementById('dc-btn-close');
    this.confrontBtn = document.getElementById('dc-btn-confront');
    this.modeBtn = document.getElementById('dc-btn-mode');
    this.voicesBtn = document.getElementById('dc-btn-voices');
    this.subtitlesBtn = document.getElementById('dc-btn-subtitles');
    this.theaterBtn = document.getElementById('dc-btn-theater');

    // Attach event listeners
    this.visualFrameEl?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.togglePlayPause();
    });

    this.centerPlayBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.soundEngine.playClick();
      this.togglePlayPause();
    });

    this.playPauseBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.togglePlayPause();
    });

    this.prevBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.prevChapter();
    });

    this.nextBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.nextChapter();
    });

    this.muteBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.toggleMute();
    });

    this.modeBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.toggleMode();
    });

    this.voicesBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.toggleVoices();
    });

    this.subtitlesBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.toggleSubtitles();
    });

    this.theaterBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.toggleTheater();
    });

    this.skipBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.skip();
    });

    this.closeBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.close();
    });

    this.confrontBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.close();
      this.onComplete?.();
    });

    this.videoScrubberEl?.addEventListener('click', (e) => {
      const rect = this.videoScrubberEl!.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetCh = Math.min(
        DARK_CLOUDS_CHAPTERS.length - 1,
        Math.floor(ratio * DARK_CLOUDS_CHAPTERS.length)
      );
      this.goToChapter(targetCh);
    });

    // Wire voice manager callbacks
    this.setupVoiceCallbacks();
  }

  private setupVoiceCallbacks(): void {
    this.voiceManager.onDialogueLineStart = (line, profile) => {
      this.updateSubtitleUI(line, profile);

      this.equalizerEl?.classList.add('active');

      // Trigger cinematic visual reactions based on speaker
      if (line.speakerId === 'void_overlord') {
        this.triggerLightningFlash();
        this.bossSilhouetteEl?.classList.add('pulse-menace');
        this.stolenElementsEl?.classList.add('fury-spin');
        this.soundEngine.playDarkCloudsWhirl();
      } else if (line.speakerId === 'seeker') {
        this.heroAscensionEl?.classList.add('surge-light');
      } else if (line.speakerId === 'wizard') {
        this.soundEngine.playCutsceneWizardBlessing();
      } else {
        this.triggerLightningFlash();
      }
    };

    this.voiceManager.onDialogueLineEnd = (line) => {
      this.equalizerEl?.classList.remove('active');
      if (line.speakerId === 'void_overlord') {
        this.bossSilhouetteEl?.classList.remove('pulse-menace');
        this.stolenElementsEl?.classList.remove('fury-spin');
      } else if (line.speakerId === 'seeker') {
        this.heroAscensionEl?.classList.remove('surge-light');
      }
    };

    this.voiceManager.onChapterDialogueComplete = (chapterIdx) => {
      if (this.isPlaying && chapterIdx === this.currentChapterIndex) {
        if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
        // Savor the completed scene for 2.2s after dialogue finishes before moving on
        this.autoAdvanceTimer = setTimeout(() => {
          if (this.isPlaying && chapterIdx === this.currentChapterIndex) {
            // Confirm speech is not still speaking
            if (
              typeof window !== 'undefined' &&
              'speechSynthesis' in window &&
              window.speechSynthesis.speaking
            ) {
              this.voiceManager.onChapterDialogueComplete?.(chapterIdx);
              return;
            }
            if (this.currentChapterIndex < DARK_CLOUDS_CHAPTERS.length - 1) {
              this.nextChapter();
            } else {
              this.pause();
              if (this.confrontBtn) {
                this.confrontBtn.classList.remove('hidden');
              }
            }
          }
        }, 2200);
      }
    };
  }

  public open(startChapter: number = 0): void {
    if (typeof document === 'undefined') return;
    if (!this.overlayEl) this.initDOM();
    if (!this.overlayEl) return;

    this.soundEngine.unlockAudio();
    this.overlayEl.classList.remove('hidden');

    this.isPlaying = true;
    this.currentChapterIndex = Math.max(0, Math.min(startChapter, DARK_CLOUDS_CHAPTERS.length - 1));

    // Start darkwave music tailored for Chapter 6 (Dark Clouds / Void Overlord)
    this.musicEngine.start();
    this.musicEngine.setChapter(5);

    // Play realm rift whirlwind sound
    this.soundEngine.playDarkCloudsWhirl();

    // Render initial chapter
    this.renderChapter(this.currentChapterIndex);
  }

  public close(): void {
    this.stopAllTimers();
    this.isPlaying = false;
    this.voiceManager.stopAll();
    this.musicEngine.stop();

    if (this.overlayEl) {
      this.overlayEl.classList.add('hidden');
    }
  }

  public skip(): void {
    this.close();
    this.onComplete?.();
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
    if (this.playPauseBtn) this.playPauseBtn.textContent = '⏸ Pause';
    if (this.centerPlayIcon) this.centerPlayIcon.textContent = '⏸';
    this.centerPlayBtn?.classList.add('fade-out');

    // Resume chapter dialogue
    this.playChapterDialogue(this.currentChapterIndex);
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.playPauseBtn) this.playPauseBtn.textContent = '▶ Play';
    if (this.centerPlayIcon) this.centerPlayIcon.textContent = '▶';
    this.centerPlayBtn?.classList.remove('fade-out');

    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.voiceManager.stopAll();
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.voiceManager.toggleVoice(this.isMuted);
    this.musicEngine.setMuted(this.isMuted);
    if (this.muteBtn) {
      this.muteBtn.textContent = this.isMuted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
      this.muteBtn.classList.toggle('muted', this.isMuted);
    }
  }

  public toggleVoices(): void {
    const isMuted = this.voiceManager.isMuted();
    this.voiceManager.toggleVoice(!isMuted); // toggles
    this.voicesBtn?.classList.toggle('active', isMuted);
  }

  public toggleSubtitles(): void {
    if (this.subtitleCardEl) {
      const isHidden = this.subtitleCardEl.classList.toggle('hidden');
      this.subtitlesBtn?.classList.toggle('active', !isHidden);
    }
  }

  public toggleMode(): void {
    this.viewMode = this.viewMode === 'video' ? 'stage' : 'video';
    if (this.modeBtn) {
      this.modeBtn.textContent = this.viewMode === 'video' ? '📹 Video Mode' : '🎭 Stage Mode';
    }
    this.overlayEl?.classList.toggle('stage-view-active', this.viewMode === 'stage');
  }

  public toggleTheater(): void {
    this.isTheaterMode = !this.isTheaterMode;
    this.overlayEl?.classList.toggle('theater-mode', this.isTheaterMode);
    this.theaterBtn?.classList.toggle('active', this.isTheaterMode);
  }

  public nextChapter(): void {
    if (this.currentChapterIndex < DARK_CLOUDS_CHAPTERS.length - 1) {
      this.goToChapter(this.currentChapterIndex + 1);
    }
  }

  public prevChapter(): void {
    if (this.currentChapterIndex > 0) {
      this.goToChapter(this.currentChapterIndex - 1);
    }
  }

  public goToChapter(index: number): void {
    this.stopAllTimers();
    this.voiceManager.stopAll();
    this.currentChapterIndex = Math.max(0, Math.min(index, DARK_CLOUDS_CHAPTERS.length - 1));
    this.renderChapter(this.currentChapterIndex);

    if (this.isPlaying) {
      this.playChapterDialogue(this.currentChapterIndex);
    }
  }

  public renderChapter(chapterIdx: number): void {
    this.currentChapterIndex = Math.max(0, Math.min(chapterIdx, DARK_CLOUDS_CHAPTERS.length - 1));
    const chapter = DARK_CLOUDS_CHAPTERS[this.currentChapterIndex];

    if (this.chapterBadgeEl) this.chapterBadgeEl.textContent = chapter.badge;
    if (this.chapterTitleEl) this.chapterTitleEl.textContent = chapter.title;
    if (this.chapterSubtitleEl) this.chapterSubtitleEl.textContent = chapter.subtitle;
    if (this.chapterNarrativeEl) this.chapterNarrativeEl.textContent = chapter.narrative;

    // Visual theme & Ken Burns motion variation
    if (this.sceneImageEl) {
      this.sceneImageEl.className = `dc-scene-img ken-burns-${this.currentChapterIndex % 3}`;
      // Point to high-res cutscene images
      const imgIdx = Math.min(6, Math.max(1, this.currentChapterIndex + 1));
      this.sceneImageEl.src = `./cutscene/scene_${imgIdx}.jpg`;
    }

    // Dynamic layer states
    if (this.overlayEl) {
      for (let i = 1; i <= 6; i++) {
        this.overlayEl.classList.remove(`chapter-${i}`);
      }
      this.overlayEl.classList.add(`chapter-${this.currentChapterIndex + 1}`);
    }

    if (this.currentChapterIndex <= 1) {
      this.heroAscensionEl?.classList.remove('ascending-high');
      this.bossSilhouetteEl?.classList.remove('revealed');
      this.stolenElementsEl?.classList.remove('orbiting-active');
    } else if (this.currentChapterIndex <= 3) {
      this.heroAscensionEl?.classList.remove('ascending-high');
      this.bossSilhouetteEl?.classList.add('revealed');
      this.stolenElementsEl?.classList.add('orbiting-active');
      this.triggerLightningFlash();
    } else if (this.currentChapterIndex === 4) {
      this.heroAscensionEl?.classList.add('ascending-high');
      this.bossSilhouetteEl?.classList.add('revealed');
      this.stolenElementsEl?.classList.add('orbiting-active');
      this.triggerLightningFlash();
    } else if (this.currentChapterIndex === 5) {
      this.heroAscensionEl?.classList.add('ascending-high');
      this.bossSilhouetteEl?.classList.add('revealed');
      this.stolenElementsEl?.classList.add('orbiting-active');
      this.triggerLightningFlash();
      if (this.confrontBtn) {
        this.confrontBtn.classList.remove('hidden');
      }
    }

    // Flash cinematic chapter title card
    this.flashTitleCard(chapter);

    // Update scrubber, pips, and timeline progress
    this.updateProgressUI();
  }

  // Backwards compatibility alias for renderPhase
  public renderPhase(phaseIdx: number): void {
    this.renderChapter(phaseIdx);
  }

  private flashTitleCard(chapter: DarkCloudsChapter): void {
    if (!this.titleCardEl) return;
    if (this.titleCardSuperEl) this.titleCardSuperEl.textContent = `CHAPTER ${['I', 'II', 'III', 'IV', 'V', 'VI'][this.currentChapterIndex]}`;
    if (this.titleCardMainEl) this.titleCardMainEl.textContent = chapter.title.toUpperCase();
    if (this.titleCardSubEl) this.titleCardSubEl.textContent = chapter.subtitle;

    this.titleCardEl.classList.remove('active');
    void this.titleCardEl.offsetWidth; // Force reflow
    this.titleCardEl.classList.add('active');

    const cardTimer = setTimeout(() => {
      this.titleCardEl?.classList.remove('active');
    }, 2800);
    this.sfxTimers.push(cardTimer);
  }

  public updateProgressUI(): void {
    const totalChapters = DARK_CLOUDS_CHAPTERS.length;
    const progressPercent = ((this.currentChapterIndex + 1) / totalChapters) * 100;

    if (this.videoProgressEl) {
      this.videoProgressEl.style.width = `${progressPercent}%`;
    }

    if (this.timeDisplayEl) {
      this.timeDisplayEl.textContent = `Chapter ${this.currentChapterIndex + 1} of ${totalChapters}`;
    }

    this.renderChapterPips();
  }

  private renderChapterPips(): void {
    if (!this.chapterPipsEl) return;
    this.chapterPipsEl.innerHTML = '';

    DARK_CLOUDS_CHAPTERS.forEach((ch, idx) => {
      const pip = document.createElement('div');
      pip.className = 'dc-pip';
      if (idx === this.currentChapterIndex) pip.classList.add('active');
      if (idx < this.currentChapterIndex) pip.classList.add('visited');
      pip.title = `${ch.badge}: ${ch.title}`;
      pip.addEventListener('click', () => {
        this.soundEngine.playClick();
        this.goToChapter(idx);
      });
      this.chapterPipsEl?.appendChild(pip);
    });
  }

  private playChapterDialogue(chapterIdx: number): void {
    const lines = DARK_CLOUDS_CHAPTER_DIALOGUE[chapterIdx] || [];
    if (lines.length === 0) {
      this.voiceManager.onChapterDialogueComplete?.(chapterIdx);
      return;
    }

    let lineIdx = 0;
    const speakNext = () => {
      if (!this.isPlaying || this.currentChapterIndex !== chapterIdx) return;
      if (lineIdx >= lines.length) {
        this.voiceManager.onChapterDialogueComplete?.(chapterIdx);
        return;
      }

      const line = lines[lineIdx++];
      this.voiceManager.speakLine(line, () => {
        if (!this.isPlaying || this.currentChapterIndex !== chapterIdx) return;
        const pauseTimer = setTimeout(speakNext, 450);
        this.sfxTimers.push(pauseTimer);
      });
    };

    speakNext();
  }

  private updateSubtitleUI(line: CutsceneDialogueLine, profile?: VoiceSpeakerProfile): void {
    if (this.subtitleTextEl) {
      this.subtitleTextEl.textContent = `“${line.text}”`;
    }
    if (this.speakerNameEl) {
      const name = profile ? profile.name : line.speakerId.toUpperCase();
      this.speakerNameEl.textContent = name;
    }
    if (this.speakerAvatarEl && profile) {
      if (CHARACTER_SIGILS[profile.id]) {
        this.speakerAvatarEl.innerHTML = CHARACTER_SIGILS[profile.id];
      } else {
        this.speakerAvatarEl.textContent = profile.avatar;
      }
    }
    if (this.speakerBadgeEl && profile) {
      this.speakerBadgeEl.style.borderColor = profile.themeColor;
      this.speakerBadgeEl.style.boxShadow = `0 0 15px ${profile.glowColor}`;
    }
  }

  public triggerLightningFlash(): void {
    if (this.lightningEl) {
      this.lightningEl.classList.remove('flash-anim');
      void this.lightningEl.offsetWidth; // Force reflow
      this.lightningEl.classList.add('flash-anim');
    }
    this.soundEngine.playSpellCast('Lightning');
    this.drawProceduralLightning();

    if (this.anamorphicStreakEl) {
      this.anamorphicStreakEl.classList.remove('flare-active');
      void this.anamorphicStreakEl.offsetWidth;
      this.anamorphicStreakEl.classList.add('flare-active');
      const flareTimer = setTimeout(() => {
        this.anamorphicStreakEl?.classList.remove('flare-active');
      }, 550);
      this.sfxTimers.push(flareTimer);
    }
  }

  private drawProceduralLightning(): void {
    if (!this.lightningCanvasEl) return;
    const canvas = this.lightningCanvasEl;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawBolt = (x1: number, y1: number, x2: number, y2: number, depth: number, maxDepth: number, mainBranch: boolean) => {
      if (depth >= maxDepth) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return;
      }

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const perpAngle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      const displacement = (Math.random() - 0.5) * dist * 0.45;
      const nx = midX + Math.cos(perpAngle) * displacement;
      const ny = midY + Math.sin(perpAngle) * displacement;

      drawBolt(x1, y1, nx, ny, depth + 1, maxDepth, mainBranch);
      drawBolt(nx, ny, x2, y2, depth + 1, maxDepth, mainBranch);

      if (mainBranch && depth === 2 && Math.random() < 0.65) {
        const branchAngle = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.2;
        const branchLen = dist * (0.35 + Math.random() * 0.3);
        const bx = nx + Math.cos(branchAngle) * branchLen;
        const by = ny + Math.sin(branchAngle) * branchLen;
        drawBolt(nx, ny, bx, by, depth + 1, maxDepth - 1, false);
      }
    };

    // Draw 2-3 realistic electrical arcs
    const bolts = 1 + Math.floor(Math.random() * 2);
    for (let b = 0; b < bolts; b++) {
      const startX = canvas.width * (0.25 + Math.random() * 0.5);
      const startY = 0;
      const endX = startX + (Math.random() - 0.5) * canvas.width * 0.4;
      const endY = canvas.height * (0.6 + Math.random() * 0.4);

      // Pass 1: Volumetric Cyan/Violet Halo
      ctx.save();
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.7)';
      ctx.lineWidth = 14;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 24;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawBolt(startX, startY, endX, endY, 0, 5, true);
      ctx.restore();

      // Pass 2: Electric Core
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.95)';
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawBolt(startX, startY, endX, endY, 0, 5, true);
      ctx.restore();

      // Pass 3: White-Hot Singularity Arc
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawBolt(startX, startY, endX, endY, 0, 5, true);
      ctx.restore();
    }

    // Smoothly dissolve lightning bolt
    setTimeout(() => {
      let alpha = 1;
      const fadeInterval = setInterval(() => {
        alpha -= 0.18;
        if (alpha <= 0) {
          clearInterval(fadeInterval);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.globalAlpha = alpha;
        }
      }, 30);
    }, 180);
  }

  private stopAllTimers(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.sfxTimers.forEach((t) => clearTimeout(t));
    this.sfxTimers = [];
  }

  public getCurrentChapter(): number {
    return this.currentChapterIndex;
  }

  // Backwards compatibility alias
  public getCurrentPhase(): number {
    return this.currentChapterIndex;
  }

  public isCutscenePlaying(): boolean {
    return this.isPlaying;
  }

  public getSceneImageEl(): HTMLImageElement | null {
    return this.sceneImageEl;
  }
}
