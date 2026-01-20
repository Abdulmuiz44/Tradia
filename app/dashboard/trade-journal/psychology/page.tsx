"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Plus, Smile, Frown, Meh, AlertCircle, Heart, Zap } from "lucide-react";
import { format } from "date-fns";

const MOODS = [
    { label: "Calm", icon: Smile, color: "bg-green-500" },
    { label: "Confident", icon: Zap, color: "bg-blue-500" },
    { label: "Focused", icon: Brain, color: "bg-purple-500" },
    { label: "Neutral", icon: Meh, color: "bg-gray-500" },
    { label: "Curious", icon: Heart, color: "bg-pink-500" },
    { label: "Tense", icon: AlertCircle, color: "bg-yellow-500" },
    { label: "Tilted", icon: Frown, color: "bg-red-500" },
];

const PROMPTS = [
    "What was the exact trigger for entering the trade?",
    "How aligned was this setup with your playbook?",
    "What emotion was strongest before taking the trade?",
    "If you could replay this trade, what would you adjust?",
    "Did the position size respect your risk parameters?",
    "What confirmed the exit, and did you follow it precisely?",
];

export default function PsychologyPage() {
    const { data: session } = useSession();
    const storageKey = "trading_psych_note_" + (session?.user?.email ?? session?.user?.name ?? "anon");

    const [psychNote, setPsychNote] = useState("");
    const [currentPrompt, setCurrentPrompt] = useState(PROMPTS[0]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(storageKey);
            if (saved) setPsychNote(saved);
        }
    }, [storageKey]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem(storageKey, psychNote);
        }
    }, [psychNote, storageKey]);

    const addMoodStamp = (mood: string) => {
        const stamp = `[${format(new Date(), "PPP p")}] Mood: ${mood}`;
        setPsychNote((prev) => (prev ? `${prev}\n${stamp}` : stamp));
    };

    const randomPrompt = () => {
        setCurrentPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    };

    return (
        <div className="space-y-6">
            {/* Mood Tracker */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-500" />
                        Mood Tracker
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Track your emotional state before and during trading sessions.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {MOODS.map((mood) => {
                            const Icon = mood.icon;
                            return (
                                <Button
                                    key={mood.label}
                                    variant="outline"
                                    onClick={() => addMoodStamp(mood.label)}
                                    className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <span className={`w-2 h-2 rounded-full ${mood.color} mr-2`} />
                                    {mood.label}
                                </Button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Reflection Prompt */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Reflection Prompt
                        </span>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={randomPrompt}
                            className="text-gray-600 dark:text-gray-400"
                        >
                            New Prompt
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <p className="text-lg font-medium text-gray-900 dark:text-white italic">
                        {`"${currentPrompt}"`}
                    </p>
                </CardContent>
            </Card>

            {/* Psychology Journal */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Heart className="h-5 w-5 text-pink-500" />
                        Psychology Journal
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <textarea
                        value={psychNote}
                        onChange={(e) => setPsychNote(e.target.value)}
                        placeholder="Write your thoughts, reflections, and emotional observations here..."
                        rows={12}
                        className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Your notes are saved automatically in your browser.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
