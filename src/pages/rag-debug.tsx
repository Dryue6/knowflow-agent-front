import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ChevronRight, Database, FileText, Loader2, Search, Target } from 'lucide-react';
import { kbApi, ragApi } from '../api';
import { KnowledgeBaseVO, RagSearchChunk } from '../types';

export default function RagDebugPage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseVO[]>([]);
  const [knowledgeBaseId, setKnowledgeBaseId] = useState<number | ''>('');
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.65);
  const [loading, setLoading] = useState(false);
  const [kbLoading, setKbLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState<RagSearchChunk[]>([]);
  const [lastQuery, setLastQuery] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      try {
        const res = await kbApi.list({ page: 1, size: 100 });
        const records = res.data?.data?.records || [];
        setKnowledgeBases(records);
      } catch (err) {
        console.error(err);
        setError('知识库列表加载失败，请检查后端接口。');
      } finally {
        setKbLoading(false);
      }
    };

    fetchKnowledgeBases();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);
    setElapsedMs(null);

    const startedAt = performance.now();
    try {
      const res = await ragApi.search({
        query: query.trim(),
        knowledgeBaseId: knowledgeBaseId === '' ? undefined : knowledgeBaseId,
        topK,
        minScore,
      });
      setResults(res.data?.data?.chunks || []);
      setLastQuery(res.data?.data?.query || query.trim());
      setElapsedMs(Math.round(performance.now() - startedAt));
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || '检索失败，请检查 /api/rag/search 接口。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-10 pb-24">
      <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-[#1a1c1e] text-white rounded-sm shadow-2xl relative overflow-hidden">
        <div className="relative z-10 w-20 h-20 bg-gold-500 text-noble-dark rounded-sm flex items-center justify-center shadow-lg shrink-0">
          <Target className="w-10 h-10" />
        </div>
        <div className="relative z-10 flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-sm text-[10px] font-black uppercase tracking-[0.16em] mb-3 text-gold-500 border border-white/5">
            RAG Search
          </div>
          <h2 className="text-3xl font-bold font-serif text-white">知识检索调试</h2>
          <p className="text-slate-400 mt-2 font-medium max-w-xl">调用真实的 RAG 检索接口，查看命中的文档片段、相似度分数和检索参数。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <form onSubmit={handleSearch} className="bg-white p-2 rounded-sm border border-slate-200 shadow-sm flex items-center gap-2 group">
            <div className="flex-1 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-gold-500 transition-colors" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入要检索的问题"
                className="w-full pl-16 pr-6 py-5 bg-transparent border-none focus:ring-0 text-lg font-bold text-slate-900 placeholder:text-slate-300"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-10 py-4 bg-[#1a1c1e] text-white font-black uppercase tracking-widest text-xs rounded-sm hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '检索'}
            </button>
          </form>

          {error && (
            <div className="flex items-center gap-3 rounded-sm border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {!loading && !error && lastQuery && results.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-sm p-10 text-center text-stone-500"
                >
                  未检索到符合条件的文档片段。
                </motion.div>
              )}

              {results.map((res, idx) => (
                <motion.div
                  key={`${res.documentId}-${res.chunkId}-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="bg-white border border-slate-200 rounded-sm p-8 hover:shadow-xl hover:shadow-gold-500/5 transition-all group border-l-4 border-l-gold-500"
                >
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-slate-50 rounded-sm flex items-center justify-center text-slate-400 group-hover:bg-gold-500 group-hover:text-noble-dark transition-all shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{res.documentName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-sm">片段 #{res.chunkIndex}</span>
                          <span className="text-[10px] font-bold text-gold-700 uppercase bg-gold-50 px-2 py-0.5 rounded-sm">Chunk ID: {res.chunkId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-6">
                      <span className="text-4xl font-serif font-black text-slate-900">
                        {(res.score * 100).toFixed(1)}
                        <span className="text-lg ml-0.5 font-bold text-gold-600">%</span>
                      </span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">相似度</p>
                    </div>
                  </div>

                  <div className="relative pl-8 mb-8">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-slate-100 rounded-full" />
                    <p className="text-base text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{res.content}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase">
                      <span>文档 ID：{res.documentId}</span>
                      <span>查询：{lastQuery}</span>
                    </div>
                    <button type="button" className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-slate-100 transition-colors">
                      片段详情 <ChevronRight className="w-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#1a1c1e] text-white p-8 rounded-sm shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gold-500 mb-6 font-sans">检索参数</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">知识库</label>
                <div className="relative">
                  <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={knowledgeBaseId}
                    onChange={(e) => setKnowledgeBaseId(e.target.value ? Number(e.target.value) : '')}
                    disabled={kbLoading}
                    className="w-full appearance-none rounded-sm border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-sm font-bold text-white outline-none focus:border-gold-500"
                  >
                    <option value="">全部知识库</option>
                    {knowledgeBases.map((kb) => (
                      <option key={kb.id} value={kb.id}>{kb.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                  <span>Top K</span>
                  <span className="text-white">{topK}</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full rounded-sm border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-gold-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                  <span>最低相似度</span>
                  <span className="text-white">{minScore}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full rounded-sm border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-gold-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-gold-50 p-8 rounded-sm border border-gold-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-gold-700 mb-4">接口结果</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gold-200/50">
                <span className="text-[10px] font-bold text-gold-700 uppercase tracking-tight">命中片段</span>
                <span className="text-xs font-bold text-gold-900 font-mono">{results.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gold-200/50">
                <span className="text-[10px] font-bold text-gold-700 uppercase tracking-tight">请求耗时</span>
                <span className="text-xs font-bold text-gold-900 font-mono">{elapsedMs === null ? '-' : `${elapsedMs}ms`}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gold-200/50">
                <span className="text-[10px] font-bold text-gold-700 uppercase tracking-tight">接口</span>
                <span className="text-xs font-bold text-gold-900 font-mono">/rag/search</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
