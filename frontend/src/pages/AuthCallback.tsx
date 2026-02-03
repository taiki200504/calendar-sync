import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import api from '../services/api';

export function AuthCallback() {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');

        if (error) {
          console.error('Authentication error:', decodeURIComponent(error));
          setStatus('error');
          setErrorMessage(decodeURIComponent(error));
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (success === 'true') {
          // セッションが確立されるまで少し待つ
          await new Promise((r) => setTimeout(r, 500));
          
          // 最大3回リトライ
          for (let i = 0; i < 3; i++) {
            try {
              const response = await api.get('/auth/me');
              if (response.data) {
                setAuthenticated(true);
                navigate('/dashboard');
                return;
              }
            } catch (err: unknown) {
              console.debug(`Auth verification attempt ${i + 1} failed, retrying...`);
              if (i < 2) {
                await new Promise((r) => setTimeout(r, 500));
              }
            }
          }
          
          // 3回失敗した場合
          console.error('Failed to verify authentication after 3 attempts');
          setStatus('error');
          setErrorMessage('認証の確認に失敗しました。もう一度お試しください。');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        navigate('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setErrorMessage('認証処理中にエラーが発生しました。');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    checkAuth();
  }, [navigate, setAuthenticated]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-800 font-medium mb-2">認証エラー</p>
          <p className="text-gray-600 text-sm mb-4">{errorMessage}</p>
          <p className="text-gray-500 text-xs">3秒後にログインページに戻ります...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">認証処理中...</p>
      </div>
    </div>
  );
}
