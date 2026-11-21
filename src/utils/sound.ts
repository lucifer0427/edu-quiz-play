let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.14,
  delay = 0,
  endFrequency?: number,
): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (endFrequency !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, endFrequency),
      now + duration,
    );
  }

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playTap(): void {
  playTone(540, 0.06, 'triangle', 0.08, 0, 680);
}

export function playCorrect(combo = 1): void {
  const boost = Math.min(combo - 1, 6) * 35;
  playTone(523.25 + boost, 0.12, 'triangle', 0.14, 0);
  playTone(659.25 + boost, 0.14, 'triangle', 0.14, 0.07);
  playTone(783.99 + boost, 0.2, 'sine', 0.16, 0.14);
}

export function playCrit(): void {
  playTone(587.33, 0.09, 'triangle', 0.15, 0);
  playTone(783.99, 0.09, 'triangle', 0.15, 0.06);
  playTone(1046.5, 0.25, 'sine', 0.18, 0.12);
  playTone(1318.5, 0.28, 'triangle', 0.12, 0.18);
}

export function playWrong(): void {
  playTone(260, 0.16, 'sawtooth', 0.07, 0, 190);
  playTone(190, 0.22, 'triangle', 0.1, 0.11, 140);
}

export function playVictory(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    playTone(freq, 0.22, 'triangle', 0.15, idx * 0.1);
  });
  playTone(1046.5, 0.4, 'sine', 0.16, 0.42);
}

export function playDefeat(): void {
  const notes = [392, 349.23, 311.13, 261.63];
  notes.forEach((freq, idx) => {
    playTone(freq, 0.24, 'triangle', 0.12, idx * 0.13);
  });
}

export function playUnlock(): void {
  playTone(659.25, 0.12, 'sine', 0.14, 0);
  playTone(880, 0.14, 'sine', 0.14, 0.08);
  playTone(1174.66, 0.26, 'triangle', 0.16, 0.16);
}
