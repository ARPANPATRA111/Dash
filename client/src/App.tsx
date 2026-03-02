import { useEffect } from 'react';
import { useChatStore, useAuthStore } from '@/stores';
import { connectToSpacetimeDB, disconnectFromSpacetimeDB } from '@/lib/spacetimedb';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ConnectionError } from '@/components/ui/ConnectionError';

export default function App() {
  const isConnected = useChatStore((state) => state.isConnected);
  const isConnecting = useChatStore((state) => state.isConnecting);
  const connectionError = useChatStore((state) => state.connectionError);
  const currentUser = useChatStore((state) => state.currentUser);
  const currentIdentity = useChatStore((state) => state.currentIdentity);
  const users = useChatStore((state) => state.users);
  const setCurrentUser = useChatStore((state) => state.setCurrentUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRegistered = useAuthStore((state) => state.isRegistered);
  const needsProfileSetup = useAuthStore((state) => state.needsProfileSetup);
  const setIsRegistered = useAuthStore((state) => state.setIsRegistered);
  const setNeedsProfileSetup = useAuthStore((state) => state.setNeedsProfileSetup);
  const token = useAuthStore((state) => state.token);
  
  useEffect(() => {
    const connect = async () => {
      if (!isAuthenticated) {
        disconnectFromSpacetimeDB();
        return;
      }

      try {
        await connectToSpacetimeDB();
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    };
    
    connect();
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !isConnected || currentUser || !currentIdentity) {
      return;
    }

    const identityUser = users.get(currentIdentity.toHexString());
    if (identityUser) {
      console.debug('[AuthGate] Hydrated current user from cached table row', {
        identity: currentIdentity.toHexString(),
        username: identityUser.username,
      });
      setCurrentUser(identityUser);
      setIsRegistered(true);
      setNeedsProfileSetup(false);
    }
  }, [currentIdentity, currentUser, isAuthenticated, isConnected, setCurrentUser, setIsRegistered, setNeedsProfileSetup, users]);

  useEffect(() => {
    console.debug('[AuthGate] State snapshot', {
      isAuthenticated,
      isConnecting,
      isConnected,
      isRegistered,
      needsProfileSetup,
      hasCurrentUser: Boolean(currentUser),
      hasCurrentIdentity: Boolean(currentIdentity),
      hasConnectionError: Boolean(connectionError),
    });
  }, [connectionError, currentIdentity, currentUser, isAuthenticated, isConnected, isConnecting, isRegistered, needsProfileSetup]);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (isConnecting) {
    return <LoadingScreen message="Connecting to Dash..." />;
  }

  if (connectionError) {
    return <ConnectionError error={connectionError} />;
  }

  if (!isConnected) {
    return <LoadingScreen message="Initializing..." />;
  }

  if (!currentUser || !isRegistered) {
    if (!needsProfileSetup) {
      return <LoadingScreen message="Loading your account..." />;
    }
    return <AuthScreen />;
  }

  return <ChatLayout />;
}
