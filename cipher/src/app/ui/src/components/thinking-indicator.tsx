"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Image from "next/image"

interface ThinkingIndicatorProps {
  className?: string
}

export function ThinkingIndicator({ className }: ThinkingIndicatorProps) {
  return (
    <div className={cn("flex items-end gap-3 px-4 py-2 animate-in fade-in duration-500", className)}>
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="text-xs bg-muted border border-border">
          <Image 
            src="/cipher-logo.svg" 
            alt="Cipher" 
            width={16} 
            height={16} 
            className="w-4 h-4 opacity-70"
          />
        </AvatarFallback>
      </Avatar>
      
      <div className="p-3 rounded-xl shadow-sm max-w-[75%] bg-muted/50 border border-border/50 rounded-bl-none">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s] [animation-duration:1.4s]"></div>
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s] [animation-duration:1.4s]"></div>
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-duration:1.4s]"></div>
          </div>
          <span className="text-sm font-medium">Cipher is thinking...</span>
        </div>
      </div>
    </div>
  )
}