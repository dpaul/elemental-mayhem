// Elemental Mayhem - Origin Cutscene Voice Dialogue System
// Coordinates multi-character voice acting via Web Speech API & Web Audio formant voice fallbacks

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
  delayMs: number; // Delay from chapter start before this line triggers
  durationEstimateMs: number;
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
  // Chapter 1: When Titans Collided
  0: [
    {
      id: 'ch1_line1',
      speakerId: 'narrator',
      text: 'Long before the arenas were forged, two primeval titans collided in catastrophic fury across the stars!',
      delayMs: 150,
      durationEstimateMs: 3800,
    },
    {
      id: 'ch1_line2',
      speakerId: 'titan_magma',
      text: 'I am the eternal flame! I will scorch this entire cosmos into ash!',
      delayMs: 3600,
      durationEstimateMs: 3200,
    },
    {
      id: 'ch1_line3',
      speakerId: 'titan_void',
      text: 'The void swallows all light! Submit to the infinite abyss!',
      delayMs: 6500,
      durationEstimateMs: 3400,
    },
  ],

  // Chapter 2: The Dimensional Tear Opens
  1: [
    {
      id: 'ch2_line1',
      speakerId: 'narrator',
      text: 'Their apocalyptic blow shattered spacetime, tearing open a swirling cosmic rift beyond mortal imagination!',
      delayMs: 150,
      durationEstimateMs: 4000,
    },
    {
      id: 'ch2_line2',
      speakerId: 'titan_void',
      text: 'Fall... into the dimensional singularity...',
      delayMs: 4200,
      durationEstimateMs: 3000,
    },
  ],

  // Chapter 3: Falling Through the Rift
  2: [
    {
      id: 'ch3_line1',
      speakerId: 'seeker',
      text: "I'm falling! The rift's gravity is tearing me across hyperspace!",
      delayMs: 200,
      durationEstimateMs: 3000,
    },
    {
      id: 'ch3_line2',
      speakerId: 'narrator',
      text: 'Tumbling through hyperspace wormholes, you crash-landed onto an uncharted floating world.',
      delayMs: 3200,
      durationEstimateMs: 3800,
    },
  ],

  // Chapter 4: The Grand Wizard's Blessing
  3: [
    {
      id: 'ch4_line1',
      speakerId: 'wizard',
      text: 'Rise, young wanderer! Darkness awakens. Take my life power... all fifty elements are now yours to wield!',
      delayMs: 200,
      durationEstimateMs: 4600,
    },
    {
      id: 'ch4_line2',
      speakerId: 'seeker',
      text: 'By the stars... I can feel the primal magic surging through my hands!',
      delayMs: 4800,
      durationEstimateMs: 3500,
    },
  ],

  // Chapter 5: Ambushed in the Shadows
  4: [
    {
      id: 'ch5_line1',
      speakerId: 'void_overlord',
      text: 'Foolish old wizard! That godlike power belongs to the Void! IT IS MINE!',
      delayMs: 200,
      durationEstimateMs: 3800,
    },
    {
      id: 'ch5_line2',
      speakerId: 'wizard',
      text: 'No! You fiend! Protect the starter embers!',
      delayMs: 3900,
      durationEstimateMs: 2800,
    },
    {
      id: 'ch5_line3',
      speakerId: 'seeker',
      text: 'My magic... he violently ripped it away! Only three starter embers remain!',
      delayMs: 6400,
      durationEstimateMs: 3600,
    },
  ],

  // Chapter 6: The Mission to Reclaim the Power
  5: [
    {
      id: 'ch6_line1',
      speakerId: 'wizard',
      text: 'Do not despair! Master the three starter embers, ascend through the gauntlet to Round 1000, and defeat the Void Overlord to reclaim what was stolen!',
      delayMs: 200,
      durationEstimateMs: 5400,
    },
    {
      id: 'ch6_line2',
      speakerId: 'void_overlord',
      text: 'Face me on Round 1000 if you dare, pathetic worm!',
      delayMs: 5500,
      durationEstimateMs: 3200,
    },
    {
      id: 'ch6_line3',
      speakerId: 'seeker',
      text: 'I will train, conquer every arena, and defeat the Void Overlord on Round 1000!',
      delayMs: 8400,
      durationEstimateMs: 3600,
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

  // Cached system voices
  private availableVoices: SpeechSynthesisVoice[] = [];
  private hasInitializedVoices: boolean = false;

  // DOM Elements
  private cardEl: HTMLElement | null = null;
  private avatarEl: HTMLElement | null = null;
  private nameEl: HTMLElement | null = null;
  private voiceTagEl: HTMLElement | null = null;
  private speechTextEl: HTMLElement | null = null;
  private wavesEl: HTMLElement | null = null;
  private toggleBtnEl: HTMLElement | null = null;
  private speakBtnEl: HTMLElement | null = null;

  // Event callbacks
  public onDialogueLineStart?: (line: CutsceneDialogueLine, profile: VoiceSpeakerProfile) => void;
  public onDialogueLineEnd?: (line: CutsceneDialogueLine) => void;

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

    this.updateToggleBtnUI();

    this.toggleBtnEl?.addEventListener('click', () => {
      this.toggleVoice();
    });

    this.speakBtnEl?.addEventListener('click', () => {
      this.soundEngine.playClick();
      this.replayCurrentChapterDialogue();
    });
  }

  public playChapter(chapterIndex: number): void {
    this.stopAll();
    this.currentChapterIndex = chapterIndex;

    const lines = CHAPTER_DIALOGUES[chapterIndex] || [];
    if (lines.length === 0) return;

    // Show initial line right away in UI
    this.updateDialogueUI(lines[0], false);

    // Schedule each dialogue line by delayMs
    lines.forEach((line) => {
      const timer = setTimeout(() => {
        this.speakLine(line);
      }, line.delayMs);
      this.scheduledTimers.push(timer);
    });
  }

  public speakLine(line: CutsceneDialogueLine): void {
    this.currentLine = line;
    const profile = VOICE_PROFILES[line.speakerId];
    if (!profile) return;

    // Update UI card
    this.updateDialogueUI(line, true);
    this.onDialogueLineStart?.(line, profile);

    // Play character procedural vocal tone through sound engine
    this.soundEngine.playCharacterVocalTone(line.speakerId);

    if (this.isVoiceMuted) {
      // Simulate speaking time without audio
      const simTimer = setTimeout(() => {
        this.setSpeakingState(false);
        this.onDialogueLineEnd?.(line);
      }, line.durationEstimateMs);
      this.scheduledTimers.push(simTimer);
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.setSpeakingState(false);
      return;
    }

    try {
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

      utterance.onend = () => {
        this.setSpeakingState(false);
        this.onDialogueLineEnd?.(line);
      };

      utterance.onerror = () => {
        this.setSpeakingState(false);
        this.onDialogueLineEnd?.(line);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.setSpeakingState(false);
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
      // Prefer deep/male voices (e.g. David, Daniel, Google UK English Male, Alex, Fred)
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
        // Trigger reflow to restart CSS animation
        void this.cardEl.offsetWidth;
        this.cardEl.classList.add('dialogue-pop');
      }
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
  }

  public stopAll(): void {
    this.scheduledTimers.forEach((t) => clearTimeout(t));
    this.scheduledTimers = [];

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
      // Re-trigger current line
      if (this.currentLine) {
        this.speakLine(this.currentLine);
      }
    }

    return !this.isVoiceMuted;
  }

  private updateToggleBtnUI(): void {
    if (!this.toggleBtnEl) return;
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

  public replayCurrentChapterDialogue(): void {
    this.playChapter(this.currentChapterIndex);
  }

  public isMuted(): boolean {
    return this.isVoiceMuted;
  }

  public getSpeakerProfile(speakerId: VoiceSpeakerId): VoiceSpeakerProfile {
    return VOICE_PROFILES[speakerId];
  }

  public getCurrentLine(): CutsceneDialogueLine | null {
    return this.currentLine;
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  public isVoicesLoaded(): boolean {
    return this.hasInitializedVoices;
  }

  public getChapterLines(chapterIndex: number): CutsceneDialogueLine[] {
    return CHAPTER_DIALOGUES[chapterIndex] || [];
  }
}
