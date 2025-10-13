import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (username: string, email: string, password: string) =>
  api.post('/auth/register', { username, email, password });

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const getCurrentUser = () => api.get('/auth/me');

// Stocks
export const getStocks = () => api.get('/stocks');

export const getStock = (id: number) => api.get(`/stocks/${id}`);

export const addStock = (stock: { symbol: string; name: string; sector?: string; current_price?: number }) =>
  api.post('/stocks', stock);

export const updateStock = (id: number, stock: { symbol?: string; name?: string; sector?: string; current_price?: number }) =>
  api.put(`/stocks/${id}`, stock);

export const deleteStock = (id: number) => api.delete(`/stocks/${id}`);

export const recordMonthlyPrice = (stockId: number, price: number, month: number, year: number) =>
  api.post(`/stocks/${stockId}/monthly-price`, { price, month, year });

export const getMonthlyPrices = (stockId: number) => api.get(`/stocks/${stockId}/monthly-prices`);

// Portfolio
export const getPortfolio = () => api.get('/portfolio');

export const makeInitialSelection = (stock_ids: number[]) =>
  api.post('/portfolio/initial-selection', { stock_ids });

export const getPendingSwitches = () => api.get('/portfolio/pending-switches');

export const requestSwitch = (old_stock_id: number, new_stock_id: number) =>
  api.post('/portfolio/switch', { old_stock_id, new_stock_id });

export const cancelSwitch = (switchId: number) => api.delete(`/portfolio/switch/${switchId}`);

export const getPerformance = () => api.get('/portfolio/performance');

export default api;
