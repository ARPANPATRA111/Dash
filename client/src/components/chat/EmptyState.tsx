import { motion } from 'framer-motion';
import { MessageSquare, Users, ArrowRight, Menu, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  onNewConversation: () => void;
  onNewGroup: () => void;
  onOpenSidebar?: () => void;
  isMobile?: boolean;
}

export function EmptyState({ onNewConversation, onNewGroup, onOpenSidebar, isMobile }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 md:p-8 relative">
      {isMobile && (
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={onOpenSidebar}
            className="p-2 hover:bg-ghost/10 rounded-xl transition-colors"
          >
            <Menu className="w-6 h-6 text-graphite/60 dark:text-ghost/60" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-plasma to-plasma/60 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-graphite dark:text-ghost">Dash</span>
          </div>
          <div className="w-10" />
        </div>
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md text-center"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0],
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="inline-flex mb-6 md:mb-8"
        >
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-br from-plasma/20 to-plasma/5 border border-plasma/20 flex items-center justify-center">
              <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-plasma" />
            </div>
            <div className="absolute inset-0 rounded-[2rem] bg-plasma/10 blur-2xl -z-10" />
          </div>
        </motion.div>
        
        <h2 className="text-xl md:text-2xl font-heading font-bold text-graphite dark:text-ghost mb-2 md:mb-3">
          Welcome to Dash
        </h2>

        <p className="text-sm md:text-base text-graphite/60 dark:text-ghost/60 mb-6 md:mb-8 px-4">
          Start a conversation or create a group to begin chatting with friends.
        </p>

        <div className="flex flex-col gap-3 px-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewConversation}
            className="btn-primary w-full py-4 inline-flex items-center justify-center gap-2 text-base"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Start a Chat</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewGroup}
            className="btn-secondary w-full py-4 inline-flex items-center justify-center gap-2 text-base border-ghost/20"
          >
            <Users className="w-5 h-5" />
            <span>Create Group</span>
          </motion.button>
        </div>

        <p className="mt-8 text-xs text-graphite/40 dark:text-ghost/40 hidden md:block">
          Press <kbd className="px-1.5 py-0.5 bg-ghost/20 dark:bg-ghost/10 rounded text-graphite/60 dark:text-ghost/60">Ctrl</kbd> +{' '}
          <kbd className="px-1.5 py-0.5 bg-ghost/20 dark:bg-ghost/10 rounded text-graphite/60 dark:text-ghost/60">N</kbd> to start a new chat
        </p>
      </motion.div>
    </div>
  );
}
