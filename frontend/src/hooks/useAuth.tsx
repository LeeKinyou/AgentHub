'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { apiClient, type UserRead } from '@/lib/api';

interface AuthState {
  user: UserRead | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: apiClient.isAuthenticated(),
    isLoading: true,
  });

  useEffect(() => {
    const initAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const result = await apiClient.getMe();
          if (result.data) {
            setState({ user: result.data, isAuthenticated: true, isLoading: false });
          } else {
            apiClient.clearTokens();
            setState({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          apiClient.clearTokens();
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiClient.login(username, password);
    if (result.data) {
      setState({ user: result.data.user, isAuthenticated: true, isLoading: false });
      return { success: true };
    }
    return { success: false, message: result.message };
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const result = await apiClient.register(username, email, password);
    if (result.data) {
      setState({ user: result.data.user, isAuthenticated: true, isLoading: false });
      return { success: true };
    }
    return { success: false, message: result.message };
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
