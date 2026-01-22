import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import api from '../services/api';

export function AuthCallback() {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // URLパラメータから成功/失敗を確認
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
            // アカウント追加モード：ダッシュボードに戻るだけ
            console.log('✅ Account added successfully');
            // アカウント一覧を再取得するためにダッシュボードにリロード
            window.location.href = '/dashboard';
            return;
          }

          // 通常のログインフロー - セッションが設定されているので、/api/auth/meで確認
          // 少し待ってからセッションが確立されるのを待つ
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            console.log('🔄 Verifying authentication with /api/auth/me...');
            // withCredentials: trueが設定されているので、セッションクッキーが自動的に送信される
            const response = await api.get('/auth/me');
            console.log('✅ Authentication verified:', response.data);
            
            if (response.data) {
              setAuthenticated(true);
              console.log('✅ Navigating to dashboard...');
              navigate('/dashboard');
            } else {
              console.error('❌ No user data received');
              navigate('/');
            }
          } catch (err: any) {
            console.error('❌ Failed to verify authentication:', err);
            // エラーの詳細をログに出力
            if (err.response) {
              console.error('Error response:', err.response.data);
              console.error('Error status:', err.response.status);
              console.error('Error headers:', err.response.headers);
            }
            if (err.request) {
              console.error('Request made but no response received');
            }
            console.error('Full error:', err);
            navigate('/');
          }
        } else {
          // 認証失敗
          console.log('❌ Authentication failed (success !== true)');
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
