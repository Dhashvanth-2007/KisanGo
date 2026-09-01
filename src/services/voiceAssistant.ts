import { LanguageCode } from '../types';

export const LANG_SPEECH_MAP: Record<LanguageCode, string> = {
  Tamil: 'ta-IN',
  English: 'en-IN',
  Hindi: 'hi-IN',
  Telugu: 'te-IN',
  Malayalam: 'ml-IN'
};

export const LANG_SHORT_MAP: Record<LanguageCode, string> = {
  Tamil: 'ta',
  English: 'en',
  Hindi: 'hi',
  Telugu: 'te',
  Malayalam: 'ml'
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
let currentAudio: HTMLAudioElement | null = null;

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

/**
 * Clean & normalize text to ensure fluent, natural pronunciation without weird symbol artifacts
 */
export function cleanTextForSpeech(rawText: string, language: LanguageCode = 'Tamil'): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Remove Markdown syntax & brackets
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/#+\s*/g, '');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 2. Remove Emojis & decorative symbols
  text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/gu, '');
  text = text.replace(/[•★✓✗📢⚖️🟢🟡🔴🛡️⏱️🌾⚠️₹]/g, ' ');

  // 3. Language-specific pronunciation optimization & phoneme normalization
  if (language === 'Tamil') {
    text = text.replace(/DPC/gi, 'நேரடி நெல் கொள்முதல் மையம் ');
    text = text.replace(/\bரூ\.\s*/g, 'ரூபாய் ');
    text = text.replace(/\bரூபாய்\s*(\d+)/g, '$1 ரூபாய் ');
    text = text.replace(/\bDBT\b/gi, 'டி பி டி ');
    text = text.replace(/\bUTR\b/gi, 'யு டி ஆர் ');
    text = text.replace(/\(மையம் B\)/gi, 'மையம் பி ');
    text = text.replace(/\(மையம் A\)/gi, 'மையம் ஏ ');
    text = text.replace(/\(மையம் C\)/gi, 'மையம் சி ');
    text = text.replace(/~/g, 'சுமார் ');
    text = text.replace(/(\d+)\s*kg/gi, '$1 கிலோகிராம் ');
    text = text.replace(/(\d+)\s*mins?/gi, '$1 நிமிடங்கள் ');
    text = text.replace(/(\d+)\s*qtl/gi, '$1 குவிண்டால் ');
    text = text.replace(/1800-425-3435/g, '1 8 0 0 4 2 5 3 4 3 5 ');
    text = text.replace(/FG-(\d+)/gi, 'எஃப் ஜி $1 ');
    text = text.replace(/KM-(\d+)/gi, 'கே எம் $1 ');
  } else if (language === 'Hindi') {
    text = text.replace(/DPC/gi, 'खरीद केंद्र ');
    text = text.replace(/\bरु\.\s*/g, 'रुपये ');
    text = text.replace(/\bDBT\b/gi, 'डी बी टी ');
    text = text.replace(/\bUTR\b/gi, 'यू टी आर ');
    text = text.replace(/\(केंद्र B\)/gi, 'केंद्र बी ');
    text = text.replace(/\(केंद्र A\)/gi, 'केंद्र ए ');
    text = text.replace(/\(केंद्र C\)/gi, 'केंद्र सी ');
    text = text.replace(/~/g, 'लगभग ');
    text = text.replace(/(\d+)\s*kg/gi, '$1 किलोग्राम ');
    text = text.replace(/(\d+)\s*mins?/gi, '$1 मिनट ');
    text = text.replace(/(\d+)\s*qtl/gi, '$1 क्विंटल ');
    text = text.replace(/1800-425-3435/g, '1 8 0 0 4 2 5 3 4 3 5 ');
    text = text.replace(/FG-(\d+)/gi, 'एफ जी $1 ');
    text = text.replace(/KM-(\d+)/gi, 'के एम $1 ');
  } else if (language === 'Telugu') {
    text = text.replace(/DPC/gi, 'కొనుగోలు కేంద్రం ');
    text = text.replace(/\bరూ\.\s*/g, 'రూపాయలు ');
    text = text.replace(/\bDBT\b/gi, 'డి బి టి ');
    text = text.replace(/\(సెంటర్ B\)/gi, 'సెంటర్ బి ');
    text = text.replace(/~/g, 'సుమారు ');
    text = text.replace(/(\d+)\s*kg/gi, '$1 కిలోలు ');
    text = text.replace(/(\d+)\s*mins?/gi, '$1 నిమిషాలు ');
    text = text.replace(/1800-425-3435/g, '1 8 0 0 4 2 5 3 4 3 5 ');
    text = text.replace(/FG-(\d+)/gi, 'ఎఫ్ జి $1 ');
  } else if (language === 'Malayalam') {
    text = text.replace(/DPC/gi, 'സംഭരണ കേന്ദ്രം ');
    text = text.replace(/\bരൂ\.\s*/g, 'രൂപ ');
    text = text.replace(/\bDBT\b/gi, 'ഡി ബി ടി ');
    text = text.replace(/\(സെന്റർ B\)/gi, 'സെന്റർ ബി ');
    text = text.replace(/~/g, 'ഏകദേശം ');
    text = text.replace(/(\d+)\s*kg/gi, '$1 കിലോഗ്രാം ');
    text = text.replace(/(\d+)\s*mins?/gi, '$1 മിനിറ്റ് ');
    text = text.replace(/1800-425-3435/g, '1 8 0 0 4 2 5 3 4 3 5 ');
    text = text.replace(/FG-(\d+)/gi, 'എഫ് ജി $1 ');
  } else {
    // English
    text = text.replace(/DPC/gi, 'Direct Procurement Centre ');
    text = text.replace(/\b₹\s*(\d+)/g, '$1 rupees ');
    text = text.replace(/~/g, 'approximately ');
    text = text.replace(/(\d+)\s*kg/gi, '$1 kilograms ');
    text = text.replace(/(\d+)\s*qtl/gi, '$1 quintals ');
    text = text.replace(/(\d+)\s*mins?/gi, '$1 minutes ');
    text = text.replace(/1800-425-3435/g, '1800 425 3435 ');
    text = text.replace(/FG-(\d+)/gi, 'F G $1 ');
    text = text.replace(/KM-(\d+)/gi, 'K M $1 ');
  }

  // 4. Remove parentheses and multiple spaces
  text = text.replace(/[()]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Play natural Indic TTS stream with browser fallback
 */
export async function speakText(
  text: string,
  language: LanguageCode = 'Tamil',
  onEnd?: () => void
): Promise<void> {
  if (!text) {
    if (onEnd) onEnd();
    return;
  }

  stopSpeaking();

  const cleanText = cleanTextForSpeech(text, language);
  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  const shortCode = LANG_SHORT_MAP[language] || 'ta';
  const langCode = LANG_SPEECH_MAP[language] || 'ta-IN';

  // Chunks of max 180 chars for seamless online streaming
  const chunks: string[] = [];
  const sentences = cleanText.split(/([.!?;,]\s+)/);
  let currentChunk = '';

  for (let i = 0; i < sentences.length; i++) {
    const segment = sentences[i];
    if ((currentChunk + segment).length < 180) {
      currentChunk += segment;
    } else {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = segment;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  // Try Online Native Voice Stream first (Google Indic TTS Engine)
  const tryPlayOnlineStream = (chunkIndex: number): void => {
    if (chunkIndex >= chunks.length) {
      if (onEnd) onEnd();
      return;
    }

    const chunk = chunks[chunkIndex];
    const encoded = encodeURIComponent(chunk);
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${shortCode}&client=tw-ob&q=${encoded}`;

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      tryPlayOnlineStream(chunkIndex + 1);
    };

    audio.onerror = () => {
      console.warn('Online TTS stream failed, falling back to Web Speech API...');
      playBrowserSpeechFallback(cleanText, language, onEnd);
    };

    audio.play().catch(() => {
      // If audio autoplay blocked or network failed, fallback to Web Speech
      playBrowserSpeechFallback(cleanText, language, onEnd);
    });
  };

  try {
    tryPlayOnlineStream(0);
  } catch (e) {
    playBrowserSpeechFallback(cleanText, language, onEnd);
  }
}

/**
 * Fallback to Web Speech API with strict native voice matching and clear rate
 */
function playBrowserSpeechFallback(
  text: string,
  language: LanguageCode,
  onEnd?: () => void
): void {
  if (!isSpeechSynthesisSupported()) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const langCode = LANG_SPEECH_MAP[language] || 'ta-IN';
    const shortCode = langCode.slice(0, 2).toLowerCase();
    const voices = voiceList.length > 0 ? voiceList : window.speechSynthesis.getVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = language === 'English' ? 0.95 : 0.88; // Slightly slower pace for clear Indic syllables
    utterance.pitch = 1.05;

    // Strict search for language-matched voice
    const matchedVoice =
      voices.find((v) => v.lang.toLowerCase().replace('_', '-') === langCode.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(shortCode)) ||
      voices.find((v) => v.name.toLowerCase().includes(language.toLowerCase())) ||
      voices.find((v) => v.lang.toLowerCase().includes('in')) ||
      voices.find((v) => v.lang.toLowerCase().includes('en'));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis fallback error:', e);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Browser Speech Exception:', err);
    if (onEnd) onEnd();
  }
}

export function stopSpeaking(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }

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

  recognition.onresult = (event: any) => {
    if (event.results && event.results[0] && event.results[0][0]) {
      const transcript = event.results[0][0].transcript;
      if (transcript && transcript.trim()) {
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
