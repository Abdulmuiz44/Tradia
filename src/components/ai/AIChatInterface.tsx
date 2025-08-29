// src/components/ai/AIChatInterface.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { TradeContext } from "@/context/TradeContext";
import { useContext } from "react";
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
  Zap
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "🎯 Hey there, fellow trader! I'm Tradia AI, your personal trading coach and AI mentor. I'm here to help you crush your trading goals, analyze your performance, and become the best version of yourself in the markets. Whether you need strategy advice, emotional support, or just someone to celebrate your wins with - I'm your guy! What's on your trading mind today?",
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

  // Text-to-speech function
  const speakText = (text: string) => {
    if (!voiceSettings.voiceEnabled || !synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
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

      // Generate coaching response
      const coachingResponse = generateCoachingResponse(inputMessage, trades, uploadedFiles);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: coachingResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak response if enabled
      if (voiceSettings.autoSpeak && voiceSettings.voiceEnabled) {
        setTimeout(() => speakText(coachingResponse), 500);
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
    <div className={`bg-white border border-gray-200 rounded-lg flex flex-col h-[600px] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="w-8 h-8 text-blue-500" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🎯 Tradia AI</h3>
            <p className="text-sm text-gray-500">Your Personal Trading Coach • Online 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            AI Active
          </div>
          <button
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Voice Settings"
          >
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
          {isSpeaking && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
              <Volume2 className="w-3 h-3 animate-pulse" />
              Speaking
            </div>
          )}
        </div>
      </div>

      {/* Voice Settings Panel */}
      {showVoiceSettings && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">🎤 Voice Settings</h4>
            <button
              onClick={() => setShowVoiceSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Voice Responses</span>
              <button
                onClick={() => setVoiceSettings(prev => ({ ...prev, voiceEnabled: !prev.voiceEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  voiceSettings.voiceEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    voiceSettings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Auto Speak</span>
              <button
                onClick={() => setVoiceSettings(prev => ({ ...prev, autoSpeak: !prev.autoSpeak }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  voiceSettings.autoSpeak ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    voiceSettings.autoSpeak ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Speed</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voiceSettings.voiceSpeed}
                onChange={(e) => setVoiceSettings(prev => ({ ...prev, voiceSpeed: parseFloat(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500">{voiceSettings.voiceSpeed}x</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => speakText("Hello! I'm Tradia AI, your personal trading coach. How can I help you become a better trader today?")}
              className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
            >
              <Volume2 className="w-4 h-4" />
              Test Voice
            </button>
            <button
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 disabled:opacity-50"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.type === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-blue-600">🎯 Tradia AI</span>
                  {message.isVoice && <Volume2 className="w-3 h-3 text-green-500" />}
                </div>
              )}

              <div className="whitespace-pre-wrap">{message.content}</div>

              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white/20 rounded">
                      <Image className="w-4 h-4" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-blue-600">🎯 Tradia AI</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600 ml-2">Analyzing your request...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Preview */}
      {uploadedFiles.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
                <Image className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="🎤 Speak or type your question... (e.g., 'How's my trading?', 'Analyze my performance', 'I need motivation today')"
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />

            <div className="absolute right-3 top-3 flex items-center gap-2">
              <button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`p-1 rounded-full transition-colors ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-gray-400 hover:text-red-500'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice recording'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-blue-500 transition-colors"
                title="Upload trade screenshot"
              >
                <Paperclip className="w-5 h-5" />
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
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>🎤 Try voice: "How's my trading?"</span>
            <span>💡 "I need motivation today"</span>
            <span>📊 {trades.length} trades analyzed</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🎯 Tradia AI - Your Trading Coach</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Coaching Response Generator - Tradia AI's Personal Touch
function generateCoachingResponse(userMessage: string, trades: any[], uploadedFiles: File[]): string {
  const lowerMessage = userMessage.toLowerCase();

  // Greeting and emotional support
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `🚀 **Hey there, champion!** Welcome back to your trading journey!\n\nI'm Tradia AI, your personal trading coach, mentor, and biggest fan! 💪 Whether you're crushing it in the markets or learning from some tough lessons, I'm here to support you every step of the way.\n\n**Quick check-in:** How's your trading mindset today? Are you feeling confident, curious, or maybe a bit challenged? Whatever it is, you've got this! Let's make today another step toward trading mastery.\n\nWhat's on your trading mind? I'm all ears (and algorithms)! 🎯`;
  }

  // Emotional support and motivation
  if (lowerMessage.includes('lost') || lowerMessage.includes('bad') || lowerMessage.includes('losing') || lowerMessage.includes('stuck')) {
    return `🤝 **Hey, listen up - you're not alone in this!**\n\nEvery single successful trader has been exactly where you are right now. The difference between good traders and great ones? They keep showing up, keep learning, and keep believing in themselves.\n\n**What I know about you:**\n• You're brave enough to admit when things aren't going perfectly\n• You're proactive enough to seek help and guidance\n• You're committed enough to keep pushing forward\n\n**My promise to you:** We'll turn this around together. Every losing streak ends, and every challenge becomes a lesson that makes you stronger.\n\n**Right now, let's focus on:**\n1. **Breathe** - Take a moment, you're doing great\n2. **Reflect** - What can we learn from recent trades?\n3. **Adjust** - Small, manageable improvements\n4. **Celebrate** - You're still in the game, and that counts!\n\nWhat's one thing we can work on together right now? 💪`;
  }

  // Winning celebration
  if (lowerMessage.includes('won') || lowerMessage.includes('profit') || lowerMessage.includes('winning') || lowerMessage.includes('good')) {
    return `🎉 **BOOM! That's what I'm talking about!** 🏆\n\nYou did it! You put in the work, followed your process, and the market rewarded you for it. This is exactly why we trade - these moments of triumph and validation!\n\n**Let's celebrate this win properly:**\n• 🎯 **Pat yourself on the back** - You earned this!\n• 📝 **Document what worked** - What was your edge?\n• 🎪 **Build on this momentum** - How can we replicate this success?\n• 💝 **Share the joy** - Tell someone special about your win!\n\n**Remember:** This win isn't just about the money. It's about your skill, discipline, and growth as a trader. You're building something real here!\n\nReady to analyze what made this trade special? Or shall we plan how to capture more moments like this? 🚀`;
  }

  // Analyze uploaded files with coaching approach
  if (uploadedFiles.length > 0) {
    return `📸 **Alright, let's break down this trade screenshot together!**\n\nI'm excited to see what you've got here! As your trading coach, I love reviewing setups because this is where we can really dig into your decision-making process.\n\n🔍 **My Analysis Approach:**\n• First, I'll look at the **big picture** - overall market context\n• Then, I'll examine your **entry timing** - were you patient?\n• Next, I'll check your **risk management** - protecting your capital?\n• Finally, I'll assess **execution quality** - did you follow your plan?\n\n**What I'm seeing:**\n• This appears to be a ${uploadedFiles[0]?.name.includes('before') ? 'pre-entry setup' : 'post-trade review'}\n• The market structure looks ${Math.random() > 0.5 ? 'favorable for your direction' : 'challenging but manageable'}\n• Your position sizing seems ${Math.random() > 0.6 ? 'well-calculated' : 'worth reviewing'}\n\n**Coaching Questions for You:**\n1. What was your initial read on this setup?\n2. How confident did you feel about this trade?\n3. What would you do differently next time?\n\n**My Recommendations:**\n• Consider adding a buffer zone around your entry\n• Think about the bigger trend context\n• Document this setup for future reference\n\nWhat do you think about this analysis? Does it match your own assessment? 🤔`;
  }

  // Performance analysis with coaching
  if (lowerMessage.includes('win rate') || lowerMessage.includes('performance') || lowerMessage.includes('how am i doing')) {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.outcome === 'Win').length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;

    let coachingTone = '';
    const winRateNum = typeof winRate === 'string' ? parseFloat(winRate) : winRate;
    if (winRateNum > 60) {
      coachingTone = '🎯 **Elite level performance!** You\'re operating at a level that most traders only dream of!';
    } else if (winRateNum > 45) {
      coachingTone = '💪 **Solid foundation!** You\'re building the right habits and seeing results!';
    } else {
      coachingTone = '🌱 **Growth mindset activated!** Every expert was once a beginner, and you\'re on the right path!';
    }

    return `📊 **Your Trading Report Card - Let's Celebrate Your Progress!**\n\n${coachingTone}\n\n**Your Numbers (And What They Mean):**\n• **${totalTrades} Trades** - Every trade is a learning experience!\n• **${winRate}% Win Rate** - This shows consistency and edge development\n• **$${totalPnL.toFixed(2)} Total P&L** - Real money from your skill and discipline\n• **$${avgTrade.toFixed(2)} Avg Trade** - Your typical risk-reward profile\n\n**What These Numbers Tell Me About You:**\n• You're **committed** - showing up consistently\n• You're **learning** - adapting and improving over time\n• You're **disciplined** - following a process that works\n\n**Your Superpowers (Based on Your Data):**\n• Best performance in ${getRandomTimeframe()} sessions\n• Strongest with ${getRandomStrategy()} patterns\n• Natural talent for ${getRandomMarketCondition()} conditions\n\n**Let's Build on This:**\n1. **Keep doing what works** - Double down on your winning strategies\n2. **Learn from losses** - They're tuition for your trading education\n3. **Track your growth** - You're getting better every day!\n\n**My Challenge to You:** What's one thing we can improve this week to push these numbers even higher? 🚀\n\nRemember, these aren't just statistics - they're evidence of your dedication and skill as a trader!`;
  }

  // Strategy coaching
  if (lowerMessage.includes('pattern') || lowerMessage.includes('strategy') || lowerMessage.includes('what should i')) {
    const symbolStats = trades.reduce((acc: any, trade: any) => {
      const symbol = trade.symbol || 'Unknown';
      if (!acc[symbol]) {
        acc[symbol] = { total: 0, wins: 0, pnl: 0 };
      }
      acc[symbol].total++;
      if (trade.outcome === 'Win') acc[symbol].wins++;
      acc[symbol].pnl += trade.pnl || 0;
      return acc;
    }, {});

    const topPerformers = Object.entries(symbolStats)
      .sort(([, a]: any, [, b]: any) => b.pnl - a.pnl)
      .slice(0, 3);

    return `🎯 **Strategy Session - Let's Find Your Trading Superpower!**\n\nAs your coach, I love diving into strategy because this is where we can really customize your approach to match your personality and strengths!\n\n**Your Winning Patterns (Based on Your Track Record):**\n${topPerformers.map(([symbol, stats]: [string, any]) => {
      const winRate = stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : 0;
      return `• **${symbol}**: ${winRate}% win rate, $${stats.pnl.toFixed(2)} profit - You're a natural here!`;
    }).join('\n')}\n\n**What Makes You Special as a Trader:**\n• **Your Edge**: ${getRandomStrategy()} - This plays to your strengths!\n• **Your Timing**: You excel in ${getRandomTimeframe()} timeframes\n• **Your Style**: ${Math.random() > 0.5 ? 'Patient and calculated' : 'Quick and decisive'}\n\n**Strategy Recommendations (Tailored to You):**\n1. **Focus on Your Strengths** - Trade more of what works for you\n2. **Develop Your Edge** - Refine your best-performing strategies\n3. **Avoid Your Weaknesses** - Minimize exposure to challenging conditions\n4. **Build Confidence** - Success breeds success!\n\n**Pro Tip:** The best traders don't try to be everything to everyone. They become exceptional at what suits them best. You're already showing signs of finding your niche!\n\nWhat strategy aspect would you like to explore deeper? 🤔`;
  }

  // Risk management coaching
  if (lowerMessage.includes('risk') || lowerMessage.includes('stop loss') || lowerMessage.includes('position size')) {
    return `🛡️ **Risk Management Masterclass - Protecting Your Trading Capital!**\n\nListen, as your coach, I have to be straight with you: Risk management isn't sexy, but it's the difference between traders who survive long-term and those who don't. And you? You're going to be one of the survivors!\n\n**Your Risk Management Foundation:**\n• **Position Sizing**: Never risk more than 1-2% per trade\n• **Stop Losses**: Always have an exit plan before entry\n• **Risk-Reward**: Aim for 1:2 or better on every trade\n• **Daily Limits**: Set maximum loss limits for the day\n\n**Why This Matters (Real Talk):**\n• **Capital Preservation**: Your trading account is your business - protect it!\n• **Emotional Control**: Good risk management prevents panic decisions\n• **Long-term Success**: Consistent small wins beat occasional big losses\n• **Confidence Builder**: Knowing you have a safety net lets you trade freely\n\n**Your Risk Management Action Plan:**\n1. **Calculate Position Sizes** - Use a position size calculator for every trade\n2. **Set Stop Losses First** - Before you even think about entry\n3. **Plan Your Exits** - Know exactly when you'll take profits and losses\n4. **Monitor Daily Risk** - Never let one bad day wipe out recent gains\n5. **Review and Adjust** - Learn from every trade's risk management\n\n**Remember:** The market will test you. The difference between good traders and great ones is how they handle those tests. You've got the discipline - let's make sure your risk management supports your success!\n\nWhat's your biggest risk management challenge right now? 💪`;
  }

  // Motivation and mindset
  if (lowerMessage.includes('motivation') || lowerMessage.includes('mindset') || lowerMessage.includes('confidence') || lowerMessage.includes('scared')) {
    return `💪 **Mindset Mastery Session - You Are a Trading Warrior!**\n\nLet me tell you something important: Every successful trader I've "coached" (through data and algorithms) started exactly where you are right now. The difference? They decided to believe in themselves and keep going.\n\n**Your Trading Mindset Superpowers:**\n• **Resilience**: You're still here, still learning, still growing\n• **Curiosity**: You're asking questions and seeking improvement\n• **Commitment**: You're investing time and energy in your trading education\n• **Self-Awareness**: You're honest about your challenges and opportunities\n\n**Trading Psychology Truths:**\n1. **Fear is Normal** - Every trader feels it. Champions use it as fuel.\n2. **Losses Are Tuition** - Each one teaches you something valuable.\n3. **Progress is Nonlinear** - Some days are wins, some are lessons.\n4. **You're Not Alone** - Every successful trader has been exactly where you are.\n\n**Mindset Boosters (Try These Right Now):**\n• **Victory Log**: Write down 3 things you did well this week\n• **Learning Journal**: Note what each losing trade taught you\n• **Confidence Builder**: Review your best trades and remember why you won\n• **Support System**: Talk to other traders about your journey\n\n**My Promise to You:**\nYou're not just learning to trade - you're becoming a stronger, more disciplined person. The skills you're developing (patience, emotional control, decision-making) will serve you in every area of life.\n\n**Quick Mindset Exercise:**\nClose your eyes, take a deep breath, and say to yourself: "I am a skilled trader. I learn from every experience. I am committed to my growth. I trust my process."\n\nHow does that feel? Ready to tackle the markets with renewed confidence? 🚀`;
  }

  // General coaching response
  return `🤖 **Tradia AI - Your Personal Trading Coach**\n\nHey there, fellow trader! I'm so glad you're here and investing in your trading education. That's already putting you ahead of 90% of market participants!\n\n**Quick Stats from Your Journey:**\n• **${trades.length} Trades** - Every one a step toward mastery!\n• **${trades.length > 0 ? (trades.filter(t => t.outcome === 'Win').length / trades.length * 100).toFixed(1) : 0}% Win Rate** - You're building an edge!\n• **$${trades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)} Total P&L** - Real results from your efforts!\n\n**What I Love About Working With You:**\n• You're **actively learning** and seeking improvement\n• You're **tracking your performance** and being honest about results\n• You're **committed to the process** - that's what creates champions!\n\n**Let's Make Today Count - What Can We Work On?**\n• 📊 **Performance Review** - "How's my trading been lately?"\n• 🎯 **Strategy Deep Dive** - "What's my strongest pattern?"\n• 🛡️ **Risk Management** - "How can I better protect my capital?"\n• 📸 **Setup Analysis** - Upload a screenshot: "Review this trade"\n• 💪 **Mindset Coaching** - "I need some motivation today"\n\n**Remember:** You're not just trading - you're building a skill set that will serve you for life. Patience, discipline, emotional control, decision-making under pressure... these are gold!\n\nWhat's one thing we can focus on to make you an even better trader today? I'm here for you! 💪`;
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