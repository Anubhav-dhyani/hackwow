import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Admin API calls
export const adminAPI = {
  login: (credentials) => api.post('/admin/login', credentials),
  createApp: (appData) => api.post('/admin/apps', appData),
  listApps: () => api.get('/admin/apps'),
  getApp: (appId) => api.get(`/admin/apps/${appId}`),
  updateApp: (appId, updates) => api.put(`/admin/apps/${appId}`, updates),
  rotateApiKey: (appId) => api.post(`/admin/apps/${appId}/rotate-key`),
  getBookings: (params) => api.get('/admin/bookings', { params }),
};

export default api;
