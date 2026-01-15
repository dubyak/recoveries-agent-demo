'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Clock, DollarSign, Wifi, Battery, Signal } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Demo loan data
  const loanData = {
    totalOwed: 562.50,
    daysOverdue: 45,
    originalAmount: 500.00,
    fees: 62.50,
  };

  useEffect(() => {
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);

    setTimeout(() => {
      addMessage('assistant', "Hi! I'm Andrea from Tala. I noticed you have an outstanding loan balance. I'm here to help you find a way to get back on track. Can you tell me what's been making it difficult to make your payments?");
    }, 1000);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      setTimeout(() => {
        setIsLoading(false);
        addMessage('assistant', data.response);
      }, 500);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      addMessage('assistant', "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      {/* Android Phone Frame */}
      <div className="relative w-full max-w-[375px] h-[812px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
        {/* Phone Screen */}
        <div className="relative w-full h-full bg-gray-50 rounded-[2.5rem] overflow-hidden flex flex-col">

          {/* Android Status Bar */}
          <div className="bg-tala-500 px-6 py-2 flex items-center justify-between text-white text-xs">
            <span className="font-medium">9:41</span>
            <div className="flex items-center gap-2">
              <Signal className="w-4 h-4" />
              <Wifi className="w-4 h-4" />
              <Battery className="w-5 h-4" />
            </div>
          </div>

          {/* App Header */}
          <header className="bg-tala-500 text-white px-4 py-3 flex items-center gap-3 shadow-md">
            <div className="relative">
              <Image
                src="/andrea.png"
                alt="Andrea"
                width={44}
                height={44}
                className="rounded-full border-2 border-white/30"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-tala-500"></div>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">Andrea</h2>
              <p className="text-xs text-tala-100">Tala Recovery Specialist</p>
            </div>
          </header>

          {/* Loan Summary Card */}
          <div className="px-4 py-3 bg-white border-b border-gray-100">
            <div className="bg-gradient-to-br from-tala-50 to-white rounded-xl p-4 border border-tala-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-tala-600" />
                  <span className="font-semibold text-gray-700 text-sm">Outstanding Balance</span>
                </div>
                <div className="flex items-center gap-1 text-orange-500 text-xs">
                  <Clock className="w-3 h-3" />
                  <span>{loanData.daysOverdue} days overdue</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${loanData.totalOwed.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Original: ${loanData.originalAmount.toFixed(2)} + Fees: ${loanData.fees.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Chat Messages - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">💬</div>
                  <h3 className="font-bold text-base mb-1">Hi! I'm Andrea</h3>
                  <p className="text-xs text-gray-600">
                    I'm here to help you get back on track with your loan.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Image
                      src="/andrea.png"
                      alt="Andrea"
                      width={28}
                      height={28}
                      className="rounded-full mr-2 mt-1 flex-shrink-0"
                    />
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-tala-500 text-white rounded-br-md'
                        : 'bg-white border border-gray-200 rounded-bl-md shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <Image
                    src="/andrea.png"
                    alt="Andrea"
                    width={28}
                    height={28}
                    className="rounded-full mr-2 mt-1 flex-shrink-0"
                  />
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-tala-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-tala-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-tala-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-3">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-tala-500 focus:border-tala-500 outline-none transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-tala-500 text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-tala-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>

          {/* Android Navigation Bar */}
          <div className="bg-gray-100 h-8 flex items-center justify-center gap-16 px-8">
            <div className="w-5 h-5 border-2 border-gray-400 rounded-sm"></div>
            <div className="w-5 h-5 border-2 border-gray-400 rounded-full"></div>
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[14px] border-b-gray-400"></div>
          </div>
        </div>

        {/* Phone Notch/Camera */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-2xl flex items-center justify-center">
          <div className="w-3 h-3 bg-gray-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
