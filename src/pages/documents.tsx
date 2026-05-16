import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  FileIcon,
  ChevronRight
} from 'lucide-react';
import { kbApi, docApi } from '../api';
import { KnowledgeBaseVO, DocumentVO, DocumentStatus } from '../types';
import { cn, formatFileSize } from '../lib/utils';
import { format } from 'date-fns';

export default function DocumentsPage() {
  const [kbs, setKbs] = useState<KnowledgeBaseVO[]>([]);
  const [activeKb, setActiveKb] = useState<number | null>(null);
  const [docs, setDocs] = useState<DocumentVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);

  const fetchKbs = async () => {
    const res = await kbApi.list({});
    const records = res.data?.data?.records || [];
    setKbs(records);
    if (records.length > 0 && !activeKb) {
      setActiveKb(records[0].id);
    }
  };

  const fetchDocs = async () => {
    if (!activeKb) return;
    setLoading(true);
    try {
      const res = await docApi.list(activeKb, { page: 1, size: 50 });
      setDocs(res.data?.data?.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKbs();
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [activeKb]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeKb) return;
    
    setUploadLoading(true);
    try {
      await docApi.upload(activeKb, file);
      fetchDocs();
    } catch (err) {
      alert('上传失败');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <div className="flex flex-col lg:flex-row gap-12 lg:items-center justify-between shadow-chiaroscuro p-12 border border-[#e8dec5] bg-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rotate-45 translate-x-16 -translate-y-16" />
           <div className="space-y-8 flex-1 relative z-10">
              <div>
                <h2 className="text-4xl font-black text-noble-dark font-serif italic tracking-tighter">语料资产宝库</h2>
                <p className="text-stone-600 mt-2 font-serif italic text-lg font-bold">查看、上传并管理接入向量引擎的原始语料</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {kbs.map(kb => (
                  <button
                    key={kb.id}
                    onClick={() => setActiveKb(kb.id)}
                    className={cn(
                      "px-6 py-3 rounded-sm text-[10px] font-bold border transition-all uppercase tracking-[0.3em] font-serif italic",
                      activeKb === kb.id 
                        ? "bg-noble-dark text-gold-500 border-gold-500 shadow-chiaroscuro" 
                        : "bg-stone-50 text-stone-400 border-stone-200 hover:border-gold-500 hover:text-gold-600"
                    )}
                  >
                    {kb.name}
                  </button>
                ))}
              </div>
           </div>
           
           <div className="shrink-0 relative z-10">
             <label className={cn(
               "relative flex flex-col items-center justify-center w-80 h-52 border-2 border-double rounded-sm cursor-pointer transition-all duration-700",
               uploadLoading ? "bg-stone-50 border-stone-200 cursor-not-allowed" : "bg-gold-500/5 border-gold-500/30 hover:bg-gold-500/10 hover:border-gold-500 group"
             )}>
                {uploadLoading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
                    <span className="text-[10px] font-bold text-gold-600 uppercase tracking-[0.3em] font-serif italic">Ascending Data...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center px-6">
                    <div className="w-16 h-16 bg-noble-dark text-gold-500 rounded-sm flex items-center justify-center shadow-chiaroscuro group-hover:scale-110 transition-all duration-700 group-hover:rotate-6 border border-gold-500/20">
                       <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="block text-lg font-black text-noble-dark font-serif italic tracking-tight">注入新智</span>
                      <span className="block text-[9px] text-stone-500 font-black mt-1 uppercase tracking-[0.2em]">Support: PDF, DOCX, Markdown, Text</span>
                    </div>
                  </div>
                )}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploadLoading} />
             </label>
           </div>
      </div>

      <div className="bg-white border border-[#e8dec5] shadow-chiaroscuro overflow-hidden rounded-sm relative">
        <div className="absolute inset-0 bg-gold-500/2 pointer-events-none" />
        <div className="p-10 border-b border-[#e8dec5]/50 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-8">
             <div className="relative group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500/40 group-focus-within:text-gold-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="按文档特征进行全局检索..." 
                 className="pl-14 pr-8 py-4 bg-stone-50 border border-[#e8dec5] rounded-sm text-sm focus:outline-none focus:ring-8 focus:ring-gold-500/5 focus:border-gold-500 transition-all w-96 font-serif italic shadow-inner"
               />
             </div>
             <div className="h-10 w-px bg-gold-500/10" />
             <button className="flex items-center gap-3 px-6 py-2.5 bg-white text-stone-600 text-[10px] font-black uppercase tracking-[0.2em] border border-stone-300 rounded-sm hover:text-stone-900 transition-all font-serif italic">
               <Filter className="w-3.5 h-3.5 text-gold-500" />
               Inventory Filter
             </button>
          </div>
          <div className="text-xs font-black text-gold-700 uppercase tracking-[0.15em] px-6 py-3 bg-gold-500/5 border border-gold-500/10 rounded-sm font-serif italic">
             Census: {docs.length} Entities
          </div>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse marble-bg">
            <thead>
              <tr className="bg-stone-900/5 font-serif">
                <th className="px-10 py-6 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Asset Genealogy</th>
                <th className="px-10 py-6 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Grace Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Weight</th>
                <th className="px-10 py-6 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Sectors</th>
                <th className="px-10 py-6 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Incarnation</th>
                <th className="px-10 py-6 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] text-right">Rituals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8dec5]/30">
              <AnimatePresence>
                {loading ? (
                   <tr>
                     <td colSpan={6} className="py-32 text-center">
                       <Loader2 className="w-12 h-12 text-gold-500 animate-spin mx-auto mb-6" />
                       <p className="text-gold-600/60 font-serif italic text-sm tracking-widest uppercase animate-pulse">Summoning Ledger...</p>
                     </td>
                   </tr>
                ) : docs.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="py-32 text-center grayscale opacity-40">
                       <div className="w-24 h-24 bg-stone-100 border border-stone-200 rounded-sm flex items-center justify-center mx-auto mb-6 text-stone-300">
                         <FileIcon className="w-12 h-12" />
                       </div>
                       <p className="text-stone-400 font-serif italic text-lg">No assets have attained existence here</p>
                     </td>
                   </tr>
                ) : docs.map((doc, idx) => (
                  <motion.tr 
                    key={doc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gold-500/[0.02] transition-colors group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-noble-dark border border-gold-500/20 rounded-sm flex items-center justify-center text-gold-500 group-hover:scale-110 transition-all duration-500 shadow-lg">
                           <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-base font-black text-noble-dark truncate max-w-[250px] font-serif italic tracking-tight">{doc.originalFileName}</span>
                          <span className="block text-[9px] text-gold-600 uppercase font-bold tracking-[0.2em] mt-1 italic">{doc.fileType} · CONSECRATED</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          doc.status === DocumentStatus.INDEXED ? "bg-gold-500 shadow-[0_0_12px_#c5a021]" : "bg-stone-400"
                        )} />
                        <span className={cn(
                          "text-[10px] font-black tracking-[0.1em] uppercase font-serif italic",
                          doc.status === DocumentStatus.INDEXED ? "text-gold-700" : "text-stone-500"
                        )}>
                          {doc.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="text-xs text-stone-600 font-serif italic font-black">{formatFileSize(doc.fileSize)}</span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-noble-dark text-gold-500 rounded-sm border border-gold-500/20 text-xs font-serif italic font-black shadow-inner">
                        {doc.chunkCount}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-[10px] text-stone-500 font-black uppercase tracking-widest font-serif italic">
                      {format(new Date(doc.createdAt), 'MMM dd, HH:mm')}
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                         <button className="p-3 text-stone-500 hover:text-gold-600 bg-white shadow-chiaroscuro border border-stone-200 rounded-sm hover:rotate-[360deg] transition-all duration-1000">
                           <RefreshCw className="w-4 h-4" />
                         </button>
                         <button onClick={async () => {
                           if(window.confirm('Determine for asset deletion?')) {
                             await docApi.delete(doc.id);
                             fetchDocs();
                           }
                         }} className="p-3 text-stone-500 hover:text-red-700 bg-white shadow-chiaroscuro border border-stone-200 rounded-sm hover:scale-110 transition-all">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
