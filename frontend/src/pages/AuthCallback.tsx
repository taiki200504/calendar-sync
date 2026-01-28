import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import api from '../services/api';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function AuthCallback() {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1) Supabase Auth からのリダイレクト: ハッシュにトークンが入っている（クライアントが復元するまで少し待つ）
        if (window.location.hash) {
          await new Promise(r => setTimeout(r, 100));
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          try {
            const res = await fetch(`${API_BASE}/auth/supabase-session`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: session.access_token }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              setAuthenticated(true);
              navigate('/dashboard');
              return;
            }
          } catch (e) {
            console.error('Supabase session exchange failed:', e);
          }
          navigate('/');
          return;
        }

        // 2) 従来のバックエンド OAuth コールバック (success=true)
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');

        if (error) {
          console.error('Authentication error:', error);
          navigate('/');
          return;
        }

        if (success === 'true') {
          const accountAdded = urlParams.get('accountAdded') === 'true';
          if (accountAdded) {
            window.location.href = '/dashboard';
            return;
          }

          await new Promise(resolve => setTimeout(resolve, 500));
          try {
            const response = await api.get('/auth/me');
            if (response.data) {
              setAuthenticated(true);
              navigate('/dashboard');
            } else {
              navigate('/');
            }
          } catch (err: unknown) {
            console.error('Failed to verify authentication:', err);
            navigate('/');
          }
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate, setAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">認証処理中...</p>
      </div>
    </div>
  );
}
