import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, User, Loader2, Moon, Sun, CheckCircle } from 'lucide-react';
import { connectToSpacetimeDB, registerUser, disconnectFromSpacetimeDB } from '@/lib/spacetimedb';
import { useAuthStore, useChatStore, useUIStore } from '@/stores';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function ProfileSetupScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userEmail = useAuthStore((state) => state.userEmail);
  const oauthName = useAuthStore((state) => state.oauthName);
  const oauthAvatarUrl = useAuthStore((state) => state.oauthAvatarUrl);
  const logout = useAuthStore((state) => state.logout);
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const currentUser = useChatStore((state) => state.currentUser);
  const isRegistered = useAuthStore((state) => state.isRegistered);

  const suggestedUsername = useMemo(() => {
    if (!userEmail) return '';
    return userEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
  }, [userEmail]);

  useEffect(() => {
    if (!username && suggestedUsername) {
      setUsername(suggestedUsername);
    }
  }, [suggestedUsername, username]);

  useEffect(() => {
    if (!displayName && oauthName) {
      setDisplayName(oauthName);
    }
  }, [displayName, oauthName]);

  useEffect(() => {
    if (currentUser && isRegistered) {
      setIsSubmitting(false);
    }
  }, [currentUser, isRegistered]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userEmail) {
      setError('Authenticated email is missing. Sign in with Google again.');
      return;
    }

    if (!USERNAME_REGEX.test(username)) {
      setError('Username must be 3-20 chars and use letters, numbers, or underscore.');
      return;
    }

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await connectToSpacetimeDB();
      await registerUser(username.trim(), userEmail.toLowerCase());

      setTimeout(() => {
        setIsSubmitting((loading) => {
          if (loading) {
            setError('Profile creation timed out. Please try again.');
          }
          return false;
        });
      }, 10000);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to create profile';
      if (message.toLowerCase().includes('username already taken')) {
        setError('Username already taken. Try a different username.');
      } else if (message.toLowerCase().includes('email already registered') || message.toLowerCase().includes('user already registered')) {
        setError('This Google account already has a profile. Click Back to Sign In to continue to your dashboard.');
      } else {
        setError(message);
      }
      setIsSubmitting(false);
    }
  };

  const handleBackToSignIn = () => {
    disconnectFromSpacetimeDB();
    logout();
  };

  return (
    <div className="min-h-screen bg-ghost dark:bg-void flex flex-col items-center justify-center p-6">
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

      <div className="w-full max-w-md bg-white/85 dark:bg-graphite/60 backdrop-blur-2xl rounded-[2rem] p-8 border border-ghost-400/50 dark:border-void-50/50 shadow-2xl">
        <h1 className="text-2xl font-heading font-bold text-graphite dark:text-ghost mb-2 text-center">Create your profile</h1>
        <p className="text-graphite/60 dark:text-ghost/60 text-center mb-6">
          Authenticated as {userEmail ?? 'unknown user'}
        </p>
        {oauthAvatarUrl && (
          <p className="text-xs text-graphite/45 dark:text-ghost/45 text-center mb-6">
            Google profile image detected and will be available after profile setup.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-graphite/80 dark:text-ghost/80 mb-2">
              Username
            </label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-graphite/40 dark:text-ghost/40" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field pl-12"
                maxLength={20}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-graphite/80 dark:text-ghost/80 mb-2">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-graphite/40 dark:text-ghost/40" />
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field pl-12"
                maxLength={50}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-plasma to-purple-600 text-white font-semibold transition-all duration-300 hover:shadow-glow disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating profile...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Create Profile</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleBackToSignIn}
            className="w-full px-6 py-3 rounded-2xl border border-ghost-400/50 dark:border-void-50/50 text-graphite dark:text-ghost"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
