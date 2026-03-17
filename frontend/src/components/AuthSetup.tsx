import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import api from '../services/api';

export function AuthSetup({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const hasSetup = useRef(false);

  useEffect(() => {
    if (hasSetup.current) return;
    hasSetup.current = true;

    const setup = async () => {
      try {
        const token = await getToken();
        if (token) {
          await api.post('/auth/setup', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (err) {
        console.warn('Auth setup failed (calendars may not be synced):', err);
      }
    };

    setup();
  }, [getToken]);

  return <>{children}</>;
}
