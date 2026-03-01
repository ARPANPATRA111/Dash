import { GoogleAuthScreen } from './GoogleAuthScreen';
import { ProfileSetupScreen } from './ProfileSetupScreen';
import { useAuthStore } from '@/stores';

export function AuthScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <GoogleAuthScreen />;
  }

  return <ProfileSetupScreen />;
}
