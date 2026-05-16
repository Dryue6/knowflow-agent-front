import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  Database, 
  MessageSquare, 
  FileText, 
  Settings, 
  Search, 
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Menu,
  X,
  User as UserIcon,
  Plus,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import KnowledgeBasePage from './pages/knowledge-base';
import ChatPage from './pages/chat';
import DocumentsPage from './pages/documents';
import RagDebugPage from './pages/rag-debug';
import AuthPage from './pages/auth';

const translations = {
  zh: {
    kb: '知识库',
    docs: '文档中心',
    chat: '问答助手',
    debug: '检索实验室',
    config: '系统说明',
    online: '系统在线',
    kb_title: '知识库管理',
    docs_title: '文档管理',
    chat_title: '智能问答',
    debug_title: '检索调试',
    logout: '登出',
  },
  en: {
    kb: 'Knowledge Base',
    docs: 'Document Center',
    chat: 'AI Assistant',
    debug: 'Discovery Lab',
    config: 'Configurations',
    online: 'System Active',
    kb_title: 'Manage Knowledge Base',
    docs_title: 'Asset Management',
    chat_title: 'Smart AI Agent',
    debug_title: 'Retrieval Analytics',
    logout: 'Logout',
  }
};

const Sidebar = ({ isOpen, toggle, lang }: { isOpen: boolean; toggle: () => void; lang: 'zh' | 'en' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const t = translations[lang];

  const navItems = [
    { name: t.kb, path: '/kb', icon: Database },
    { name: t.docs, path: '/docs', icon: FileText },
    { name: t.chat, path: '/chat', icon: MessageSquare },
    { name: t.debug, path: '/debug', icon: Search },
    { name: t.config, path: '/config', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-500",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={toggle}
      />
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 z-50 w-72 bg-noble-dark text-stone-300 transition-transform lg:translate-x-0 flex flex-col shadow-chiaroscuro border-r border-gold-500/20",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-10 pb-12 flex items-center gap-4">
          <div className="w-12 h-12 bg-gold-500 rounded-sm flex items-center justify-center shadow-[0_0_20px_rgba(197,160,33,0.3)] rotate-3">
            <Database className="w-6 h-6 text-noble-dark" />
          </div>
          <div>
            <span className="font-serif font-black text-2xl tracking-tighter text-gold-500 italic block leading-none">Knowflow</span>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-600 mt-1 block">Aura of Knowledge</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-5 py-4 rounded-sm transition-all duration-500 group text-sm font-serif italic font-black tracking-wide",
                  isActive 
                    ? "bg-gold-500/10 text-white border-l-2 border-gold-500 shadow-inner" 
                    : "text-stone-500 hover:bg-gold-500/5 hover:text-gold-500"
                )}
                onClick={() => window.innerWidth < 1024 && toggle()}
              >
                <div className={cn(
                  "p-2 rounded-sm transition-all duration-500",
                  isActive ? "bg-gold-500 text-noble-dark scale-110 shadow-lg" : "bg-stone-800/50 text-stone-500 group-hover:text-gold-500"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                {item.name}
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator" 
                    className="ml-auto w-1 h-3 bg-gold-500 shadow-[0_0_10px_#c5a021]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-8">
          <div className="p-5 rounded-sm bg-stone-900/50 border border-gold-500/10 flex items-center gap-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gold-500/2 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-sm bg-stone-800 border border-gold-500/20 flex items-center justify-center text-gold-500 font-serif italic text-lg shadow-inner z-10">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0 z-10">
              <p className="text-sm font-black text-white italic truncate">{user?.displayName || 'Admin'}</p>
              <p className="text-[10px] text-stone-600 font-black uppercase tracking-widest truncate">{user?.username || 'admin'}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-stone-600 hover:text-gold-500 transition-all z-10">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = translations[lang];

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/*" element={
          <PrivateRoute>
            <div className="min-h-screen bg-noble-bg flex text-stone-900 font-sans tracking-tight">
              <Sidebar 
                isOpen={isSidebarOpen} 
                toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
                lang={lang}
              />
              <main className="flex-1 lg:ml-64 flex flex-col min-w-0">
                <header className="h-24 bg-white/40 backdrop-blur-xl border-b border-gold-500/10 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-30 shadow-sm transition-all duration-700">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="p-2 -ml-2 text-gold-600 rounded-sm lg:hidden hover:bg-gold-50"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                      <h1 className="text-2xl font-black text-noble-dark font-serif tracking-tighter italic">
                        {window.location.pathname === '/kb' && t.kb_title}
                        {window.location.pathname === '/docs' && t.docs_title}
                        {window.location.pathname === '/chat' && t.chat_title}
                        {window.location.pathname === '/debug' && t.debug_title}
                      </h1>
                      <div className="h-0.5 w-12 bg-gold-500/60 mt-1 rounded-full shadow-[0_0_8px_#c5a021]" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    {/* Language Switcher */}
                    <div className="flex items-center bg-stone-900/5 p-1 rounded-sm border border-gold-500/10">
                      <button 
                        onClick={() => setLang('zh')}
                        className={cn(
                          "px-6 py-2 text-[11px] font-black uppercase tracking-[0.15em] rounded-sm transition-all font-serif italic",
                          lang === 'zh' ? "bg-noble-dark text-gold-500 shadow-chiaroscuro" : "text-stone-500 hover:text-stone-800"
                        )}
                      >
                        Han
                      </button>
                      <button 
                        onClick={() => setLang('en')}
                        className={cn(
                          "px-6 py-2 text-[11px] font-black uppercase tracking-[0.15em] rounded-sm transition-all font-serif italic",
                          lang === 'en' ? "bg-noble-dark text-gold-500 shadow-chiaroscuro" : "text-stone-500 hover:text-stone-800"
                        )}
                      >
                        Eng
                      </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-stone-900 text-gold-500 rounded-sm text-[11px] font-black uppercase tracking-[0.15em] border border-gold-500/20 shadow-lg font-serif">
                      <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse shadow-[0_0_12px_#c5a021]" />
                      {t.online}
                    </div>
                  </div>
                </header>
                <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
                  <Routes>
                    <Route path="/kb" element={<KnowledgeBasePage />} />
                    <Route path="/docs" element={<DocumentsPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/debug" element={<RagDebugPage />} />
                    <Route path="/config" element={<div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">配置页面开发中...</div>} />
                    <Route path="/" element={<Navigate to="/kb" />} />
                  </Routes>
                </div>
              </main>
            </div>
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
