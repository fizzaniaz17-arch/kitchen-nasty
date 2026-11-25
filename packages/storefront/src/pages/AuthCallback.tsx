import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const isExchanging = useRef(false);

  useEffect(() => {
    if (isExchanging.current) return;
    isExchanging.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      void navigate('/login?error=auth_failed', { replace: true });
      return;
    }

    if (!code) {
      void navigate('/login?error=auth_failed', { replace: true });
      return;
    }

    void navigate('/auth/callback', { replace: true });
    void (async () => {
      try {
        const response = await fetch('/api/auth/social/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await response.json();
        if (!response.ok || !data.data?.token) throw new Error('Social login exchange failed');
        loginWithToken(data.data.token);
        void navigate('/account', { replace: true });
      } catch {
        void navigate('/login?error=auth_failed', { replace: true });
      }
    })();
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}
