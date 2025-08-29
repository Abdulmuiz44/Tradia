// src/components/ai/AIChatInterface.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { TradeContext } from "@/context/TradeContext";
import { useContext } from "react";
import { aiService } from "@/lib/ai/AIService";
import {
  Send,
  Bot,
  User,
  Upload,
  Image,
  FileText,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Target,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageSquare,
  X,
  Download
} from "lucide-react";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  attachments?: {
    type: 'image' | 'analysis';
    url?: string;
    data?: any;
  }[];
  suggestions?: string[];
}


export function AIChatInterface() {
  const { trades, filteredTrades } = useContext(TradeContext) as any;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'ai',
      content: "👋 Hi! I'm Tradia AI, your personal trading assistant. I can help you analyze your trading performance, identify patterns, and provide personalized insights. Feel free to ask me anything about your trading!",
      timestamp: new Date(),
      suggestions: [
        "What's my overall trading performance?",
        "What are my biggest mistakes?",
        "How can I improve my win rate?",
        "Analyze my recent trades"
      ]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const generateAIResponse = async (userMessage: string, images: File[] = []): Promise<string> => {
    const tradeData = filteredTrades.length > 0 ? filteredTrades : trades;

    if (tradeData.length === 0) {
      return `🤖 **Welcome to Tradia AI!**

I don't see any trades in your account yet. Here's how to get started:

**To begin using AI insights:**
1. **Connect your MT5 account** (if you haven't already)
2. **Sync your trade history** from the MT5 Integration tab
3. **Upload some trades** or import CSV data
4. **Ask me questions** about your trading performance

**What I can help you with:**
• 📊 Performance analysis and metrics
• 🎯 Trading pattern identification
• 💡 Personalized improvement recommendations
• 📈 Risk management assessment
• 📸 Screenshot analysis for trade setups
• 🔮 Predictive performance modeling

Once you have some trade data, I can provide detailed, personalized insights about your trading!

**Quick Start:**
- Go to "MT5 Integration" tab to connect your account
- Or upload a CSV file with your trade history
- Then come back here to chat about your performance!

What would you like to know about trading in general?`;
    }

    try {
      // Use the AI service for intelligent responses
      const response = await aiService.generatePersonalizedResponse(userMessage, tradeData, {
        uploadedImages: images
      });

      return response;
    } catch (error) {
      console.error('AI Service Error:', error);
      return `❌ **AI Analysis Error**

I'm having trouble analyzing your data right now. This might be due to:

• **Data Quality**: Some trades might be missing required fields
• **Network Issues**: Connection problems with the AI service
• **Processing Limits**: Too many trades to analyze at once

**Try these solutions:**
1. **Refresh the page** and try again
2. **Check your trade data** for completeness
3. **Ask a simpler question** to start with
4. **Contact support** if the problem persists

**Alternative Questions:**
• "What's my overall performance?"
• "Show me my recent trades"
• "What are my strengths?"
• "Help me improve my trading"

Would you like me to try a different approach?`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && uploadedImages.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      attachments: uploadedImages.map(file => ({
        type: 'image',
        url: URL.createObjectURL(file),
        data: { name: file.name, size: file.size }
      }))
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await generateAIResponse(inputMessage, uploadedImages);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        suggestions: [
          "Tell me more about my performance",
          "What should I focus on next?",
          "Analyze my risk management",
          "Help me with trade planning"
        ]
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "❌ Sorry, I encountered an error analyzing your request. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setUploadedImages([]);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    );

    if (imageFiles.length !== files.length) {
      alert('Some files were skipped. Only images under 10MB are supported.');
    }

    setUploadedImages(prev => [...prev, ...imageFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Tradia AI Assistant</h3>
            <p className="text-sm text-gray-400">Your personal trading coach</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Online
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {/* Avatar */}
              <div className={`flex items-center gap-2 mb-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'ai' && (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <span className="text-xs text-gray-400">
                  {message.type === 'ai' ? 'Tradia AI' : 'You'}
                </span>
                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className={`rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 border border-gray-700'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-700 rounded">
                        <Image className="w-4 h-4" />
                        <span className="text-sm">{attachment.data?.name || 'Screenshot'}</span>
                        {attachment.url && (
                          <img
                            src={attachment.url}
                            alt="Trade screenshot"
                            className="max-w-32 max-h-32 rounded border"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {message.suggestions && message.type === 'ai' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-xs text-gray-400">Tradia AI</span>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing your trading data...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Previews */}
      {uploadedImages.length > 0 && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex flex-wrap gap-2">
            {uploadedImages.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="w-16 h-16 object-cover rounded border border-gray-600"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="text-xs text-gray-400 mt-1 truncate max-w-16">
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div
          className={`relative ${isDragOver ? 'ring-2 ring-blue-500' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask me anything about your trading..."
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />

              {/* Drag overlay */}
              {isDragOver && (
                <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                    <p className="text-blue-400 font-medium">Drop screenshots here</p>
                  </div>
                </div>
              )}
            </div>

            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <Image className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputMessage.trim() && uploadedImages.length === 0)}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />

          {/* Helper text */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>Upload screenshots for AI analysis</span>
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIChatInterface;