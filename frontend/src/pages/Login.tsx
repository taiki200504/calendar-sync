const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function Login() {
  const handleGoogleLogin = () => {
    // 1回の認証でログイン・カレンダー取得・同期まで完了（バックエンド OAuth）
    window.location.href = `${API_BASE}/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            CalendarSync OS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            複数のGoogleカレンダーを双方向同期
          </p>
        </div>
        <div>
          <button
            onClick={handleGoogleLogin}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Googleでログイン
          </button>
        </div>
      </div>
    </div>
  );
}
