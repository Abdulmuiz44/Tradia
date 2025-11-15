// src/components/ai/EmotionCoachChat.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getEmotionColor, getEmotionCoachingHint } from '@/lib/emotionClassifier';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface EmotionData {
  primary: string;
  score: number;
  triggers: string[];
  tiltLevel: number;
  secondary?: string;
}

export default function EmotionCoachChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emotion, setEmotion] = useState<EmotionData | null>(null);
  const [showTiltAlert, setShowTiltAlert] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [lowTiltStreak, setLowTiltStreak] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for tilt alert
  useEffect(() => {
    if (emotion && emotion.tiltLevel >= 1.4) {
      setShowTiltAlert(true);
      setLowTiltStreak(0);
    } else if (emotion && emotion.tiltLevel < 0.8) {
      setLowTiltStreak((prev) => prev + 1);
    }
  }, [emotion]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('emotionCoachHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('emotionCoachHistory', JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Prepare assistant message placeholder
    const assistantId = `msg_${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let buffer = '';
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);

              if (data.type === 'emotion') {
                setEmotion(data.data);
              } else if (data.type === 'delta') {
                accumulatedContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulatedContent }
                      : m
                  )
                );
              } else if (data.type === 'done') {
                accumulatedContent = data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulatedContent }
                      : m
                  )
                );
              } else if (data.type === 'queued') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: data.message }
                      : m
                  )
                );
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  'Sorry, I encountered an error. Please try again.',
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    if (confirm('Clear all chat history?')) {
      setMessages([]);
      localStorage.removeItem('emotionCoachHistory');
      setEmotion(null);
      setStreakCount(0);
      setLowTiltStreak(0);
    }
  };

  const emotionColor = emotion
    ? getEmotionColor(emotion.primary, emotion.tiltLevel)
    : 'bg-gray-400';

  const emotionHint = emotion
    ? getEmotionCoachingHint(emotion.primary, emotion.tiltLevel)
    : '';

  return (
    <div className="flex flex-col h-screen bg-[#061226]">
      {/* Header with Emotion Pulse */}
      <div className="bg-[#0a1929] border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                Trading Psychology Coach
              </h1>
              <p className="text-sm text-gray-400">
                Powered by xAI Grok • Battle-tested mentor
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Streak Counter */}
              {lowTiltStreak >= 3 && (
                <div className="bg-green-900/30 border border-green-500 rounded-lg px-3 py-2">
                  <div className="text-green-400 text-sm font-semibold">
                    🔥 {lowTiltStreak} Calm Messages
                  </div>
                  <div className="text-xs text-green-300">Keep it up!</div>
                </div>
              )}
              <button
                onClick={clearHistory}
                className="text-gray-400 hover:text-white text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
        {/* Emotion Pulse Bar */}
        <div
          className={`h-2 ${emotionColor} transition-all duration-300`}
          style={{
            opacity: emotion ? 0.7 + emotion.tiltLevel * 0.15 : 0.3,
          }}
        />
        {/* Emotion Hint */}
        {emotionHint && (
          <div className="bg-[#0a1929]/80 px-4 py-2 text-sm text-gray-300">
            {emotionHint}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="text-2xl font-bold mb-2 text-white">
              Your Trading Psychology Coach
            </h2>
            <p className="mb-4">
              I'm here to help you navigate trading emotions and build
              discipline.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-sm">
              <div className="bg-[#0a1929] p-3 rounded-lg text-left">
                <div className="font-semibold text-white mb-1">
                  🎯 Pattern Recognition
                </div>
                <div className="text-gray-400">
                  Identify revenge trading, FOMO, fear
                </div>
              </div>
              <div className="bg-[#0a1929] p-3 rounded-lg text-left">
                <div className="font-semibold text-white mb-1">
                  💪 Real Actions
                </div>
                <div className="text-gray-400">
                  Immediate steps, not theory
                </div>
              </div>
              <div className="bg-[#0a1929] p-3 rounded-lg text-left">
                <div className="font-semibold text-white mb-1">
                  🔥 Tilt Detection
                </div>
                <div className="text-gray-400">
                  Catch emotions before they hurt
                </div>
              </div>
              <div className="bg-[#0a1929] p-3 rounded-lg text-left">
                <div className="font-semibold text-white mb-1">
                  🎖️ Battle-Tested
                </div>
                <div className="text-gray-400">
                  Advice from the trenches
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#0a1929] text-gray-100 border border-gray-700'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user'
                    ? 'text-blue-200'
                    : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-[#0a1929] rounded-lg px-4 py-3 border border-gray-700">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-pulse">●</div>
                <div className="animate-pulse delay-100">●</div>
                <div className="animate-pulse delay-200">●</div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[#0a1929] border-t border-gray-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What's on your mind about trading?"
            className="flex-1 bg-[#061226] text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Tilt Alert Modal */}
      {showTiltAlert && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-red-900 border-2 border-red-500 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                PAUSE
              </h2>
              <p className="text-lg text-red-100 mb-6">
                High tilt detected. Let's take a breath.
              </p>
              <div className="bg-red-950 rounded-lg p-6 mb-6">
                <p className="font-semibold text-white mb-4">
                  4-7-8 Breathing Technique
                </p>
                <ol className="text-left text-red-100 space-y-2">
                  <li>1. Breathe in through nose for 4 seconds</li>
                  <li>2. Hold your breath for 7 seconds</li>
                  <li>3. Exhale through mouth for 8 seconds</li>
                  <li>4. Repeat 3 times</li>
                </ol>
              </div>
              <button
                onClick={() => setShowTiltAlert(false)}
                className="bg-white text-red-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
              >
                I'm Ready to Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
