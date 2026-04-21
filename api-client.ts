// API Client - Hostinger MySQL Backend
const API_BASE = '';

async function apiRequest(endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem('finansse_token');
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers
    }
  });
  if (res.status === 401) {
    localStorage.removeItem('finansse_token');
    window.location.reload();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('finansse_token', data.token);
    return data.user;
  },
  async register(email: string, password: string) {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('finansse_token', data.token);
    return data.user;
  },
  async getSession() {
    const token = localStorage.getItem('finansse_token');
    if (!token) return null;
    try {
      return await apiRequest('/api/auth/me');
    } catch {
      localStorage.removeItem('finansse_token');
      return null;
    }
  },
  signOut() {
    localStorage.removeItem('finansse_token');
  },

  // Checks
  getChecks: () => apiRequest('/api/checks'),
  createCheck: (data: any) => apiRequest('/api/checks', { method: 'POST', body: JSON.stringify(data) }),
  updateCheck: (id: string, data: any) => apiRequest(`/api/checks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCheck: (id: string) => apiRequest(`/api/checks/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => apiRequest('/api/settings'),
  updateSettings: (data: any) => apiRequest('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Stats
  getStats: () => apiRequest('/api/stats')
};
