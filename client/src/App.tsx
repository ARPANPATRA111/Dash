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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRegistered = useAuthStore((state) => state.isRegistered);
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
    return <AuthScreen />;
  }

  return <ChatLayout />;
}
