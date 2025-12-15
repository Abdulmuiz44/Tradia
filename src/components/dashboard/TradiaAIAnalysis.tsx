"use client";

import React, { useState, useCallback } from 'react';
import { Trade } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface TradiaAIAnalysisProps {
  trades: Trade[];
  userId?: string;
}

export default function TradiaAIAnalysis({ trades, userId }: TradiaAIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analyzeWithAI = useCallback(async (customPrompt?: string) => {
    if (!customPrompt && !prompt) return;
    if (trades.length === 0) return;

    setLoading(true);
    setError(null);
    
    try {
      const userPrompt = customPrompt || prompt;
      
      const response = await fetch('/api/tradia/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: userPrompt
          }],
          mode: 'analysis',
          options: {
            temperature: 0.3,
            max_tokens: 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
      }

      setAnalysis(fullResponse);
      if (!customPrompt) setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
      console.error('AI Analysis Error:', err);
    } finally {
      setLoading(false);
    }
  }, [trades, prompt]);

  const quickAnalyses = [
    { label: 'Performance Review', prompt: 'Analyze my trading performance focusing on win rate, P&L, and consistency. What are my main strengths and areas for improvement?' },
    { label: 'Risk Assessment', prompt: 'Evaluate my risk management. Am I taking appropriate risks? What\'s my risk-to-reward ratio and how can I optimize it?' },
    { label: 'Pattern Analysis', prompt: 'What trading patterns do you see in my data? Are there specific symbols, times, or conditions where I perform better or worse?' },
    { label: 'Improvement Plan', prompt: 'Based on my trading history, create a personalized action plan for the next week. What should I focus on to improve?' }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#0D1117]">
      {/* Header */}
      <div className="border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Tradia AI Analysis</h2>
              <p className="text-sm text-gray-400">{trades.length} trades analyzed</p>
            </div>
          </div>
          <Button
            onClick={() => analyzeWithAI()}
            disabled={loading || !prompt.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Analyses */}
      {!analysis && (
        <div className="border-b border-gray-700 p-6">
          <p className="text-sm text-gray-400 mb-3">Quick Analysis</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickAnalyses.map((item) => (
              <button
                key={item.label}
                onClick={() => analyzeWithAI(item.prompt)}
                disabled={loading}
                className="p-3 text-left rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-white transition-colors disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-700/50 text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {analysis && (
          <div className="prose prose-invert max-w-none">
            <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
              <div className="text-white">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 text-white" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 mt-4 text-white" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mb-2 mt-3 text-white" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-3 text-gray-100" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 text-gray-100" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 text-gray-100" {...props} />,
                    li: ({ node, ...props }) => <li className="mb-1 text-gray-100" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-gray-200" {...props} />,
                    code: ({ node, ...props }) => <code className="bg-gray-900/50 px-2 py-1 rounded text-blue-300 text-sm" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-3" {...props} />,
                    table: ({ node, ...props }) => <div className="overflow-x-auto mb-3"><table className="w-full text-sm" {...props} /></div>,
                    thead: ({ node, ...props }) => <thead className="border-b-2 border-gray-600" {...props} />,
                    th: ({ node, ...props }) => <th className="px-2 py-2 text-left text-gray-100 font-semibold" {...props} />,
                    td: ({ node, ...props }) => <td className="px-2 py-2 text-gray-200" {...props} />,
                  }}
                >
                  {analysis}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {!analysis && !loading && !error && (
          <div className="text-center text-gray-400">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a quick analysis or enter your own prompt to get started</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      {analysis && (
        <div className="border-t border-gray-700 p-6">
          <div className="flex gap-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              rows={2}
            />
            <Button
              onClick={() => analyzeWithAI()}
              disabled={loading || !prompt.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white self-end"
              size="sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
