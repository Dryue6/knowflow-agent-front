import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Database, MoreVertical, Trash2, Edit3, Loader2, BookOpen, Layers } from 'lucide-react';
import { kbApi } from '../api';
import { KnowledgeBaseVO, KnowledgeBaseStatus } from '../types';

export default function KnowledgeBasePage() {
  const [list, setList] = useState<KnowledgeBaseVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchList = async () => {
    try {
      const res = await kbApi.list({});
      setList(res.data?.data?.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async () => {
    try {
      await kbApi.create(form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      fetchList();
    } catch (err) {
      alert('创建失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定删除该知识库吗？')) {
      try {
        await kbApi.delete(id);
        fetchList();
      } catch (err) {
        alert('删除失败');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 leading-tight">知识库中心</h2>
          <p className="text-slate-500 mt-2 font-medium">构建、管理并检索您的企业私有知识网络</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl font-bold shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-95 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          初始化新索引
        </button>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
        </div>
        <input 
          type="text" 
          placeholder="检索知识库、文档关键词或切片描述..." 
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-3xl focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all text-base shadow-sm font-medium placeholder:text-slate-300"
        />
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-brand-500/20" />
            </div>
            <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">正在同步向量索引...</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {list.map((kb, idx) => (
              <motion.div
                key={kb.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bento-card group relative overflow-hidden"
              >
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                   <button onClick={() => handleDelete(kb.id)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>

                <div className="flex items-start gap-5 mb-8">
                  <div className="w-14 h-14 bg-brand-50 rounded-3xl flex items-center justify-center text-brand-600 shadow-inner group-hover:bg-brand-500 group-hover:text-white transition-all duration-500 transform group-hover:rotate-6">
                    <Database className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 py-1 px-2 bg-brand-50 rounded-lg">
                        {kb.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">{kb.name}</h3>
                  </div>
                </div>

                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10 h-10 line-clamp-2 italic">
                  {kb.description || '暂无详细描述，系统已自动根据内容进行聚类索引。'}
                </p>

                <div className="flex items-center justify-between p-1 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="px-4 py-2 border-r border-slate-100 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Documents</span>
                    <p className="text-xl font-bold text-slate-900 flex items-baseline gap-1">
                      {kb.documentCount}
                      <span className="text-xs font-normal text-slate-400">份</span>
                    </p>
                  </div>
                  <div className="px-4 py-2 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Chunks</span>
                    <p className="text-xl font-bold text-slate-900 flex items-baseline gap-1">
                      {kb.chunkCount}
                      <span className="text-xs font-normal text-slate-400">片</span>
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-tighter">
                   <span>ID: KB-#{kb.id.toString().slice(-4)}</span>
                   <span>Last Sync: 2m ago</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">新建知识库</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">名称</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="例如：公司行政制度"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">描述</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    placeholder="描述这个知识库的内容和用途..."
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={handleCreate}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  确认创建
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
