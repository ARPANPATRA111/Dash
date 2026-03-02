import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Phone,
  Video,
  Search,
  Info,
  ChevronLeft,
} from 'lucide-react';
import { useChatStore } from '@/stores';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import { ChatDetails } from './ChatDetails';
import { formatLastSeen } from '@/utils/formatters';

interface ChatAreaProps {
  conversationId: bigint;
  onOpenSidebar?: () => void;
  onBackToChats?: () => void;
  isMobile?: boolean;
}

export function ChatArea({ conversationId, onOpenSidebar, onBackToChats, isMobile }: ChatAreaProps) {
  const conversations = useChatStore((state) => state.conversations);
  const participants = useChatStore((state) => state.participants);
  const users = useChatStore((state) => state.users);
  const presences = useChatStore((state) => state.presences);
  const currentIdentity = useChatStore((state) => state.currentIdentity);
  const typingIndicators = useChatStore((state) => state.typingIndicators);
  
  const [showDetails, setShowDetails] = useState(false);

  const conversation = conversations.get(conversationId.toString());

  const participantInfo = useMemo(() => {
    if (!conversation) return null;
    
    const convParticipants = Array.from(participants.values())
      .filter((p) => p.conversationId.toString() === conversationId.toString());
    
    const otherParticipants = convParticipants.filter(
      (p) => currentIdentity && !p.userIdentity.isEqual(currentIdentity)
    );
    
    const otherUsers = otherParticipants
      .map((p) => users.get(p.userIdentity.toHexString()))
      .filter(Boolean);
    
    return {
      participants: convParticipants,
      otherParticipants,
      otherUsers,
    };
  }, [conversation, participants, users, currentIdentity, conversationId]);

  const displayInfo = useMemo(() => {
    if (!conversation || !participantInfo) {
      return { name: 'Loading...', avatarUrl: undefined, isGroup: false };
    }
    
    if (conversation.isGroup) {
      return {
        name: conversation.name || 'Group',
        avatarUrl: conversation.avatarUrl ?? undefined,
        isGroup: true,
        memberCount: participantInfo.participants.length,
        members: participantInfo.otherUsers.map((u) => ({
          name: u?.displayName ?? 'User',
          avatarUrl: u?.avatarUrl ?? undefined,
        })),
      };
    }
    
    const otherUser = participantInfo.otherUsers[0];
    const otherParticipant = participantInfo.otherParticipants[0];
    const presence = otherParticipant 
      ? presences.get(otherParticipant.userIdentity.toHexString())
      : undefined;
    
    return {
      name: otherUser?.displayName ?? 'User',
      avatarUrl: otherUser?.avatarUrl ?? undefined,
      isGroup: false,
      status: presence?.isOnline ? presence.status : 'offline',
      lastSeen: presence?.lastSeen,
    };
  }, [conversation, participantInfo, presences]);

  const typingUsers = useMemo(() => {
    if (!currentIdentity) return [];
    
    return Array.from(typingIndicators.values())
      .filter((t) => 
        t.conversationId.toString() === conversationId.toString() &&
        !t.userIdentity.isEqual(currentIdentity)
      )
      .map((t) => {
        const user = users.get(t.userIdentity.toHexString());
        return user?.displayName ?? 'Someone';
      });
  }, [typingIndicators, conversationId, currentIdentity, users]);

  const subtitle = useMemo(() => {
    if (typingUsers.length > 0) {
      return null;
    }
    
    if (displayInfo.isGroup) {
      return `${displayInfo.memberCount} members`;
    }
    
    if (displayInfo.status === 'online') {
      return 'Online';
    }
    
    if (displayInfo.lastSeen) {
      return formatLastSeen(displayInfo.lastSeen.toDate());
    }
    
    return 'Offline';
  }, [displayInfo, typingUsers]);
  
  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-ghost/50">Loading conversation...</p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-ghost/10 flex items-center justify-between px-4 bg-white/80 dark:bg-graphite/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={onBackToChats ?? onOpenSidebar}
                title="Back to chats"
                aria-label="Back to chats"
                className="p-2 hover:bg-ghost/10 rounded-xl transition-colors -ml-2"
              >
                <ChevronLeft className="w-6 h-6 text-graphite dark:text-ghost" />
              </button>
            )}

            <button onClick={() => setShowDetails(true)} className="flex items-center gap-3">
              {displayInfo.isGroup && displayInfo.members && displayInfo.members.length > 1 ? (
                <AvatarGroup
                  users={displayInfo.members}
                  max={2}
                  size="md"
                />
              ) : (
                <Avatar
                  src={displayInfo.avatarUrl}
                  name={displayInfo.name}
                  size="md"
                  showStatus={!displayInfo.isGroup}
                  status={(displayInfo.status as any) ?? 'offline'}
                />
              )}
              
              <div className="text-left">
                <h2 className="font-semibold text-graphite dark:text-ghost">{displayInfo.name}</h2>
                {typingUsers.length > 0 ? (
                  <TypingIndicator users={typingUsers} />
                ) : (
                  <p className="text-xs text-graphite/50 dark:text-ghost/50">{subtitle}</p>
                )}
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button title="Start voice call" aria-label="Start voice call" className="p-2 hover:bg-ghost/10 rounded-xl transition-colors hidden md:block">
              <Phone className="w-5 h-5 text-graphite/60 dark:text-ghost/60" />
            </button>
            <button title="Start video call" aria-label="Start video call" className="p-2 hover:bg-ghost/10 rounded-xl transition-colors hidden md:block">
              <Video className="w-5 h-5 text-graphite/60 dark:text-ghost/60" />
            </button>
            <button title="Search messages" aria-label="Search messages" className="p-2 hover:bg-ghost/10 rounded-xl transition-colors hidden md:block">
              <Search className="w-5 h-5 text-graphite/60 dark:text-ghost/60" />
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              title={showDetails ? 'Close chat details' : 'Open chat details'}
              aria-label={showDetails ? 'Close chat details' : 'Open chat details'}
              className={`p-2 rounded-xl transition-colors ${
                showDetails ? 'bg-plasma/20 text-plasma' : 'hover:bg-ghost/10 text-graphite/60 dark:text-ghost/60'
              }`}
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <MessageList conversationId={conversationId} />
        </div>

        <MessageInput conversationId={conversationId} />
      </div>

      <AnimatePresence>
        {showDetails && (
          <>
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setShowDetails(false)}
              />
            )}
            <motion.div
              initial={isMobile ? { x: '100%' } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0 } : { width: 320, opacity: 1 }}
              exit={isMobile ? { x: '100%' } : { width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                ${isMobile 
                  ? 'fixed inset-y-0 right-0 w-full max-w-[320px] z-50' 
                  : 'relative border-l border-ghost/10'
                }
                overflow-hidden bg-white dark:bg-graphite
              `}
            >
              <ChatDetails
                conversation={conversation}
                onClose={() => setShowDetails(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
