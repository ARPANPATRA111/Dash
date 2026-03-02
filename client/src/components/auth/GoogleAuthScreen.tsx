import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Moon, Sun, Shield, Zap, MessageCircle, Sparkles } from 'lucide-react';
import { connectToSpacetimeDB, disconnectFromSpacetimeDB, loginWithEmail } from '@/lib/spacetimedb';
import { loadGoogleIdentityScript, parseGoogleIdTokenPayload } from '@/lib/google-oauth';
import { useAuthStore, useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

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

        const allowedOrigins = String(import.meta.env.VITE_GOOGLE_ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (allowedOrigins.length > 0 && !allowedOrigins.includes(window.location.origin)) {
          setError(`Google OAuth is not enabled for this origin (${window.location.origin}). Add it to Google Cloud Console authorized origins and VITE_GOOGLE_ALLOWED_ORIGINS.`);
          setIsScriptReady(true);
          return;
        }

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
    <div className="min-h-[100dvh] bg-ghost dark:bg-void flex flex-col p-4 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 w-[24rem] h-[24rem] bg-plasma/20 dark:bg-plasma/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -right-8 w-[22rem] h-[22rem] bg-indigo-300/20 dark:bg-indigo-500/10 blur-3xl rounded-full" />
      </div>

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

      <div className="flex-1 z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="hidden lg:block"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl border border-ghost-400/50 dark:border-void-50/50 bg-white/70 dark:bg-graphite/40 backdrop-blur-xl mb-7">
            <Sparkles className="w-4 h-4 text-plasma" />
            <span className="text-sm font-semibold text-graphite dark:text-ghost">World-class real-time messaging</span>
          </div>
          <h1 className="text-5xl leading-tight font-heading font-bold text-graphite dark:text-ghost mb-4">
            Secure chat,
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-plasma to-indigo-500">beautifully fast.</span>
          </h1>
          <p className="text-lg text-graphite/65 dark:text-ghost/65 max-w-xl mb-7">
            Sign in with Google to continue to Dash. Your identity remains verifiable, secure, and tied to your workspace profile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            {[
              { icon: Shield, label: 'Trusted OAuth' },
              { icon: Zap, label: 'Realtime sync' },
              { icon: MessageCircle, label: 'Group messaging' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-2xl border border-ghost-400/50 dark:border-void-50/50 bg-white/70 dark:bg-graphite/40 backdrop-blur-xl px-3 py-2.5">
                <item.icon className="w-4 h-4 text-plasma" />
                <span className="text-sm font-medium text-graphite/85 dark:text-ghost/85">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="bg-white/90 dark:bg-graphite/70 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-8 border border-ghost-400/50 dark:border-void-50/50 shadow-2xl text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-plasma via-plasma/80 to-purple-600 flex items-center justify-center shadow-glow mb-5">
              <Lock className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-heading font-bold text-graphite dark:text-ghost mb-2">Continue to Dash</h1>
            <p className="text-graphite/60 dark:text-ghost/60 mb-6">
              Sign in with Google to open your chats and profile.
            </p>

            <div className="flex justify-center min-h-11 w-full overflow-hidden rounded-xl">
              <div ref={buttonRef} className="w-full flex justify-center" />
            </div>

            {!isScriptReady && !error && (
              <p className="text-sm text-graphite/55 dark:text-ghost/55 mt-4">Loading Google sign-in...</p>
            )}

            {isLoading && (
              <p className="text-sm text-graphite/65 dark:text-ghost/65 mt-4">Completing sign-in...</p>
            )}

            {error && (
              <div className={cn(
                'mt-4 text-left p-3 rounded-xl border text-sm',
                'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              )}>
                {error}
              </div>
            )}

            <p className="mt-5 text-xs text-graphite/50 dark:text-ghost/50">
              OAuth-only authentication • Google verified identity
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
