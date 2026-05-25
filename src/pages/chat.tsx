import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Bot, Database, Download, ExternalLink, Loader2, MapPin, MessageSquare, Paperclip, Plus, Send, Trash2, User, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatApi, docApi, kbApi } from '../api';
import { getApiUrl } from '../config/api';
import { ChatMessageVO, ChatRole, ChatSessionVO, Citation, DocumentConstraintLevel, DocumentPreviewTextVO, DocumentVO, FileType, KnowledgeBaseVO } from '../types';
import { cn } from '../lib/utils';

const parseCitations = (value: string | null): Citation[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    // 兼容后端 citationsJson 的 snippet 字段，统一补齐前端引用卡片使用的预览字段。
    return parsed.map((item) => ({
      ...item,
      contentPreview: item.contentPreview || item.snippet || '',
    }));
  } catch {
    return [];
  }
};

type SseEventHandler = (event: string, data: string) => void;

const normalizeSseDataLine = (line: string) => {
  const data = line.slice(5);
  return data.startsWith(' ') ? data.slice(1) : data;
};

const decodeSseData = (data: string) => {
  try {
    const parsed = JSON.parse(data);
    return typeof parsed === 'string' ? parsed : String(parsed ?? '');
  } catch {
    return data;
  }
};

const createSseLineConsumer = (handleEvent: SseEventHandler) => {
  let currentEvent = 'message';
  let dataLines: string[] = [];
  let messageLineCount = 0;

  const resetCurrentEvent = () => {
    currentEvent = 'message';
    dataLines = [];
    messageLineCount = 0;
  };

  const flushCurrentEvent = () => {
    if (currentEvent !== 'message' && dataLines.length > 0) {
      handleEvent(currentEvent, dataLines.join('\n'));
    }
    resetCurrentEvent();
  };

  // 后端可能在同一个 message 事件中连续返回多行 data，按行消费可避免等到事件块结束才展示。
  return (line: string) => {
    if (line === '') {
      flushCurrentEvent();
      return;
    }

    if (line.startsWith(':')) return;

    if (line.startsWith('event:')) {
      flushCurrentEvent();
      currentEvent = line.slice(6).trim() || 'message';
      return;
    }

    if (!line.startsWith('data:')) return;

    const data = normalizeSseDataLine(line);
    if (currentEvent === 'message') {
      // 同一 message 事件的多行 data 需要补回换行，保留后端输出的段落结构。
      handleEvent(currentEvent, `${messageLineCount > 0 ? '\n' : ''}${data}`);
      messageLineCount += 1;
      return;
    }

    dataLines.push(data);
  };
};

const citationLocation = (citation: Citation) => {
  if (citation.locationText) return citation.locationText;

  const parts: string[] = [];
  if (typeof citation.pageNumber === 'number') parts.push(`第 ${citation.pageNumber} 页`);
  if (citation.sectionTitle) parts.push(citation.sectionTitle);
  if (typeof citation.paragraphIndex === 'number') parts.push(`第 ${citation.paragraphIndex} 段`);
  // 页码等结构化位置为空时，片段 ID 是后端可稳定回查的精确定位依据。
  if (typeof citation.chunkId === 'number') parts.push(`片段ID：${citation.chunkId}`);
  if (typeof citation.chunkIndex === 'number') parts.push(`切片 #${citation.chunkIndex}`);
  if (parts.length > 0) return parts.join(' / ');

  return '位置待补充';
};

const citationPreview = (citation: Citation) => citation.contentPreview || '暂无片段预览';

const citationScore = (citation: Citation) => (
  Number.isFinite(citation.score) ? `${Math.round(citation.score * 100)}%` : '未知'
);

const citationPdfUrl = (citation: Citation) => {
  const baseUrl = docApi.fileUrl(citation.documentId);
  return typeof citation.pageNumber === 'number' ? `${baseUrl}#page=${citation.pageNumber}` : baseUrl;
};

const inferCitationFileType = (citation: Citation): FileType | null => {
  const name = citation.documentName.toLowerCase();
  if (name.endsWith('.pdf')) return FileType.PDF;
  if (name.endsWith('.md')) return FileType.MD;
  if (name.endsWith('.docx')) return FileType.DOCX;
  if (name.endsWith('.txt')) return FileType.TXT;
  return null;
};

const citationDocumentFallback = (citation: Citation, fileType: FileType): DocumentVO => ({
  id: citation.documentId,
  knowledgeBaseId: 0,
  fileName: citation.documentName,
  originalFileName: citation.documentName,
  fileType,
  fileSize: 0,
  title: citation.documentName,
  status: 'INDEXED' as DocumentVO['status'],
  errorMessage: null,
  chunkCount: 0,
  constraintLevel: DocumentConstraintLevel.NORMAL,
  constraintPriority: 100,
  createdAt: '',
  updatedAt: '',
});

export default function ChatPage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseVO[]>([]);
  const [activeKnowledgeBaseId, setActiveKnowledgeBaseId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ChatSessionVO[]>([]);
  const [activeSession, setActiveSession] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageVO[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const [error, setError] = useState('');
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [citationDocument, setCitationDocument] = useState<DocumentVO | null>(null);
  const [citationText, setCitationText] = useState<DocumentPreviewTextVO | null>(null);
  const [citationLoading, setCitationLoading] = useState(false);
  const [citationError, setCitationError] = useState('');
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const assistantBodyEndRef = useRef<HTMLSpanElement>(null);
  const streamingSessionRef = useRef<number | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<number | null>(null);

  const animateMessageScroll = (targetTop: number, duration = 680) => {
    const container = messageScrollRef.current;
    if (!container) return;

    if (scrollAnimationRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationRef.current);
    }

    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const nextTop = Math.min(Math.max(targetTop, 0), maxTop);
    const startTop = container.scrollTop;
    const distance = nextTop - startTop;

    if (Math.abs(distance) < 1) {
      container.scrollTop = nextTop;
      return;
    }

    const startedAt = performance.now();
    // 使用固定时长缓动滚动，避免流式字符频繁更新时浏览器默认 smooth 滚动过快或相互抢占。
    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = startTop + distance * eased;

      if (progress < 1) {
        scrollAnimationRef.current = window.requestAnimationFrame(step);
      } else {
        scrollAnimationRef.current = null;
      }
    };

    scrollAnimationRef.current = window.requestAnimationFrame(step);
  };

  const scrollElementBottomIntoView = (target: HTMLElement | null, duration = 680) => {
    const container = messageScrollRef.current;
    if (!target || !container) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetTop = container.scrollTop + targetRect.bottom - containerRect.bottom;
    animateMessageScroll(targetTop, duration);
  };

  const scrollToAssistantBodyEnd = (duration = 680) => {
    scrollElementBottomIntoView(assistantBodyEndRef.current, duration);
  };

  const scheduleAssistantBodyScroll = (duration = 680) => {
    if (scrollTimerRef.current !== null) return;

    // 对流式输出滚动做轻微节流，减少字符级更新导致的连续急滑。
    scrollTimerRef.current = window.setTimeout(() => {
      scrollTimerRef.current = null;
      scrollToAssistantBodyEnd(duration);
    }, 120);
  };

  const fetchKnowledgeBases = async () => {
    const res = await kbApi.list({ page: 1, size: 100 });
    const records = res.data?.data?.records || [];
    setKnowledgeBases(records);
    setActiveKnowledgeBaseId((current) => current ?? records[0]?.id ?? null);
  };

  const fetchSessions = async (knowledgeBaseId = activeKnowledgeBaseId) => {
    if (!knowledgeBaseId) {
      setSessions([]);
      setActiveSession(null);
      setMessages([]);
      return;
    }

    const res = await chatApi.listSessions({ knowledgeBaseId, page: 1, size: 50 });
    const records = res.data?.data?.records || [];
    setSessions(records);
    setActiveSession((current) => {
      if (current && records.some((session) => session.id === current)) {
        return current;
      }
      return records[0]?.id ?? null;
    });
    if (records.length === 0) {
      setMessages([]);
    }
  };

  const fetchMessages = async (sessionId: number) => {
    // 当前会话正在接收流式回答时，避免历史消息接口的空结果或旧结果覆盖正在展示的内容。
    if (streamingSessionRef.current === sessionId) return;

    const res = await chatApi.getMessages(sessionId, { page: 1, size: 50 });
    const records = res.data?.data?.records || [];
    setMessages(records);
  };

  useEffect(() => {
    const bootstrap = async () => {
      setInitialLoading(true);
      setError('');
      try {
        await fetchKnowledgeBases();
      } catch (err) {
        console.error(err);
        setError('知识库列表加载失败，请检查后端接口。');
      } finally {
        setInitialLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!activeKnowledgeBaseId) return;

    setError('');
    fetchSessions(activeKnowledgeBaseId).catch((err) => {
      console.error(err);
      setError('会话列表加载失败，请检查 /api/chat/sessions 接口。');
    });
  }, [activeKnowledgeBaseId]);

  useEffect(() => {
    if (activeSession) {
      fetchMessages(activeSession).catch((err) => {
        console.error(err);
        setError('历史消息加载失败，请检查会话消息接口。');
      });
    }
  }, [activeSession]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;

    if (latestMessage.role === ChatRole.ASSISTANT) {
      scheduleAssistantBodyScroll();
      return;
    }

    scrollElementBottomIntoView(scrollRef.current, 520);
  }, [messages]);

  const createSession = async () => {
    if (!activeKnowledgeBaseId) {
      setError('请先创建或选择一个知识库。');
      return null;
    }

    setError('');
    try {
      const res = await chatApi.createSession({
        knowledgeBaseId: activeKnowledgeBaseId,
        title: `新会话 ${new Date().toLocaleTimeString()}`,
      });
      const session = res.data.data;
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session.id);
      setMessages([]);
      return session;
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || '新建会话失败，请检查 /api/chat/sessions 接口。');
      return null;
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm('确定要删除该会话吗？')) return;

    try {
      await chatApi.deleteSession(sessionId);
      const nextSessions = sessions.filter((session) => session.id !== sessionId);
      setSessions(nextSessions);
      setActiveSession(nextSessions[0]?.id ?? null);
      if (nextSessions.length === 0) {
        setMessages([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || '删除会话失败。');
    }
  };

  const openCitation = async (citation: Citation) => {
    setActiveCitation(citation);
    setCitationDocument(null);
    setCitationText(null);
    setCitationError('');
    setCitationLoading(true);

    let fileType = inferCitationFileType(citation);

    try {
      const docRes = await docApi.get(citation.documentId);
      const doc = docRes.data.data;
      setCitationDocument(doc);
      fileType = doc.fileType;
    } catch (err) {
      console.error(err);
      if (fileType) {
        setCitationDocument(citationDocumentFallback(citation, fileType));
      }
    }

    try {
      if (fileType === FileType.PDF) {
        return;
      }

      if (fileType) {
        const textRes = await docApi.previewText(citation.documentId);
        setCitationText(textRes.data.data);
        return;
      }

      const textRes = await docApi.previewText(citation.documentId);
      setCitationText(textRes.data.data);
      setCitationDocument(citationDocumentFallback(citation, textRes.data.data.fileType));
    } catch (err: any) {
      console.error(err);
      setCitationError(err.response?.data?.message || err.message || '资料预览加载失败，请稍后重试。');
    } finally {
      setCitationLoading(false);
    }
  };

  const closeCitation = () => {
    setActiveCitation(null);
    setCitationDocument(null);
    setCitationText(null);
    setCitationError('');
    setCitationLoading(false);
  };

  const downloadCitationDocument = () => {
    if (!activeCitation) return;
    window.open(docApi.downloadUrl(activeCitation.documentId), '_blank', 'noopener,noreferrer');
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || loading) return;

    let sessionId = activeSession;
    if (!sessionId) {
      const session = await createSession();
      sessionId = session?.id ?? null;
    }

    if (!sessionId) return;

    streamingSessionRef.current = sessionId;
    setInput('');
    setLoading(true);
    setError('');
    setCurrentCitations([]);

    const localUserMessageId = Date.now();
    const localAssistantMessageId = localUserMessageId + 1;
    let assistantMessageId = localAssistantMessageId;
    const optimisticUserMsg: ChatMessageVO = {
      id: localUserMessageId,
      sessionId,
      role: ChatRole.USER,
      content,
      citationsJson: null,
      createdAt: new Date().toISOString(),
    };
    const streamingAssistantMsg: ChatMessageVO = {
      id: assistantMessageId,
      sessionId,
      role: ChatRole.ASSISTANT,
      content: '',
      citationsJson: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg, streamingAssistantMsg]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/chat/sessions/${sessionId}/messages/stream`), {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `消息发送失败：${response.status}`);
      }

      if (!response.body) {
        throw new Error('后端未返回可读取的 SSE 响应。');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';
      let streamedCitations: Citation[] = [];

      const updateAssistantMessage = (updater: (message: ChatMessageVO) => ChatMessageVO) => {
        const targetAssistantMessageId = assistantMessageId;
        setMessages((prev) => prev.map((message) => (
          message.id === targetAssistantMessageId ? updater(message) : message
        )));
      };

      const handleSseEvent = (event: string, data: string) => {
        if (event === 'userMessageId') {
          const nextId = Number(data);
          if (Number.isFinite(nextId)) {
            setMessages((prev) => prev.map((message) => (
              message.id === localUserMessageId ? { ...message, id: nextId } : message
            )));
          }
          return;
        }

        if (event === 'assistantMessageId') {
          const nextId = Number(data);
          if (Number.isFinite(nextId)) {
            const previousAssistantMessageId = assistantMessageId;
            assistantMessageId = nextId;
            setMessages((prev) => prev.map((message) => (
              message.id === previousAssistantMessageId ? { ...message, id: nextId } : message
            )));
          }
          return;
        }

        if (event === 'citations') {
          try {
            const parsed = JSON.parse(data);
            streamedCitations = Array.isArray(parsed) ? parsed : [];
          } catch {
            streamedCitations = [];
          }
          setCurrentCitations(streamedCitations);
          updateAssistantMessage((message) => ({
            ...message,
            citationsJson: JSON.stringify(streamedCitations),
          }));
          return;
        }

        if (event === 'message') {
          // message 分片会被逐行送入，这里只负责累加已解析出的文本片段并刷新 UI。
          fullContent += decodeSseData(data);
          updateAssistantMessage((message) => ({
            ...message,
            content: fullContent,
          }));
        }
      };

      const consumeSseLine = createSseLineConsumer(handleSseEvent);

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        let lineBreakIndex = buffer.indexOf('\n');
        while (lineBreakIndex >= 0) {
          const line = buffer.slice(0, lineBreakIndex).replace(/\r$/, '');
          buffer = buffer.slice(lineBreakIndex + 1);
          consumeSseLine(line);
          lineBreakIndex = buffer.indexOf('\n');
        }

        if (done) break;
      }

      if (buffer.length > 0) {
        consumeSseLine(buffer.replace(/\r$/, ''));
      }
      // 末尾补一次空行，确保 assistantMessageId、citations 等非 message 事件在连接结束时被提交。
      consumeSseLine('');
      const finalAssistantMessageId = assistantMessageId;
      // React 可能批量执行前面的 setMessages；最终再用累积正文校准一次，防止 ID 切换时序导致正文分片丢失。
      setMessages((prev) => prev.map((message) => (
        message.id === finalAssistantMessageId || message.id === localAssistantMessageId
          ? { ...message, id: finalAssistantMessageId, content: fullContent }
          : message
      )));
      // 回答结束后重新对齐到正文尾部，避免引用卡片渲染后把正文顶出视口底端。
      window.requestAnimationFrame(() => scrollToAssistantBodyEnd(760));

      try {
        // SSE 已经回传并更新了本轮问答的内容、消息 ID 和引用信息；
        // 此处只刷新会话列表，避免保存链路稍慢时用历史接口覆盖刚刚的流式结果。
        await fetchSessions(activeKnowledgeBaseId);
      } catch (refreshError) {
        console.error(refreshError);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '消息发送失败，请检查流式消息接口。');
    } finally {
      streamingSessionRef.current = null;
      setLoading(false);
    }
  };

  const lastAssistantMessageId = messages.reduce<number | null>(
    (lastId, message) => (message.role === ChatRole.ASSISTANT ? message.id : lastId),
    null,
  );

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-8 overflow-hidden relative">
      <div className="hidden lg:flex flex-col w-80 bg-noble-dark border border-gold-500/20 shadow-chiaroscuro overflow-hidden relative">
        <div className="p-8 border-b border-gold-500/10 space-y-5 relative z-10">
          <div className="flex items-center justify-between">
            <span className="font-serif font-black text-2xl text-gold-500 tracking-tight">会话列表</span>
            <button
              title="新建会话"
              onClick={createSession}
              disabled={!activeKnowledgeBaseId}
              className="p-2.5 bg-gold-500 text-noble-dark rounded-sm hover:bg-gold-600 disabled:opacity-40 transition-all shadow-[0_0_15px_rgba(197,160,33,0.3)] active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
            <select
              value={activeKnowledgeBaseId ?? ''}
              onChange={(e) => setActiveKnowledgeBaseId(e.target.value ? Number(e.target.value) : null)}
              disabled={initialLoading || knowledgeBases.length === 0}
              className="w-full rounded-sm border border-gold-500/20 bg-stone-900 py-3 pl-10 pr-4 text-sm font-bold text-stone-200 outline-none focus:border-gold-500"
            >
              {knowledgeBases.length === 0 ? (
                <option value="">暂无知识库</option>
              ) : (
                knowledgeBases.map((kb) => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar relative z-10">
          {sessions.length === 0 ? (
            <div className="px-5 py-8 text-sm text-stone-500 leading-relaxed">
              当前知识库暂无会话，点击上方按钮或直接发送问题即可创建。
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-4 rounded-sm text-left transition-all group relative border border-transparent',
                  activeSession === s.id
                    ? 'bg-gold-500/10 text-white shadow-inner border-gold-500/30'
                    : 'text-stone-500 font-bold hover:bg-gold-500/5 hover:text-stone-300',
                )}
              >
                <div
                  className={cn(
                    'p-2.5 rounded-sm transition-all duration-300',
                    activeSession === s.id ? 'bg-gold-500 text-noble-dark shadow-lg' : 'bg-stone-800 text-stone-600 group-hover:bg-gold-500/20 group-hover:text-gold-500',
                  )}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold tracking-wide">{s.title}</span>
                  <span className="block text-[11px] text-stone-600 uppercase tracking-[0.1em] mt-1 font-bold">会话记录</span>
                </div>
                <span
                  title="删除会话"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteSession(s.id);
                  }}
                  className="p-2 text-stone-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </span>
                {activeSession === s.id && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1 h-3 bg-gold-500 shadow-[0_0_10px_#c5a021]" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white border border-[#e8dec5] shadow-chiaroscuro overflow-hidden relative">
        <div ref={messageScrollRef} className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 custom-scrollbar relative">
          {error && (
            <div className="flex items-center gap-3 rounded-sm border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}

          {initialLoading ? (
            <div className="flex items-center justify-center h-full text-gold-700 font-bold">
              <Loader2 className="w-5 h-5 animate-spin mr-3" />
              正在加载问答数据...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="max-w-md">
                <Bot className="mx-auto mb-5 h-12 w-12 text-gold-500" />
                <h2 className="mb-3 text-2xl font-black text-noble-dark">开始新的问答</h2>
                <p className="text-sm leading-relaxed text-stone-500">
                  选择知识库后输入问题。若当前没有会话，系统会先调用后端创建会话，再发送消息。
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={cn('flex flex-col', m.role === ChatRole.USER ? 'items-end' : 'items-start')}
              >
                <div className={cn('flex items-start gap-5 max-w-[85%] group', m.role === ChatRole.USER ? 'flex-row-reverse' : 'flex-row')}>
                  <div
                    className={cn(
                      'w-12 h-12 rounded-sm shrink-0 shadow-lg flex items-center justify-center mt-2 border border-gold-500/30',
                      m.role === ChatRole.USER ? 'bg-noble-dark text-gold-500' : 'bg-gold-500 text-noble-dark',
                    )}
                  >
                    {m.role === ChatRole.USER ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                  </div>

                  <div
                    className={cn(
                      'px-8 py-7 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border transition-all duration-300 relative',
                      m.role === ChatRole.USER
                        ? 'bg-noble-dark text-stone-200 border-gold-500/20 rounded-sm'
                        : 'bg-[#fffdf8] text-stone-900 border-[#e8dec5] rounded-sm marble-bg',
                    )}
                  >
                    <div className={cn('markdown-body', m.role === ChatRole.USER ? 'prose-invert text-stone-300 font-medium' : '')}>
                      {m.content ? (
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      ) : loading && m.role === ChatRole.ASSISTANT && messages[messages.length - 1]?.id === m.id ? (
                        <div className="flex items-center gap-3 text-gold-700 text-sm font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          正在生成回答...
                        </div>
                      ) : null}
                      {loading && m.role === ChatRole.ASSISTANT && messages[messages.length - 1]?.id === m.id && m.content && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="inline-block w-2 h-5 bg-gold-500 ml-2 align-middle"
                        />
                      )}
                      {m.role === ChatRole.ASSISTANT && m.id === lastAssistantMessageId && (
                        <span
                          ref={assistantBodyEndRef}
                          aria-hidden="true"
                          className="block h-0 overflow-hidden"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {parseCitations(m.citationsJson).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn('mt-5 grid max-w-3xl gap-3 sm:grid-cols-2', m.role === ChatRole.USER ? 'mr-16' : 'ml-16')}
                  >
                    {parseCitations(m.citationsJson).map((c, i) => (
                      <button
                        key={`${c.documentId}-${c.chunkId}-${i}`}
                        type="button"
                        onClick={() => openCitation(c)}
                        className="group text-left px-4 py-3 bg-stone-900/5 border border-gold-500/10 rounded-sm text-stone-700 hover:bg-noble-dark hover:text-gold-500 transition-all shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2 text-xs font-black">
                            <Paperclip className="w-3.5 h-3.5 shrink-0 text-gold-500/70" />
                            <span className="truncate">{c.documentName}</span>
                          </div>
                          <span className="shrink-0 rounded-sm border border-gold-500/20 px-2 py-0.5 text-[10px] font-black text-gold-700 group-hover:text-gold-500">
                            {citationScore(c)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-stone-500 group-hover:text-stone-300">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{citationLocation(c)}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-stone-500 group-hover:text-stone-400">
                          {citationPreview(c)}
                        </p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ))
          )}

          {loading && messages[messages.length - 1]?.role !== ChatRole.ASSISTANT && (
            <div className="flex items-center gap-5 text-gold-700 text-[12px] font-bold tracking-[0.12em] ml-20 py-6 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在生成回答...
            </div>
          )}
          <div ref={scrollRef} className="h-8" />
        </div>

        {currentCitations.length > 0 && (
          <div className="px-12 py-3 border-t border-gold-500/10 bg-gold-500/5 text-xs text-stone-600">
            已引用 {currentCitations.length} 条文档片段。
          </div>
        )}

        <div className="px-8 md:px-12 pb-10 pt-6 bg-gradient-to-t from-white via-white/95 to-transparent relative z-10 border-t border-gold-500/5">
          <div className="max-w-5xl mx-auto relative group">
            <div className="relative flex items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={activeKnowledgeBaseId ? '请输入问题或指令' : '请先选择知识库'}
                disabled={loading || !activeKnowledgeBaseId}
                className="w-full bg-stone-50 border border-[#e8dec5] rounded-sm pl-8 pr-24 py-6 text-base focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500 transition-all shadow-inner placeholder:text-stone-400 min-h-[88px] resize-none disabled:cursor-not-allowed disabled:opacity-60"
                rows={1}
              />
              <button
                title="发送"
                onClick={handleSend}
                disabled={loading || !input.trim() || !activeKnowledgeBaseId}
                className="absolute right-4 bottom-4 p-4 bg-noble-dark text-gold-500 rounded-sm shadow-chiaroscuro hover:bg-stone-900 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 border border-gold-500/30"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-center text-stone-500 mt-6 uppercase tracking-[0.14em] font-bold">
            Knowflow 智能问答助手
          </p>
        </div>
      </div>

      <AnimatePresence>
        {activeCitation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-sm border border-[#e8dec5] bg-white shadow-2xl"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#e8dec5] px-6 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gold-700">引用资料预览</p>
                  <h3 className="truncate text-xl font-black text-noble-dark">
                    {citationDocument?.originalFileName || activeCitation.documentName}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-stone-600">
                    <span className="inline-flex items-center gap-1 rounded-sm bg-gold-500/10 px-2 py-1 text-gold-800">
                      <MapPin className="h-3 w-3" />
                      {citationLocation(activeCitation)}
                    </span>
                    <span className="rounded-sm border border-stone-200 px-2 py-1">
                      相似度 {citationScore(activeCitation)}
                    </span>
                    <span className="rounded-sm border border-stone-200 px-2 py-1">
                      切片 #{activeCitation.chunkIndex}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {citationDocument?.fileType === FileType.PDF && (
                    <button
                      title="在新窗口打开"
                      onClick={() => window.open(citationPdfUrl(activeCitation), '_blank', 'noopener,noreferrer')}
                      className="rounded-sm border border-stone-200 bg-white p-3 text-stone-600 shadow-chiaroscuro hover:text-gold-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    title="下载原文件"
                    onClick={downloadCitationDocument}
                    className="rounded-sm border border-stone-200 bg-white p-3 text-stone-600 shadow-chiaroscuro hover:text-gold-700"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    title="关闭"
                    onClick={closeCitation}
                    className="rounded-sm border border-stone-200 bg-white p-3 text-stone-600 shadow-chiaroscuro hover:text-stone-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="border-b border-gold-500/10 bg-gold-500/5 px-6 py-4">
                <p className="mb-2 text-xs font-black text-noble-dark">引用片段</p>
                <p className="max-h-24 overflow-auto text-sm leading-6 text-stone-700">
                  {citationPreview(activeCitation)}
                </p>
              </div>

              <div className="flex-1 overflow-hidden bg-stone-50">
                {citationLoading ? (
                  <div className="flex h-full flex-col items-center justify-center text-gold-700">
                    <Loader2 className="mb-4 h-10 w-10 animate-spin" />
                    <p className="text-sm font-bold">正在读取资料内容...</p>
                  </div>
                ) : citationError ? (
                  <div className="flex h-full items-center justify-center px-8 text-center">
                    <p className="text-sm text-stone-600">{citationError}</p>
                  </div>
                ) : citationDocument?.fileType === FileType.PDF ? (
                  <iframe
                    title={citationDocument.originalFileName}
                    src={citationPdfUrl(activeCitation)}
                    className="h-full w-full bg-white"
                  />
                ) : citationDocument?.fileType === FileType.MD ? (
                  <div className="prose prose-stone h-full max-w-none overflow-auto bg-white p-8">
                    <ReactMarkdown>{citationText?.content || ''}</ReactMarkdown>
                  </div>
                ) : (
                  <pre className="h-full overflow-auto whitespace-pre-wrap bg-white p-8 font-mono text-sm leading-7 text-stone-800">
                    {citationText?.content || '暂无可预览内容。'}
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
