'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// Tala brand color
const TALA_COLOR = '#00c39b';
const TALA_LIGHT = '#e6f9f5';
const TALA_DARK = '#00a784';

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          history: messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString()
          })),
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Android Phone Frame */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '375px',
        height: '812px',
        backgroundColor: '#1f2937',
        borderRadius: '48px',
        padding: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Phone Screen */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: '#f9fafb',
          borderRadius: '40px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>

          {/* Status Bar */}
          <div style={{
            backgroundColor: TALA_COLOR,
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'white',
            fontSize: '12px'
          }}>
            <span style={{ fontWeight: 500 }}>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16" />
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
              </svg>
              <svg width="20" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="6" width="18" height="12" rx="2" />
                <line x1="23" y1="10" x2="23" y2="14" />
              </svg>
            </div>
          </div>

          {/* App Header */}
          <header style={{
            backgroundColor: TALA_COLOR,
            color: 'white',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ position: 'relative' }}>
              <Image
                src="/andrea.png"
                alt="Andrea"
                width={44}
                height={44}
                style={{ borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '12px',
                height: '12px',
                backgroundColor: '#4ade80',
                borderRadius: '50%',
                border: `2px solid ${TALA_COLOR}`
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontWeight: 700, fontSize: '18px', margin: 0 }}>Andrea</h2>
              <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>Tala Recovery Specialist</p>
            </div>
          </header>

          {/* Loan Summary Card */}
          <div style={{ padding: '12px 16px', backgroundColor: 'white', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{
              background: `linear-gradient(135deg, ${TALA_LIGHT} 0%, white 100%)`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${TALA_LIGHT}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TALA_DARK} strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span style={{ fontWeight: 600, color: '#374151', fontSize: '14px' }}>Outstanding Balance</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f97316', fontSize: '12px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{loanData.daysOverdue} days overdue</span>
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                ${loanData.totalOwed.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Original: ${loanData.originalAmount.toFixed(2)} + Fees: ${loanData.fees.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                  <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Hi! I'm Andrea</h3>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>
                    I'm here to help you get back on track with your loan.
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  {message.role === 'assistant' && (
                    <Image
                      src="/andrea.png"
                      alt="Andrea"
                      width={28}
                      height={28}
                      style={{ borderRadius: '50%', marginRight: '8px', marginTop: '4px', flexShrink: 0 }}
                    />
                  )}
                  <div style={{
                    maxWidth: '75%',
                    borderRadius: '16px',
                    padding: '8px 12px',
                    backgroundColor: message.role === 'user' ? TALA_COLOR : 'white',
                    color: message.role === 'user' ? 'white' : '#111827',
                    border: message.role === 'user' ? 'none' : '1px solid #e5e7eb',
                    borderBottomRightRadius: message.role === 'user' ? '4px' : '16px',
                    borderBottomLeftRadius: message.role === 'user' ? '16px' : '4px',
                    boxShadow: message.role === 'assistant' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}>
                    <p style={{ fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Image
                    src="/andrea.png"
                    alt="Andrea"
                    width={28}
                    height={28}
                    style={{ borderRadius: '50%', marginRight: '8px', marginTop: '4px', flexShrink: 0 }}
                  />
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    borderBottomLeftRadius: '4px',
                    padding: '12px 16px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: TALA_COLOR,
                            borderRadius: '50%',
                            animation: 'bounce 1s infinite',
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div style={{ backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: '12px' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '24px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = TALA_COLOR}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  backgroundColor: isLoading || !input.trim() ? '#9ca3af' : TALA_COLOR,
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '24px',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                Send
              </button>
            </form>
          </div>

          {/* Android Navigation Bar */}
          <div style={{
            backgroundColor: '#f3f4f6',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '64px',
            padding: '0 32px'
          }}>
            <div style={{ width: '20px', height: '20px', border: '2px solid #9ca3af', borderRadius: '4px' }} />
            <div style={{ width: '20px', height: '20px', border: '2px solid #9ca3af', borderRadius: '50%' }} />
            <div style={{
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderBottom: '14px solid #9ca3af'
            }} />
          </div>
        </div>

        {/* Phone Notch */}
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '96px',
          height: '24px',
          backgroundColor: '#1f2937',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#374151', borderRadius: '50%' }} />
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
