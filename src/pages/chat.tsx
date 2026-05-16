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
    <div className="h-[calc(100vh-10rem)] flex gap-8 overflow-hidden relative">
      {/* Sidebar - Sessions List */}
      <div className="hidden lg:flex flex-col w-80 bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <span className="font-serif font-bold text-xl text-slate-900">会话档案</span>
          <button 
            onClick={createSession} 
            className="p-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 active:scale-90"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-3xl text-left transition-all group relative",
                activeSession === s.id 
                  ? "bg-white text-brand-600 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-100" 
                  : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-colors",
                activeSession === s.id ? "bg-brand-50 text-brand-600" : "bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-400"
              )}>
                <MessageSquare className="w-4 h-4 shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{s.title}</span>
                <span className="block text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">2 messages</span>
              </div>
              {activeSession === s.id && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-[3rem] border border-slate-200/60 overflow-hidden shadow-2xl shadow-slate-200/60 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-50/30 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 custom-scrollbar relative">
          {messages.map((m, idx) => (
            <motion.div 
              key={m.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={cn("flex flex-col", m.role === ChatRole.USER ? "items-end" : "items-start")}
            >
              <div className="flex items-end gap-3 max-w-[85%] group">
                {m.role === ChatRole.ASSISTANT && (
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-500/20 order-first mb-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={cn(
                  "rounded-[2rem] px-7 py-5 shadow-sm transition-all duration-300",
                  m.role === ChatRole.USER 
                    ? "bg-[#1a1c1e] text-white rounded-tr-sm shadow-xl shadow-slate-900/10" 
                    : "bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100"
                )}>
                  <div className={cn(
                    "prose prose-sm max-w-none leading-relaxed",
                    m.role === ChatRole.USER ? "prose-invert text-white/90" : "prose-slate"
                  )}>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
              
              {m.citationsJson && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex flex-wrap gap-2 ml-10"
                >
                  {JSON.parse(m.citationsJson).map((c: any, i: number) => (
                    <div key={i} className="text-[10px] px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-full text-slate-500 font-bold flex items-center gap-2 hover:bg-brand-50 hover:text-brand-600 transition-colors cursor-help">
                      <Paperclip className="w-3 h-3" />
                      {c.documentName}
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ))}

          {streamingContent && (
            <div className="flex flex-col items-start">
              <div className="flex items-end gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-500/20 mb-1">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-[2rem] px-7 py-5 bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100 shadow-sm">
                  <div className="prose prose-sm max-w-none prose-slate leading-relaxed">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    <motion.span 
                      animate={{ opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="inline-block w-1.5 h-4 bg-brand-500 ml-1 align-middle rounded-full" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading && !streamingContent && (
             <div className="flex items-center gap-4 text-slate-400 text-xs font-bold tracking-widest uppercase ml-11 py-4">
               <div className="flex gap-1">
                 <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-brand-500 rounded-full" />
                 <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-brand-500 rounded-full" />
                 <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-brand-500 rounded-full" />
               </div>
               AI IS DEEP-SEARCHING...
             </div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="px-8 pb-8 pt-4 bg-gradient-to-t from-white via-white to-transparent relative z-10">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-x-0 bottom-full h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            <div className="relative flex items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="发送指令或询问知识库..."
                className="w-full bg-slate-100 border-none rounded-[2rem] pl-7 pr-16 py-6 text-base focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all shadow-inner font-medium placeholder:text-slate-400 min-h-[72px]"
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-3 bottom-3 p-3.5 bg-brand-500 text-white rounded-2xl shadow-xl shadow-brand-500/30 hover:bg-brand-600 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 group-focus-within:rotate-[-5deg]"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-center text-slate-300 mt-6 font-bold uppercase tracking-[0.2em]">
             Protocol 5.0 — Neural Knowledge Discovery Engine
          </p>
        </div>
      </div>
    </div>
  );
}
