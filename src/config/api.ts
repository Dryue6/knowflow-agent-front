export type ApiMode = 'real' | 'mock';

const normalizeApiMode = (value: string | undefined): ApiMode => {
  return value?.toLowerCase() === 'mock' ? 'mock' : 'real';
};

export const apiMode = normalizeApiMode(import.meta.env.VITE_API_MODE);

export const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const getApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = apiBaseURL.endsWith('/') ? apiBaseURL.slice(0, -1) : apiBaseURL;

  return `${normalizedBase}${normalizedPath}`;
};

