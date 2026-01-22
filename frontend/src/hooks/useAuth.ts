import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  email: string;
  name?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // セッションベースの認証を使用
        // api.tsでwithCredentials: trueが設定されているので、セッションクッキーが自動的に送信される
        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include', // クッキーを送信
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // セッションが無効な場合
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const logout = async () => {
    try {
      // セッションを破棄するためにログアウトAPIを呼び出す
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
    }
    setUser(null);
    navigate('/');
  };

  return { user, loading, logout };
}
