"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

const FOCUS_OPTIONS = [
  {
    key: "confidence",
    title: "Boost my confidence",
    description: "Tighter entries, clearer exits",
    icon: "🎯"
  },
  {
    key: "profits",
    title: "Scale my profits",
    description: "More green weeks, fewer chops",
    icon: "📈"
  },
  {
    key: "automation",
    title: "Automate discipline",
    description: "Risk guard, playbook, alerts",
    icon: "🤖"
  },
  {
    key: "analysis",
    title: "Better analysis",
    description: "Deeper insights, patterns, predictions",
    icon: "📊"
  },
  {
    key: "speed",
    title: "Faster workflow",
    description: "Quick uploads, instant feedback",
    icon: "⚡"
  }
];



export default function SurveyPrompt({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sessionStart] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    try { localStorage.setItem("survey_last_open", String(Date.now())); } catch {}
  }, [isOpen]);



  const resetAndClose = () => {
    setStep(0);
    setFocus(null);
    setRating(null);
    setComment("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
  const sessionDuration = Math.floor((Date.now() - sessionStart) / 1000); // seconds

  // Use Supabase client to insert into user_feedback table
  const supabase = (await import("@supabase/auth-helpers-nextjs")).createClientComponentClient();
  const user = await supabase.auth.getUser();
  const uid = user?.data?.user?.id ?? null;
  const userEmail = user?.data?.user?.email ?? null;

  const feedbackData = {
  user_id: uid,
  user_email: userEmail,
  feedback_text: comment || `Focus: ${focus}, Rating: ${rating}/10`,
  page: window.location.pathname,
    created_at: new Date().toISOString(),
      additional_data: {
      focus,
        rating,
        sessionDuration,
          userAgent: navigator.userAgent,
          pageUrl: window.location.href
        }
      };

      await supabase.from("user_feedback").insert(feedbackData);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
    resetAndClose();
  };

  if (!isOpen) return null;

  const TYPEFORM_URL = process.env.NEXT_PUBLIC_TYPEFORM_URL || "";
  const progress = step === 0 ? 25 : step === 1 ? 65 : 100;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={resetAndClose} />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-indigo-400/40 bg-[#050b18] shadow-[0_0_48px_rgba(129,140,248,0.45)]">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.35)_0%,transparent_65%)]" />
        <div className="relative flex flex-col gap-6 p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-300/80">Growth pulse</p>
              <h3 className="mt-2 text-2xl font-bold text-white">
              Help us improve Tradia for you
              </h3>
              <p className="mt-1 text-sm text-indigo-100/80">
              30 seconds. Real impact. Your feedback shapes our platform.
              </p>
            </div>
            <button onClick={resetAndClose} className="text-sm text-indigo-200/70 hover:text-white">Skip for now</button>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-indigo-200/90">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress className="mt-2 h-2" value={progress} />
          </div>

          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    setFocus(option.key);
                    setStep(1);
                  }}
                  className="group rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-left transition-all hover:border-indigo-400 hover:bg-indigo-500/15 hover:scale-105 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl group-hover:scale-110 transition-transform">{option.icon}</span>
                    <p className="text-sm font-semibold text-white">{option.title}</p>
                  </div>
                  <p className="text-xs text-indigo-100/70 ml-8">{option.description}</p>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-white">How satisfied are you with Tradia?</p>
                <p className="text-xs text-indigo-100/70">Rate your experience from 1 (needs improvement) to 10 (perfect)</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs text-indigo-200/60 px-2">
                  <span>Needs work</span>
                  <span>Perfect</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                    <button
                      key={score}
                      onClick={() => {
                        setRating(score);
                        setStep(2);
                      }}
                      className={`relative h-12 w-12 rounded-full border-2 text-sm font-bold transition-all duration-200 hover:scale-110 ${
                        rating === score
                          ? 'border-white bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                          : 'border-indigo-500/40 bg-indigo-500/10 text-indigo-100/80 hover:border-indigo-400 hover:bg-indigo-500/20 hover:shadow-md'
                      }`}
                    >
                      {score}
                      {rating === score && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button onClick={() => setStep(0)} className="text-xs text-indigo-200/60 hover:text-indigo-100 underline">
                  ← Change focus area
                </button>
                <div className="text-xs text-indigo-200/60">
                  {rating ? `Selected: ${rating}/10` : 'Click to rate'}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center space-y-3">
                <div className="text-4xl animate-bounce">🎉</div>
                <p className="text-lg font-semibold text-white">Almost there!</p>
                <p className="text-sm text-indigo-100/80">Your feedback helps us build the perfect trading platform for you.</p>
              </div>

              <div className="space-y-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">💭</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white mb-2">What&apos;s one thing we could improve?</p>
                    <p className="text-xs text-indigo-100/80 mb-3">Optional but super helpful - we read every response!</p>
                    <textarea
                      className="w-full resize-none rounded-lg border border-indigo-500/40 bg-black/40 p-3 text-sm text-indigo-100 placeholder:text-indigo-200/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[80px]"
                      placeholder='e.g. "Love the AI insights, but wish the chart integration was smoother..."'
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                </div>

                <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 transform hover:scale-[1.02]"
                >
                🚀 Submit Feedback
                </button>
              </div>

              <div className="flex justify-between items-center text-xs text-indigo-200/60">
                <button onClick={() => setStep(1)} className="hover:text-indigo-100 underline">
                  ← Change rating
                </button>
                <span>Step 3 of 3</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
