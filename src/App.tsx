import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  Database,
  MessageSquare,
  FileText,
  Settings,
  Search,
  LogOut,
  Menu,
  User as UserIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import KnowledgeBasePage from './pages/knowledge-base';
import ChatPage from './pages/chat';
import DocumentsPage from './pages/documents';
import RagDebugPage from './pages/rag-debug';
import AuthPage from './pages/auth';

const translations = {
  zh: {
    kb: '知识库',
    docs: '文档管理',
    chat: '问答助手',
    debug: '检索调试',
    config: '系统说明',
    online: '系统在线',
    kb_title: '知识库管理',
    docs_title: '文档管理',
    chat_title: '智能问答',
    debug_title: '检索调试',
    config_title: '系统说明',
    logout: '退出登录',
  },
  en: {
    kb: 'Knowledge Base',
    docs: 'Documents',
    chat: 'Assistant',
    debug: 'Retrieval Debug',
    config: 'System',
    online: 'Online',
    kb_title: 'Knowledge Base',
    docs_title: 'Documents',
    chat_title: 'Assistant',
    debug_title: 'Retrieval Debug',
    config_title: 'System',
    logout: 'Logout',
  },
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
          'fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-all duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={toggle}
      />
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-72 bg-noble-dark text-stone-300 transition-transform md:translate-x-0 flex flex-col shadow-chiaroscuro border-r border-gold-500/20',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="p-8 pb-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-gold-500 rounded-sm flex items-center justify-center shadow-[0_0_20px_rgba(197,160,33,0.3)]">
            <Database className="w-6 h-6 text-noble-dark" />
          </div>
          <div>
            <span className="font-serif font-black text-2xl tracking-tighter text-gold-500 block leading-none">Knowflow</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500 mt-1 block">Knowledge Agent</span>
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
                  'flex items-center gap-3 px-5 py-4 rounded-sm transition-all duration-300 group text-sm font-bold tracking-wide',
                  isActive
                    ? 'bg-gold-500/10 text-white border-l-2 border-gold-500 shadow-inner'
                    : 'text-stone-500 hover:bg-gold-500/5 hover:text-gold-500',
                )}
                onClick={() => window.innerWidth < 768 && toggle()}
              >
                <div
                  className={cn(
                    'p-2 rounded-sm transition-all duration-300',
                    isActive ? 'bg-gold-500 text-noble-dark shadow-lg' : 'bg-stone-800/50 text-stone-500 group-hover:text-gold-500',
                  )}
                >
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

        <div className="p-6">
          <div className="p-5 rounded-sm bg-stone-900/50 border border-gold-500/10 flex items-center gap-3 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-sm bg-stone-800 border border-gold-500/20 flex items-center justify-center text-gold-500 font-bold text-lg shadow-inner z-10">
              {user?.displayName?.charAt(0) || <UserIcon className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0 z-10">
              <p className="text-sm font-bold text-white truncate">{user?.displayName || '管理员'}</p>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest truncate">{user?.username || 'admin'}</p>
            </div>
            <button title={t.logout} onClick={handleLogout} className="p-2 text-stone-500 hover:text-gold-500 transition-all z-10">
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

const AppShell = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const location = useLocation();
  const t = translations[lang];

  const pageTitle =
    location.pathname === '/kb'
      ? t.kb_title
      : location.pathname === '/docs'
        ? t.docs_title
        : location.pathname === '/chat'
          ? t.chat_title
          : location.pathname === '/debug'
            ? t.debug_title
            : t.config_title;

  return (
    <PrivateRoute>
      <div className="min-h-screen bg-noble-bg text-stone-900 font-sans tracking-tight overflow-x-auto">
        <div className="min-h-screen md:min-w-[1180px]">
          <Sidebar
            isOpen={isSidebarOpen}
            toggle={() => setIsSidebarOpen(!isSidebarOpen)}
            lang={lang}
          />
          <main className="flex min-h-screen flex-col md:ml-72">
            <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-gold-500/10 flex items-center justify-between px-6 md:px-10 sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-6 min-w-0">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 -ml-2 text-gold-600 rounded-sm md:hidden hover:bg-gold-50"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-2xl font-black text-noble-dark font-serif tracking-tight truncate">
                    {pageTitle}
                  </h1>
                  <div className="h-0.5 w-12 bg-gold-500/60 mt-1 rounded-full shadow-[0_0_8px_#c5a021]" />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center bg-stone-900/5 p-1 rounded-sm border border-gold-500/10">
                  <button
                    onClick={() => setLang('zh')}
                    className={cn(
                      'px-5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] rounded-sm transition-all',
                      lang === 'zh' ? 'bg-noble-dark text-gold-500 shadow-chiaroscuro' : 'text-stone-500 hover:text-stone-800',
                    )}
                  >
                    中文
                  </button>
                  <button
                    onClick={() => setLang('en')}
                    className={cn(
                      'px-5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] rounded-sm transition-all',
                      lang === 'en' ? 'bg-noble-dark text-gold-500 shadow-chiaroscuro' : 'text-stone-500 hover:text-stone-800',
                    )}
                  >
                    EN
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-stone-900 text-gold-500 rounded-sm text-[11px] font-bold uppercase tracking-[0.12em] border border-gold-500/20 shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse shadow-[0_0_12px_#c5a021]" />
                  {t.online}
                </div>
              </div>
            </header>
            <div className="flex-1 p-4 md:p-8">
              <Routes>
                <Route path="/kb" element={<KnowledgeBasePage />} />
                <Route path="/docs" element={<DocumentsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/debug" element={<RagDebugPage />} />
                <Route path="/config" element={<div className="bg-white p-8 rounded-sm shadow-sm border border-slate-200">系统说明页面正在开发中。</div>} />
                <Route path="/" element={<Navigate to="/kb" />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </PrivateRoute>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}
