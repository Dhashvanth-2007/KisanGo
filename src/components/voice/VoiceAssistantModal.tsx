import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  createSpeechRecognizer,
  speakText,
  stopSpeaking,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported
} from '../../services/voiceAssistant';
import { LanguageCode } from '../../types';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  ArrowRight,
  HelpCircle,
  Clock,
  Ticket,
  DollarSign,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { language, setLanguage, languagesList, t } = useLanguage();
  const { user } = useAuth();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<string>('idle');
  const [messages, setMessages] = useState<
    { id: string; sender: 'user' | 'ai'; text: string; actionRoute?: string; english?: string }[]
  >([]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognizerRef = useRef<any>(null);

  // Suggested prompts per language
  const suggestedQuestions: Record<LanguageCode, string[]> = {
    Tamil: [
      'எந்த கொள்முதல் நிலையத்தில் காத்திருப்பு நேரம் குறைவு?',
      'என் டோக்கன் எண் மற்றும் வரிசை நிலை என்ன?',
      'நான் எப்போது வீட்டிலிருந்து கிளம்ப வேண்டும்?',
      'இந்த மையத்தில் நெல் மற்றும் பயிர் விலை என்ன?',
      'என் வங்கி கணக்கில் DBT பணம் வந்துவிட்டதா?'
    ],
    English: [
      'Which procurement center has the lowest waiting time?',
      'What is my token number and queue position?',
      'When should I leave to reach on time?',
      'What crops and MSP rates are accepted?',
      'What is my payment DBT status?'
    ],
    Hindi: [
      'किस खरीद केंद्र में सबसे कम प्रतीक्षा समय है?',
      'मेरा टोकன் नंबर और कतार में स्थान क्या है?',
      'मुझे समय पर पहुंचने के लिए कब निकलना चाहिए?',
      'स्वीकृत फसलें और न्यूनतम समर्थन मूल्य क्या हैं?',
      'मेरी डीबीटी भुगतान स्थिति क्या है?'
    ],
    Telugu: [
      'ఏ కొనుగోలు కేంద్రంలో తక్కువ నిరీక్షణ సమయం ఉంది?',
      'నా టోకెన్ సంఖ్య మరియు క్యూ స్థానం ఏమిటి?',
      'సమయానికి చేరుకోవడానికి నేను ఎప్పుడు బయలుదేరాలి?',
      'నా చెల్లింపు DBT స్థితి ఏమిటి?'
    ],
    Malayalam: [
      'ഏത് സംഭരണ കേന്ദ്രത്തിലാണ് കുറഞ്ഞ കാത്തിരിപ്പ് സമയം?',
      'എന്റെ ടോക്കൺ നമ്പറും ക്യൂ സ്ഥാനവും എന്താണ്?',
      'ഞാൻ എപ്പോൾ പുറപ്പെടണം?',
      'എന്റെ പേയ്‌മെന്റ് നില എന്താണ്?'
    ]
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isListening]);

  // Welcome message when modal opens
  useEffect(() => {
    if (isOpen) {
      const welcomeMap: Record<LanguageCode, string> = {
        Tamil: 'வணக்கம்! நான் கிசான் கோ AI உதவியாளர். கொள்முதல் மையம், டோக்கன், வரிசை நிலை அல்லது கட்டண விவரங்கள் பற்றி கேட்கலாம்.',
        English: 'Hello! I am your Kisan Go AI Assistant. Ask me about center recommendations, tokens, live queue, departure times, or payments.',
        Hindi: 'नमस्ते! मैं किसान गो AI सहायक हूँ। खरीद केंद्र, टोकन, लाइव कतार या भुगतान के बारे में मुझसे पूछें।',
        Telugu: 'నమస్కారం! నేను మీ కిసాన్ గో AI సహాయకుడిని. ఏదైనా అడగండి.',
        Malayalam: 'നമസ്കാരം! ഞാൻ കിസാൻ ഗോ AI അസിസ്റ്റന്റാണ്. എന്നോട് ചോദിക്കൂ.'
      };

      const welcomeText = welcomeMap[language] || welcomeMap.English;
      setMessages([
        {
          id: 'welcome-1',
          sender: 'ai',
          text: welcomeText
        }
      ]);
      setSpeechStatus('ready');

      // Do not auto-speak on initial open to comply with strict browser autoplay policies
      // Audio plays cleanly whenever user taps mic or suggested prompt
    } else {
      stopSpeaking();
      if (recognizerRef.current) {
        try {
          recognizerRef.current.abort();
        } catch (e) {}
      }
      setIsListening(false);
      setIsSpeaking(false);
      setSpeechStatus('idle');
    }
  }, [isOpen, language]);

  const handleSendQuery = async (query: string) => {
    if (!query.trim()) return;

    const userMsgId = `u-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: query.trim() }]);
    setQueryText('');
    setLoading(true);
    setSpeechStatus('thinking');
    stopSpeaking();
    setIsSpeaking(false);

    try {
      const res = await api.queryVoiceAI(query.trim(), language, user?.id);
      if (res.success && res.data) {
        const aiReply = res.data.displayText || res.data.spokenText;
        const actionRoute = res.data.actionRoute;
        const engTrans = res.data.englishTranslation;

        setMessages((prev) => [
          ...prev,
          { id: aiMsgId, sender: 'ai', text: aiReply, actionRoute, english: engTrans }
        ]);

        if (!voiceMuted) {
          setIsSpeaking(true);
          setSpeechStatus('speaking');
          speakText(aiReply, language, () => {
            setIsSpeaking(false);
            setSpeechStatus('ready');
          });
        } else {
          setSpeechStatus('ready');
        }
      } else {
        const fallbackText =
          language === 'Tamil'
            ? 'மன்னிக்கவும், தகவல் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
            : 'Sorry, could not process your query right now. Please try again.';
        setMessages((prev) => [...prev, { id: aiMsgId, sender: 'ai', text: fallbackText }]);
        setSpeechStatus('ready');
      }
    } catch (e: any) {
      console.error('Voice AI error:', e);
      const errMsg =
        language === 'Tamil'
          ? 'சேவையகத்தை தொடர்பு கொள்ள முடியவில்லை. இணைய இணைப்பை சரிபார்க்கவும்.'
          : 'Could not connect to AI service. Please check your connection.';
      setMessages((prev) => [...prev, { id: aiMsgId, sender: 'ai', text: errMsg }]);
      setSpeechStatus('ready');
    } finally {
      setLoading(false);
    }
  };

  const handleStartListening = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Speech recognition is not supported in this browser. Please type your query in the input box below.');
      return;
    }

    if (isListening) {
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setSpeechStatus('ready');
      return;
    }

    stopSpeaking();
    setIsSpeaking(false);
    setIsListening(true);
    setSpeechStatus('listening');

    const recognizer = createSpeechRecognizer(
      language,
      (transcript) => {
        setIsListening(false);
        setSpeechStatus('thinking');
        handleSendQuery(transcript);
      },
      (error) => {
        console.warn('Speech recognizer error:', error);
        setIsListening(false);
        if (error === 'no-speech') {
          setSpeechStatus('no-speech');
        } else if (error === 'not-allowed') {
          setSpeechStatus('permission-denied');
        } else {
          setSpeechStatus('ready');
        }
      },
      () => {
        setIsListening(false);
      }
    );

    recognizerRef.current = recognizer;

    if (recognizer) {
      try {
        recognizer.start();
      } catch (err) {
        console.warn('Recognizer start error:', err);
        setIsListening(false);
        setSpeechStatus('ready');
      }
    }
  };

  const handleReplay = (text: string) => {
    stopSpeaking();
    setIsSpeaking(true);
    setSpeechStatus('speaking');
    speakText(text, language, () => {
      setIsSpeaking(false);
      setSpeechStatus('ready');
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white p-0.5 border border-emerald-200 shadow-sm flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Kisan Go Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="text-base font-bold text-km-textPrimary">{t('voice_assistant_btn')}</h3>
            <span className="text-[10px] text-km-textSecondary">{t('voice_assistant_subtitle')}</span>
          </div>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Language Bar & Audio Toggle */}
        <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] uppercase font-bold text-gray-400 pl-1">Language:</span>
            {languagesList.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code as LanguageCode);
                  stopSpeaking();
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  language === lang.code
                    ? 'bg-km-primary text-white shadow-sm'
                    : 'bg-white text-km-textPrimary border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {lang.native}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setVoiceMuted(!voiceMuted);
            }}
            className={`p-2 rounded-xl border transition-colors ${
              voiceMuted ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-gray-200 text-km-primary'
            }`}
            title={voiceMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Animated Microphone & Soundwave Visualizer */}
        <div className="bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950 rounded-3xl p-6 text-white text-center flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(129,199,132,0.15),transparent)]" />

          {/* Sound Waves Animation */}
          <div className="flex items-center justify-center gap-1.5 h-12 mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((bar) => (
              <div
                key={bar}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  isListening
                    ? 'bg-amber-400 animate-pulse'
                    : isSpeaking
                    ? 'bg-emerald-400 animate-bounce'
                    : 'bg-emerald-700/40 h-2'
                }`}
                style={{
                  height: isListening
                    ? `${Math.max(10, Math.sin(bar * 0.8) * 36 + 10)}px`
                    : isSpeaking
                    ? `${Math.max(8, ((bar % 3) + 1) * 14)}px`
                    : '8px',
                  animationDelay: `${bar * 0.1}s`
                }}
              />
            ))}
          </div>

          {/* Status Text Indicator */}
          <div className="mb-4">
            {isListening ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30 animate-pulse">
                <Mic className="w-3.5 h-3.5" />
                <span>Listening... Speak your question now</span>
              </div>
            ) : isSpeaking ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Speaking answer...</span>
              </div>
            ) : loading ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-400/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing live database...</span>
              </div>
            ) : speechStatus === 'permission-denied' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-400/30">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Microphone access blocked. You can type below.</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold">
                <span>Tap the microphone button or ask a question</span>
              </div>
            )}
          </div>

          {/* Main Action Microphone Button */}
          <button
            onClick={handleStartListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 active:scale-95 border-4 ${
              isListening
                ? 'bg-amber-500 border-amber-300 text-white animate-pulse shadow-amber-500/50'
                : 'bg-km-primary hover:bg-km-primaryDark border-emerald-300 text-white shadow-emerald-900/50'
            }`}
          >
            {isListening ? <Mic className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
          </button>
        </div>

        {/* Conversation Dialogue History */}
        <div className="max-h-60 overflow-y-auto space-y-3 p-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-km-primary text-white font-semibold rounded-tr-xs shadow-sm'
                    : 'bg-white border border-gray-200 text-km-textPrimary rounded-tl-xs shadow-km-sm space-y-2'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p>{msg.text}</p>
                  {msg.sender === 'ai' && (
                    <button
                      onClick={() => handleReplay(msg.text)}
                      className="p-1 text-gray-400 hover:text-km-primary transition-colors shrink-0"
                      title="Replay Voice"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Direct Action Deep Link */}
                {msg.actionRoute && onNavigate && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate(msg.actionRoute!);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-km-primary font-bold text-[11px] transition-colors border border-emerald-200"
                  >
                    <span>
                      {msg.actionRoute === '/find-center'
                        ? 'View Center Details'
                        : msg.actionRoute === '/my-slot'
                        ? 'View Token & Queue'
                        : 'View Status'}
                    </span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-km-textSecondary p-2 bg-gray-50 rounded-2xl max-w-xs border border-gray-200">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
              <span>Thinking in {language}...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Suggested Questions</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(suggestedQuestions[language] || suggestedQuestions.English).map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(q)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-km-primary font-bold text-xs transition-colors border border-emerald-200/80 shrink-0"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Fallback Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery(queryText);
          }}
          className="flex items-center gap-2 pt-1 border-t border-gray-100"
        >
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={`Type or ask anything in ${language}...`}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-km-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={!queryText.trim() || loading}
            className="p-2.5 bg-km-primary hover:bg-km-primaryDark text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Modal>
  );
};
