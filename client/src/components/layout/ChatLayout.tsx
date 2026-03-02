import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
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
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const [isMobile, setIsMobile] = useState(false);

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
    if (isMobile && activeConversationId) {
      setSidebarOpen(false);
    }
  }, [activeConversationId, isMobile, setSidebarOpen]);

  useEffect(() => {
    if (isMobile && !activeConversationId) {
      setSidebarOpen(true);
    }
  }, [activeConversationId, isMobile, setSidebarOpen]);

  const handleBackToChats = () => {
    setActiveConversation(null);
    setSidebarOpen(true);
  };
  
  return (
    <div className="h-[100dvh] bg-ghost dark:bg-void flex overflow-hidden relative">
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              flex-shrink-0 z-50
              ${isMobile ? 'fixed inset-y-0 left-0' : 'relative'}
            `}
          >
            <Sidebar
              onOpenProfile={() => setProfileModalOpen(true)}
              onOpenSettings={() => setSettingsModalOpen(true)}
              onNewConversation={() => setNewConversationModalOpen(true)}
              onNewGroup={() => setNewGroupModalOpen(true)}
              onClose={() => isMobile && setSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!sidebarOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 z-30 md:hidden p-3 bg-plasma rounded-2xl shadow-glow"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-6 h-6 text-white" />
        </motion.button>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
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
                onOpenSidebar={() => setSidebarOpen(true)}
                onBackToChats={handleBackToChats}
                isMobile={isMobile}
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
                onOpenSidebar={() => setSidebarOpen(true)}
                isMobile={isMobile}
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
