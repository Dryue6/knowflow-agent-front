import React, { useState } from 'react';
import { Search, Loader2, Database, Layers, ChevronRight, FileText, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function RagDebugPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    // Simulate RAG search
    setTimeout(() => {
      setResults([
        {
          chunkId: 101,
          documentName: "员工手册.pdf",
          score: 0.92,
          content: "公司为员工提供每年一度的体检服务。体检范围包括常规内外科检查、血液检查、影像学检查等。员工可根据个人意愿选择合作的体检机构..."
        },
        {
          chunkId: 102,
          documentName: "差旅制度2024.docx",
          score: 0.78,
          content: "境内出差住宿费标准为城市类别一等（北京、上海、广州、深圳）：600元/天；二等（各省会城市）：450元/天。超出部分需自行承担..."
        }
      ]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24">
      <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-[#1a1c1e] text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full" />
        <div className="relative z-10 w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
          <Target className="w-10 h-10" />
        </div>
        <div className="relative z-10 flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-brand-400 border border-white/5">
             Neural Engine Debug Console
          </div>
          <h2 className="text-3xl font-bold font-serif">知识检索实验室</h2>
          <p className="text-slate-400 mt-2 font-medium max-w-xl">Deep Vision: 观测多维向量空间中的语义对齐，优化 RAG 检索链路</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white p-2 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-2 group">
            <div className="flex-1 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
              <input 
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="键入查询指令以探测向量关联..."
                className="w-full pl-16 pr-6 py-5 bg-transparent border-none focus:ring-0 text-lg font-bold text-slate-900 placeholder:text-slate-300"
              />
            </div>
            <button 
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-10 py-4 bg-[#1a1c1e] text-white font-black uppercase tracking-widest text-xs rounded-[1.8rem] hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Run Probe'}
            </button>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {results.map((res, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white border border-slate-200 rounded-[2rem] p-8 hover:shadow-xl hover:shadow-brand-500/5 transition-all group border-l-4 border-l-brand-500"
                >
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-500 group-hover:text-white transition-all transform group-hover:rotate-6">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{res.documentName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">UUID: #{res.chunkId}</span>
                          <span className="text-[10px] font-bold text-brand-500 uppercase bg-brand-50 px-2 py-0.5 rounded">SIMILARITY: HIGH</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-4xl font-serif font-black text-slate-900">{(res.score * 100).toFixed(1)}<span className="text-lg ml-0.5 font-bold text-brand-500">%</span></span>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Confidence Score</p>
                    </div>
                  </div>
                  
                  <div className="relative pl-8 mb-8">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-slate-100 rounded-full" />
                    <p className="text-base text-slate-600 leading-relaxed font-medium">
                      {res.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          Vector Tokenized
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                          <Layers className="w-3" />
                          Dimensions: 768
                        </div>
                     </div>
                     <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-100 transition-colors">
                        Inspect Local Nodes <ChevronRight className="w-3" />
                     </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-[#1a1c1e] text-white p-8 rounded-[2.5rem] shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-500 mb-6 font-sans">Engine Settings</h3>
              <div className="space-y-6">
                 <div className="space-y-3">
                   <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                      <span>Top K Neighbors</span>
                      <span className="text-white">5</span>
                   </div>
                   <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 w-1/2" />
                   </div>
                 </div>
                 <div className="space-y-3">
                   <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                      <span>Min Sim Score</span>
                      <span className="text-white">0.65</span>
                   </div>
                   <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 w-2/3" />
                   </div>
                 </div>
                 <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-400">Rerank Enabled</span>
                       <div className="w-8 h-4 bg-brand-500 rounded-full relative">
                          <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                       </div>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-400">Hybrid Search</span>
                       <div className="w-8 h-4 bg-brand-500 rounded-full relative">
                          <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-brand-50 p-8 rounded-[2.5rem] border border-brand-100">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-700 mb-4">Diagnostics</h4>
              <div className="space-y-4">
                 {[
                   { label: 'Embedding Latency', value: '42ms' },
                   { label: 'Vector DB Latency', value: '18ms' },
                   { label: 'Total TTFB', value: '124ms' }
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center py-2 border-b border-brand-200/50">
                      <span className="text-[10px] font-bold text-brand-600 uppercase tracking-tighter">{item.label}</span>
                      <span className="text-xs font-bold text-brand-900 font-mono">{item.value}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
