import { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types/auth';
import { API_BASE_URL } from './config';

const API_BASE = `${API_BASE_URL}/api/auth`;

export async function registerStudent(credentials: RegisterCredentials): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Registration failed');
  }
  return data;
}

export async function loginStudent(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Login failed');
  }
  return data;
}

export async function logoutStudent(): Promise<void> {
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
  });
}

export async function fetchCurrentUser(token?: string | null): Promise<User> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/me`, {
    method: 'GET',
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to fetch current user profile');
  }
  return data;
}
