import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Moon,
  Sun,
  Monitor,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Layout,
  Palette,
} from 'lucide-react';
import { useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const soundEnabled = useUIStore((state) => state.soundEnabled);
  const setSoundEnabled = useUIStore((state) => state.setSoundEnabled);
  const notificationsEnabled = useUIStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useUIStore((state) => state.setNotificationsEnabled);
  const compactMode = useUIStore((state) => state.compactMode);
  const setCompactMode = useUIStore((state) => state.setCompactMode);
  
  if (!open) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-ghost">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-ghost/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-ghost/60" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-5 h-5 text-ghost/60" />
                <h3 className="font-medium text-ghost">Theme</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors',
                    theme === 'light'
                      ? 'bg-plasma/20 border-plasma/50 text-plasma'
                      : 'border-ghost/10 text-ghost/60 hover:bg-ghost/5'
                  )}
                >
                  <Sun className="w-5 h-5" />
                  <span className="text-sm">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors',
                    theme === 'dark'
                      ? 'bg-plasma/20 border-plasma/50 text-plasma'
                      : 'border-ghost/10 text-ghost/60 hover:bg-ghost/5'
                  )}
                >
                  <Moon className="w-5 h-5" />
                  <span className="text-sm">Dark</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors',
                    theme === 'system'
                      ? 'bg-plasma/20 border-plasma/50 text-plasma'
                      : 'border-ghost/10 text-ghost/60 hover:bg-ghost/5'
                  )}
                >
                  <Monitor className="w-5 h-5" />
                  <span className="text-sm">System</span>
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-5 h-5 text-ghost/60" />
                <h3 className="font-medium text-ghost">Notifications</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className="w-full flex items-center justify-between p-3 hover:bg-ghost/5 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {notificationsEnabled ? (
                      <Bell className="w-5 h-5 text-ghost/60" />
                    ) : (
                      <BellOff className="w-5 h-5 text-ghost/60" />
                    )}
                    <span className="text-sm text-ghost">Push notifications</span>
                  </div>
                  <div
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors',
                      notificationsEnabled ? 'bg-plasma' : 'bg-ghost/20'
                    )}
                  >
                    <motion.div
                      animate={{ x: notificationsEnabled ? 18 : 2 }}
                      className="w-5 h-5 mt-0.5 bg-white rounded-full shadow-md"
                    />
                  </div>
                </button>
                
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="w-full flex items-center justify-between p-3 hover:bg-ghost/5 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-ghost/60" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-ghost/60" />
                    )}
                    <span className="text-sm text-ghost">Sound effects</span>
                  </div>
                  <div
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors',
                      soundEnabled ? 'bg-plasma' : 'bg-ghost/20'
                    )}
                  >
                    <motion.div
                      animate={{ x: soundEnabled ? 18 : 2 }}
                      className="w-5 h-5 mt-0.5 bg-white rounded-full shadow-md"
                    />
                  </div>
                </button>
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layout className="w-5 h-5 text-ghost/60" />
                <h3 className="font-medium text-ghost">Display</h3>
              </div>
              <button
                onClick={() => setCompactMode(!compactMode)}
                className="w-full flex items-center justify-between p-3 hover:bg-ghost/5 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Layout className="w-5 h-5 text-ghost/60" />
                  <div className="text-left">
                    <span className="text-sm text-ghost block">Compact mode</span>
                    <span className="text-xs text-ghost/50">Show more messages on screen</span>
                  </div>
                </div>
                <div
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors',
                    compactMode ? 'bg-plasma' : 'bg-ghost/20'
                  )}
                >
                  <motion.div
                    animate={{ x: compactMode ? 18 : 2 }}
                    className="w-5 h-5 mt-0.5 bg-white rounded-full shadow-md"
                  />
                </div>
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-ghost/10 text-center">
              <p className="text-xs text-ghost/40">
                Dash v1.0.0 • Built with SpacetimeDB
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
