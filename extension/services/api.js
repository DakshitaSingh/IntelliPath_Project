
const DEFAULT_API_BASE = 'https://intellipath-project-2.onrender.com/api';

export async function getConfig() {
  const data = await chrome.storage.local.get(['apiBaseUrl', 'appUrl']);
  return {
    apiBaseUrl: (data.apiBaseUrl || DEFAULT_API_BASE).replace(/\/+$/, ''),
    appUrl: (data.appUrl || 'http://localhost:5173').replace(/\/+$/, ''),
  };
}

export async function getToken() {
  const { token } = await chrome.storage.local.get('token');
  return token || '';
}

export async function apiRequest(path, options = {}) {
  const { apiBaseUrl } = await getConfig();
  const token = await getToken();
  const headers = { ...(options.headers || {}) };

  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  let data = {};

  try { data = await response.json(); } catch {}

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function saveWebResource(resource) {
  return apiRequest('/documents/web', {
    method: 'POST',
    body: JSON.stringify(resource),
  });
}

export async function explainWebContent(content) {
  return apiRequest('/ai/web/explain', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function generateQuizFromResource(documentId, count = 5) {
  return apiRequest('/quizzes/generate', {
    method: 'POST',
    body: JSON.stringify({ documentId, count }),
  });
}

export async function generateFlashcardsFromResource(documentId, count = 10) {
  return apiRequest('/flashcards/generate', {
    method: 'POST',
    body: JSON.stringify({ documentId, count }),
  });
}

export async function login(email, password) {
  const { apiBaseUrl } = await getConfig();

  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.message || 'Login failed');

  await chrome.storage.local.set({ token: data.token, user: data.user });
  return data.user;
}

export async function logout() {
  await chrome.storage.local.remove(['token', 'user']);
}

export async function getUser() {
  const { user } = await chrome.storage.local.get('user');
  return user || null;
}

export async function isAuthenticated() {
  return Boolean(await getToken());
}
