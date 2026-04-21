// API Client - Replaces Supabase with local MySQL backend
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

// Compatibility layer for existing code that expects supabase interface
export const auth = {
  async getSession() {
    const user = await api.getSession();
    return { data: { session: user ? { user } : null } };
  },
  async signInWithPassword(credentials: { email: string; password: string }) {
    try {
      const user = await api.login(credentials.email, credentials.password);
      return { data: { session: { user } }, error: null };
    } catch (err: any) {
      return { data: { session: null }, error: { message: err.message } };
    }
  },
  async signUp(credentials: { email: string; password: string }) {
    try {
      const user = await api.register(credentials.email, credentials.password);
      return { data: { user }, error: null };
    } catch (err: any) {
      return { data: { user: null }, error: { message: err.message } };
    }
  },
  signOut() {
    api.signOut();
  },
  onAuthStateChange(callback: (event: string, session: any) => void) {
    // Return subscription-like object
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
};

// Database compatibility layer - Query Builder pattern
const from = (table: string) => {
  const state = { filters: [] as any[], orderBy: null as string | null, ascending: false };

  const builder: any = {
    select: (columns = '*') => builder,
    eq: (field: string, value: any) => {
      state.filters.push({ field, value });
      return builder;
    },
    order: (field: string, opts?: { ascending?: boolean }) => {
      state.orderBy = field;
      state.ascending = opts?.ascending ?? false;
      return builder;
    },
    maybeSingle: () => builder,
    insert: async (data: any) => {
      if (table === 'checks') {
        const check = await api.createCheck(data);
        return { data: check, error: null };
      }
      return { data: null, error: null };
    },
    update: (updates: any) => {
      return {
        eq: async (field: string, value: string) => {
          if (table === 'checks') {
            const check = await api.updateCheck(value, updates);
            return { data: check, error: null };
          }
          return { data: null, error: null };
        },
        in: async (field: string, values: string[]) => {
          if (table === 'checks') {
            for (const id of values) {
              await api.updateCheck(id, updates);
            }
            return { data: null, error: null };
          }
          return { data: null, error: null };
        }
      };
    },
    delete: () => {
      return {
        eq: async (field: string, value: string) => {
          if (table === 'checks') {
            await api.deleteCheck(value);
            return { data: null, error: null };
          }
          return { data: null, error: null };
        },
        in: async (field: string, values: string[]) => {
          if (table === 'checks') {
            for (const id of values) {
              await api.deleteCheck(id);
            }
            return { data: null, error: null };
          }
          return { data: null, error: null };
        }
      };
    },
    upsert: async (data: any, options?: any) => {
      if (table === 'cheque_settings') {
        const settings = await api.updateSettings(data);
        return { data: settings, error: null };
      }
      return { data: null, error: null };
    },
    then: (resolve: any, reject: any) => {
      (async () => {
        try {
          if (table === 'checks') {
            let checks = await api.getChecks();
            for (const f of state.filters) {
              checks = checks.filter((c: any) => c[f.field] === f.value);
            }
            resolve({ data: checks, error: null });
          } else if (table === 'cheque_settings') {
            const settings = await api.getSettings();
            resolve({ data: settings, error: null });
          } else {
            resolve({ data: null, error: null });
          }
        } catch (err) {
          reject(err);
        }
      })();
    }
  };

  return builder;
};

export const supabase = { auth, from };
export const isConfigured = true;
console.log('API: Using local MySQL backend');
