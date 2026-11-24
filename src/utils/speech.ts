export interface SpeakOptions {
  grade?: number;
  slowMode?: boolean;
  audioUrl?: string;
  onEnd?: () => void;
}

let activeAudio: HTMLAudioElement | null = null;

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('speechSynthesis' in window || typeof Audio !== 'undefined')
  );
}

/**
 * 依語言、年級與慢速模式計算清晰朗讀語速（G1–G2 中文預設 0.85，符合 0.80–0.90 實證建議）。
 */
export function resolveSpeechRate(
  lang = 'zh-TW',
  grade?: number,
  slowMode = false,
): number {
  const isEnglish = lang.toLowerCase().startsWith('en');
  if (slowMode) {
    return isEnglish ? 0.75 : 0.78;
  }
  if (grade !== undefined && grade <= 2) {
    return isEnglish ? 0.82 : 0.85;
  }
  return isEnglish ? 0.88 : 0.95;
}

export function stopSpeech(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function speakWithSynthesis(
  text: string,
  lang: string,
  options?: SpeakOptions,
): void {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    !text.trim()
  ) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = resolveSpeechRate(lang, options?.grade, options?.slowMode);
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const exact = voices.find(
      (v) => v.lang.toLowerCase() === lang.toLowerCase(),
    );
    const prefix = voices.find((v) =>
      v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()),
    );
    if (exact) {
      utterance.voice = exact;
    } else if (prefix) {
      utterance.voice = prefix;
    }
  }

  if (options?.onEnd) {
    utterance.onend = options.onEnd;
    utterance.onerror = options.onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

export function speakText(
  text: string,
  lang = 'zh-TW',
  options?: SpeakOptions,
): void {
  stopSpeech();

  const audioUrl = options?.audioUrl?.trim();
  if (audioUrl && typeof Audio !== 'undefined') {
    try {
      const audio = new Audio(audioUrl);
      audio.playbackRate = options?.slowMode ? 0.85 : 1.0;
      activeAudio = audio;
      audio.addEventListener(
        'ended',
        () => {
          if (activeAudio === audio) {
            activeAudio = null;
          }
          options?.onEnd?.();
        },
        { once: true },
      );
      audio.addEventListener(
        'error',
        () => {
          if (activeAudio === audio) {
            activeAudio = null;
          }
          speakWithSynthesis(text, lang, options);
        },
        { once: true },
      );
      const playResult = audio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          if (activeAudio === audio) {
            activeAudio = null;
          }
          speakWithSynthesis(text, lang, options);
        });
      }
      return;
    } catch {
      activeAudio = null;
    }
  }

  speakWithSynthesis(text, lang, options);
}
