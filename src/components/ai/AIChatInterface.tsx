// src/components/ai/AIChatInterface.tsx
"use client";

import React, { useState, useRef, useEffect, useContext, useCallback } from "react";
import { useTrade } from "@/context/TradeContext";
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
  Image as ImageIcon,
  X,
  Paperclip,
  Mic,
  MicOff,
  Volume2,
  Square,
  Settings,
  Crown,
  Lock,
  Sparkles
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";
import { cn } from "@/lib/utils";

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
  maxAlternatives: number;
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
  mode?: 'coach' | 'grok';
  variant?: 'default' | 'upgrade' | 'system';
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

function normalizeTier(p: string | undefined): 'free' | 'pro' | 'plus' | 'elite' {
  if (!p) return 'free';
  const v = p.toLowerCase();
  if (v === 'free' || v === 'pro' || v === 'plus' || v === 'elite') return v as any;
  return 'free';
}

export default function AIChatInterface({ className = "" }: AIChatInterfaceProps) {
  const { trades } = useTrade();
  const { plan } = useUser();
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'plus' | 'elite'>('free');

  // Sync tier with actual user plan
  useEffect(() => {
    setUserTier(normalizeTier(plan));
  }, [plan]);

  const normalizedPlan = plan?.toLowerCase() ?? '';
  const isStarterPlan = normalizedPlan === 'starter';
  const isFreeLikeTier = userTier === 'free' || isStarterPlan;
  const tierBadgeLabel = isStarterPlan ? 'STARTER' : userTier.toUpperCase();

  const effectivePlan = (userTier as PlanType) in PLAN_LIMITS ? (userTier as PlanType) : 'free';
  const limits = PLAN_LIMITS[effectivePlan];
  const grokUnlocked = userTier === 'plus' || userTier === 'elite';
  const [assistantMode, setAssistantMode] = useState<'coach' | 'grok'>(() => (grokUnlocked ? 'grok' : 'coach'));

  const getOnboardingMessage = useCallback((tier: 'free' | 'pro' | 'plus' | 'elite', mode: 'coach' | 'grok', tradeCount: number) => {
    const hasTrades = tradeCount > 0;

    if (mode === 'grok' && (tier === 'plus' || tier === 'elite')) {
      return [
        '### Grok mode is live',
        hasTrades
          ? `I just ran anomaly checks across ${tradeCount} recent trades.`
          : 'Drop a question or upload a chart and Grok will break it down instantly.',
        'Ask for a bias sweep, forward view, or say "build a playbook" for action steps.'
      ].join("\n\n");
    }

    if (tier === 'plus' || tier === 'elite') {
      return [
        'Welcome back to Tradia Coach.',
        hasTrades
          ? `I already scanned ${tradeCount} recent trades so we can set the focus for today.`
          : 'Share what you are tackling and we will map the next best move.',
        'Flip into Grok mode whenever you want deep explainability or predictive signals.'
      ].join("\n\n");
    }

    if (tier === 'pro') {
      return [
        'Hey! I am Tradia Coach.',
        hasTrades
          ? `Your last ${tradeCount} trades are queued for a fast performance pulse.`
          : 'Ask for a scorecard, risk tune-up, or mindset reset to get a tailored plan.',
        'Upgrade to Plus when you are ready for Grok anomaly detection and screenshot breakdowns.'
      ].join("\n\n");
    }

    return [
      'Welcome to Tradia Coach.',
      hasTrades
        ? `I pulled highlights from ${tradeCount} recent trades so you can build momentum faster.`
        : 'Ask anything about performance, risk, or setups and I will respond with a game plan.',
      'Upgrading unlocks Grok mode for explainable deep dives and predictive prompts.'
    ].join("\n\n");
  }, []);

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'ai-welcome',
      type: 'assistant',
      content: getOnboardingMessage('free', grokUnlocked ? 'grok' : 'coach', trades.length),
      timestamp: new Date(),
      mode: grokUnlocked ? 'grok' : 'coach',
      variant: 'system',
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


  useEffect(() => {
    setMessages((prev) => {
      if (!prev.length) return prev;
      const [first, ...rest] = prev;
      if (first.id === 'ai-welcome' && first.type === 'assistant') {
        return [
          {
            ...first,
            content: getOnboardingMessage(userTier, assistantMode, trades.length),
            mode: assistantMode,
          },
          ...rest,
        ];
      }
      return prev;
    });
    if (!grokUnlocked) {
      setAssistantMode('coach');
    }
  }, [userTier, grokUnlocked, assistantMode, trades.length, getOnboardingMessage]);

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

  // Initialize speech recognition and synthesis (client-only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const r = new SR();
        r.continuous = false;
        r.interimResults = false;
        r.lang = 'en-US';
        r.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript ?? '';
          if (transcript) setInputMessage(transcript);
          setIsRecording(false);
        };
        r.onerror = () => setIsRecording(false);
        r.onend = () => setIsRecording(false);
        recognitionRef.current = r as any;
      }
    }
    return () => {
      try { recognitionRef.current?.abort(); } catch {}
      try { synthRef.current?.cancel(); } catch {}
    };
  }, []);

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

  const pushUpgradeMessage = useCallback((content: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-upgrade`,
        type: 'assistant',
        content,
        timestamp: new Date(),
      },
    ]);
  }, [setMessages]);

  const cleanForSpeech = (raw: string): string => {
    try {
      let t = raw;
      t = t.replace(/\*\*|\*|__|_/g, '');
      t = t.replace(/`{1,3}[^`]*`{1,3}/g, '');
      t = t.replace(/<[^>]+>/g, '');
      t = t.replace(/\s{2,}/g, ' ').trim();
      return t;
    } catch { return raw; }
  };

  const speakText = (text: string) => {
    if (!voiceSettings.voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utterance.rate = voiceSettings.voiceSpeed;
    utterance.pitch = voiceSettings.voicePitch;
    utterance.volume = 1;
    if (voiceSettings.selectedVoice) utterance.voice = voiceSettings.selectedVoice;
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

    if (assistantMode === 'grok' && !grokUnlocked) {
      setIsTyping(false);
      pushUpgradeMessage('Tradia Grok Fast Mode is available on Plus and Elite plans. Upgrade to unlock real-time Grok summaries, predictive signals, and conversational explainability.');
      setUploadedFiles([]);
      return;
    }

    try {
      const conversationHistory = messages.slice(-5).map(msg => ({
        role: msg.type,
        content: msg.content
      }));

      if (userTier === 'free' && (uploadedFiles.length > 0 || inputMessage.toLowerCase().includes('screenshot'))) {
        pushUpgradeMessage('PRO feature: Image analysis is available for Pro and above. Upgrade to unlock advanced chart analysis and visual insights.');
        setIsTyping(false);
        setUploadedFiles([]);
        return;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          tradeHistory: trades,
          attachments: uploadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
          conversationHistory,
          mode: assistantMode
        }),
      });

      if (!response.ok) throw new Error(`API request failed: ${response.status}`);

      const data = await response.json();
      const aiResponse: string = data.response || generateIntelligentCoachingResponse(userMessage.content, trades, uploadedFiles, userTier, assistantMode);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      if (voiceSettings.voiceEnabled && voiceSettings.autoSpeak) speakText(aiMessage.content);
    } catch (error) {
      console.error('Error sending message:', error);
      pushUpgradeMessage('Sorry, I encountered an issue processing that. Please try again in a moment.');
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
    <div
      className={cn(
        'relative mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl border border-[#2a2f3a] bg-[#161B22] shadow-xl',
        'min-h-[520px]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#2a2f3a] bg-[#0D1117]">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <Bot className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161B22] animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white">Tradia AI</h3>
            <p className="text-xs md:text-sm text-gray-400">Your personal trading coach • Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-400 rounded-full text-xs border border-green-700/50">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            AI Active
          </div>

          {/* Subscription Tier Indicator */}
          <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
            isFreeLikeTier ? 'bg-gray-900/30 text-gray-400 border-gray-700/50' :
            userTier === 'pro' ? 'bg-blue-900/30 text-blue-400 border-blue-700/50' :
            userTier === 'plus' ? 'bg-purple-900/30 text-purple-400 border-purple-700/50' :
            'bg-yellow-900/30 text-yellow-400 border-yellow-700/50'
          }`}>
            <Crown className={`w-3 h-3 ${
              isFreeLikeTier ? 'text-gray-400' :
              userTier === 'pro' ? 'text-blue-400' :
              userTier === 'plus' ? 'text-purple-400' :
              'text-yellow-400'
            }`} />
            {tierBadgeLabel}
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
            <h4 className="text-sm font-medium text-white">Voice Settings</h4>
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
              onClick={() => speakText("Hello! I'm Tradia AI. How can I help you become a better trader today?")}
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

      {/* Mode Switcher */}
      <div className="border-b border-[#2a2f3a] bg-[#101521] px-3 md:px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAssistantMode('coach')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-all',
                assistantMode === 'coach'
                  ? 'bg-blue-600/80 text-white shadow shadow-blue-500/40'
                  : 'bg-[#161B22] text-slate-300 border border-[#2a2f3a] hover:border-blue-500/50'
              )}
            >
              Tradia Coach
            </button>
            <button
              type="button"
              onClick={() => {
                if (!grokUnlocked) {
                  pushUpgradeMessage('Tradia Grok Fast Mode unlocks with Plus. Upgrade to unleash explainable AI callouts, predictive bias detection, and instant playbooks.');
                  return;
                }
                setAssistantMode('grok');
              }}
              className={cn(
                'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs md:text-sm font-medium transition-all',
                grokUnlocked
                  ? assistantMode === 'grok'
                    ? 'bg-purple-600 text-white shadow shadow-purple-500/40'
                    : 'bg-[#1f1233] text-purple-200 border border-purple-500/40 hover:bg-purple-600/80 hover:text-white'
                  : 'bg-[#1a1f2e] text-gray-400 border border-[#2a2f3a] cursor-not-allowed'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" /> Tradia Grok
              {!grokUnlocked && <Lock className="w-3 h-3" />}
            </button>
          </div>
          <div className="text-xs text-slate-400 leading-relaxed">
            {assistantMode === 'grok' && grokUnlocked
              ? 'Grok Fast Mode delivers XAI summaries, anomaly detection, and story-driven playbooks in seconds.'
              : 'Coach Mode keeps things structured with coaching prompts and gentle nudges. Switch to Grok after upgrading for XAI-powered depth.'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col space-y-3 md:space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`w-full rounded-2xl border border-[#2a2f3a] p-3 md:p-4 shadow-lg transition-all ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white border-blue-500/30'
                  : 'bg-[#1a1f2e] text-gray-100 backdrop-blur'
              }`}
            >
              {message.type === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-blue-400">Tradia AI</span>
                </div>
              )}

              <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{message.content}</div>

              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-[#0D1117]/50 rounded border border-[#2a2f3a]">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={`text-xs mt-2 opacity-70 ${message.type === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="w-full rounded-2xl border border-[#2a2f3a] bg-[#1a1f2e] p-3 md:p-4 shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Tradia AI</span>
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

        <div ref={messagesEndRef} />\r\n        </div>\r\n      </div>

      {/* Composer */}
      <div className="px-3 md:px-4 pb-2 border-t border-[#2a2f3a]">
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-[#1a1f2e] border border-[#2a2f3a] rounded-lg p-2">
                <ImageIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300 truncate max-w-[160px]">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask anything about your trading..."
              className="w-full bg-[#0D1117] border border-[#2a2f3a] rounded-xl px-3 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-blue-600"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { isRecording ? stopVoiceRecording() : startVoiceRecording(); }}
              className={`p-2.5 md:p-3 rounded-full transition-all touch-manipulation ${
                isRecording ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice recording'}
            >
              {isRecording ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
            <button
              onClick={() => {
                if (isFreeLikeTier) {
                  setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: "PRO feature: Image analysis is available for Pro and above. Upgrade to unlock advanced chart analysis and visual insights.",
                    timestamp: new Date(),
                  }]);
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`p-2.5 md:p-3 rounded-full transition-all touch-manipulation ${
                isFreeLikeTier
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-700 text-gray-200 hover:bg-blue-600 hover:text-white'
              }`}
              title={isFreeLikeTier ? 'PRO feature: Upgrade to analyze images' : 'Upload trade screenshot or analysis'}
              disabled={isFreeLikeTier}
            >
              {isFreeLikeTier ? (
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

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() && uploadedFiles.length === 0}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl px-5 md:px-7 py-3 md:py-4 transition-all flex items-center gap-2 touch-manipulation active:scale-95 shadow-lg hover:shadow-xl disabled:shadow-none min-w-[90px] justify-center font-semibold"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        {/* Suggestions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-900/30 to-blue-800/30 rounded-full border border-blue-700/50">
              <Mic className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-300 font-medium">Voice: &ldquo;How&apos;s my trading?&rdquo;</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-900/30 to-green-800/30 rounded-full border border-green-700/50">
              <span className="text-xs text-green-300 font-medium">Strategy advice</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-900/30 to-purple-800/30 rounded-full border border-purple-700/50">
              <span className="text-xs text-purple-300 font-medium">{trades.length} trades analyzed</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-full border border-gray-600/50">
            <Bot className="w-3 h-3 text-blue-400 animate-pulse" />
            <span className="text-xs text-gray-300 font-medium">Tradia AI Coach Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Intelligent Coaching Response Generator - uses advancedAnalysis helpers
function generateIntelligentCoachingResponse(
  userMessage: string,
  trades: any[],
  uploadedFiles: File[],
  userTier: string = 'free',
  mode: 'coach' | 'grok' = 'coach'
): string {
  const lowerMessage = userMessage.toLowerCase();
  const tradeAnalysis = analyzeTradingPerformance(trades);
  const focusTopic = tradeAnalysis.tradingStyle
    ? `${tradeAnalysis.tradingStyle} performance lens`
    : 'Trading performance pulse';

  const warmCoachIntro = () => {
    const greeting = generatePersonalizedGreeting(tradeAnalysis);
    const snapshot = generateTradingSnapshot(tradeAnalysis);
    return `${greeting}

**Quick Pulse**
${snapshot}

Ask for a deep-dive, a risk tune-up, or ideas to stay in flow.`;
  };

  const grokHeading = () =>
    [
      '## Tradia Grok Fast Insight',
      '**Signal Blend:** XAI Grok — Explainability Mode',
      `**Focus:** ${focusTopic}`,
    ].join('\n');

  if (mode === 'grok') {
    const summaryBlocks: string[] = [
      grokHeading(),
      '',
      '### Performance Snapshot',
      generateAdvancedPerformanceAnalysis(tradeAnalysis),
      '',
      '### Strategy Alpha Highlights',
      generateStrategyRecommendations(tradeAnalysis),
      '',
      '### Risk Radar',
      generateRiskManagementAnalysis(tradeAnalysis),
      '',
      '### Grok Next Moves',
      '- Ask for `playbook` to turn this into a checklist.',
      '- Upload a chart screenshot and I will annotate the setup.',
      '- Say `predict next` for a probabilistic outlook on upcoming trades.',
      "I&apos;m ready when you are — what should Grok spotlight next?",
    ];
    return summaryBlocks.join('\n');
  }

  if (
    lowerMessage.includes('hello') ||
    lowerMessage.includes('hi') ||
    lowerMessage.includes('hey')
  ) {
    return `${warmCoachIntro()}

- Performance Review — "How's my trading been?"
- Strategy Tune-Up — "What's my strongest pattern?"
- Risk Refinement — "How can I protect capital better?"
- Market Pulse — "What's the best setup right now?"

Let's get after it.`;
  }

  if (lowerMessage.includes('performance') || lowerMessage.includes('how am i doing') || lowerMessage.includes('win rate')) {
    return generateAdvancedPerformanceAnalysis(tradeAnalysis);
  }

  if (lowerMessage.includes('strategy') || lowerMessage.includes('pattern') || lowerMessage.includes('what should i')) {
    return generateStrategyRecommendations(tradeAnalysis);
  }

  if (lowerMessage.includes('risk') || lowerMessage.includes('stop loss') || lowerMessage.includes('position size')) {
    return generateRiskManagementAnalysis(tradeAnalysis);
  }

  if (lowerMessage.includes('when') || lowerMessage.includes('timing') || lowerMessage.includes('entry')) {
    return generateMarketTimingRecommendations(tradeAnalysis);
  }

  if (lowerMessage.includes('lost') || lowerMessage.includes('bad') || lowerMessage.includes('losing') || lowerMessage.includes('stuck')) {
    return generateEmotionalSupportWithInsights(tradeAnalysis);
  }

  if (lowerMessage.includes('won') || lowerMessage.includes('profit') || lowerMessage.includes('winning') || lowerMessage.includes('good')) {
    return generateWinningCelebrationWithGrowth(tradeAnalysis);
  }

  if (lowerMessage.includes('motivation') || lowerMessage.includes('mindset') || lowerMessage.includes('confidence')) {
    return generatePersonalizedMotivation(tradeAnalysis);
  }

  if (uploadedFiles.length > 0) {
    return generateAdvancedScreenshotAnalysis(uploadedFiles, tradeAnalysis);
  }

  const defaultResponse = generateDefaultIntelligentResponse(tradeAnalysis);
  return `${defaultResponse}

Need help with mindset, strategy, or risk? Just ask.`;
}



