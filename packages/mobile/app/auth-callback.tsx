import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/endpoints';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);
  const isExchanging = useRef(false);

  useEffect(() => {
    if (isExchanging.current) return;
    isExchanging.current = true;

    if (params.error || !params.code) {
      router.replace('/(auth)/login');
      return;
    }

    void authApi.exchangeSocialCode(params.code)
      .then((response) => {
        const token = response.data?.token;
        if (!token) throw new Error('Social login exchange returned no token');
        return loginWithToken(token);
      })
      .then(() => router.replace('/(tabs)'))
      .catch(() => {
        Alert.alert('Sign in failed', 'Please try social sign-in again.');
        router.replace('/(auth)/login');
      });
  }, [params.code, params.error, loginWithToken, router]);

  return <LoadingSpinner fullScreen />;
}
