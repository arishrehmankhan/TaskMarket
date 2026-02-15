/** TaskMarket API client */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

/* ── Token helpers ── */

export function getToken() {
  return localStorage.getItem('tm_token');
}

export function setToken(token) {
  localStorage.setItem('tm_token', token);
}

export function removeToken() {
  localStorage.removeItem('tm_token');
}

/* ── Core request wrapper ── */

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body !== undefined && body !== null) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, options);

  if (!res.ok) {
    let payload;
    try {
      payload = await res.json();
    } catch {
      payload = {};
    }
    const err = new Error(payload.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = payload.code || 'UNKNOWN_ERROR';
    err.message = payload.message || err.message;
    err.details = payload.details || null;
    throw err;
  }

  const json = await res.json();
  return json.data;
}

/* ── Convenience methods ── */

const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};

/* ── Task lifecycle ── */

export function fetchTasks(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  const query = qs.toString();
  return api.get(`/tasks${query ? `?${query}` : ''}`);
}

export function fetchMyTasks() {
  return api.get('/tasks/mine');
}

export function fetchTask(taskId) {
  return api.get(`/tasks/${taskId}`);
}

export function createTask(body) {
  return api.post('/tasks', body);
}

export function updateTask(taskId, body) {
  return api.patch(`/tasks/${taskId}`, body);
}

export function cancelTask(taskId) {
  return api.post(`/tasks/${taskId}/cancel`);
}

export function adminRequestTaskModification(taskId, body) {
  return api.post(`/tasks/${taskId}/admin-request-modification`, body);
}

export function adminDeleteTask(taskId) {
  return api.del(`/tasks/${taskId}/admin-delete`);
}

export function submitOffer(taskId, body) {
  return api.post(`/tasks/${taskId}/offers`, body);
}

export function withdrawOffer(taskId, offerId) {
  return api.post(`/tasks/${taskId}/offers/${offerId}/withdraw`);
}

export function acceptOffer(taskId, offerId) {
  return api.post(`/tasks/${taskId}/offers/${offerId}/accept`);
}

export function submitWork(taskId) {
  return api.post(`/tasks/${taskId}/work-submitted`);
}

export function confirmOffline(taskId) {
  return api.post(`/tasks/${taskId}/confirm-offline`);
}

/* ── Auth ── */

export function login(body) {
  return api.post('/auth/login', body);
}

export function register(body) {
  return api.post('/auth/register', body);
}

export function fetchMe() {
  return api.get('/auth/me');
}

/* ── Chat ── */

export function getConversation(taskId) {
  return api
    .post(`/chat/tasks/${taskId}/conversation`)
    .then((data) => data?.conversation || data);
}

export function getMessages(conversationId, after) {
  const qs = after ? `?after=${after}` : '';
  return api
    .get(`/chat/conversations/${conversationId}/messages${qs}`)
    .then((data) => data?.messages || data);
}

export function sendMessage(conversationId, body) {
  return api
    .post(`/chat/conversations/${conversationId}/messages`, body)
    .then((data) => data?.message || data);
}

/* ── Reviews ── */

export function createReview(body) {
  return api.post('/reviews', body);
}

export function fetchUserReviews(userId) {
  return api.get(`/reviews/user/${userId}`);
}

/* ── Reports ── */

export function createReport(body) {
  return api.post('/reports', body);
}

export function fetchMyReports() {
  return api.get('/reports/mine');
}

export function fetchAdminReports(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return api.get(`/reports${qs}`);
}

export function resolveReport(reportId, body) {
  return api.post(`/reports/${reportId}/resolve`, body);
}

/* ── Users ── */

export function fetchUser(userId) {
  return api.get(`/users/${userId}`);
}

export default api;
