import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  Eye,
  FileIcon,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { kbApi, docApi } from '../api';
import { DocumentConstraintLevel, DocumentPreviewTextVO, DocumentStatus, DocumentVO, FileType, KnowledgeBaseVO } from '../types';
import { cn, formatFileSize } from '../lib/utils';

const statusLabels: Record<DocumentStatus, string> = {
  [DocumentStatus.UPLOADED]: '已上传',
  [DocumentStatus.PARSING]: '解析中',
  [DocumentStatus.PARSED]: '已解析',
  [DocumentStatus.INDEXING]: '索引中',
  [DocumentStatus.INDEXED]: '已索引',
  [DocumentStatus.FAILED]: '处理失败',
  [DocumentStatus.DELETED]: '已删除',
};

const previewTitle = (fileType: FileType) => {
  if (fileType === FileType.PDF) return '原文件预览';
  if (fileType === FileType.DOCX) return '文本预览';
  return '文档内容';
};

const constraintLabels: Record<DocumentConstraintLevel, string> = {
  [DocumentConstraintLevel.NORMAL]: '普通检索资料',
  [DocumentConstraintLevel.PINNED]: '固定参考资料',
  [DocumentConstraintLevel.SYSTEM]: '系统级约束',
};

export default function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const requestedKbId = Number(searchParams.get('knowledgeBaseId') || searchParams.get('kbId') || 0) || null;
  const [kbs, setKbs] = useState<KnowledgeBaseVO[]>([]);
  const [activeKb, setActiveKb] = useState<number | null>(null);
  const [docs, setDocs] = useState<DocumentVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentVO | null>(null);
  const [previewText, setPreviewText] = useState<DocumentPreviewTextVO | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewUrl = useMemo(() => (previewDoc ? docApi.fileUrl(previewDoc.id) : ''), [previewDoc]);

  const fetchKbs = async () => {
    const res = await kbApi.list({});
    const records = res.data?.data?.records || [];
    setKbs(records);
    setActiveKb((current) => {
      if (requestedKbId && records.some((kb) => kb.id === requestedKbId)) {
        return requestedKbId;
      }
      if (current && records.some((kb) => kb.id === current)) {
        return current;
      }
      return records[0]?.id ?? null;
    });
  };

  const fetchDocs = async (nextKeyword = keyword) => {
    if (!activeKb) return;
    setLoading(true);
    try {
      const res = await docApi.list(activeKb, { page: 1, size: 50, keyword: nextKeyword || undefined });
      setDocs(res.data?.data?.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKbs();
  }, [requestedKbId]);

  useEffect(() => {
    fetchDocs();
  }, [activeKb]);

  useEffect(() => {
    if (!activeKb) return;
    const timer = window.setTimeout(() => {
      fetchDocs(keyword);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeKb, keyword]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeKb) return;

    setUploadLoading(true);
    try {
      await docApi.upload(activeKb, file);
      fetchDocs();
    } catch (err) {
      console.error(err);
      alert('上传失败，请稍后重试。');
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const handleReindex = async (documentId: number) => {
    try {
      await docApi.reindex(documentId);
      fetchDocs();
    } catch (err) {
      console.error(err);
      alert('重新索引失败，请稍后重试。');
    }
  };

  const handlePreview = async (doc: DocumentVO) => {
    setPreviewDoc(doc);
    setPreviewText(null);
    setPreviewError(null);
    if (doc.fileType === FileType.PDF) return;

    setPreviewLoading(true);
    try {
      const res = await docApi.previewText(doc.id);
      setPreviewText(res.data.data);
    } catch (err) {
      console.error(err);
      setPreviewError('无法读取文档内容，请下载原文件查看。');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = (doc: DocumentVO) => {
    window.open(docApi.downloadUrl(doc.id), '_blank', 'noopener,noreferrer');
  };

  const handleConstraintChange = async (doc: DocumentVO, constraintLevel: DocumentConstraintLevel) => {
    const priority = constraintLevel === DocumentConstraintLevel.SYSTEM ? 10 : constraintLevel === DocumentConstraintLevel.PINNED ? 50 : 100;
    const res = await docApi.updateConstraint(doc.id, { constraintLevel, constraintPriority: priority });
    const updated = res.data?.data;
    if (updated) {
      setDocs((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    }
  };

  return (
    <div className="w-full space-y-10 pb-24">
      <div className="flex flex-col lg:flex-row gap-10 lg:items-center justify-between shadow-chiaroscuro p-10 border border-[#e8dec5] bg-white relative overflow-hidden">
        <div className="space-y-8 flex-1 relative z-10">
          <div>
            <h2 className="text-4xl font-black text-noble-dark font-serif tracking-tight">文档管理</h2>
            <p className="text-stone-600 mt-2 text-base font-medium">上传、查看和维护知识库中的原始文档。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {kbs.map((kb) => (
              <button
                key={kb.id}
                onClick={() => setActiveKb(kb.id)}
                className={cn(
                  'px-6 py-3 rounded-sm text-[11px] font-bold border transition-all uppercase tracking-[0.18em]',
                  activeKb === kb.id
                    ? 'bg-noble-dark text-gold-500 border-gold-500 shadow-chiaroscuro'
                    : 'bg-stone-50 text-stone-500 border-stone-200 hover:border-gold-500 hover:text-gold-600',
                )}
              >
                {kb.name}
              </button>
            ))}
          </div>
        </div>

        <div className="shrink-0 relative z-10">
          <label
            className={cn(
              'relative flex flex-col items-center justify-center w-80 h-48 border-2 border-double rounded-sm cursor-pointer transition-all duration-300',
              uploadLoading
                ? 'bg-stone-50 border-stone-200 cursor-not-allowed'
                : 'bg-gold-500/5 border-gold-500/30 hover:bg-gold-500/10 hover:border-gold-500 group',
            )}
          >
            {uploadLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
                <span className="text-[11px] font-bold text-gold-600 uppercase tracking-[0.18em]">正在上传...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center px-6">
                <div className="w-16 h-16 bg-noble-dark text-gold-500 rounded-sm flex items-center justify-center shadow-chiaroscuro group-hover:scale-105 transition-all duration-300 border border-gold-500/20">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <span className="block text-lg font-black text-noble-dark font-serif tracking-tight">上传文档</span>
                  <span className="block text-[10px] text-stone-500 font-bold mt-1 uppercase tracking-[0.12em]">支持 PDF、DOCX、Markdown、TXT</span>
                </div>
              </div>
            )}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploadLoading} />
          </label>
        </div>
      </div>

      <div className="bg-white border border-[#e8dec5] shadow-chiaroscuro overflow-hidden rounded-sm relative">
        <div className="p-8 border-b border-[#e8dec5]/50 flex items-center justify-between relative z-10 gap-6">
          <div className="flex items-center gap-6 min-w-0">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500/50 group-focus-within:text-gold-500 transition-colors" />
              <input
                type="text"
                placeholder="按文档名称搜索"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-14 pr-8 py-4 bg-stone-50 border border-[#e8dec5] rounded-sm text-sm focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 transition-all w-96 shadow-inner"
              />
            </div>
            <div className="h-10 w-px bg-gold-500/10" />
            <button className="flex items-center gap-3 px-6 py-2.5 bg-white text-stone-600 text-[11px] font-bold uppercase tracking-[0.14em] border border-stone-300 rounded-sm hover:text-stone-900 transition-all">
              <Filter className="w-3.5 h-3.5 text-gold-500" />
              筛选
            </button>
          </div>
          <div className="text-xs font-bold text-gold-700 uppercase tracking-[0.12em] px-6 py-3 bg-gold-500/5 border border-gold-500/10 rounded-sm">
            共 {docs.length} 个文档
          </div>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse marble-bg">
            <thead>
              <tr className="bg-stone-900/5">
                <th className="px-8 py-5 text-[11px] font-black text-stone-500 uppercase tracking-[0.16em]">文档名称</th>
                <th className="px-8 py-5 text-[11px] font-black text-stone-500 uppercase tracking-[0.16em]">状态</th>
                <th className="px-8 py-5 text-[11px] font-black text-stone-500 uppercase tracking-[0.16em]">大小</th>
                <th className="px-8 py-5 text-[11px] font-black text-stone-500 uppercase tracking-[0.16em]">切片数</th>
                <th className="px-8 py-5 text-[11px] font-black text-stone-500 uppercase tracking-[0.16em]">资料层级</th>
                <th className="px-8 py-5 text-[11px] font-black text-stone-500 uppercase tracking-[0.16em]">创建时间</th>
                <th className="px-8 py-5 text-[11px] font-black text-stone-500 uppercase tracking-[0.16em] text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8dec5]/30">
              <AnimatePresence>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-32 text-center">
                      <Loader2 className="w-12 h-12 text-gold-500 animate-spin mx-auto mb-6" />
                      <p className="text-gold-600/70 text-sm tracking-wide">正在加载文档...</p>
                    </td>
                  </tr>
                ) : docs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-32 text-center opacity-60">
                      <div className="w-24 h-24 bg-stone-100 border border-stone-200 rounded-sm flex items-center justify-center mx-auto mb-6 text-stone-300">
                        <FileIcon className="w-12 h-12" />
                      </div>
                      <p className="text-stone-500 text-base">当前知识库暂无文档。</p>
                    </td>
                  </tr>
                ) : (
                  docs.map((doc, idx) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="hover:bg-gold-500/[0.02] transition-colors group"
                    >
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-noble-dark border border-gold-500/20 rounded-sm flex items-center justify-center text-gold-500 shadow-lg">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-base font-black text-noble-dark truncate max-w-[250px] font-serif tracking-tight">{doc.originalFileName}</span>
                            <span className="block text-[10px] text-gold-600 uppercase font-bold tracking-[0.16em] mt-1">{doc.fileType}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-2.5 h-2.5 rounded-full',
                              doc.status === DocumentStatus.INDEXED ? 'bg-gold-500 shadow-[0_0_12px_#c5a021]' : 'bg-stone-400',
                            )}
                          />
                          <span
                            className={cn(
                              'text-[11px] font-black tracking-[0.12em] uppercase',
                              doc.status === DocumentStatus.INDEXED ? 'text-gold-700' : 'text-stone-500',
                            )}
                          >
                            {statusLabels[doc.status] || doc.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <span className="text-xs text-stone-600 font-bold">{formatFileSize(doc.fileSize)}</span>
                      </td>
                      <td className="px-8 py-7">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-noble-dark text-gold-500 rounded-sm border border-gold-500/20 text-xs font-bold shadow-inner">
                          {doc.chunkCount}
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <select
                          value={doc.constraintLevel || DocumentConstraintLevel.NORMAL}
                          onChange={(event) => handleConstraintChange(doc, event.target.value as DocumentConstraintLevel)}
                          className="min-w-[140px] bg-white border border-stone-200 rounded-sm px-3 py-2 text-xs font-bold text-stone-700 shadow-inner focus:outline-none focus:border-gold-500"
                          title="设置资料层级"
                        >
                          {Object.values(DocumentConstraintLevel).map((level) => (
                            <option key={level} value={level}>
                              {constraintLabels[level]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-8 py-7 text-[11px] text-stone-500 font-bold uppercase tracking-widest">
                        {format(new Date(doc.createdAt), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="px-8 py-7 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <button
                            title="查看文档"
                            onClick={() => handlePreview(doc)}
                            className="p-3 text-stone-500 hover:text-gold-600 bg-white shadow-chiaroscuro border border-stone-200 rounded-sm transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="下载原文件"
                            onClick={() => handleDownload(doc)}
                            className="p-3 text-stone-500 hover:text-gold-600 bg-white shadow-chiaroscuro border border-stone-200 rounded-sm transition-all"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            title="重新索引"
                            onClick={() => handleReindex(doc.id)}
                            className="p-3 text-stone-500 hover:text-gold-600 bg-white shadow-chiaroscuro border border-stone-200 rounded-sm transition-all"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            title="删除文档"
                            onClick={async () => {
                              if (window.confirm('确定要删除该文档吗？')) {
                                await docApi.delete(doc.id);
                                fetchDocs();
                              }
                            }}
                            className="p-3 text-stone-500 hover:text-red-700 bg-white shadow-chiaroscuro border border-stone-200 rounded-sm hover:scale-105 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {previewDoc && (
          <motion.div
            className="fixed inset-0 z-50 bg-stone-950/55 backdrop-blur-sm px-4 py-6 sm:px-8 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-6xl h-[86vh] bg-white border border-[#e8dec5] shadow-chiaroscuro rounded-sm flex flex-col overflow-hidden"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
            >
              <div className="px-6 py-4 border-b border-[#e8dec5] flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-gold-700 uppercase tracking-[0.16em]">{previewTitle(previewDoc.fileType)}</p>
                  <h3 className="text-xl font-black text-noble-dark truncate">{previewDoc.originalFileName}</h3>
                  {previewDoc.fileType === FileType.DOCX && (
                    <p className="text-xs text-stone-500 mt-1">DOCX 当前显示解析后的文本内容，原始版式请下载文件查看。</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    title="下载原文件"
                    onClick={() => handleDownload(previewDoc)}
                    className="p-3 text-stone-600 hover:text-gold-700 border border-stone-200 rounded-sm bg-white shadow-chiaroscuro"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    title="关闭"
                    onClick={() => setPreviewDoc(null)}
                    className="p-3 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-sm bg-white shadow-chiaroscuro"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-stone-50 overflow-hidden">
                {previewDoc.fileType === FileType.PDF ? (
                  <iframe title={previewDoc.originalFileName} src={previewUrl} className="w-full h-full bg-white" />
                ) : previewLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-gold-700">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p className="text-sm font-bold">正在读取文档内容...</p>
                  </div>
                ) : previewError ? (
                  <div className="h-full flex items-center justify-center px-8 text-center">
                    <p className="text-sm text-stone-600">{previewError}</p>
                  </div>
                ) : previewDoc.fileType === FileType.MD ? (
                  <div className="h-full overflow-auto bg-white p-8 prose prose-stone max-w-none">
                    <ReactMarkdown>{previewText?.content || ''}</ReactMarkdown>
                  </div>
                ) : (
                  <pre className="h-full overflow-auto bg-white p-8 text-sm leading-7 text-stone-800 whitespace-pre-wrap font-mono">
                    {previewText?.content || '暂无可预览内容。'}
                  </pre>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
