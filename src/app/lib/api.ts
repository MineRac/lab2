const API_BASE = import.meta.env.VITE_API_BASE || '';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T = any>(url: string): Promise<T> =>
    fetch(`${API_BASE}${url}`, { headers: getHeaders() }).then(handleResponse),
  post: <T = any>(url: string, body?: any): Promise<T> =>
    fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    }).then(handleResponse),
  put: <T = any>(url: string, body: any): Promise<T> =>
    fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse),
  delete: <T = any>(url: string): Promise<T> =>
    fetch(`${API_BASE}${url}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
};