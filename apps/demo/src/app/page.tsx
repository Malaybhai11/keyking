'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am powered by the KeyKing Zero-Trust Serverless SDK. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Create request payload formatted for OpenAI compatibility
      const payload = messages.map(m => ({ role: m.role, content: m.content })).concat({ role: 'user', content: userMessage });
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      const data = await res.json();
      
      if (res.ok && data.choices && data.choices.length > 0) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.choices[0].message.content,
          provider: data.model || 'Unknown Provider'
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Failed to fetch response'}` }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Could not reach the API.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-12 lg:p-24 bg-[#0a0a0a] text-white selection:bg-amber-500/30">
      
      {/* Background gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-4xl flex flex-col h-[85vh] relative z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-amber-500 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Powered by KeyKing Zero-Trust SDK
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40 text-center">
            Serverless AI Chat
          </h1>
          <p className="text-gray-400 text-center max-w-lg">
            This entire application runs on the edge. No proxy server required. Keys are decrypted on the fly.
          </p>
        </div>

        {/* Chat Container */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div 
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-black rounded-tr-sm' 
                      : 'bg-white/10 text-gray-100 border border-white/5 rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
                </div>
                
                {/* Provider Badge */}
                {msg.provider && (
                  <div className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-gray-500 flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Served by <span className="text-amber-500/80">{msg.provider}</span>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/40 border-t border-white/10">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask something amazing..."
                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl py-4 pl-5 pr-14 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all shadow-inner"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2.5 bg-amber-500 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
