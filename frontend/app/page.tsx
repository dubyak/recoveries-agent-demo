'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import LoanSummary from '@/components/LoanSummary';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize session
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);

    // Initial greeting from Andrea
    setTimeout(() => {
      addMessage('assistant', "Hi! I'm Andrea from Tala. I noticed you have an outstanding loan balance. I'm here to help you find a way to get back on track. Can you tell me what's been making it difficult to make your payments?");
    }, 1000);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async (content: string) => {
    // Add user message
    addMessage('user', content);

    // Show typing indicator
    setIsTyping(true);

    try {
      // Call backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId,
          history: messages,
        }),
      });

      const data = await response.json();

      // Simulate typing delay
      setTimeout(() => {
        setIsTyping(false);
        addMessage('assistant', data.response);
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      addMessage('assistant', "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.");
    }
  };

  return (
    <div className="android-frame">
      {/* Status Bar */}
      <div className="bg-tala-purple h-6 flex items-center justify-between px-4 text-white text-xs">
        <span>9:41</span>
        <div className="flex gap-1 items-center">
          <div className="w-4 h-3 border border-white rounded-sm relative">
            <div className="absolute inset-0.5 bg-white"></div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-tala-purple text-white p-4 flex items-center gap-3 shadow-md">
        <div className="relative">
          <Image
            src="/andrea.png"
            alt="Andrea"
            width={48}
            height={48}
            className="rounded-full border-2 border-white"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-tala-purple"></div>
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-lg">Andrea</h1>
          <p className="text-xs text-purple-200">Tala Recovery Specialist</p>
        </div>
      </div>

      {/* Loan Summary Card */}
      <LoanSummary />

      {/* Chat Messages */}
      <div ref={chatContainerRef} className="chat-container px-4 py-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isTyping && (
          <div className="flex items-start gap-2">
            <Image
              src="/andrea.png"
              alt="Andrea"
              width={32}
              height={32}
              className="rounded-full mt-1"
            />
            <div className="bg-tala-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[70%]">
              <div className="typing-indicator flex gap-1">
                <span className="w-2 h-2 bg-tala-gray-400 rounded-full"></span>
                <span className="w-2 h-2 bg-tala-gray-400 rounded-full"></span>
                <span className="w-2 h-2 bg-tala-gray-400 rounded-full"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
    </div>
  );
}
