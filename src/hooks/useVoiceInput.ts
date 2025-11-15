import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { trackEvent } from '@/lib/analytics';

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

  const recognitionRef = useRef<any | null>(null);
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
      // maxAlternatives is not universally supported, so we set it conditionally
      if ('maxAlternatives' in recognition) {
        (recognition as any).maxAlternatives = options.maxAlternatives || 1;
      }

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        info('Listening...', 'Speak now to send a voice message.');
        trackEvent('voice_input_started');
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
          trackEvent('voice_input_transcript', {
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
        trackEvent('voice_input_error', { error: event.error });
      };

      recognition.onend = () => {
        setIsListening(false);
        trackEvent('voice_input_ended');
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
  }, [isSupported, isListening, showError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

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
