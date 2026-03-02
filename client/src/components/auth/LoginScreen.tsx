import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Sparkles, Moon, Sun, Shield, MessageCircle, Zap, Users, Loader2 } from 'lucide-react';
import { loginWithEmail, connectToSpacetimeDB } from '@/lib/spacetimedb';
import { useChatStore, useAuthStore, useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

interface LoginScreenProps {
  onSwitchToSignup: () => void;
  onSwitchToGoogle?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen({ onSwitchToSignup, onSwitchToGoogle }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const setUserEmail = useAuthStore((state) => state.setUserEmail);
  const currentUser = useChatStore((state) => state.currentUser);
  const isRegistered = useAuthStore((state) => state.isRegistered);

  useEffect(() => {
    if (currentUser && isRegistered) {
      setIsSubmitting(false);
    }
  }, [currentUser, isRegistered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      setUserEmail(email.trim().toLowerCase());
      
      await connectToSpacetimeDB();
      
      loginWithEmail(email.trim().toLowerCase());
      
      setSuccess(true);
      
      setTimeout(() => {
        setIsSubmitting(false);
        if (!currentUser) {
          setError('Email not found. Please sign up first.');
          setSuccess(false);
        }
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsSubmitting(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-ghost dark:bg-void flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-plasma/10 dark:bg-plasma/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-plasma/8 dark:bg-plasma/3 rounded-full blur-[100px]" />
      </div>
      
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={toggleTheme}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-3 rounded-2xl bg-white/80 dark:bg-graphite/80 backdrop-blur-xl border border-ghost-400/50 dark:border-void-50/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
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
      
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left hidden lg:block"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="inline-flex mb-8"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-plasma via-plasma/80 to-purple-600 flex items-center justify-center shadow-glow-lg">
                <span className="text-4xl sm:text-5xl font-heading font-bold text-white">D</span>
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-graphite dark:text-ghost mb-4"
            >
              Welcome back to <span className="text-transparent bg-clip-text bg-gradient-to-r from-plasma to-purple-500">Dash</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg sm:text-xl text-graphite/60 dark:text-ghost/60 mb-8 max-w-md mx-auto lg:mx-0"
            >
              Sign in to continue your conversations
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0"
            >
              {[
                { icon: Zap, label: 'Real-time sync', color: 'text-amber-500' },
                { icon: Shield, label: 'Secure auth', color: 'text-green-500' },
                { icon: Users, label: 'Group chats', color: 'text-blue-500' },
                { icon: MessageCircle, label: 'Rich messaging', color: 'text-purple-500' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 dark:bg-graphite/30 backdrop-blur-sm border border-ghost-400/30 dark:border-void-50/30"
                >
                  <feature.icon className={cn("w-5 h-5", feature.color)} />
                  <span className="text-sm font-medium text-graphite dark:text-ghost">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md mx-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="lg:hidden flex justify-center mb-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-plasma via-plasma/80 to-purple-600 flex items-center justify-center shadow-glow">
                <span className="text-3xl font-heading font-bold text-white">D</span>
              </div>
            </motion.div>
            
            <div className="bg-white/80 dark:bg-graphite/50 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-8 border border-ghost-400/50 dark:border-void-50/50 shadow-2xl">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-heading font-bold text-graphite dark:text-ghost mb-2">
                    Sign In
                  </h2>
                  <p className="text-graphite/60 dark:text-ghost/60">
                    Enter your email to continue
                  </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-graphite/80 dark:text-ghost/80 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-graphite/40 dark:text-ghost/40" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="input-field pl-12"
                        required
                        autoComplete="email"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
                    >
                      <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                  
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-500/10 border border-green-500/20 rounded-xl p-4"
                    >
                      <p className="text-sm text-green-500 dark:text-green-400">Connecting to your account...</p>
                    </motion.div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-plasma to-purple-600 text-white font-semibold transition-all duration-300 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-ghost-400/30 dark:border-void-50/30"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/80 dark:bg-graphite/50 text-graphite/50 dark:text-ghost/50">
                      New to Dash?
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={onSwitchToSignup}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border-2 border-plasma/30 text-plasma font-semibold transition-all duration-300 hover:bg-plasma/10 hover:border-plasma/50"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Create an account</span>
                </button>

                {onSwitchToGoogle && (
                  <button
                    onClick={onSwitchToGoogle}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-ghost-400/60 dark:border-void-50/60 text-graphite/80 dark:text-ghost/80 font-semibold transition-all duration-300 hover:bg-ghost/20 dark:hover:bg-ghost/10"
                  >
                    <span>Continue with Google</span>
                  </button>
                )}
              </div>
            </div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-graphite/40 dark:text-ghost/40 text-center mt-6"
            >
              Powered by SpacetimeDB • Built with React
            </motion.p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
