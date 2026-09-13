// Elemental Mayhem - Ascent to the Dark Clouds Cutscene
// Dramatic Round 1000 cinematic sequence where the player ascends through a dimensional rift
// into the dark storm clouds to confront the Void Overlord and reclaim their stolen power.

import { SoundEngine } from '../audio/SoundEngine';
import {
  CutsceneVoiceManager,
  CutsceneDialogueLine,
  VoiceSpeakerProfile,
} from './CutsceneVoiceManager';
import { CutsceneMusicEngine } from '../audio/CutsceneMusicEngine';

export interface DarkCloudsPhase {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  narrative: string;
  themeColor: string;
  glowColor: string;
  durationEstimateMs: number;
}

export const DARK_CLOUDS_PHASES: DarkCloudsPhase[] = [
  {
    id: 1,
    badge: '⚡ PHASE I • THE RIFT SUNDERS THE ARENA',
    title: 'The Sky Tears Open',
    subtitle: 'After 999 battles, an abyssal dimensional rift fractures the heavens!',
    narrative:
      'The mortal arenas tremble as celestial thunder shatters the horizon! A colossal dimensional vortex opens above, pulling everything skyward toward the turbulent dark storm clouds!',
    themeColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.75)',
    durationEstimateMs: 6500,
  },
  {
    id: 2,
    badge: '🌩️ PHASE II • HURTLING INTO THE TEMPEST',
    title: 'Ascension Through Dark Clouds',
    subtitle: 'Surging upward through gale-force winds and violet cosmic lightning!',
    narrative:
      'Spiraling skyward at supersonic speed, you pierce through towering black thunderheads and crackling purple lightning bolts! The stolen elemental magic resonates powerfully from deep within the tempest!',
    themeColor: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.85)',
    durationEstimateMs: 7000,
  },
  {
    id: 3,
    badge: '👑 PHASE III • THE OVERLORD AWAITS',
    title: 'Confronting the Void Overlord',
    subtitle: 'Breaking into the eye of the storm where the ultimate boss holds dominion!',
    narrative:
      'You burst into the calm, eerie eye of the dark clouds. Looming above upon a cosmic vortex of stolen elemental stars, the colossal Void Overlord glares down with malevolent glowing eyes!',
    themeColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    durationEstimateMs: 7500,
  },
];

export const DARK_CLOUDS_DIALOGUE: CutsceneDialogueLine[] = [
  {
    id: 'dc_line1',
    speakerId: 'narrator',
    text: 'At last, on Round 1,000, the heavens shatter as an abyssal rift pulls you skyward!',
    durationEstimateMs: 6500,
  },
  {
    id: 'dc_line2',
    speakerId: 'seeker',
    text: 'The gale winds are lifting me... I am ascending straight into the dark clouds!',
    durationEstimateMs: 6000,
  },
  {
    id: 'dc_line3',
    speakerId: 'wizard',
    text: 'Steel your spirit, young wanderer! Face the Void Overlord in the tempest and reclaim your stolen power!',
    durationEstimateMs: 7000,
  },
  {
    id: 'dc_line4',
    speakerId: 'void_overlord',
    text: 'You foolish mortal... You actually reached my dark clouds?! Here in the abyss, your journey ends!',
    durationEstimateMs: 7200,
  },
  {
    id: 'dc_line5',
    speakerId: 'narrator',
    text: 'Draw upon every ember! The final battle for the fate of the cosmos begins now!',
    durationEstimateMs: 6200,
  },
];

export class DarkCloudsCutsceneManager {
  private soundEngine: SoundEngine;
  public voiceManager: CutsceneVoiceManager;
  public musicEngine: CutsceneMusicEngine;

  private currentPhaseIndex: number = 0;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private autoAdvanceTimer: any = null;
  private sfxTimers: any[] = [];

  // DOM Elements
  private overlayEl: HTMLElement | null = null;
  private phaseBadgeEl: HTMLElement | null = null;
  private phaseTitleEl: HTMLElement | null = null;
  private phaseSubtitleEl: HTMLElement | null = null;
  private phaseNarrativeEl: HTMLElement | null = null;
  private sceneImageEl: HTMLImageElement | null = null;
  private heroAscensionEl: HTMLElement | null = null;
  private bossSilhouetteEl: HTMLElement | null = null;
  private lightningEl: HTMLElement | null = null;

  // Subtitles / Dialogue Elements
  private subtitleTextEl: HTMLElement | null = null;
  private speakerBadgeEl: HTMLElement | null = null;
  private speakerNameEl: HTMLElement | null = null;

  // Action / Control Buttons
  private playPauseBtn: HTMLElement | null = null;
  private muteBtn: HTMLElement | null = null;
  private skipBtn: HTMLElement | null = null;
  private closeBtn: HTMLElement | null = null;
  private confrontBtn: HTMLElement | null = null;

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
    this.phaseBadgeEl = document.getElementById('dc-cutscene-badge');
    this.phaseTitleEl = document.getElementById('dc-cutscene-title');
    this.phaseSubtitleEl = document.getElementById('dc-cutscene-subtitle');
    this.phaseNarrativeEl = document.getElementById('dc-cutscene-narrative');
    this.sceneImageEl = document.getElementById('dc-cutscene-bg-img') as HTMLImageElement;
    this.heroAscensionEl = document.getElementById('dc-hero-ascension');
    this.bossSilhouetteEl = document.getElementById('dc-boss-silhouette');
    this.lightningEl = document.getElementById('dc-lightning-flash');

    this.subtitleTextEl = document.getElementById('dc-subtitle-text');
    this.speakerBadgeEl = document.getElementById('dc-speaker-badge');
    this.speakerNameEl = document.getElementById('dc-speaker-name');

    this.playPauseBtn = document.getElementById('dc-btn-play-pause');
    this.muteBtn = document.getElementById('dc-btn-mute');
    this.skipBtn = document.getElementById('dc-btn-skip');
    this.closeBtn = document.getElementById('dc-btn-close');
    this.confrontBtn = document.getElementById('dc-btn-confront');

    // Attach event listeners
    this.playPauseBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.togglePlayPause();
    });

    this.muteBtn?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.toggleMute();
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

    // Wire voice manager callbacks
    this.setupVoiceCallbacks();
  }

  private setupVoiceCallbacks(): void {
    this.voiceManager.onDialogueLineStart = (line, profile) => {
      this.updateSubtitleUI(line, profile);

      // Trigger cinematic effects based on who is speaking
      if (line.speakerId === 'void_overlord') {
        this.triggerLightningFlash();
        this.bossSilhouetteEl?.classList.add('pulse-menace');
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
      if (line.speakerId === 'void_overlord') {
        this.bossSilhouetteEl?.classList.remove('pulse-menace');
      } else if (line.speakerId === 'seeker') {
        this.heroAscensionEl?.classList.remove('surge-light');
      }
    };
  }

  public open(): void {
    if (typeof document === 'undefined') return;
    if (!this.overlayEl) this.initDOM();
    if (!this.overlayEl) return;

    this.soundEngine.unlockAudio();
    this.overlayEl.classList.remove('hidden');

    this.isPlaying = true;
    this.currentPhaseIndex = 0;

    // Start darkwave music tailored for Chapter 6 (Dark Clouds / Void Overlord)
    this.musicEngine.start();
    this.musicEngine.setChapter(5); // Chapter 6 pattern (0-indexed 5)

    // Play realm rift whirlwind sound
    this.soundEngine.playDarkCloudsWhirl();

    // Render Phase 1
    this.renderPhase(0);

    // Start dialogue sequence
    this.playDialogueSequence();
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
    this.isPlaying = !this.isPlaying;
    if (this.playPauseBtn) {
      this.playPauseBtn.textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Play';
    }
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

  public renderPhase(phaseIdx: number): void {
    this.currentPhaseIndex = Math.max(0, Math.min(phaseIdx, DARK_CLOUDS_PHASES.length - 1));
    const phase = DARK_CLOUDS_PHASES[this.currentPhaseIndex];

    if (this.phaseBadgeEl) this.phaseBadgeEl.textContent = phase.badge;
    if (this.phaseTitleEl) this.phaseTitleEl.textContent = phase.title;
    if (this.phaseSubtitleEl) this.phaseSubtitleEl.textContent = phase.subtitle;
    if (this.phaseNarrativeEl) this.phaseNarrativeEl.textContent = phase.narrative;

    // Visual elements animation state
    if (this.overlayEl) {
      this.overlayEl.classList.remove('phase-1', 'phase-2', 'phase-3');
      this.overlayEl.classList.add(`phase-${this.currentPhaseIndex + 1}`);
    }

    if (this.sceneImageEl) {
      this.sceneImageEl.className = `dc-scene-img ken-burns-${this.currentPhaseIndex % 3}`;
    }

    if (this.currentPhaseIndex === 0) {
      this.heroAscensionEl?.classList.remove('ascending-high');
      this.bossSilhouetteEl?.classList.remove('revealed');
    } else if (this.currentPhaseIndex === 1) {
      this.heroAscensionEl?.classList.add('ascending-high');
      this.triggerLightningFlash();
    } else if (this.currentPhaseIndex === 2) {
      this.bossSilhouetteEl?.classList.add('revealed');
      this.triggerLightningFlash();
      if (this.confrontBtn) {
        this.confrontBtn.classList.remove('hidden');
      }
    }
  }

  public getSceneImageEl(): HTMLImageElement | null {
    return this.sceneImageEl;
  }

  private playDialogueSequence(): void {
    let lineIdx = 0;

    const playNextLine = () => {
      if (!this.isPlaying) return;

      if (lineIdx >= DARK_CLOUDS_DIALOGUE.length) {
        // Cutscene finished all dialogue!
        this.renderPhase(2);
        if (this.confrontBtn) {
          this.confrontBtn.classList.remove('hidden');
        }
        // Auto-proceed after brief pause if not clicked
        const finishTimer = setTimeout(() => {
          if (this.isPlaying) {
            this.close();
            this.onComplete?.();
          }
        }, 3500);
        this.sfxTimers.push(finishTimer);
        return;
      }

      // Synchronize visual phase transitions with dialogue lines
      if (lineIdx === 0) {
        this.renderPhase(0);
      } else if (lineIdx === 1 || lineIdx === 2) {
        this.renderPhase(1);
      } else if (lineIdx >= 3) {
        this.renderPhase(2);
      }

      const line = DARK_CLOUDS_DIALOGUE[lineIdx];
      lineIdx++;

      this.voiceManager.speakLine(line, () => {
        if (!this.isPlaying) return;
        // Pause between lines to allow speech echo to conclude naturally
        const pauseTimer = setTimeout(playNextLine, 500);
        this.sfxTimers.push(pauseTimer);
      });
    };

    playNextLine();
  }

  private updateSubtitleUI(line: CutsceneDialogueLine, profile?: VoiceSpeakerProfile): void {
    if (this.subtitleTextEl) {
      this.subtitleTextEl.textContent = `"${line.text}"`;
    }
    if (this.speakerNameEl) {
      const name = profile ? profile.name : line.speakerId.toUpperCase();
      this.speakerNameEl.textContent = name;
      if (profile && this.speakerBadgeEl) {
        this.speakerBadgeEl.style.borderColor = profile.themeColor;
        this.speakerBadgeEl.style.boxShadow = `0 0 15px ${profile.glowColor}`;
      }
    }
  }

  public triggerLightningFlash(): void {
    if (!this.lightningEl) return;
    this.lightningEl.classList.remove('flash-anim');
    void this.lightningEl.offsetWidth; // Force reflow
    this.lightningEl.classList.add('flash-anim');
    this.soundEngine.playSpellCast('Lightning');
  }

  private stopAllTimers(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.sfxTimers.forEach((t) => clearTimeout(t));
    this.sfxTimers = [];
  }

  public getCurrentPhase(): number {
    return this.currentPhaseIndex;
  }

  public isCutscenePlaying(): boolean {
    return this.isPlaying;
  }
}
