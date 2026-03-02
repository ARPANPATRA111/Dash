import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, useUIStore } from '@/stores';
import { Sidebar } from './Sidebar';
import { ChatArea } from '../chat/ChatArea';
import { EmptyState } from '../chat/EmptyState';
import { UserProfileModal } from '../modals/UserProfileModal';
import { SettingsModal } from '../modals/SettingsModal';
import { NewConversationModal } from '../modals/NewConversationModal';
import { NewGroupModal } from '../modals/NewGroupModal';

export function ChatLayout() {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newConversationModalOpen, setNewConversationModalOpen] = useState(false);
  const [newGroupModalOpen, setNewGroupModalOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    }
  }, [isMobile, setSidebarOpen]);

  useEffect(() => {
    if (!isMobile || !window.visualViewport) {
      setKeyboardInset(0);
      return;
    }

    const updateInset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        setKeyboardInset(0);
        return;
      }

      const rawInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(rawInset > 80 ? Math.min(rawInset, 320) : 0);
    };

    updateInset();
    window.visualViewport.addEventListener('resize', updateInset);
    window.visualViewport.addEventListener('scroll', updateInset);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateInset);
      window.visualViewport?.removeEventListener('scroll', updateInset);
    };
  }, [isMobile]);

  useEffect(() => {
    document.documentElement.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
    return () => {
      document.documentElement.style.setProperty('--keyboard-inset', '0px');
    };
  }, [keyboardInset]);

  const handleBackToChats = () => {
    setActiveConversation(null);
    setSidebarOpen(true);
  };

  if (isMobile) {
    return (
      <div className="h-[100dvh] bg-ghost dark:bg-void overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeConversationId ? (
            <motion.div
              key={activeConversationId.toString()}
              initial={{ x: '100%', opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.6 }}
              transition={{ type: 'spring', damping: 32, stiffness: 420, mass: 0.7 }}
              className="h-full"
            >
              <ChatArea
                conversationId={activeConversationId}
                onBackToChats={handleBackToChats}
                isMobile
                sidebarOpen={false}
              />
            </motion.div>
          ) : (
            <motion.div
              key="mobile-list"
              initial={{ x: '-8%', opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-8%', opacity: 0.6 }}
              transition={{ type: 'spring', damping: 32, stiffness: 420, mass: 0.7 }}
              className="h-full"
            >
              <Sidebar
                onOpenProfile={() => setProfileModalOpen(true)}
                onOpenSettings={() => setSettingsModalOpen(true)}
                onNewConversation={() => setNewConversationModalOpen(true)}
                onNewGroup={() => setNewGroupModalOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <UserProfileModal
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
        />

        <SettingsModal
          open={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
        />

        <NewConversationModal
          open={newConversationModalOpen}
          onClose={() => setNewConversationModalOpen(false)}
        />

        <NewGroupModal
          open={newGroupModalOpen}
          onClose={() => setNewGroupModalOpen(false)}
        />
      </div>
    );
  }
  
  return (
    <div className="h-[100dvh] bg-ghost dark:bg-void flex overflow-hidden relative">
      <div className="w-80 flex-shrink-0 border-r border-ghost/10">
        <Sidebar
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onNewConversation={() => setNewConversationModalOpen(true)}
          onNewGroup={() => setNewGroupModalOpen(true)}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col bg-white/40 dark:bg-graphite/35">
        <AnimatePresence mode="wait">
          {activeConversationId ? (
            <motion.div
              key={activeConversationId.toString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-0"
            >
              <ChatArea 
                conversationId={activeConversationId} 
                onBackToChats={handleBackToChats}
                isMobile={false}
                sidebarOpen={true}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-0"
            >
              <EmptyState
                onNewConversation={() => setNewConversationModalOpen(true)}
                onNewGroup={() => setNewGroupModalOpen(true)}
                isMobile={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UserProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
      
      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
      
      <NewConversationModal
        open={newConversationModalOpen}
        onClose={() => setNewConversationModalOpen(false)}
      />
      
      <NewGroupModal
        open={newGroupModalOpen}
        onClose={() => setNewGroupModalOpen(false)}
      />
    </div>
  );
}
