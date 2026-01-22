import axios from 'axios';

// Use environment variable or fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin API endpoints
export const adminAPI = {
  // Auth
  login: (credentials) => api.post('/admin/login', credentials),
  
  // Apps management
  getApps: () => api.get('/admin/apps'),
  createApp: (appData) => api.post('/admin/apps', appData),
  updateApp: (appId, appData) => api.put(`/admin/apps/${appId}`, appData),
  deleteApp: (appId) => api.delete(`/admin/apps/${appId}`),
  rotateApiKey: (appId) => api.post(`/admin/apps/${appId}/rotate-key`),
  
  // Bookings
  getBookings: (params) => api.get('/admin/bookings', { params }),
  
  // Dashboard stats
  getStats: () => api.get('/admin/stats'),
};

// User Auth API (for reference)
export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

// Booking API (requires app auth headers)
export const bookingAPI = {
  getSeats: (appId, apiKey, params) => 
    api.get('/seats', { 
      params,
      headers: { 'x-app-id': appId, 'x-api-key': apiKey }
    }),
  reserveSeat: (appId, apiKey, data) => 
    api.post('/reserve-seat', data, {
      headers: { 'x-app-id': appId, 'x-api-key': apiKey }
    }),
  confirmBooking: (appId, apiKey, data) => 
    api.post('/confirm-booking', data, {
      headers: { 'x-app-id': appId, 'x-api-key': apiKey }
    }),
  releaseSeat: (appId, apiKey, data) => 
    api.post('/release-seat', data, {
      headers: { 'x-app-id': appId, 'x-api-key': apiKey }
    }),
};

export default api;