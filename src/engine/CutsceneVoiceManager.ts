// Elemental Mayhem - Origin Cutscene Voice Dialogue System
// Coordinates multi-character voice acting via Web Speech API & Web Audio formant voice fallbacks.
// Uses a robust sequential speech queue so every narrative line and character dialogue is spoken
// completely without getting cut off mid-sentence.

import { SoundEngine } from '../audio/SoundEngine';

export type VoiceSpeakerId =
  | 'narrator'
  | 'titan_magma'
  | 'titan_void'
  | 'seeker'
  | 'wizard'
  | 'void_overlord';

export interface VoiceSpeakerProfile {
  id: VoiceSpeakerId;
  name: string;
  role: string;
  avatar: string;
  tag: string;
  themeColor: string;
  glowColor: string;
  pitch: number; // 0.1 to 2.0 (SpeechSynthesis pitch)
  rate: number;  // 0.5 to 1.5 (SpeechSynthesis speed)
  volume: number; // 0.0 to 1.0
  voiceGenderHint: 'male' | 'female' | 'monster' | 'elder' | 'hero';
}

export interface CutsceneDialogueLine {
  id: string;
  speakerId: VoiceSpeakerId;
  text: string;
  delayMs?: number;
  durationEstimateMs?: number;
}

export const VOICE_PROFILES: Record<VoiceSpeakerId, VoiceSpeakerProfile> = {
  narrator: {
    id: 'narrator',
    name: 'CELESTIAL CHRONICLER',
    role: 'Epic Narrator',
    avatar: '📜🌌',
    tag: '📖 Grand Storyteller Voice (Balanced & Resonant)',
    themeColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.6)',
    pitch: 0.95,
    rate: 0.96,
    volume: 0.95,
    voiceGenderHint: 'male',
  },
  titan_magma: {
    id: 'titan_magma',
    name: 'MAGMA COLOSSUS',
    role: 'Primeval Fire Titan',
    avatar: '🗿🌋',
    tag: '🌋 Deep Volcanic Monster Voice (Sub-Bass Roar • Pitch: 0.32)',
    themeColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.75)',
    pitch: 0.32,
    rate: 0.8,
    volume: 1.0,
    voiceGenderHint: 'monster',
  },
  titan_void: {
    id: 'titan_void',
    name: 'VOID LEVIATHAN',
    role: 'Primeval Cosmic Leviathan',
    avatar: '🌌⚡',
    tag: '🌌 Chilling Cosmic Abyss Voice (Eerie Resonant Echo • Pitch: 0.45)',
    themeColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.75)',
    pitch: 0.45,
    rate: 0.76,
    volume: 1.0,
    voiceGenderHint: 'monster',
  },
  seeker: {
    id: 'seeker',
    name: 'MORTAL SEEKER',
    role: 'The Player Champion',
    avatar: '🏃‍♂️✨',
    tag: '⚡ Mortal Seeker Voice (Energetic & Determined • Pitch: 1.15)',
    themeColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.65)',
    pitch: 1.15,
    rate: 1.05,
    volume: 0.95,
    voiceGenderHint: 'hero',
  },
  wizard: {
    id: 'wizard',
    name: 'GRAND ARCH-WIZARD',
    role: 'Ancient Guardian of Elements',
    avatar: '🧙‍♂️✨',
    tag: '🔮 Ancient Arch-Mage Voice (Wise & Reverent • Pitch: 0.76)',
    themeColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.7)',
    pitch: 0.76,
    rate: 0.86,
    volume: 1.0,
    voiceGenderHint: 'elder',
  },
  void_overlord: {
    id: 'void_overlord',
    name: 'THE VOID OVERLORD',
    role: 'Supreme Nemesis of Round 1000',
    avatar: '😈👑',
    tag: '👹 Sinister Overlord Voice (Demonic Raspy Bass • Pitch: 0.28)',
    themeColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.85)',
    pitch: 0.28,
    rate: 0.82,
    volume: 1.0,
    voiceGenderHint: 'monster',
  },
};

export const CHAPTER_DIALOGUES: Record<number, CutsceneDialogueLine[]> = {
  // Chapter 1: When Titans Collided (The Titans)
  0: [
    {
      id: 'ch1_line1',
      speakerId: 'narrator',
      text: 'Long before the arenas were forged, two primeval giants collided in a war that shattered reality!',
      durationEstimateMs: 6000,
    },
    {
      id: 'ch1_line2',
      speakerId: 'titan_magma',
      text: 'I am the eternal flame! I will scorch this entire cosmos into ash!',
      durationEstimateMs: 4800,
    },
    {
      id: 'ch1_line3',
      speakerId: 'titan_void',
      text: 'The void swallows all light! Submit to the infinite abyss!',
      durationEstimateMs: 4600,
    },
  ],

  // Chapter 2: The Dimensional Tear Opens (The Dimensional Rift)
  1: [
    {
      id: 'ch2_line1',
      speakerId: 'narrator',
      text: "The titans' clash tore open a colossal dimensional rift in the fabric of spacetime!",
      durationEstimateMs: 5200,
    },
    {
      id: 'ch2_line2',
      speakerId: 'titan_void',
      text: 'Fall... into the dimensional singularity...',
      durationEstimateMs: 3800,
    },
  ],

  // Chapter 3: Falling Through the Rift (Falling Through)
  2: [
    {
      id: 'ch3_line1',
      speakerId: 'seeker',
      text: "I'm falling! The rift's gravity is tearing me across hyperspace!",
      durationEstimateMs: 4200,
    },
    {
      id: 'ch3_line2',
      speakerId: 'narrator',
      text: 'You crash-land upon the mystical miniature world of the Arena!',
      durationEstimateMs: 4200,
    },
  ],

  // Chapter 4: The Grand Wizard's Blessing (The Wizard Giving Magic)
  3: [
    {
      id: 'ch4_line1',
      speakerId: 'narrator',
      text: 'An ancient Grand Arch-Wizard channeled godlike elemental magic into your soul!',
      durationEstimateMs: 5000,
    },
    {
      id: 'ch4_line2',
      speakerId: 'wizard',
      text: 'Rise, young wanderer! Take my power... all fifty elements are now yours!',
      durationEstimateMs: 4800,
    },
    {
      id: 'ch4_line3',
      speakerId: 'seeker',
      text: 'By the stars... I can feel the godlike magic surging through my hands!',
      durationEstimateMs: 4400,
    },
  ],

  // Chapter 5: Ambushed in the Shadows (Stealing The Magic)
  4: [
    {
      id: 'ch5_line1',
      speakerId: 'narrator',
      text: 'Suddenly, the sky turned black as the sinister Void Overlord struck from the dark!',
      durationEstimateMs: 5200,
    },
    {
      id: 'ch5_line2',
      speakerId: 'void_overlord',
      text: 'Foolish old wizard! That godlike power belongs to the Void! IT IS MINE!',
      durationEstimateMs: 5000,
    },
    {
      id: 'ch5_line3',
      speakerId: 'wizard',
      text: 'No! Protect the starter embers!',
      durationEstimateMs: 2500,
    },
    {
      id: 'ch5_line4',
      speakerId: 'seeker',
      text: 'My magic... he violently ripped it away! Only three starter embers remain!',
      durationEstimateMs: 4800,
    },
  ],

  // Chapter 6: The Void Overlord in the Dark Clouds (The One in the Dark Clouds)
  5: [
    {
      id: 'ch6_line1',
      speakerId: 'void_overlord',
      text: 'From the dark clouds, I rule the cosmos! Face me on Round 1000 if you dare!',
      durationEstimateMs: 5200,
    },
    {
      id: 'ch6_line2',
      speakerId: 'wizard',
      text: 'Do not despair! Defeat the Overlord in the dark clouds on Round 1000 to reclaim your power!',
      durationEstimateMs: 5600,
    },
    {
      id: 'ch6_line3',
      speakerId: 'seeker',
      text: 'I will conquer every arena and defeat the Void Overlord in the dark clouds on Round 1000!',
      durationEstimateMs: 5400,
    },
    {
      id: 'ch6_line4',
      speakerId: 'narrator',
      text: 'Your mission begins now! Ascend through the arenas and reclaim your destiny!',
      durationEstimateMs: 4800,
    },
  ],
};

export class CutsceneVoiceManager {
  private soundEngine: SoundEngine;
  private isVoiceMuted: boolean = false;
  private currentChapterIndex: number = 0;
  private currentLine: CutsceneDialogueLine | null = null;
  private scheduledTimers: any[] = [];
  private isSpeaking: boolean = false;

  // Queue state for complete sequential speech
  private lineQueue: CutsceneDialogueLine[] = [];
  private currentQueueIndex: number = 0;
  private isQueueActive: boolean = false;
  private safetyTimer: any = null;
  private keepAliveTimer: any = null;

  // Cached system voices
  private availableVoices: SpeechSynthesisVoice[] = [];
  private hasInitializedVoices: boolean = false;

  // DOM Elements - Dialogue Card
  private cardEl: HTMLElement | null = null;
  private avatarEl: HTMLElement | null = null;
  private nameEl: HTMLElement | null = null;
  private voiceTagEl: HTMLElement | null = null;
  private speechTextEl: HTMLElement | null = null;
  private wavesEl: HTMLElement | null = null;
  private toggleBtnEl: HTMLElement | null = null;
  private speakBtnEl: HTMLElement | null = null;

  // DOM Elements - In-Video Cinematic Subtitles & Video HUD
  private videoSubtitlesEl: HTMLElement | null = null;
  private videoSubAvatarEl: HTMLElement | null = null;
  private videoSubSpeakerNameEl: HTMLElement | null = null;
  private videoSubEqualizerEl: HTMLElement | null = null;
  private videoSubTextEl: HTMLElement | null = null;
  private videoHudSubtitlesBtnEl: HTMLElement | null = null;
  private areSubtitlesVisible: boolean = true;
  private activeBabbleHandle: { stop: () => void } | null = null;

  // Event callbacks
  public onDialogueLineStart?: (line: CutsceneDialogueLine, profile: VoiceSpeakerProfile) => void;
  public onDialogueLineEnd?: (line: CutsceneDialogueLine) => void;
  public onChapterDialogueComplete?: (chapterIndex: number) => void;

  constructor(soundEngine: SoundEngine) {
    this.soundEngine = soundEngine;

    // Load persisted voice state
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('elemental_cutscene_voice_muted');
      if (saved !== null) {
        this.isVoiceMuted = saved === 'true';
      }
    }

    this.initSpeechSynthesis();
  }

  private initSpeechSynthesis(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      this.availableVoices = window.speechSynthesis.getVoices();
      this.hasInitializedVoices = this.availableVoices.length > 0;
    };

    loadVoices();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  public initDOM(): void {
    this.cardEl = document.getElementById('cutscene-dialogue-card');
    this.avatarEl = document.getElementById('cutscene-speaker-avatar');
    this.nameEl = document.getElementById('cutscene-speaker-name');
    this.voiceTagEl = document.getElementById('cutscene-speaker-voice-tag');
    this.speechTextEl = document.getElementById('cutscene-speech-text');
    this.wavesEl = document.getElementById('cutscene-voice-waves');
    this.toggleBtnEl = document.getElementById('cutscene-voice-toggle-btn');
    this.speakBtnEl = document.getElementById('cutscene-voice-speak-btn');

    // In-Video Subtitle Elements
    this.videoSubtitlesEl = document.getElementById('cutscene-video-subtitles');
    this.videoSubAvatarEl = document.getElementById('video-sub-avatar');
    this.videoSubSpeakerNameEl = document.getElementById('video-sub-speaker-name');
    this.videoSubEqualizerEl = document.getElementById('video-sub-equalizer');
    this.videoSubTextEl = document.getElementById('video-sub-text');
    this.videoHudSubtitlesBtnEl = document.getElementById('video-hud-subtitles-btn');

    this.videoHudSubtitlesBtnEl?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.toggleSubtitles();
    });

    const hudVoiceBtn = document.getElementById('video-hud-voice-btn');
    hudVoiceBtn?.addEventListener('click', () => {
      this.toggleVoice();
    });

    this.updateToggleBtnUI();

    this.toggleBtnEl?.addEventListener('click', () => {
      this.toggleVoice();
    });

    this.speakBtnEl?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.replayCurrentChapterDialogue();
    });
  }

  public toggleSubtitles(visible?: boolean): boolean {
    if (visible !== undefined) {
      this.areSubtitlesVisible = visible;
    } else {
      this.areSubtitlesVisible = !this.areSubtitlesVisible;
    }

    if (this.videoSubtitlesEl) {
      if (this.areSubtitlesVisible) {
        this.videoSubtitlesEl.classList.remove('subtitles-hidden');
      } else {
        this.videoSubtitlesEl.classList.add('subtitles-hidden');
      }
    }

    if (this.videoHudSubtitlesBtnEl) {
      if (this.areSubtitlesVisible) {
        this.videoHudSubtitlesBtnEl.classList.add('active');
        this.videoHudSubtitlesBtnEl.textContent = '💬 Subtitles';
      } else {
        this.videoHudSubtitlesBtnEl.classList.remove('active');
        this.videoHudSubtitlesBtnEl.textContent = '💬 Subtitles (Off)';
      }
    }

    return this.areSubtitlesVisible;
  }

  public playChapter(chapterIndex: number): void {
    this.stopAll();
    this.currentChapterIndex = chapterIndex;

    const lines = CHAPTER_DIALOGUES[chapterIndex] || [];
    if (lines.length === 0) {
      this.onChapterDialogueComplete?.(chapterIndex);
      return;
    }

    this.lineQueue = [...lines];
    this.currentQueueIndex = 0;
    this.isQueueActive = true;

    // Display first line on UI immediately
    this.updateDialogueUI(lines[0], false);

    // Start sequential processing with small initial breath delay (200ms)
    const initialTimer = setTimeout(() => {
      this.processQueue();
    }, 200);
    this.scheduledTimers.push(initialTimer);
  }

  private processQueue(): void {
    if (!this.isQueueActive) return;

    if (this.currentQueueIndex >= this.lineQueue.length) {
      // Entire chapter dialogue completed!
      this.isQueueActive = false;
      this.setSpeakingState(false);
      this.onChapterDialogueComplete?.(this.currentChapterIndex);
      return;
    }

    const line = this.lineQueue[this.currentQueueIndex];
    this.speakLine(line, () => {
      if (!this.isQueueActive) return;
      this.currentQueueIndex++;
      // Natural 350ms pause between character voices
      const nextTimer = setTimeout(() => {
        this.processQueue();
      }, 350);
      this.scheduledTimers.push(nextTimer);
    });
  }

  public speakLine(line: CutsceneDialogueLine, onLineDone?: () => void): void {
    this.currentLine = line;
    const profile = VOICE_PROFILES[line.speakerId];
    if (!profile) {
      onLineDone?.();
      return;
    }

    // Update UI card & in-video subtitles with character avatar, glowing name, voice tag, and speech text
    this.updateDialogueUI(line, true);
    this.onDialogueLineStart?.(line, profile);

    // Play character procedural vocal tone through sound engine
    this.soundEngine.playCharacterVocalTone(line.speakerId);

    // Calculate speech duration
    const speechDurationMs = line.durationEstimateMs || Math.max(3200, line.text.length * 65);

    // Play procedural character speech babble for audible voice chatter
    if (!this.isVoiceMuted) {
      if (this.activeBabbleHandle) {
        this.activeBabbleHandle.stop();
      }
      this.activeBabbleHandle = this.soundEngine.playCharacterSpeechBabble(line.speakerId, speechDurationMs);
    }

    const finishLine = () => {
      if (this.safetyTimer) {
        clearTimeout(this.safetyTimer);
        this.safetyTimer = null;
      }
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }
      if (this.activeBabbleHandle) {
        this.activeBabbleHandle.stop();
        this.activeBabbleHandle = null;
      }
      this.setSpeakingState(false);
      this.onDialogueLineEnd?.(line);
      onLineDone?.();
    };

    if (this.isVoiceMuted) {
      // In muted mode, allow reading duration based on text length
      const readingDuration = line.durationEstimateMs || Math.max(3000, line.text.length * 60);
      const simTimer = setTimeout(() => {
        finishLine();
      }, readingDuration);
      this.scheduledTimers.push(simTimer);
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      const fallbackDuration = line.durationEstimateMs || Math.max(3000, line.text.length * 60);
      const simTimer = setTimeout(() => {
        finishLine();
      }, fallbackDuration);
      this.scheduledTimers.push(simTimer);
      return;
    }

    try {
      // Cancel previous utterance cleanly before starting this one
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;
      utterance.volume = profile.volume;

      // Match best system voice
      const selectedVoice = this.pickBestVoiceForSpeaker(profile);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      this.setSpeakingState(true);

      let hasFinished = false;
      const safeFinish = () => {
        if (hasFinished) return;
        hasFinished = true;
        finishLine();
      };

      utterance.onend = safeFinish;
      utterance.onerror = safeFinish;

      // Speech keep-alive loop to prevent Chrome pausing long utterances
      this.keepAliveTimer = setInterval(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
        }
      }, 4500);

      // Safety timeout in case browser event drops
      const maxEstimatedTime = Math.max(5000, line.text.length * 140 + 3500);
      this.safetyTimer = setTimeout(safeFinish, maxEstimatedTime);

      // Resume speech synthesis to prevent browser autoplay block
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      finishLine();
    }
  }

  private pickBestVoiceForSpeaker(profile: VoiceSpeakerProfile): SpeechSynthesisVoice | null {
    if (!this.availableVoices || this.availableVoices.length === 0) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.availableVoices = window.speechSynthesis.getVoices();
      }
    }
    if (!this.availableVoices || this.availableVoices.length === 0) return null;

    const englishVoices = this.availableVoices.filter(
      (v) => v.lang.startsWith('en') || v.lang.startsWith('EN')
    );
    const pool = englishVoices.length > 0 ? englishVoices : this.availableVoices;

    if (profile.voiceGenderHint === 'monster') {
      const deepVoice = pool.find(
        (v) =>
          /male|david|daniel|alex|george|fred|deep|monster/i.test(v.name) &&
          !/female|zira|samantha|victoria/i.test(v.name)
      );
      if (deepVoice) return deepVoice;
    } else if (profile.voiceGenderHint === 'elder') {
      const elderVoice = pool.find(
        (v) => /natural|guy|uk|scottish|irish|daniel|oliver/i.test(v.name)
      );
      if (elderVoice) return elderVoice;
    } else if (profile.voiceGenderHint === 'hero') {
      const heroVoice = pool.find(
        (v) => /alex|junior|evan|tom|nathan/i.test(v.name)
      );
      if (heroVoice) return heroVoice;
    }

    return pool[0] || null;
  }

  public updateDialogueUI(line: CutsceneDialogueLine, animateBubble: boolean = true): void {
    const profile = VOICE_PROFILES[line.speakerId];
    if (!profile) return;

    if (this.avatarEl) {
      this.avatarEl.textContent = profile.avatar;
    }
    if (this.nameEl) {
      this.nameEl.textContent = profile.name;
      this.nameEl.style.color = profile.themeColor;
      this.nameEl.style.textShadow = `0 0 12px ${profile.glowColor}`;
    }
    if (this.voiceTagEl) {
      this.voiceTagEl.textContent = profile.tag;
    }
    if (this.speechTextEl) {
      this.speechTextEl.textContent = line.text;
    }

    if (this.cardEl) {
      this.cardEl.style.borderColor = profile.themeColor;
      this.cardEl.style.boxShadow = `0 10px 30px rgba(0,0,0,0.7), 0 0 20px ${profile.glowColor}`;
      if (animateBubble) {
        this.cardEl.classList.remove('dialogue-pop');
        void this.cardEl.offsetWidth; // Trigger reflow for restart
        this.cardEl.classList.add('dialogue-pop');
      }
    }

    // In-Video Subtitles Update
    if (this.videoSubAvatarEl) {
      this.videoSubAvatarEl.textContent = profile.avatar;
    }
    if (this.videoSubSpeakerNameEl) {
      this.videoSubSpeakerNameEl.textContent = profile.name;
      this.videoSubSpeakerNameEl.style.color = profile.themeColor;
      this.videoSubSpeakerNameEl.style.textShadow = `0 0 12px ${profile.glowColor}`;
    }
    if (this.videoSubTextEl) {
      this.videoSubTextEl.textContent = `“${line.text}”`;
    }
    if (this.videoSubtitlesEl) {
      this.videoSubtitlesEl.style.borderColor = profile.themeColor;
    }
  }

  private setSpeakingState(speaking: boolean): void {
    this.isSpeaking = speaking;
    if (this.wavesEl) {
      if (speaking && !this.isVoiceMuted) {
        this.wavesEl.classList.add('active');
      } else {
        this.wavesEl.classList.remove('active');
      }
    }
    if (this.videoSubEqualizerEl) {
      if (speaking && !this.isVoiceMuted) {
        this.videoSubEqualizerEl.classList.add('active');
      } else {
        this.videoSubEqualizerEl.classList.remove('active');
      }
    }
  }

  public stopAll(): void {
    this.isQueueActive = false;
    this.lineQueue = [];
    this.currentQueueIndex = 0;

    this.scheduledTimers.forEach((t) => clearTimeout(t));
    this.scheduledTimers = [];

    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    if (this.activeBabbleHandle) {
      this.activeBabbleHandle.stop();
      this.activeBabbleHandle = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    this.setSpeakingState(false);
  }

  public toggleVoice(muted?: boolean): boolean {
    if (muted !== undefined) {
      this.isVoiceMuted = muted;
    } else {
      this.isVoiceMuted = !this.isVoiceMuted;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('elemental_cutscene_voice_muted', String(this.isVoiceMuted));
    }

    this.updateToggleBtnUI();

    if (this.isVoiceMuted) {
      this.stopAll();
    } else {
      // Re-trigger current chapter so entire dialogue plays cleanly
      this.replayCurrentChapterDialogue();
    }

    return !this.isVoiceMuted;
  }

  private updateToggleBtnUI(): void {
    if (this.toggleBtnEl) {
      if (this.isVoiceMuted) {
        this.toggleBtnEl.textContent = '🔇 Voices: MUTED';
        this.toggleBtnEl.classList.remove('active');
        this.toggleBtnEl.style.borderColor = '#f87171';
        this.toggleBtnEl.style.color = '#f87171';
      } else {
        this.toggleBtnEl.textContent = '🎙️ Voices: ON';
        this.toggleBtnEl.classList.add('active');
        this.toggleBtnEl.style.borderColor = '#38bdf8';
        this.toggleBtnEl.style.color = '#38bdf8';
      }
    }

    const hudVoiceBtn = document.getElementById('video-hud-voice-btn');
    if (hudVoiceBtn) {
      if (this.isVoiceMuted) {
        hudVoiceBtn.classList.remove('active');
        hudVoiceBtn.textContent = '🎙️ Voices (Off)';
      } else {
        hudVoiceBtn.classList.add('active');
        hudVoiceBtn.textContent = '🎙️ Voices';
      }
    }
  }

  public replayCurrentChapterDialogue(): void {
    this.playChapter(this.currentChapterIndex);
  }

  public isMuted(): boolean {
    return this.isVoiceMuted;
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  public isVoicesLoaded(): boolean {
    return this.hasInitializedVoices;
  }

  public getSpeakerProfile(speakerId: VoiceSpeakerId): VoiceSpeakerProfile {
    return VOICE_PROFILES[speakerId];
  }

  public getCurrentLine(): CutsceneDialogueLine | null {
    return this.currentLine;
  }

  public getChapterLines(chapterIndex: number): CutsceneDialogueLine[] {
    return CHAPTER_DIALOGUES[chapterIndex] || [];
  }
}
