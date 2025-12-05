// src/components/ai/ModeSelector.tsx
"use client";

import React from 'react';
import { TradiaMode, getModeTemplate, getAllModes } from '@/lib/modes';
import { cn } from '@/lib/utils';

interface ModeSelectorProps {
  currentMode: TradiaMode;
  onModeChange: (mode: TradiaMode) => void;
  disabled?: boolean;
  className?: string;
}

const MODE_ICONS: Record<TradiaMode, string> = {
  coach: '💪',
  mentor: '🎓',
  assistant: '🤖',
  analysis: '📊',
  journal: '📝'
};

const MODE_COLORS: Record<TradiaMode, string> = {
  coach: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/30',
  mentor: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/30',
  assistant: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/30',
  analysis: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/30',
  journal: 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 border-pink-500/30'
};

export function ModeSelector({ currentMode, onModeChange, disabled, className }: ModeSelectorProps) {
  const modes = getAllModes();

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {modes.map((mode) => {
        const template = getModeTemplate(mode);
        const isActive = currentMode === mode;
        
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            disabled={disabled}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
              "flex items-center gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isActive
                ? MODE_COLORS[mode] + " ring-2 ring-offset-2 ring-offset-[#061226]"
                : "bg-white/5 text-gray-400 hover:bg-white/10 border-white/10"
            )}
            title={template.description}
          >
            <span className="text-lg">{MODE_ICONS[mode]}</span>
            <span className="capitalize">{mode}</span>
          </button>
        );
      })}
    </div>
  );
}

// Compact version for mobile
export function ModeDropdown({ currentMode, onModeChange, disabled }: ModeSelectorProps) {
  const modes = getAllModes();
  const currentTemplate = getModeTemplate(currentMode);

  return (
    <div className="relative">
      <select
        value={currentMode}
        onChange={(e) => onModeChange(e.target.value as TradiaMode)}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 rounded-lg border text-sm font-medium",
          "bg-[#0a1929] text-white border-white/10",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "appearance-none cursor-pointer"
        )}
      >
        {modes.map((mode) => {
          const template = getModeTemplate(mode);
          return (
            <option key={mode} value={mode}>
              {MODE_ICONS[mode]} {template.name} - {template.description}
            </option>
          );
        })}
      </select>
    </div>
  );
}

// Mode info display
export function ModeInfo({ mode }: { mode: TradiaMode }) {
  const template = getModeTemplate(mode);
  
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      MODE_COLORS[mode]
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{MODE_ICONS[mode]}</span>
        <h3 className="font-bold text-lg">{template.name}</h3>
      </div>
      
      <p className="text-sm mb-3 opacity-90">{template.description}</p>
      
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Example questions:</p>
        <ul className="text-xs space-y-1 opacity-80">
          {template.exampleQuestions.slice(0, 3).map((q, i) => (
            <li key={i}>• {q}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
