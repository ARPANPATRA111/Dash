import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Moon, Sun } from 'lucide-react';
import { connectToSpacetimeDB, disconnectFromSpacetimeDB, loginWithEmail } from '@/lib/spacetimedb';
import { loadGoogleIdentityScript, parseGoogleIdTokenPayload } from '@/lib/google-oauth';
import { useAuthStore, useUIStore } from '@/stores';

export function GoogleAuthScreen() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(320);
  const buttonRef = useRef<HTMLDivElement>(null);

  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const setUserEmail = useAuthStore((state) => state.setUserEmail);
  const setOauthProfile = useAuthStore((state) => state.setOauthProfile);
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated);
  const setNeedsProfileSetup = useAuthStore((state) => state.setNeedsProfileSetup);
  const setToken = useAuthStore((state) => state.setToken);
  const previousEmail = useAuthStore((state) => state.userEmail);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const updateButtonWidth = () => {
      const viewportWidth = window.innerWidth;
      const horizontalPadding = viewportWidth < 640 ? 64 : 96;
      const width = Math.max(220, Math.min(320, viewportWidth - horizontalPadding));
      setButtonWidth(width);
    };

    updateButtonWidth();
    window.addEventListener('resize', updateButtonWidth);
    return () => window.removeEventListener('resize', updateButtonWidth);
  }, []);

  useEffect(() => {
    let canceled = false;

    const init = async () => {
      try {
        setError(null);
        await loadGoogleIdentityScript();
        if (canceled) return;

        if (!googleClientId) {
          setError('Missing VITE_GOOGLE_CLIENT_ID in frontend environment configuration.');
          return;
        }

        if (!window.google?.accounts?.id) {
          setError('Google Identity API is unavailable.');
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) {
              setError('Google did not return a credential. Please try again.');
              return;
            }

            setIsLoading(true);
            setError(null);
            let authenticated = false;
            try {
              const payload = parseGoogleIdTokenPayload(response.credential);

              if (!payload.email || !payload.email_verified) {
                throw new Error('Your Google account must have a verified email.');
              }

              const normalizedEmail = payload.email.toLowerCase();
              if (previousEmail && previousEmail.toLowerCase() !== normalizedEmail) {
                setToken(null);
              }

              setUserEmail(normalizedEmail);
              setOauthProfile({
                name: payload.name ?? null,
                avatarUrl: payload.picture ?? null,
              });
              setNeedsProfileSetup(false);
              setIsAuthenticated(true);
              authenticated = true;

              disconnectFromSpacetimeDB();
              await connectToSpacetimeDB();

              try {
                await loginWithEmail(normalizedEmail);
                setNeedsProfileSetup(false);
              } catch (loginError) {
                const message = loginError instanceof Error ? loginError.message : String(loginError);
                const normalizedMessage = message.toLowerCase();
                const isNewUserFlow =
                  normalizedMessage.includes('email not found') ||
                  normalizedMessage.includes('sign up first');

                if (!isNewUserFlow) {
                  throw loginError;
                }

                setNeedsProfileSetup(true);
              }
            } catch (oauthError) {
              if (!authenticated) {
                setNeedsProfileSetup(false);
                setIsAuthenticated(false);
              }
              setError(oauthError instanceof Error ? oauthError.message : 'Google sign-in failed.');
            } finally {
              setIsLoading(false);
            }
          },
        });

        if (buttonRef.current && window.google?.accounts?.id) {
          buttonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: theme === 'dark' ? 'filled_black' : 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: buttonWidth,
          });
        }

        setIsScriptReady(true);
      } catch (initError) {
        setError(initError instanceof Error ? initError.message : 'Failed to initialize Google sign-in.');
      }
    };

    init();

    return () => {
      canceled = true;
    };
  }, [buttonWidth, googleClientId, previousEmail, setIsAuthenticated, setNeedsProfileSetup, setOauthProfile, setToken, setUserEmail, theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-[100dvh] bg-ghost dark:bg-void flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={toggleTheme}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-3 rounded-2xl bg-white/80 dark:bg-graphite/80 backdrop-blur-xl border border-ghost-400/50 dark:border-void-50/50 shadow-lg"
        aria-label="Toggle theme"
      >
        <AnimatePresence mode="wait">
          {theme === 'dark' ? (
            <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <Sun className="w-5 h-5 text-amber-500" />
            </motion.div>
          ) : (
            <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Moon className="w-5 h-5 text-plasma" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <div className="w-full max-w-md bg-white/85 dark:bg-graphite/60 backdrop-blur-2xl rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 border border-ghost-400/50 dark:border-void-50/50 shadow-2xl text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-plasma via-plasma/80 to-purple-600 flex items-center justify-center shadow-glow mb-5">
          <Lock className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-heading font-bold text-graphite dark:text-ghost mb-2">Authenticate to continue</h1>
        <p className="text-graphite/60 dark:text-ghost/60 mb-6">
          Sign in with Google first, then create your Dash profile.
        </p>

        <div className="flex justify-center min-h-11 w-full overflow-hidden">
          <div ref={buttonRef} className="w-full flex justify-center" />
        </div>

        {!isScriptReady && !error && (
          <p className="text-sm text-graphite/50 dark:text-ghost/50 mt-4">Loading Google sign-in...</p>
        )}

        {isLoading && (
          <p className="text-sm text-graphite/60 dark:text-ghost/60 mt-4">Completing sign-in...</p>
        )}

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}
