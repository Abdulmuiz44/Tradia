"use client";

import React, { useState, useContext, useEffect, useCallback } from "react";
import { TradeContext } from "@/context/TradeContext";
import type { Trade } from "@/types/trade";
import { aiService } from "@/lib/ai/AIService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Brain, Tag as TagIcon, AlertTriangle, Check, BrainCircuit } from "lucide-react";
import { toast } from "sonner";

interface Props {
  trade: Trade;
  onClose: () => void;
}

export default function TradeJournalModal({ trade, onClose }: Props) {
  const ctx = useContext(TradeContext)!;
  const [note, setNote] = useState((trade as any).postNote || (trade as any).journalNotes || "");
  const [emotion, setEmotion] = useState((trade as any).emotion || "Calm");
  const [rating, setRating] = useState((trade as any).executionRating || 3);
  const [selectedTags, setSelectedTags] = useState<string[]>(trade.tags || []);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>(trade.mistakes || []);

  const [aiSuggestions, setAiSuggestions] = useState<{ tags: string[], mistakes: string[] } | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const handleAnalytic = useCallback(async () => {
    if (!note || note.length < 10) return;
    setIsAnalysing(true);
    try {
      const result = await aiService.analyzeJournalEntry(note);
      setAiSuggestions(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalysing(false);
    }
  }, [note]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleMistake = (mistake: string) => {
    setSelectedMistakes(prev => prev.includes(mistake) ? prev.filter(m => m !== mistake) : [...prev, mistake]);
  };

  const save = () => {
    const updatedData = {
      ...(trade as any),
      postNote: note,
      journalNotes: note,
      emotion,
      executionRating: rating,
      tags: selectedTags,
      mistakes: selectedMistakes,
      reviewed: true,
      updated_at: new Date().toISOString()
    };

    if ((ctx as any).addPostNote) {
      try { (ctx as any).addPostNote((trade as any).id, note, emotion, rating); } catch { /* ignore */ }
    }

    if ((ctx as any).updateTrade) {
      try { (ctx as any).updateTrade(updatedData); } catch { /* ignore */ }
    }

    toast.success("Journal updated successfully");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[#0D1117] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">
              Journal Trade: <span className="text-blue-400">{trade.symbol}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Note Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Post-Trade Analysis</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAnalytic}
                disabled={isAnalysing || !note}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 h-7"
              >
                {isAnalysing ? <BrainCircuit className="h-3 w-3 mr-2 animate-pulse" /> : <Brain className="h-3 w-3 mr-2" />}
                AI Suggest Tags
              </Button>
            </div>
            <textarea
              className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-zinc-600 focus:border-blue-500/50 outline-none min-h-[140px] resize-none transition-all"
              placeholder="What happened? Did you follow your rules? How was the price action at entry?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* AI Suggestions Panel */}
          {aiSuggestions && (
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4 animate-in fade-in slide-in-from-left-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Brain className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">AI Detected Patterns</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {aiSuggestions.tags.map(tag => (
                  <Badge
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`cursor-pointer transition-all ${selectedTags.includes(tag) ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                  >
                    <TagIcon className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {aiSuggestions.mistakes.map(mistake => (
                  <Badge
                    key={mistake}
                    onClick={() => toggleMistake(mistake)}
                    variant="destructive"
                    className={`cursor-pointer transition-all ${selectedMistakes.includes(mistake) ? 'bg-red-600 text-white' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {mistake}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Emotion</label>
              <select
                className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 text-white outline-none focus:border-blue-500/50 appearance-none transition-all"
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
              >
                {["Calm", "Confidence", "Fear", "Greed", "Revenge", "Skeptical"].map((emo) => (
                  <option key={emo} value={emo} className="bg-[#0D1117]">{emo}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Execution (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`flex-1 p-2 rounded-lg border transition-all ${rating >= star ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-white/5 border-white/10 text-zinc-600'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Tags Display */}
          {(selectedTags.length > 0 || selectedMistakes.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs font-bold text-zinc-500 uppercase">Selected Markers</label>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(t => (
                  <span key={t} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-300 text-xs flex items-center gap-1">
                    {t} <X className="h-3 w-3 cursor-pointer hover:text-red-400" onClick={() => toggleTag(t)} />
                  </span>
                ))}
                {selectedMistakes.map(m => (
                  <span key={m} className="px-2 py-1 rounded-md bg-red-500/5 border border-red-500/10 text-red-400 text-xs flex items-center gap-1">
                    {m} <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => toggleMistake(m)} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-zinc-400 hover:bg-white/5 hover:text-white rounded-2xl h-12">
            Discard
          </Button>
          <Button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 shadow-lg shadow-blue-500/20">
            <Check className="h-4 w-4 mr-2" />
            Complete Journal
          </Button>
        </div>
      </div>
    </div>
  );
}
