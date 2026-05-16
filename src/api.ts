import axios from 'axios';
import { ApiResult, KnowledgeBaseVO, PageResult, KnowledgeBaseStatus, ChatSessionVO, ChatMessageVO } from './types';

const api = axios.create({
  baseURL: '/api',
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
  list: (kbId: number, params: any) => api.get<ApiResult<PageResult<any>>>(`/knowledge-bases/${kbId}/documents`, { params }),
  upload: (kbId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/knowledge-bases/${kbId}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id: number) => api.delete(`/documents/${id}`),
  reindex: (id: number) => api.post(`/documents/${id}/reindex`),
  getChunks: (id: number, params: any) => api.get(`/documents/${id}/chunks`, { params }),
  getJob: (id: number) => api.get(`/documents/${id}/index-job`),
};

export const chatApi = {
  createSession: (data: any) => api.post<ApiResult<ChatSessionVO>>('/chat/sessions', data),
  listSessions: (params: any) => api.get<ApiResult<PageResult<ChatSessionVO>>>('/chat/sessions', { params }),
  getMessages: (sessionId: number, params: any) => api.get<ApiResult<PageResult<ChatMessageVO>>>(`/chat/sessions/${sessionId}/messages`, { params }),
  deleteSession: (id: number) => api.delete(`/chat/sessions/${id}`),
};

export default api;
