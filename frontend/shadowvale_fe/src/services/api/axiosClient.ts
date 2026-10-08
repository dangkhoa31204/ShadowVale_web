import axios from 'axios';
import { storageService } from '../storage/storageService';
import { apiBaseURL } from '../../config/environment';

export const axiosClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = storageService.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      storageService.clearAuth();
    }
    const message = error.response?.data?.detail || error.response?.data?.message;
    if (typeof message === 'string') error.message = message;
    return Promise.reject(error);
  }
);
