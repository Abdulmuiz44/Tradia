import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { trackEvent } from '@/lib/analytics';

interface VoiceOutputOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

export const useVoiceOutput = (options: VoiceOutputOptions = {}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { info, error: showError } = useToast();

  useEffect(() => {
    // Check if speech synthesis is supported
    if ('speechSynthesis' in window) {
      setIsSupported(true);

      // Load available voices
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);

        // Set default voice
        if (!currentVoice && availableVoices.length > 0) {
          const defaultVoice = availableVoices.find(voice =>
            voice.lang.startsWith(options.language || 'en') && voice.default
          ) || availableVoices.find(voice =>
            voice.lang.startsWith(options.language || 'en')
          ) || availableVoices[0];

          setCurrentVoice(defaultVoice);
        }
      };

      loadVoices();

      // Voices might load asynchronously
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    } else {
      setIsSupported(false);
    }

    return () => {
      if (utteranceRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, [options.language, currentVoice]);

  const speak = useCallback(async (text: string): Promise<boolean> => {
    if (!isSupported) {
      showError('Not Supported', 'Text-to-speech is not supported in this browser.');
      return false;
    }

    if (!text.trim()) {
      showError('No Text', 'Please provide text to speak.');
      return false;
    }

    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Apply options
      if (currentVoice) {
        utterance.voice = currentVoice;
      }
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      utterance.lang = options.language || 'en-US';

      utterance.onstart = () => {
        setIsSpeaking(true);
        trackEvent('voice_output_started' as any, {
          textLength: text.length,
          voice: currentVoice?.name,
          language: utterance.lang,
        });
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        trackEvent('voice_output_completed' as any);
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error('Speech synthesis error:', event);
        showError('Speech Error', 'Failed to synthesize speech.');
        trackEvent('voice_output_error' as any, { error: event.error });
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);

      info('Speaking...', 'AI response is being read aloud.');
      return true;
    } catch (err) {
      console.error('Speech synthesis failed:', err);
      showError('Speech Failed', 'Failed to start text-to-speech.');
      return false;
    }
  }, [isSupported, currentVoice, options, info, showError]);

  const stop = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      trackEvent('voice_output_stopped' as any);
    }
  }, []);

  const pause = useCallback(() => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      trackEvent('voice_output_paused' as any);
    }
  }, []);

  const resume = useCallback(() => {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      trackEvent('voice_output_resumed' as any);
    }
  }, []);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setCurrentVoice(voice);
    trackEvent('voice_output_voice_changed' as any, { voice: voice.name });
  }, []);

  const getVoicesByLanguage = useCallback((language: string) => {
    return voices.filter(voice => voice.lang.startsWith(language));
  }, [voices]);

  return {
    isSupported,
    isSpeaking,
    voices,
    currentVoice,
    speak,
    stop,
    pause,
    resume,
    setVoice,
    getVoicesByLanguage,
  };
};
