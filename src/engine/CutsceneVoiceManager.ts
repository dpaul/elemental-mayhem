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
  // Chapter 1: When Titans Collided
  0: [
    {
      id: 'ch1_line1',
      speakerId: 'narrator',
      text: 'Long before the arenas were forged, mortal souls lived defenseless under the shadows of cosmic titans. Two primeval giants, the Magma Colossus and the Void Leviathan, collided in a war that shattered the boundaries of reality!',
      durationEstimateMs: 6500,
    },
    {
      id: 'ch1_line2',
      speakerId: 'titan_magma',
      text: 'I am the eternal flame! I will scorch this entire cosmos into ash!',
      durationEstimateMs: 3800,
    },
    {
      id: 'ch1_line3',
      speakerId: 'titan_void',
      text: 'The void swallows all light! Submit to the infinite abyss!',
      durationEstimateMs: 3800,
    },
  ],

  // Chapter 2: The Dimensional Tear Opens
  1: [
    {
      id: 'ch2_line1',
      speakerId: 'narrator',
      text: "The titans' apocalyptic clash tore open a swirling cosmic rift! A singularity of raw spacetime ruptured the heavens, pulling wandering mortals and fractured stars into its gravitational abyss.",
      durationEstimateMs: 7000,
    },
    {
      id: 'ch2_line2',
      speakerId: 'titan_void',
      text: 'Fall... into the dimensional singularity...',
      durationEstimateMs: 3200,
    },
  ],

  // Chapter 3: Falling Through the Rift
  2: [
    {
      id: 'ch3_line1',
      speakerId: 'seeker',
      text: "I'm falling! The rift's gravity is tearing me across hyperspace!",
      durationEstimateMs: 3600,
    },
    {
      id: 'ch3_line2',
      speakerId: 'narrator',
      text: 'Sucked through the cosmic wormhole, you tumbled through hyperspace before crash-landing upon a mysterious miniature world, surrounded by ancient ruins and shimmering energy.',
      durationEstimateMs: 6800,
    },
    {
      id: 'ch3_line3',
      speakerId: 'seeker',
      text: 'Where am I? What is this strange mystical world...?',
      durationEstimateMs: 3400,
    },
  ],

  // Chapter 4: The Grand Wizard's Blessing
  3: [
    {
      id: 'ch4_line1',
      speakerId: 'narrator',
      text: 'An ancient Grand Arch-Wizard emerged from the ruins and channeled his godlike powers into your soul! The reaction cascade began, giving you mastery over all fifty elements of the cosmos!',
      durationEstimateMs: 7200,
    },
    {
      id: 'ch4_line2',
      speakerId: 'wizard',
      text: 'Rise, young wanderer! Darkness awakens. Take my life power... all fifty elements are now yours to wield!',
      durationEstimateMs: 5200,
    },
    {
      id: 'ch4_line3',
      speakerId: 'seeker',
      text: 'By the stars... I can feel the primal magic surging through my hands!',
      durationEstimateMs: 3800,
    },
  ],

  // Chapter 5: Ambushed in the Shadows
  4: [
    {
      id: 'ch5_line1',
      speakerId: 'narrator',
      text: "Suddenly, the sky turned pitch black! The sinister Void Overlord struck from the shadows, violently siphoning the wizard's godlike power from your chest!",
      durationEstimateMs: 6500,
    },
    {
      id: 'ch5_line2',
      speakerId: 'void_overlord',
      text: 'Foolish old wizard! That godlike power belongs to the Void! IT IS MINE!',
      durationEstimateMs: 4400,
    },
    {
      id: 'ch5_line3',
      speakerId: 'wizard',
      text: 'No! You fiend! Protect the starter embers!',
      durationEstimateMs: 3000,
    },
    {
      id: 'ch5_line4',
      speakerId: 'narrator',
      text: 'The demon fled into the cosmos, leaving you with only the basic starter embers of Fire, Water, and Earth.',
      durationEstimateMs: 4800,
    },
    {
      id: 'ch5_line5',
      speakerId: 'seeker',
      text: 'My magic... he violently ripped it away! Only three starter embers remain!',
      durationEstimateMs: 4000,
    },
  ],

  // Chapter 6: The Mission to Reclaim the Power
  5: [
    {
      id: 'ch6_line1',
      speakerId: 'wizard',
      text: 'Do not despair! You still hold the Three Starter Embers. Train, master the elements, and battle through the arenas to defeat the Ultimate Boss on Round 1000 and reclaim the stolen power!',
      durationEstimateMs: 7800,
    },
    {
      id: 'ch6_line2',
      speakerId: 'void_overlord',
      text: 'Face me on Round 1000 if you dare, pathetic worm!',
      durationEstimateMs: 3800,
    },
    {
      id: 'ch6_line3',
      speakerId: 'seeker',
      text: 'I will train, conquer every arena, and defeat the Void Overlord on Round 1000!',
      durationEstimateMs: 4200,
    },
    {
      id: 'ch6_line4',
      speakerId: 'narrator',
      text: 'Your mission begins now! Ascend through the gauntlet and reclaim your destiny!',
      durationEstimateMs: 4500,
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

    // Update UI card with character avatar, glowing name, voice tag, and speech text
    this.updateDialogueUI(line, true);
    this.onDialogueLineStart?.(line, profile);

    // Play character procedural vocal tone through sound engine
    this.soundEngine.playCharacterVocalTone(line.speakerId);

    const finishLine = () => {
      if (this.safetyTimer) {
        clearTimeout(this.safetyTimer);
        this.safetyTimer = null;
      }
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
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
