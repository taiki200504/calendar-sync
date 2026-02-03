import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../hooks/useAuthStore';
import api from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, setAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // セッションベースの認証を確認
        const response = await api.get('/auth/me');
        if (response.data) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
        }
      } catch (error: unknown) {
        // 401エラーは未認証を意味する（正常な動作）
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          console.debug('User not authenticated, redirecting to login');
        } else {
          console.error('Auth check failed:', error);
        }
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    // 既に認証済みの場合はスキップ
    if (isAuthenticated) {
      setLoading(false);
    } else {
      checkAuth();
    }
  }, [isAuthenticated, setAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証確認中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // ログインしていない場合はLoginページにリダイレクト
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
