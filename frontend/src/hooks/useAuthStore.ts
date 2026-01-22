import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // セッションベースの認証なので、初期状態はfalse
  // ProtectedRouteで実際にAPIを呼び出して確認する
  isAuthenticated: false,
  setAuthenticated: (value: boolean) => {
    set({ isAuthenticated: value });
  },
  logout: async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ isAuthenticated: false });
      window.location.href = '/';
    }
  }
}));
