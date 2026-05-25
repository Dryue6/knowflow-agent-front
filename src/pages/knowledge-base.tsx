import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Database, Loader2, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { kbApi } from '../api';
import { KnowledgeBaseStatus, KnowledgeBaseVO } from '../types';

const statusOptions = [
  { value: KnowledgeBaseStatus.ACTIVE, label: '启用' },
  { value: KnowledgeBaseStatus.DISABLED, label: '停用' },
];

const emptyForm = {
  name: '',
  description: '',
  status: KnowledgeBaseStatus.ACTIVE,
};

export default function KnowledgeBasePage() {
  const navigate = useNavigate();
  const [list, setList] = useState<KnowledgeBaseVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBaseVO | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');

  const fetchList = async (nextKeyword = keyword) => {
    setLoading(true);
    try {
      const res = await kbApi.list({ page: 1, size: 50, keyword: nextKeyword || undefined });
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchList(keyword);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [keyword]);

  const openCreateModal = () => {
    setEditingKb(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (kb: KnowledgeBaseVO) => {
    setEditingKb(kb);
    setForm({
      name: kb.name,
      description: kb.description || '',
      status: kb.status,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingKb(null);
    setForm(emptyForm);
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      await kbApi.create({
        name: form.name,
        description: form.description,
      });
      closeModal();
      fetchList();
    } catch (err) {
      alert('创建失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingKb) return;

    try {
      setSaving(true);
      await kbApi.update(editingKb.id, {
        name: form.name,
        description: form.description,
        status: form.status,
      });
      closeModal();
      fetchList();
    } catch (err) {
      alert('修改失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert('请输入知识库名称。');
      return;
    }

    if (editingKb) {
      handleUpdate();
      return;
    }

    handleCreate();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除该知识库吗？')) {
      try {
        await kbApi.delete(id);
        fetchList();
      } catch (err) {
        alert('删除失败，请稍后重试。');
      }
    }
  };

  return (
    <div className="w-full space-y-12 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 border-b border-gold-500/20 pb-10 relative">
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-noble-dark leading-none mb-4 font-serif">知识库管理</h2>
          <p className="text-stone-600 text-base font-medium mt-1">创建、维护并检索企业内部知识库。</p>
        </div>
        <button
          onClick={openCreateModal}
          className="gilded-btn group flex items-center justify-center gap-3 relative overflow-hidden"
        >
          <Plus className="w-5 h-5 relative z-10" />
          <span className="relative z-10">新建知识库</span>
        </button>
      </div>

      <div className="relative group max-w-4xl">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gold-500/50 group-focus-within:text-gold-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="搜索知识库"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full pl-16 pr-8 py-5 bg-white border border-[#e8dec5] rounded-sm focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 transition-all text-base shadow-sm placeholder:text-stone-400"
        />
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-36 space-y-6">
            <Loader2 className="w-14 h-14 text-gold-500 animate-spin" />
            <p className="text-gold-700 text-sm font-bold tracking-wide">正在加载知识库...</p>
          </div>
        ) : list.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 px-6 border border-dashed border-[#e8dec5] bg-white/70 shadow-sm"
          >
            <div className="w-16 h-16 bg-stone-50 border border-[#e8dec5] rounded-sm flex items-center justify-center text-gold-500 shadow-inner">
              <Database className="w-8 h-8" />
            </div>
            <p className="mt-6 text-lg font-black text-noble-dark">未查询到相关数据库</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
          >
            {list.map((kb, idx) => (
              <motion.div
                key={kb.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.4 }}
                className="baroque-card group"
              >
                <div className="absolute top-6 right-6 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <button
                    title="编辑知识库"
                    onClick={() => openEditModal(kb)}
                    className="p-3 text-stone-400 hover:text-gold-700 hover:bg-gold-50 rounded-sm transition-all border border-transparent hover:border-gold-100 shadow-sm"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    title="删除知识库"
                    onClick={() => handleDelete(kb.id)}
                    className="p-3 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-sm transition-all border border-transparent hover:border-red-100 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start gap-5 mb-8">
                  <div className="w-14 h-14 bg-noble-dark border border-gold-500/30 rounded-sm flex items-center justify-center text-gold-500 shadow-chiaroscuro">
                    <Database className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex text-[11px] font-bold uppercase tracking-[0.1em] text-gold-700 py-1.5 px-3 bg-gold-500/5 rounded-sm border border-gold-500/10">
                      {kb.status}
                    </span>
                    <h3 className="mt-3 text-2xl font-black text-noble-dark group-hover:text-gold-600 transition-colors truncate">{kb.name}</h3>
                  </div>
                </div>

                <p className="text-stone-600 text-sm leading-relaxed mb-10 h-12 line-clamp-2 font-medium">
                  {kb.description || '暂无描述。'}
                </p>

                <div className="flex items-center justify-between p-1 bg-stone-50/50 border border-[#e8dec5]/50 shadow-inner">
                  <div className="px-6 py-3 border-r border-[#e8dec5]/50 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 block mb-1">文档数</span>
                    <p className="text-2xl font-serif font-black text-noble-dark flex items-baseline gap-1">
                      {kb.documentCount}
                      <span className="text-xs font-bold text-stone-500">个</span>
                    </p>
                  </div>
                  <div className="px-6 py-3 flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 block mb-1">分块数</span>
                    <p className="text-2xl font-serif font-black text-noble-dark flex items-baseline gap-1">
                      {kb.chunkCount}
                      <span className="text-xs font-bold text-stone-500">段</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/docs?knowledgeBaseId=${kb.id}`)}
                  className="mt-6 w-full flex items-center justify-center gap-3 px-5 py-3 bg-noble-dark text-gold-500 rounded-sm border border-gold-500/30 shadow-chiaroscuro hover:bg-stone-900 hover:border-gold-500 transition-all active:scale-[0.99] font-serif font-bold"
                >
                  <Upload className="w-4 h-4" />
                  添加文档
                </button>

                <div className="mt-8 flex items-center justify-between text-[10px] font-bold text-stone-500 uppercase tracking-widest border-t border-stone-100 pt-4">
                  <span>KB-#{kb.id.toString().slice(-4)}</span>
                  <span className="text-gold-600">已同步</span>
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
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ type: 'spring', damping: 22 }}
              className="relative w-full max-w-xl bg-white shadow-chiaroscuro p-10 border border-gold-500/30"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gold-500 shadow-[0_0_10px_#c5a021]" />
              <h3 className="text-2xl font-black text-noble-dark mb-8 font-serif">
                {editingKb ? '修改知识库信息' : '新建知识库'}
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-[0.16em]">知识库名称</label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-stone-50 border border-[#e8dec5] rounded-sm focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 transition-all"
                    placeholder="请输入知识库名称"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-[0.16em]">知识库描述</label>
                  <textarea
                    rows={4}
                    className="w-full px-5 py-4 bg-stone-50 border border-[#e8dec5] rounded-sm focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 transition-all resize-none"
                    placeholder="请输入知识库用途或内容范围"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                {editingKb && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-[0.16em]">知识库状态</label>
                    <select
                      className="w-full px-5 py-4 bg-stone-50 border border-[#e8dec5] rounded-sm focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 transition-all"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as KnowledgeBaseStatus })}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-10 flex gap-4">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 py-4 bg-stone-100 text-stone-600 font-bold border border-stone-200 hover:bg-stone-200 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="gilded-btn flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? '正在保存...' : editingKb ? '保存修改' : '确认创建'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
