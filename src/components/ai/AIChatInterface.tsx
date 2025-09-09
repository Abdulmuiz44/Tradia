// src/components/ai/AIChatInterface.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { TradeContext } from "@/context/TradeContext";
import { useContext } from "react";
import {
  analyzeTradingPerformance,
  generatePersonalizedGreeting,
  generateTradingSnapshot,
  generateAdvancedPerformanceAnalysis,
  generateStrategyRecommendations,
  generateRiskManagementAnalysis,
  generateMarketTimingRecommendations,
  generateEmotionalSupportWithInsights,
  generateWinningCelebrationWithGrowth,
  generatePersonalizedMotivation,
  generateAdvancedScreenshotAnalysis,
  generateDefaultIntelligentResponse
} from "@/lib/ai/advancedAnalysis";
import {
  Send,
  Bot,
  User,
  Upload,
  Image,
  Loader2,
  MessageSquare,
  X,
  Paperclip,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Settings,
  Heart,
  Target,
  TrendingUp,
  Award,
  Zap,
  Crown,
  Lock
} from "lucide-react";

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: File[];
  isTyping?: boolean;
  isVoice?: boolean;
}

interface VoiceSettings {
  voiceEnabled: boolean;
  autoSpeak: boolean;
  voiceSpeed: number;
  voicePitch: number;
  selectedVoice: SpeechSynthesisVoice | null;
}

interface AIChatInterfaceProps {
  className?: string;
}

export default function AIChatInterface({ className = "" }: AIChatInterfaceProps) {
  const { trades } = useContext(TradeContext);
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'plus' | 'elite'>('free');

  // Get user subscription tier
  useEffect(() => {
    // In a real app, this would come from your auth/user context
    // For now, we'll simulate based on localStorage or a prop
    const tier = localStorage.getItem('user_tier') || 'free';
    setUserTier(tier as any);
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: userTier === 'free'
        ? "🎯 Hey there, fellow trader! I'm Tradia AI, your personal trading coach. I can help analyze your recent trades and give basic advice. Upgrade to PRO for advanced analytics, image analysis, and personalized strategies!"
        : "🎯 Hey there, fellow trader! I'm Tradia AI, your personal trading coach and AI mentor. I'm here to help you crush your trading goals, analyze your performance, and become the best version of yourself in the markets. Whether you need strategy advice, emotional support, or just someone to celebrate your wins with - I'm your guy! What's on your trading mind today?",
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voiceEnabled: true,
    autoSpeak: true,
    voiceSpeed: 1,
    voicePitch: 1,
    selectedVoice: null
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;

      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsRecording(false);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Voice recording functions
  const startVoiceRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  // Clean text for better speech (strip markdown/artefacts)
  const cleanForSpeech = (raw: string): string => {
    try {
      let t = raw;
      t = t.replace(/\*\*|\*|__|_/g, '');
      t = t.replace(/`{1,3}[^`]*`{1,3}/g, '');
      t = t.replace(/<[^>]+>/g, '');
      t = t.replace(/[\u{1F300}-\u{1FAD6}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '');
      t = t.replace(/^[^a-zA-Z0-9]+/g, '').replace(/[^a-zA-Z0-9\.!?,;:'"\-\s]/g, '');
      t = t.replace(/\s{2,}/g, ' ').trim();
      return t;
    } catch { return raw; }
  };

  // Text-to-speech function
  const speakText = (text: string) => {
    if (!voiceSettings.voiceEnabled || !synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utterance.rate = voiceSettings.voiceSpeed;
    utterance.pitch = voiceSettings.voicePitch;
    utterance.volume = 1;

    if (voiceSettings.selectedVoice) {
      utterance.voice = voiceSettings.selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && uploadedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      isVoice: isRecording,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.slice(-5).map(msg => ({
        role: msg.type,
        content: msg.content
      }));

      // Generate intelligent coaching response with trade analysis
      const coachingResponse = generateIntelligentCoachingResponse(inputMessage, trades, uploadedFiles, userTier);

      // Add PRO analytics summary for PRO+ users
      let finalResponse = coachingResponse;
      if (userTier !== 'free' && (inputMessage.toLowerCase().includes('analytics') || inputMessage.toLowerCase().includes('performance'))) {
        const analyticsSummary = generateProAnalyticsSummary(trades);
        finalResponse += '\n\n' + analyticsSummary;
      }

      // Ensure plain text without markdown/asterisks or emojis
      const sanitize = (raw: string) => {
        try {
          let t = raw;
          t = t.replace(/\*\*|\*|__|_/g, ''); // remove markdown bold/italic
          t = t.replace(/`{1,3}[^`]*`{1,3}/g, ''); // remove inline code
          t = t.replace(/[•▪︎·\u2022\u25C6\u25CF\u25A0\u25CB\u25E6]/g, '-'); // replace bullets with dash
          t = t.replace(/[\u{1F300}-\u{1FAD6}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, ''); // remove emojis/symbols
          t = t.replace(/\s{2,}/g, ' ').trim();
          return t;
        } catch { return raw; }
      };
      finalResponse = sanitize(finalResponse);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: finalResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak response if enabled
      if (voiceSettings.autoSpeak && voiceSettings.voiceEnabled) {
        setTimeout(() => speakText(finalResponse), 500);
      }

    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "🤝 Hey, I'm here for you! Sometimes technology glitches, but that doesn't change the fact that you're an amazing trader working hard to improve. Let's try that again - what's on your mind?",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setUploadedFiles([]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`bg-[#161B22] border border-[#2a2f3a] rounded-lg flex flex-col h-full min-h-[500px] max-h-[calc(100vh-200px)] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#2a2f3a] bg-[#0D1117]">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <Bot className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161B22] animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white">🎯 Tradia AI</h3>
            <p className="text-xs md:text-sm text-gray-400">Your Personal Trading Coach • Online 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-400 rounded-full text-xs border border-green-700/50">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            AI Active
          </div>

          {/* Subscription Tier Indicator */}
          <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
            userTier === 'free' ? 'bg-gray-900/30 text-gray-400 border-gray-700/50' :
            userTier === 'pro' ? 'bg-blue-900/30 text-blue-400 border-blue-700/50' :
            userTier === 'plus' ? 'bg-purple-900/30 text-purple-400 border-purple-700/50' :
            'bg-yellow-900/30 text-yellow-400 border-yellow-700/50'
          }`}>
            <Crown className={`w-3 h-3 ${
              userTier === 'free' ? 'text-gray-400' :
              userTier === 'pro' ? 'text-blue-400' :
              userTier === 'plus' ? 'text-purple-400' :
              'text-yellow-400'
            }`} />
            {userTier.toUpperCase()}
          </div>

          <button
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="p-1.5 md:p-2 hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
            title="Voice Settings"
          >
            <Settings className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
          {isSpeaking && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-400 rounded-full text-xs border border-blue-700/50">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span className="hidden sm:inline">Speaking</span>
            </div>
          )}
        </div>
      </div>

      {/* Voice Settings Panel */}
      {showVoiceSettings && (
        <div className="bg-[#1a1f2e] border-b border-[#2a2f3a] p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">🎤 Voice Settings</h4>
            <button
              onClick={() => setShowVoiceSettings(false)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="flex items-center justify-between p-2 bg-[#0D1117] rounded-lg">
              <span className="text-sm text-gray-300">Voice Responses</span>
              <button
                onClick={() => setVoiceSettings(prev => ({ ...prev, voiceEnabled: !prev.voiceEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation ${
                  voiceSettings.voiceEnabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    voiceSettings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between p-2 bg-[#0D1117] rounded-lg">
              <span className="text-sm text-gray-300">Auto Speak</span>
              <button
                onClick={() => setVoiceSettings(prev => ({ ...prev, autoSpeak: !prev.autoSpeak }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation ${
                  voiceSettings.autoSpeak ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    voiceSettings.autoSpeak ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2 p-2 bg-[#0D1117] rounded-lg sm:col-span-2 lg:col-span-1">
              <span className="text-sm text-gray-300">Speed</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voiceSettings.voiceSpeed}
                onChange={(e) => setVoiceSettings(prev => ({ ...prev, voiceSpeed: parseFloat(e.target.value) }))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs text-gray-400 min-w-[2rem]">{voiceSettings.voiceSpeed}x</span>
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={() => speakText("Hello! I'm Tradia AI, your personal trading coach. How can I help you become a better trader today?")}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors touch-manipulation"
            >
              <Volume2 className="w-4 h-4" />
              Test Voice
            </button>
            <button
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors touch-manipulation"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 md:p-4 shadow-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white border border-blue-500/30'
                  : 'bg-[#1a1f2e] text-gray-100 border border-[#2a2f3a]'
              }`}
            >
              {message.type === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-blue-400">🎯 Tradia AI</span>
                  {message.isVoice && <Volume2 className="w-3 h-3 text-green-400" />}
                </div>
              )}

              <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{message.content}</div>

              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-[#0D1117]/50 rounded border border-[#2a2f3a]">
                      <Image className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={`text-xs mt-2 opacity-70 ${
                message.type === 'user' ? 'text-blue-200' : 'text-gray-400'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#1a1f2e] rounded-lg p-3 md:p-4 max-w-[85%] sm:max-w-[80%] border border-[#2a2f3a]">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">🎯 Tradia AI</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-300 ml-2">Analyzing your request...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Preview */}
      {uploadedFiles.length > 0 && (
        <div className="px-3 md:px-4 pb-2 border-t border-[#2a2f3a]">
          <div className="flex flex-wrap gap-2 pt-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-[#1a1f2e] border border-[#2a2f3a] rounded-lg p-2">
                <Image className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300 truncate max-w-[120px] sm:max-w-none">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700 transition-colors touch-manipulation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 md:p-4 border-t border-[#2a2f3a] bg-gradient-to-r from-[#0D1117] to-[#161B22]">
        <div className="flex items-end gap-2 md:gap-3">
          <div className="flex-1 relative group">
            {/* Enhanced Input Field */}
            <div className="relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="💬 Ask me anything about your trading... (e.g., 'What's my strongest pattern?', 'Give me a trading plan', 'Analyze my risk')"
                className="w-full resize-none rounded-xl border-2 border-[#2a2f3a] bg-gradient-to-r from-[#1a1f2e] to-[#161B22] px-4 py-3 pr-12 md:pr-16 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-blue-400/30 transition-all duration-300 shadow-lg backdrop-blur-sm"
                rows={1}
                style={{
                  minHeight: '52px',
                  maxHeight: window.innerWidth < 768 ? '120px' : '140px'
                }}
              />

              {/* Animated border effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

              {/* Typing indicator */}
              {inputMessage && (
                <div className="absolute left-4 bottom-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-400 font-medium">Typing...</span>
                </div>
              )}
            </div>

            <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 md:gap-2">
              <button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`p-2.5 md:p-3 rounded-full transition-all touch-manipulation shadow-lg ${
                  isRecording
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-600/25 scale-110 animate-pulse'
                    : 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-300 hover:from-red-600 hover:to-red-700 hover:text-white active:scale-95'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice recording'}
              >
                {isRecording ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
              <button
                onClick={() => {
                  if (userTier === 'free') {
                    setMessages(prev => [...prev, {
                      id: Date.now().toString(),
                      type: 'assistant',
                      content: "🔒 **PRO Feature**: Image analysis is available for PRO subscribers and above! Upgrade to unlock advanced chart analysis, screenshot reviews, and visual trade insights. 🎯",
                      timestamp: new Date(),
                    }]);
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className={`p-2.5 md:p-3 rounded-full transition-all touch-manipulation active:scale-95 shadow-lg ${
                  userTier === 'free'
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-300 hover:from-blue-600 hover:to-blue-700 hover:text-white'
                }`}
                title={userTier === 'free' ? 'PRO Feature: Upgrade to analyze images' : 'Upload trade screenshot or analysis'}
                disabled={userTier === 'free'}
              >
                {userTier === 'free' ? (
                  <Lock className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() && uploadedFiles.length === 0}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl px-5 md:px-7 py-3 md:py-4 transition-all flex items-center gap-2 touch-manipulation active:scale-95 shadow-lg hover:shadow-xl disabled:shadow-none min-w-[70px] md:min-w-[90px] justify-center font-semibold"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        {/* Enhanced Suggestions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-900/30 to-blue-800/30 rounded-full border border-blue-700/50">
              <Mic className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-300 font-medium">Voice: "How's my trading?"</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-900/30 to-green-800/30 rounded-full border border-green-700/50">
              <Target className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-300 font-medium">Strategy advice</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-900/30 to-purple-800/30 rounded-full border border-purple-700/50">
              <TrendingUp className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-300 font-medium">{trades.length} trades analyzed</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-full border border-gray-600/50">
            <Bot className="w-3 h-3 text-blue-400 animate-pulse" />
            <span className="text-xs text-gray-300 font-medium">🎯 Tradia AI Coach Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Intelligent Coaching Response Generator - Advanced AI Analysis with Trading Recommendations
function generateIntelligentCoachingResponse(userMessage: string, trades: any[], uploadedFiles: File[], userTier: string = 'free'): string {
  const lowerMessage = userMessage.toLowerCase();

  // Analyze user's trading performance for personalized insights
  const tradeAnalysis = analyzeTradingPerformance(trades);

  // Personalized greeting with performance insights
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    const personalizedGreeting = generatePersonalizedGreeting(tradeAnalysis);
    return `${personalizedGreeting}\n\n**Your Trading Snapshot:**\n${generateTradingSnapshot(tradeAnalysis)}\n\n**What would you like to focus on today?**\n• 📊 **Performance Review** - "How's my trading been?"\n• 🎯 **Strategy Optimization** - "What's my strongest pattern?"\n• 🛡️ **Risk Management** - "How can I improve my risk control?"\n• 📈 **Market Insights** - "What's the best setup right now?"\n• 💡 **Trading Recommendations** - "What should I trade next?"\n\nI'm here to help you level up your trading game! 🚀`;
  }

  // Advanced performance analysis with actionable recommendations
  if (lowerMessage.includes('performance') || lowerMessage.includes('how am i doing') || lowerMessage.includes('win rate')) {
    return generateAdvancedPerformanceAnalysis(tradeAnalysis);
  }

  // Strategy recommendations based on user's actual performance
  if (lowerMessage.includes('strategy') || lowerMessage.includes('pattern') || lowerMessage.includes('what should i')) {
    return generateStrategyRecommendations(tradeAnalysis);
  }

  // Risk management analysis and recommendations
  if (lowerMessage.includes('risk') || lowerMessage.includes('stop loss') || lowerMessage.includes('position size')) {
    return generateRiskManagementAnalysis(tradeAnalysis);
  }

  // Market timing and entry recommendations
  if (lowerMessage.includes('when') || lowerMessage.includes('timing') || lowerMessage.includes('entry')) {
    return generateMarketTimingRecommendations(tradeAnalysis);
  }

  // Emotional support with performance-based motivation
  if (lowerMessage.includes('lost') || lowerMessage.includes('bad') || lowerMessage.includes('losing') || lowerMessage.includes('stuck')) {
    return generateEmotionalSupportWithInsights(tradeAnalysis);
  }

  // Winning celebration with growth recommendations
  if (lowerMessage.includes('won') || lowerMessage.includes('profit') || lowerMessage.includes('winning') || lowerMessage.includes('good')) {
    return generateWinningCelebrationWithGrowth(tradeAnalysis);
  }

  // Motivation and mindset with personalized coaching
  if (lowerMessage.includes('motivation') || lowerMessage.includes('mindset') || lowerMessage.includes('confidence')) {
    return generatePersonalizedMotivation(tradeAnalysis);
  }

  // Screenshot analysis with advanced recommendations
  if (uploadedFiles.length > 0) {
    return generateAdvancedScreenshotAnalysis(uploadedFiles, tradeAnalysis);
  }

  // Default intelligent response with personalized recommendations
  return generateDefaultIntelligentResponse(tradeAnalysis);
}

// Helper functions for AI responses
function getRandomStrategy(): string {
  const strategies = ['momentum trading', 'breakout trading', 'mean reversion', 'scalping', 'swing trading'];
  return strategies[Math.floor(Math.random() * strategies.length)];
}

function getRandomTimeframe(): string {
  const timeframes = ['1-minute', '5-minute', '15-minute', '1-hour', '4-hour', 'daily'];
  return timeframes[Math.floor(Math.random() * timeframes.length)];
}

function getRandomMarketCondition(): string {
  const conditions = ['high volatility', 'low volatility', 'trending', 'ranging', 'news-driven'];
  return conditions[Math.floor(Math.random() * conditions.length)];
}

// PRO Analytics Summary Generator
function generateProAnalyticsSummary(trades: any[]): string {
  if (!trades || trades.length === 0) {
    return "📊 **PRO Analytics**: No trades to analyze yet. Start trading to unlock deep insights!";
  }

  // Calculate advanced metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalPnL = trades.reduce((sum, t) => sum + (parseFloat(String(t.pnl || 0))), 0);
  const avgTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;

  // Risk metrics
  const winningPnL = trades
    .filter(t => (t.outcome || '').toLowerCase() === 'win')
    .reduce((sum, t) => sum + (parseFloat(String(t.pnl || 0))), 0);

  const losingPnL = trades
    .filter(t => (t.outcome || '').toLowerCase() === 'loss')
    .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.pnl || 0))), 0);

  const profitFactor = losingPnL > 0 ? winningPnL / losingPnL : winningPnL > 0 ? Infinity : 0;

  // Sharpe-like ratio
  const returns = trades.map(t => parseFloat(String(t.pnl || 0)));
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 0;
  const volatility = Math.sqrt(variance);
  const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

  // Strategy performance
  const strategies = [...new Set(trades.map(t => t.strategy || 'Unknown'))];
  const bestStrategy = strategies.reduce((best, strategy) => {
    const strategyTrades = trades.filter(t => t.strategy === strategy);
    const strategyPnL = strategyTrades.reduce((sum, t) => sum + (parseFloat(String(t.pnl || 0))), 0);
    return strategyPnL > (best.pnl || 0) ? { name: strategy, pnl: strategyPnL } : best;
  }, { name: 'None', pnl: 0 });

  // Time-based analysis
  const recentTrades = trades.slice(-10);
  const recentWinRate = recentTrades.length > 0 ?
    (recentTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length / recentTrades.length) * 100 : 0;

  return `
🎯 **PRO Analytics Deep Dive**:

**Performance Metrics:**
• Win Rate: ${winRate.toFixed(1)}%
• Total P&L: $${totalPnL.toFixed(2)}
• Average Trade: $${avgTrade.toFixed(2)}
• Profit Factor: ${profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}

**Risk Analysis:**
• Sharpe Ratio: ${sharpeRatio.toFixed(2)}
• Volatility: $${volatility.toFixed(2)}
• Best Strategy: ${bestStrategy.name} ($${bestStrategy.pnl.toFixed(2)})

**Recent Performance:**
• Last 10 Trades Win Rate: ${recentWinRate.toFixed(1)}%
• Momentum: ${recentWinRate > winRate ? '🔥 Improving' : recentWinRate < winRate ? '⚠️ Declining' : '➡️ Stable'}

**AI Insights:**
${winRate > 60 ? '• Excellent consistency! Keep up the great work.' : winRate > 50 ? '• Good performance, focus on consistency.' : '• Room for improvement in trade selection.'}
${sharpeRatio > 1 ? '• Strong risk-adjusted returns.' : '• Consider improving risk management.'}
${profitFactor > 1.5 ? '• Excellent profit capture.' : '• Focus on cutting losses and letting profits run.'}

**Recommendations:**
${winRate < 50 ? '• Review your entry criteria and market timing.' : ''}
${volatility > Math.abs(avgReturn) * 2 ? '• High volatility detected - consider position sizing.' : ''}
${bestStrategy.name !== 'Unknown' ? `• Your strongest strategy is "${bestStrategy.name}" - focus on this.` : '• Consider developing specific trading strategies.'}
`;
}
