import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, User, Bot, Paperclip, ChevronDown, Trash2, Plus, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatApi } from '../api';
import { ChatSessionVO, ChatMessageVO, ChatRole, Citation } from '../types';
import { cn } from '../lib/utils';

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSessionVO[]>([]);
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageVO[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    const res = await chatApi.listSessions({});
    const records = res.data?.data?.records || [];
    setSessions(records);
    if (records.length > 0 && !activeSession) {
      setActiveSession(records[0].id);
    }
  };

  const fetchMessages = async (sid: number) => {
    const res = await chatApi.getMessages(sid, { page: 1, size: 50 });
    const records = res.data?.data?.records || [];
    setMessages([...records].reverse());
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSession) {
      fetchMessages(activeSession);
    }
  }, [activeSession]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!input.trim() || !activeSession) return;
    
    const userMsg = input;
    setInput('');
    setLoading(true);
    setStreamingContent('');
    setCurrentCitations([]);

    // Add user message locally
    const newUserMsg: ChatMessageVO = {
      id: Date.now(),
      sessionId: activeSession,
      role: ChatRole.USER,
      content: userMsg,
      citationsJson: null,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      const response = await fetch(`/api/chat/sessions/${activeSession}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg })
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let fullContent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('event: message')) {
            // Next line has the data
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (typeof data === 'string') {
                fullContent += data;
                setStreamingContent(fullContent);
              } else if (Array.isArray(data)) {
                setCurrentCitations(data);
              }
            } catch (e) {}
          }
        }
      }

      // After stream, refresh messages to get the real IDs and citations saved in db
      fetchMessages(activeSession);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setStreamingContent('');
    }
  };

  const createSession = async () => {
    const res = await chatApi.createSession({ title: '新会话 ' + new Date().toLocaleTimeString() });
    setSessions(prev => [res.data.data, ...prev]);
    setActiveSession(res.data.data.id);
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-10 overflow-hidden relative">
      {/* Sidebar - Sessions List (Wood/Dark Pane) */}
      <div className="hidden lg:flex flex-col w-84 bg-noble-dark border border-gold-500/20 shadow-chiaroscuro overflow-hidden relative">
        <div className="absolute inset-0 bg-gold-500/5 opacity-10 pointer-events-none" />
        <div className="p-10 border-b border-gold-500/10 flex items-center justify-between relative z-10">
          <span className="font-serif font-black italic text-2xl text-gold-500 tracking-tighter">会话秘档</span>
          <button 
            onClick={createSession} 
            className="p-2.5 bg-gold-500 text-noble-dark rounded-sm hover:bg-gold-600 transition-all shadow-[0_0_15px_rgba(197,160,33,0.3)] active:scale-90"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar relative z-10">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-5 rounded-sm text-left transition-all group relative border border-transparent",
                activeSession === s.id 
                  ? "bg-gold-500/10 text-white shadow-inner border-gold-500/30" 
                  : "text-stone-500 font-bold hover:bg-gold-500/5 hover:text-stone-300"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-sm transition-all duration-500 rotate-[-5deg]",
                activeSession === s.id ? "bg-gold-500 text-noble-dark shadow-lg" : "bg-stone-800 text-stone-600 group-hover:bg-gold-500/20 group-hover:text-gold-500"
              )}>
                <MessageSquare className="w-4 h-4 shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-serif italic font-black tracking-wide">{s.title}</span>
                <span className="block text-[11px] text-stone-600 uppercase tracking-[0.1em] mt-1 font-serif italic font-black">Chronicle Record</span>
              </div>
              {activeSession === s.id && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1 h-3 bg-gold-500 shadow-[0_0_10px_#c5a021]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area (Marble/Light Pane) */}
      <div className="flex-1 flex flex-col bg-white border border-[#e8dec5] shadow-chiaroscuro overflow-hidden relative">
        <div className="absolute inset-0 bg-gold-500/2 pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto p-8 md:p-16 space-y-12 custom-scrollbar relative">
          {messages.map((m, idx) => (
            <motion.div 
              key={m.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn("flex flex-col", m.role === ChatRole.USER ? "items-end" : "items-start")}
            >
              <div className={cn("flex items-start gap-5 max-w-[85%] group", m.role === ChatRole.USER ? "flex-row-reverse" : "flex-row")}>
                <div className={cn(
                  "w-12 h-12 rounded-sm shrink-0 shadow-lg flex items-center justify-center mt-2 border border-gold-500/30",
                  m.role === ChatRole.USER 
                    ? "bg-noble-dark text-gold-500" 
                    : "bg-gold-500 text-noble-dark"
                )}>
                  {m.role === ChatRole.USER ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                </div>
                
                <div className={cn(
                  "px-10 py-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border transition-all duration-700 relative",
                  m.role === ChatRole.USER 
                    ? "bg-noble-dark text-stone-200 border-gold-500/20 rounded-sm" 
                    : "bg-[#fffdf8] text-stone-900 border-[#e8dec5] rounded-sm marble-bg"
                )}>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <div className="w-1 h-1 bg-gold-500/20 rounded-full" />
                    <div className="w-1 h-1 bg-gold-500/20 rounded-full" />
                  </div>
                  
                  <div className={cn(
                    "markdown-body",
                    m.role === ChatRole.USER ? "prose-invert text-stone-300 font-bold" : ""
                  )}>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
              
              {m.citationsJson && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn("mt-6 flex flex-wrap gap-3", m.role === ChatRole.USER ? "mr-16" : "ml-16")}
                >
                  {JSON.parse(m.citationsJson).map((c: any, i: number) => (
                    <div key={i} className="text-[11px] px-4 py-2 bg-stone-900/5 border border-gold-500/10 rounded-sm text-stone-700 font-serif italic font-black flex items-center gap-2 hover:bg-noble-dark hover:text-gold-500 transition-all cursor-help shadow-sm">
                      <Paperclip className="w-3 h-3 text-gold-500/60" />
                      {c.documentName}
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ))}

          {streamingContent && (
            <div className="flex flex-col items-start">
              <div className="flex items-start gap-5 max-w-[85%]">
                <div className="w-12 h-12 rounded-sm bg-gold-500 text-noble-dark shrink-0 shadow-lg flex items-center justify-center mt-2 border border-gold-500/30">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="px-10 py-8 bg-[#fffdf8] text-stone-900 border-[#e8dec5] rounded-sm shadow-sm relative marble-bg">
                  <div className="markdown-body">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    <motion.span 
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="inline-block w-2 h-5 bg-gold-500 ml-2 align-middle" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading && !streamingContent && (
             <div className="flex items-center gap-5 text-gold-700 text-[11px] font-black tracking-[0.2em] uppercase ml-20 py-6 animate-pulse font-serif italic">
               <div className="flex gap-2">
                 <div className="w-1.5 h-1.5 bg-gold-500 rounded-full" />
                 <div className="w-1.5 h-1.5 bg-gold-500 rounded-full opacity-60" />
                 <div className="w-1.5 h-1.5 bg-gold-500 rounded-full opacity-30" />
               </div>
               Divine Insight is Ascending...
             </div>
          )}
          <div ref={scrollRef} className="h-8" />
        </div>

        {/* Input Area (Gilded Shadow) */}
        <div className="px-12 pb-12 pt-6 bg-gradient-to-t from-white via-white/90 to-transparent relative z-10 border-t border-gold-500/5">
          <div className="max-w-5xl mx-auto relative group">
            <div className="relative flex items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="撰写您的指令或询问知识库..."
                className="w-full bg-stone-50 border border-[#e8dec5] rounded-sm pl-10 pr-24 py-8 text-lg focus:outline-none focus:ring-8 focus:ring-gold-500/5 focus:border-gold-500 transition-all font-serif italic font-black shadow-inner placeholder:text-stone-400 min-h-[96px] resize-none"
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-4 bottom-4 p-5 bg-noble-dark text-gold-500 rounded-sm shadow-chiaroscuro hover:bg-stone-900 disabled:opacity-30 disabled:grayscale transition-all active:scale-90 border border-gold-500/30 group-focus-within:rotate-3"
              >
                <div className="relative">
                  <Send className="w-7 h-7" />
                  <div className="absolute inset-0 bg-gold-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-center text-stone-600 mt-8 font-serif italic uppercase tracking-[0.2em] font-black">
             The Oracle of Knowflow — Illuminated Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}
