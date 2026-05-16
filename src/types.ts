
export enum KnowledgeBaseStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED'
}

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  PARSING = 'PARSING',
  PARSED = 'PARSED',
  INDEXING = 'INDEXING',
  INDEXED = 'INDEXED',
  FAILED = 'FAILED',
  DELETED = 'DELETED'
}

export enum FileType {
  TXT = 'TXT',
  MD = 'MD',
  PDF = 'PDF',
  DOCX = 'DOCX'
}

export enum IndexJobType {
  INDEX = 'INDEX',
  REINDEX = 'REINDEX'
}

export enum IndexJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export enum ChatRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM'
}

export interface ApiResult<T> {
  code: string;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  page: number;
  size: number;
}

export interface User {
  id: number;
  username: string;
  displayName: string;
  status: string;
}

export interface KnowledgeBaseVO {
  id: number;
  name: string;
  description: string;
  status: KnowledgeBaseStatus;
  documentCount: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVO {
  id: number;
  knowledgeBaseId: number;
  fileName: string;
  originalFileName: string;
  fileType: FileType;
  fileSize: number;
  title: string;
  status: DocumentStatus;
  errorMessage: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChunkVO {
  id: number;
  documentId: number;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  vectorId: string;
  createdAt: string;
}

export interface IndexJobVO {
  id: number;
  documentId: number;
  knowledgeBaseId: number;
  jobType: IndexJobType;
  status: IndexJobStatus;
  progress: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionVO {
  id: number;
  knowledgeBaseId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageVO {
  id: number;
  sessionId: number;
  role: ChatRole;
  content: string;
  citationsJson: string | null;
  createdAt: string;
}

export interface Citation {
  documentId: number;
  documentName: string;
  chunkId: number;
  chunkIndex: number;
  contentPreview: string;
  score: number;
}
