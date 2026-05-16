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
        "fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#1a1c1e] text-slate-300 transition-transform lg:translate-x-0 flex flex-col shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 pb-10 flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-serif font-bold text-2xl tracking-tight text-white block leading-none">Knowflow</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1 block">Enterprise AI</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group text-sm font-medium",
                  isActive 
                    ? "bg-[#2a2d31] text-white shadow-inner" 
                    : "hover:bg-white/5 hover:text-white"
                )}
                onClick={() => window.innerWidth < 1024 && toggle()}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-brand-500 text-white" : "bg-slate-800 text-slate-500 group-hover:text-slate-300"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                {item.name}
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator" 
                    className="ml-auto w-1 h-1 rounded-full bg-brand-500"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.displayName || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.username || 'admin'}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
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
            <div className="min-h-screen bg-slate-50 flex">
              <Sidebar 
                isOpen={isSidebarOpen} 
                toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
                lang={lang}
              />
              <main className="flex-1 lg:ml-64 flex flex-col min-w-0">
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-30">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="p-2 -ml-2 text-slate-500 rounded-lg lg:hidden hover:bg-slate-50"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 font-serif">
                      {window.location.pathname === '/kb' && t.kb_title}
                      {window.location.pathname === '/docs' && t.docs_title}
                      {window.location.pathname === '/chat' && t.chat_title}
                      {window.location.pathname === '/debug' && t.debug_title}
                    </h1>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {/* Language Switcher */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                      <button 
                        onClick={() => setLang('zh')}
                        className={cn(
                          "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                          lang === 'zh' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        中文
                      </button>
                      <button 
                        onClick={() => setLang('en')}
                        className={cn(
                          "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                          lang === 'en' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        EN
                      </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border border-emerald-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
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
