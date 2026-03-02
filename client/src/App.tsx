import { useEffect, useRef } from 'react';
import { useChatStore, useAuthStore } from '@/stores';
import { connectToSpacetimeDB, disconnectFromSpacetimeDB, loginWithEmail } from '@/lib/spacetimedb';
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
  const userEmail = useAuthStore((state) => state.userEmail);
  const loginBootstrapAttemptRef = useRef<string | null>(null);
  
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
    if (!isAuthenticated || !isConnected || currentUser) {
      return;
    }

    const identityHex = currentIdentity?.toHexString();
    const normalizedEmail = userEmail?.trim().toLowerCase();

    const identityUser = identityHex ? users.get(identityHex) : undefined;
    const emailUser = normalizedEmail
      ? Array.from(users.values()).find((user) => (user.email ?? '').toLowerCase() === normalizedEmail)
      : undefined;

    const resolvedUser = identityUser ?? emailUser;
    if (resolvedUser) {
      console.debug('[AuthGate] Hydrated current user from cached table row', {
        matchType: identityUser ? 'identity' : 'email',
        identity: identityHex ?? null,
        email: normalizedEmail ?? null,
        username: resolvedUser.username,
      });
      setCurrentUser(resolvedUser);
      setIsRegistered(true);
      setNeedsProfileSetup(false);
    }
  }, [currentIdentity, currentUser, isAuthenticated, isConnected, setCurrentUser, setIsRegistered, setNeedsProfileSetup, userEmail, users]);

  useEffect(() => {
    if (!isAuthenticated || !isConnected || !userEmail) {
      loginBootstrapAttemptRef.current = null;
      return;
    }

    const identityHex = currentIdentity?.toHexString() ?? 'unknown';
    const normalizedEmail = userEmail.trim().toLowerCase();
    const attemptKey = `${identityHex}:${normalizedEmail}`;

    if (loginBootstrapAttemptRef.current === attemptKey) {
      return;
    }

    loginBootstrapAttemptRef.current = attemptKey;

    loginWithEmail(normalizedEmail)
      .then(() => {
        setIsRegistered(true);
        setNeedsProfileSetup(false);
        console.debug('[AuthGate] Session login bootstrap succeeded', {
          email: normalizedEmail,
          identity: identityHex,
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        const normalized = message.toLowerCase();
        const isNewUserFlow = normalized.includes('email not found') || normalized.includes('sign up first');

        if (isNewUserFlow) {
          setIsRegistered(false);
          setNeedsProfileSetup(true);
        } else {
          console.warn('[AuthGate] Session login bootstrap failed', { message, email: normalizedEmail, identity: identityHex });
        }
      });
  }, [currentIdentity, isAuthenticated, isConnected, setIsRegistered, setNeedsProfileSetup, userEmail]);

  useEffect(() => {
    if (!isAuthenticated || !isConnected || currentUser || needsProfileSetup) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const authState = useAuthStore.getState();
      const chatState = useChatStore.getState();
      if (!authState.isAuthenticated || !chatState.isConnected || chatState.currentUser || authState.needsProfileSetup) {
        return;
      }

      const fallbackEmail = authState.userEmail?.trim().toLowerCase();
      if (!fallbackEmail) {
        return;
      }

      const fallbackUser = Array.from(chatState.users.values()).find(
        (user) => (user.email ?? '').toLowerCase() === fallbackEmail
      );

      if (fallbackUser) {
        console.debug('[AuthGate] Late hydration resolved via email fallback', {
          email: fallbackEmail,
          username: fallbackUser.username,
        });
        chatState.setCurrentUser(fallbackUser);
        authState.setIsRegistered(true);
        authState.setNeedsProfileSetup(false);
        return;
      }

      console.warn('[AuthGate] Timed out waiting for existing account profile, switching to profile setup', {
        email: fallbackEmail,
      });
      authState.setIsRegistered(false);
      authState.setNeedsProfileSetup(true);
    }, 10000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentUser, isAuthenticated, isConnected, needsProfileSetup]);

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
