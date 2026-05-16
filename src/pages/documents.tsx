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

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.INDEXED: return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case DocumentStatus.FAILED: return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case DocumentStatus.INDEXING:
      case DocumentStatus.PARSING: return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row gap-8 lg:items-start justify-between bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-xl shadow-slate-200/40">
           <div className="space-y-6 flex-1">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 font-serif">文档资产</h2>
                <p className="text-slate-500 mt-2 font-medium">查看、上传并管理接入向量引擎的原始语料</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {kbs.map(kb => (
                  <button
                    key={kb.id}
                    onClick={() => setActiveKb(kb.id)}
                    className={cn(
                      "px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all uppercase tracking-widest",
                      activeKb === kb.id 
                        ? "bg-[#1a1c1e] text-white border-slate-900 shadow-xl shadow-slate-200" 
                        : "bg-slate-50 text-slate-500 border-slate-100 hover:border-brand-300 hover:text-brand-600"
                    )}
                  >
                    {kb.name}
                  </button>
                ))}
              </div>
           </div>
           
           <div className="shrink-0">
             <label className={cn(
               "relative flex flex-col items-center justify-center w-72 h-44 border-2 border-dashed rounded-[2.5rem] cursor-pointer transition-all duration-500",
               uploadLoading ? "bg-slate-50 border-slate-200 cursor-not-allowed" : "bg-brand-50/20 border-brand-200/50 hover:bg-brand-50 hover:border-brand-400 group"
             )}>
                {uploadLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Processing Data...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center px-4">
                    <div className="w-12 h-12 bg-white text-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/10 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12">
                       <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-900">注入新文本</span>
                      <span className="block text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">Support: PDF, DOCX, Markdown, Text</span>
                    </div>
                  </div>
                )}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploadLoading} />
             </label>
           </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-6">
             <div className="relative group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="按文档特征进行全局检索..." 
                 className="pl-11 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all w-80 font-medium"
               />
             </div>
             <div className="h-8 w-px bg-slate-200" />
             <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-500 text-xs font-bold uppercase tracking-widest border border-slate-100 rounded-xl hover:text-slate-900 transition-colors">
               <Filter className="w-3.5 h-3.5" />
               Filter Assets
             </button>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 py-2 bg-slate-100 rounded-xl">
             Inventory: {docs.length} Entities
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Name & Meta</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployment Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Capacity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Segmentation</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {loading ? (
                   <tr>
                     <td colSpan={6} className="py-24 text-center">
                       <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-4" />
                       <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Awaiting Knowledge Base Sync...</p>
                     </td>
                   </tr>
                ) : docs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                        <FileIcon className="w-10 h-10" />
                      </div>
                      <p className="text-slate-400 text-sm font-bold">No assets found in current sector</p>
                    </td>
                  </tr>
                ) : docs.map((doc, idx) => (
                  <motion.tr 
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-brand-50/20 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-500 transition-all">
                           <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-sm font-bold text-slate-900 truncate max-w-[200px]">{doc.originalFileName}</span>
                          <span className="block text-[10px] text-slate-400 uppercase font-black tracking-tighter mt-0.5">{doc.fileType} · VECTOR_READY</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          doc.status === DocumentStatus.INDEXED ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                        )} />
                        <span className={cn(
                          "text-xs font-bold tracking-tight uppercase",
                          doc.status === DocumentStatus.INDEXED ? "text-emerald-600" : "text-slate-500"
                        )}>
                          {doc.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs text-slate-500 font-mono font-medium">{formatFileSize(doc.fileSize)}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 text-xs font-black text-slate-800">
                        {doc.chunkCount}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      {format(new Date(doc.createdAt), 'MMM dd, yyyy · HH:mm')}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                         <button className="p-2 text-slate-400 hover:text-brand-600 bg-white shadow-sm border border-slate-200 rounded-xl hover:rotate-180 transition-all duration-500">
                           <RefreshCw className="w-4 h-4" />
                         </button>
                         <button onClick={async () => {
                           if(window.confirm('Determine for asset deletion?')) {
                             await docApi.delete(doc.id);
                             fetchDocs();
                           }
                         }} className="p-2 text-slate-400 hover:text-rose-600 bg-white shadow-sm border border-slate-200 rounded-xl hover:scale-110 transition-all">
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
