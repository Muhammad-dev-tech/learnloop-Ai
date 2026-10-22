import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import { loginStudent, registerStudent, logoutStudent, fetchCurrentUser } from '../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('learnloop_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await fetchCurrentUser(token);
        setUser(currentUser);
      } catch (err) {
        // Token expired or invalid
        setUser(null);
        setToken(null);
        localStorage.removeItem('learnloop_token');
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (credentials: LoginCredentials) => {
    const data = await loginStudent(credentials);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('learnloop_token', data.access_token);
  };

  const register = async (credentials: RegisterCredentials) => {
    const data = await registerStudent(credentials);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('learnloop_token', data.access_token);
  };

  const logout = async () => {
    try {
      await logoutStudent();
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('learnloop_token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
