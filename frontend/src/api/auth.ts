import { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types/auth';
import { API_BASE_URL, parseApiResponse } from './config';

const API_BASE = `${API_BASE_URL}/api/auth`;

export async function registerStudent(credentials: RegisterCredentials): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  return parseApiResponse<AuthResponse>(res, 'Registration failed');
}

export async function loginStudent(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  return parseApiResponse<AuthResponse>(res, 'Login failed');
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

  return parseApiResponse<User>(res, 'Failed to fetch current user profile');
}
