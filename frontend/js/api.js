const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function apiRequest(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;}

const api = {
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (userData) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  getMe: () => apiRequest('/auth/me'),

  getAdminStats: () => apiRequest('/admin/stats'),
  getUsers: (params = '') => apiRequest(`/admin/users${params}`),
  getAdminCertificates: (params = '') => apiRequest(`/admin/certificates${params}`),
  approveInstitution: (id) => apiRequest(`/admin/users/${id}/approve`, { method: 'PATCH' }),
  toggleUserActive: (id) => apiRequest(`/admin/users/${id}/toggle-active`, { method: 'PATCH' }),
  createAuditor: (data) => apiRequest('/admin/auditors', { method: 'POST', body: JSON.stringify(data) }),
  getReports: () => apiRequest('/admin/reports'),

  getAuditorOverview: () => apiRequest('/auditor/overview'),
  getAuditorCertificates: (params = '') => apiRequest(`/auditor/certificates${params}`),
  getAuditorVerifications: () => apiRequest('/auditor/verifications'),
  getAuditorUsers: (params = '') => apiRequest(`/auditor/users${params}`),
  getAuditorReports: () => apiRequest('/auditor/reports'),

  getInstitutionStaff: () => apiRequest('/institution/staff'),
  addInstitutionStaff: (data) => apiRequest('/institution/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateInstitutionStaff: (id, data) => apiRequest(`/institution/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getStudents: (search = '') => apiRequest(`/students${search ? `?search=${search}` : ''}`),
  getStudent: (id) => apiRequest(`/students/${id}`),
  addStudent: (data) => apiRequest('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, data) => apiRequest(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  issueCertificate: (data) =>
    apiRequest('/certificates/issue', { method: 'POST', body: JSON.stringify(data) }),
  getMyCertificates: () => apiRequest('/certificates/my'),
  getInstitutionCertificates: () => apiRequest('/certificates/institution'),
  getCertificate: (id) => apiRequest(`/certificates/${id}`),
  downloadCertificate: (id) => {
    const token = getToken();
    return fetch(`${API_BASE}/certificates/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  revokeCertificate: (id) =>
    apiRequest(`/certificates/${id}/revoke`, { method: 'PATCH' }),

  verifyCertificate: (id, method = 'id') =>
    apiRequest(`/verify/${id}?method=${method}`),

  getVerificationHistory: () => apiRequest('/verify/history/recent'),

  getBlockchainStatus: () => apiRequest('/blockchain/status'),
  getBlockchainTransactions: () => apiRequest('/blockchain/transactions'),
  getOnChainCertificate: (id) => apiRequest(`/blockchain/certificate/${id}`),
};

function requireAuth(allowedRoles = []) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = '/login.html';
    return null;
  }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    window.location.href = '/dashboard.html';
    return null;
  }
  return user;
}

function requireInstitutionAuth() {
  return requireAuth(['institution', 'institution_staff']);
}

function isInstitutionUser(user) {
  return user && (user.role === 'institution' || user.role === 'institution_staff');
}

function can(user, permission) {
  if (!user) return false;
  if (user.role === 'institution' || user.role === 'admin') return true;
  if (user.role === 'institution_staff') {
    return Boolean(user.staffPermissions?.[permission]);
  }
  return false;
}

function redirectByRole(user) {
  const routes = {
    admin: '/admin-dashboard.html',
    institution: '/institution-dashboard.html',
    institution_staff: '/institution-dashboard.html',
    student: '/student-dashboard.html',
    employer: '/employer-dashboard.html',
    auditor: '/auditor-dashboard.html',
  };
  window.location.href = routes[user.role] || '/dashboard.html';
}

function showAlert(container, message, type = 'danger') {
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function statusBadge(status) {
  const cls = `badge badge-${status.toLowerCase().replace(' ', '-')}`;
  return `<span class="badge ${cls}">${status}</span>`;
}

function logout() {
  clearAuth();
  window.location.href = '/login.html';
}
