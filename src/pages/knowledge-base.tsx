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
    <div className="max-w-7xl mx-auto space-y-16 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-10 border-b border-gold-500/20 pb-12 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-gold-500/5 blur-3xl rounded-full" />
        <div className="relative z-10">
          <h2 className="text-5xl font-black text-noble-dark leading-none italic mb-4 font-serif">知识库殿堂</h2>
          <p className="text-stone-600 font-serif italic text-lg font-bold mt-1">构建、管理并检索您的企业私有知识网络</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="gilded-btn group flex items-center gap-3 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gold-500 transition-transform translate-y-full group-hover:translate-y-0 duration-500" />
          <Plus className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform duration-500 group-hover:text-noble-dark" />
          <span className="relative z-10 group-hover:text-noble-dark">启迪新领域</span>
        </button>
      </div>

      <div className="relative group max-w-4xl">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gold-500/40 group-focus-within:text-gold-500 transition-colors" />
        </div>
        <input 
          type="text" 
          placeholder="检索知识之泉..." 
          className="w-full pl-16 pr-8 py-6 bg-white border border-[#e8dec5] rounded-sm focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 transition-all text-lg font-serif italic font-bold shadow-sm placeholder:text-stone-400"
        />
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-8">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-gold-500 animate-spin" />
              <div className="absolute inset-0 blur-2xl bg-gold-500/30" />
            </div>
            <p className="text-gold-700 font-serif italic tracking-widest text-sm uppercase animate-pulse font-black">正在共鸣向量维度...</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            {list.map((kb, idx) => (
              <motion.div
                key={kb.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.8 }}
                className="baroque-card group"
              >
                <div className="absolute top-6 right-6 z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                   <button onClick={() => handleDelete(kb.id)} className="p-3 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-sm transition-all border border-transparent hover:border-red-100 shadow-sm">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>

                <div className="flex items-start gap-6 mb-10">
                  <div className="w-16 h-16 bg-noble-dark border border-gold-500/30 rounded-sm flex items-center justify-center text-gold-500 shadow-chiaroscuro group-hover:rotate-12 transition-all duration-700 transform group-hover:scale-110">
                    <Database className="w-8 h-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-700 py-1.5 px-3 bg-gold-500/5 rounded-sm border border-gold-500/10 italic">
                        {kb.status}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-noble-dark group-hover:text-gold-600 transition-colors truncate italic">{kb.name}</h3>
                  </div>
                </div>

                <p className="text-stone-600 text-sm font-serif italic leading-relaxed mb-12 h-12 line-clamp-2 font-bold transition-opacity">
                  {kb.description || '万卷丛中，自有其灵。此库尚未着墨，静候注疏。'}
                </p>

                <div className="flex items-center justify-between p-1 bg-stone-50/50 border border-[#e8dec5]/50 shadow-inner">
                  <div className="px-6 py-3 border-r border-[#e8dec5]/50 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 block mb-1 font-serif italic">Archived Docs</span>
                    <p className="text-2xl font-serif italic font-black text-noble-dark flex items-baseline gap-1">
                      {kb.documentCount}
                      <span className="text-xs font-bold text-stone-500">册</span>
                    </p>
                  </div>
                  <div className="px-6 py-3 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 block mb-1 font-serif italic">Coded Segments</span>
                    <p className="text-2xl font-serif italic font-black text-noble-dark flex items-baseline gap-1">
                      {kb.chunkCount}
                      <span className="text-xs font-bold text-stone-500">瓣</span>
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 flex items-center justify-between text-[10px] font-black text-stone-500 uppercase tracking-widest italic border-t border-stone-100 pt-4">
                   <span>PROTOCOL: KB-#{kb.id.toString().slice(-4)}</span>
                   <span className="text-gold-600 font-bold">Synchronized</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-noble-dark/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative w-full max-w-xl bg-white shadow-chiaroscuro p-12 border border-gold-500/30"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gold-500 shadow-[0_0_10px_#c5a021]" />
              <h3 className="text-3xl font-black text-noble-dark mb-8 italic font-serif">开辟新知界阈</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-[0.2em] italic">领航之名</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-stone-50 border border-[#e8dec5] rounded-sm focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 transition-all font-serif italic"
                    placeholder="于此命其名..."
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-[0.2em] italic">其志之序</label>
                  <textarea 
                    rows={4}
                    className="w-full px-5 py-4 bg-stone-50 border border-[#e8dec5] rounded-sm focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 transition-all resize-none font-serif italic"
                    placeholder="描绘此域之用途..."
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-12 flex gap-4">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-stone-100 text-stone-500 font-serif italic font-bold border border-stone-200 hover:bg-stone-200 transition-all"
                >
                  暂缓
                </button>
                <button 
                  onClick={handleCreate}
                  className="gilded-btn flex-1"
                >
                  铭刻此时
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
