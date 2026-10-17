// Centralized API configuration supporting local proxy and production cloud backend
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
