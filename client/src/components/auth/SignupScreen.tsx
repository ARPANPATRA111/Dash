import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, AtSign, Mail, Sparkles, Moon, Sun, Shield, MessageCircle, Zap, Users, CheckCircle, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { requestEmailVerification, verifyEmailAndRegister, connectToSpacetimeDB, updateProfile, getPendingVerificationCode } from '@/lib/spacetimedb';
import { useChatStore, useAuthStore, useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

interface SignupScreenProps {
  onSwitchToLogin: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'details' | 'verification';

export function SignupScreen({ onSwitchToLogin }: SignupScreenProps) {
  const [step, setStep] = useState<Step>('details');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [_codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [fallbackCode, setFallbackCode] = useState<string | null>(null);
  
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const currentUser = useChatStore((state) => state.currentUser);
  const isRegistered = useAuthStore((state) => state.isRegistered);
  const setUserEmail = useAuthStore((state) => state.setUserEmail);
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  
  useEffect(() => {
    if (currentUser && isRegistered) {
      setIsSubmitting(false);
    }
  }, [currentUser, isRegistered]);

  useEffect(() => {
    if (email) {
      setEmailVerified(EMAIL_REGEX.test(email));
    } else {
      setEmailVerified(false);
    }
  }, [email]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!username && value.includes('@')) {
      const suggested = value.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
      setUsername(suggested);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pastedCode = value.slice(0, 6).split('');
      const newCode = [...verificationCode];
      pastedCode.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setVerificationCode(newCode);
      
      const nextIndex = Math.min(index + pastedCode.length, 5);
      codeInputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      
      if (value && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await connectToSpacetimeDB();
      
      requestEmailVerification(
        email.trim().toLowerCase(),
        username.trim(),
        displayName.trim()
      );

      const normalizedEmail = email.trim().toLowerCase();
      let tries = 0;
      const maxTries = 12;
      const pollTimer = setInterval(() => {
        tries += 1;
        const pendingCode = getPendingVerificationCode(normalizedEmail);
        if (pendingCode) {
          setFallbackCode(pendingCode);
          clearInterval(pollTimer);
          return;
        }
        if (tries >= maxTries) {
          clearInterval(pollTimer);
        }
      }, 250);
      
      setCodeSent(true);
      setStep('verification');
      setResendTimer(60);
      setIsSubmitting(false);
      
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      setUserEmail(email.trim().toLowerCase());
      
      verifyEmailAndRegister(email.trim().toLowerCase(), code);
      
      setTimeout(() => {
        updateProfile(displayName.trim() || undefined, undefined, undefined);
      }, 500);
      
      setTimeout(() => {
        setIsSubmitting((current) => {
          if (current) {
            setError('Verification timed out. Please try again.');
          }
          return false;
        });
      }, 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsSubmitting(false);
    }
  };

  const handleResendCode = () => {
    if (resendTimer > 0) return;
    setVerificationCode(['', '', '', '', '', '']);
    setFallbackCode(null);
    handleSendCode({ preventDefault: () => {} } as React.FormEvent);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  return (
    <div className="min-h-screen bg-ghost dark:bg-void flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-plasma/10 dark:bg-plasma/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-plasma/8 dark:bg-plasma/3 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-plasma/5 dark:bg-plasma/2 rounded-full blur-[150px]" />
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
              Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-plasma to-purple-500">Dash</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg sm:text-xl text-graphite/60 dark:text-ghost/60 mb-8 max-w-md mx-auto lg:mx-0"
            >
              Real-time messaging powered by the future of databases
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
              <AnimatePresence mode="wait">
                {step === 'details' ? (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className="text-2xl font-heading font-bold text-graphite dark:text-ghost mb-2">
                        Create Your Account
                      </h2>
                      <p className="text-graphite/60 dark:text-ghost/60">
                        Enter your details to get started
                      </p>
                    </div>
                    
                    <form onSubmit={handleSendCode} className="space-y-5">
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
                            onChange={(e) => handleEmailChange(e.target.value)}
                            placeholder="you@example.com"
                            className="input-field pl-12 pr-12"
                            required
                            autoComplete="email"
                          />
                          {email && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              {emailVerified ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-red-400" />
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-graphite/40 dark:text-ghost/40 mt-1.5">
                          We'll send a verification code to this email
                        </p>
                      </div>
                      
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
                            placeholder="your_username"
                            className="input-field pl-12"
                            maxLength={20}
                            required
                          />
                        </div>
                        <p className="text-xs text-graphite/40 dark:text-ghost/40 mt-1.5">
                          3-20 characters, letters, numbers, and underscores only
                        </p>
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
                            placeholder="Your Name"
                            className="input-field pl-12"
                            maxLength={50}
                            required
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
                      
                      <button
                        type="submit"
                        disabled={isSubmitting || !emailVerified}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-plasma to-purple-600 text-white font-semibold transition-all duration-300 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Sending code...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-5 h-5" />
                            <span>Send Verification Code</span>
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
                          Already have an account?
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={onSwitchToLogin}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border-2 border-plasma/30 text-plasma font-semibold transition-all duration-300 hover:bg-plasma/10 hover:border-plasma/50"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Sign in instead</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="verification"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <button
                      onClick={() => setStep('details')}
                      className="flex items-center gap-2 text-ghost/60 hover:text-ghost transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="text-sm">Back</span>
                    </button>
                    
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-plasma/10 flex items-center justify-center">
                        <KeyRound className="w-8 h-8 text-plasma" />
                      </div>
                      <h2 className="text-2xl font-heading font-bold text-graphite dark:text-ghost mb-2">
                        Verify Your Email
                      </h2>
                      <p className="text-graphite/60 dark:text-ghost/60">
                        We sent a 6-digit code to<br />
                        <span className="font-medium text-plasma">{email}</span>
                      </p>
                    </div>
                    
                    <form onSubmit={handleVerifyCode} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-graphite/80 dark:text-ghost/80 mb-3 text-center">
                          Enter Verification Code
                        </label>
                        <div className="flex justify-center gap-2">
                          {verificationCode.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => { codeInputRefs.current[index] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={digit}
                              onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
                              onKeyDown={(e) => handleCodeKeyDown(index, e)}
                              className="w-12 h-14 text-center text-xl font-bold input-field p-0"
                            />
                          ))}
                        </div>
                        <p className="text-xs text-graphite/40 dark:text-ghost/40 mt-3 text-center">
                          Didn't receive the code?{' '}
                          {resendTimer > 0 ? (
                            <span>Resend in {resendTimer}s</span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendCode}
                              className="text-plasma hover:underline"
                            >
                              Resend
                            </button>
                          )}
                        </p>
                        {fallbackCode && (
                          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Email delivery is not configured in this environment.
                            </p>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mt-1">
                              Use code: {fallbackCode}
                            </p>
                          </div>
                        )}
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
                      
                      <button
                        type="submit"
                        disabled={isSubmitting || verificationCode.some((d) => !d)}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-plasma to-purple-600 text-white font-semibold transition-all duration-300 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>Verify & Create Account</span>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-graphite/40 dark:text-ghost/40 text-center mt-6"
            >
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </motion.p>
          </motion.div>
        </div>
      </main>
      
      <div className="relative z-10 py-6 text-center">
        <p className="text-xs text-graphite/30 dark:text-ghost/30">
          Powered by SpacetimeDB • Built with React
        </p>
      </div>
    </div>
  );
}
