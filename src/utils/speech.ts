export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

export function speakText(text: string, lang = 'zh-TW'): void {
  if (!isSpeechSupported() || !text.trim()) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = lang.startsWith('en') ? 0.88 : 0.95;
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

  window.speechSynthesis.speak(utterance);
}
