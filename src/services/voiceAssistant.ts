import { LanguageCode } from '../types';

export const LANG_SPEECH_MAP: Record<LanguageCode, string> = {
  Tamil: 'ta-IN',
  English: 'en-IN',
  Hindi: 'hi-IN',
  Telugu: 'te-IN',
  Malayalam: 'ml-IN'
};

// Check if browser Speech Recognition is available
export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

// Check if browser Speech Synthesis is available
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let voiceList: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve([]);
      return;
    }
    const current = window.speechSynthesis.getVoices();
    if (current.length > 0) {
      voiceList = current;
      resolve(current);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      voiceList = window.speechSynthesis.getVoices();
      resolve(voiceList);
    };
    // Fallback timer if event never fires
    setTimeout(() => {
      voiceList = window.speechSynthesis.getVoices();
      resolve(voiceList);
    }, 500);
  });
}

// Ensure voices are loaded early
if (typeof window !== 'undefined' && isSpeechSynthesisSupported()) {
  loadVoices();
}

// Speak text in specific language with voice selection and error protection
export async function speakText(text: string, language: LanguageCode = 'Tamil', onEnd?: () => void): Promise<void> {
  if (!isSpeechSynthesisSupported() || !text) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending audio

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const voices = voiceList.length > 0 ? voiceList : await loadVoices();
    const langCode = LANG_SPEECH_MAP[language] || 'en-IN';
    const shortCode = langCode.slice(0, 2).toLowerCase();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.95; // Slightly slower for clear comprehension
    utterance.pitch = 1.0;

    // Try finding exact locale voice, or language prefix, or Indian English fallback
    const matchedVoice =
      voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(shortCode)) ||
      voices.find((v) => v.lang.toLowerCase().includes('in')) ||
      voices.find((v) => v.lang.toLowerCase().includes('en'));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('SpeakText exception:', err);
    if (onEnd) onEnd();
  }
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

// Create a Speech Recognition instance with cross-browser resilience
export function createSpeechRecognizer(
  language: LanguageCode,
  onResult: (transcript: string) => void,
  onError: (error: string) => void,
  onEnd: () => void
) {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = LANG_SPEECH_MAP[language] || 'ta-IN';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let hasResult = false;

  recognition.onresult = (event: any) => {
    if (event.results && event.results[0] && event.results[0][0]) {
      const transcript = event.results[0][0].transcript;
      if (transcript && transcript.trim()) {
        hasResult = true;
        onResult(transcript.trim());
      }
    }
  };

  recognition.onerror = (event: any) => {
    console.warn('Speech recognition error event:', event.error);
    onError(event.error || 'speech_error');
  };

  recognition.onend = () => {
    onEnd();
  };

  return recognition;
}
