import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { trackEvent } from '@/lib/analytics';

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface VoiceInputOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export const useVoiceInput = (options: VoiceInputOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { info, error: showError } = useToast();

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);

      const recognition = new SpeechRecognition();
      recognition.lang = options.language || 'en-US';
      recognition.continuous = options.continuous ?? false;
      recognition.interimResults = options.interimResults ?? true;
      recognition.maxAlternatives = options.maxAlternatives || 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        info('Listening...', 'Speak now to send a voice message.');
        trackEvent('voice_input_started' as any);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript(interimTranscript);

        if (finalTranscript) {
          trackEvent('voice_input_transcript' as any, {
            length: finalTranscript.length,
            language: recognition.lang,
          });
        }
      };

      recognition.onerror = (event) => {
        setError(event.error);
        setIsListening(false);

        let errorMessage = 'Voice input failed.';
        switch (event.error) {
          case 'network':
            errorMessage = 'Network error. Check your internet connection.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Try speaking louder.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not found or not accessible.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed.';
            break;
        }

        showError('Voice Input Error', errorMessage);
        trackEvent('voice_input_error' as any, { error: event.error });
      };

      recognition.onend = () => {
        setIsListening(false);
        trackEvent('voice_input_ended' as any);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      setError('Speech recognition not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [options.language, options.continuous, options.interimResults, options.maxAlternatives, info, showError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      showError('Not Supported', 'Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      showError('Voice Error', 'Failed to start voice recognition.');
    }
  }, [isSupported, isListening, showError, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const getFullTranscript = useCallback(() => {
    return transcript + interimTranscript;
  }, [transcript, interimTranscript]);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: getFullTranscript(),
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
};
