'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

export default function ChatAssistant() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<string[]>([]);

  const sendMessage = () => {
    if (!message) return;
    setChat([...chat, `👤: ${message}`, `🤖: I'm thinking about ${message}...`]);
    setMessage('');
  };

  return (
    <div className="bg-white p-4 mt-8 rounded-xl shadow-sm">
      <h3 className="font-semibold mb-3">Tradia AI Assistant</h3>
      <div className="h-40 overflow-y-auto border rounded p-2 mb-2">
        {chat.map((line, i) => (
          <p key={i} className="text-sm text-gray-700 mb-1">{line}</p>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-1 w-full"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask Tradia AI anything..."
        />
        <Button onClick={sendMessage}>
          Send
        </Button>
      </div>
    </div>
  );
}
