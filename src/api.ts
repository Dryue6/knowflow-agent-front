import axios from 'axios';
import { ApiResult, KnowledgeBaseVO, PageResult, ChatSessionVO, ChatMessageVO, DocumentVO, ChunkVO, IndexJobVO, RagSearchRequest, RagSearchResult, DocumentPreviewTextVO, PresignedUploadUrlResponse } from './types';
import { apiBaseURL, getApiUrl } from './config/api';

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
};

export const kbApi = {
  list: (params: any) => api.get<ApiResult<PageResult<KnowledgeBaseVO>>>('/knowledge-bases', { params }),
  create: (data: any) => api.post<ApiResult<KnowledgeBaseVO>>('/knowledge-bases', data),
  get: (id: number) => api.get<ApiResult<KnowledgeBaseVO>>(`/knowledge-bases/${id}`),
  update: (id: number, data: any) => api.put<ApiResult<KnowledgeBaseVO>>(`/knowledge-bases/${id}`, data),
  delete: (id: number) => api.delete<ApiResult<null>>(`/knowledge-bases/${id}`),
};

export const docApi = {
  list: (kbId: number, params: any) => api.get<ApiResult<PageResult<DocumentVO>>>(`/knowledge-bases/${kbId}/documents`, { params }),
  createUploadUrl: (kbId: number, file: File) =>
    api.post<ApiResult<PresignedUploadUrlResponse>>(`/knowledge-bases/${kbId}/documents/upload-url`, {
      originalFileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
    }),
  completeUpload: (kbId: number, payload: { objectKey: string; originalFileName: string; fileSize: number; contentType: string }) =>
    api.post<ApiResult<{ documentId: number; jobId: number; status: string }>>(`/knowledge-bases/${kbId}/documents/complete-upload`, payload),
  upload: async (kbId: number, file: File) => {
    const uploadUrlRes = await docApi.createUploadUrl(kbId, file);
    const uploadInfo = uploadUrlRes.data?.data;
    if (!uploadInfo?.uploadUrl || !uploadInfo.objectKey) {
      throw new Error('未获取到文件直传地址');
    }

    const uploadResponse = await fetch(uploadInfo.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });
    if (!uploadResponse.ok) {
      throw new Error(`文件直传 MinIO 失败: ${uploadResponse.status}`);
    }

    return docApi.completeUpload(kbId, {
      objectKey: uploadInfo.objectKey,
      originalFileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
    });
  },
  get: (id: number) => api.get<ApiResult<DocumentVO>>(`/documents/${id}`),
  updateConstraint: (id: number, data: { constraintLevel: string; constraintPriority?: number }) =>
    api.patch<ApiResult<DocumentVO>>(`/documents/${id}/constraint`, data),
  fileUrl: (id: number) => getApiUrl(`/documents/${id}/file`),
  downloadUrl: (id: number) => getApiUrl(`/documents/${id}/download`),
  previewText: (id: number) => api.get<ApiResult<DocumentPreviewTextVO>>(`/documents/${id}/preview-text`),
  delete: (id: number) => api.delete<ApiResult<null>>(`/documents/${id}`),
  reindex: (id: number) => api.post<ApiResult<{ documentId: number; jobId: number; status: string }>>(`/documents/${id}/reindex`),
  getChunks: (id: number, params: any) => api.get<ApiResult<PageResult<ChunkVO>>>(`/documents/${id}/chunks`, { params }),
  getJob: (id: number) => api.get<ApiResult<IndexJobVO>>(`/documents/${id}/index-job`),
};

export const chatApi = {
  createSession: (data: any) => api.post<ApiResult<ChatSessionVO>>('/chat/sessions', data),
  listSessions: (params: any) => api.get<ApiResult<PageResult<ChatSessionVO>>>('/chat/sessions', { params }),
  getSession: (id: number) => api.get<ApiResult<ChatSessionVO>>(`/chat/sessions/${id}`),
  getMessages: (sessionId: number, params: any) => api.get<ApiResult<PageResult<ChatMessageVO>>>(`/chat/sessions/${sessionId}/messages`, { params }),
  deleteSession: (id: number) => api.delete(`/chat/sessions/${id}`),
  sendMessage: (sessionId: number, data: { content: string }) => api.post(`/chat/sessions/${sessionId}/messages`, data),
};

export const ragApi = {
  search: (data: RagSearchRequest) => api.post<ApiResult<RagSearchResult>>('/rag/search', data),
};

export default api;
