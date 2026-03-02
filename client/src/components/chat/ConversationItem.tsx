import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BellOff } from 'lucide-react';
import { useChatStore } from '@/stores';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import { formatRelativeTime } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  onSelect?: () => void;
}

export function ConversationItem({ conversation, onSelect }: ConversationItemProps) {
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const currentIdentity = useChatStore((state) => state.currentIdentity);
  const currentUser = useChatStore((state) => state.currentUser);
  const effectiveIdentity = currentIdentity ?? currentUser?.identity ?? null;
  const participants = useChatStore((state) => state.participants);
  const users = useChatStore((state) => state.users);
  const messages = useChatStore((state) => state.messages);
  const presences = useChatStore((state) => state.presences);
  const getUnreadCount = useChatStore((state) => state.getUnreadCount);
  
  const isActive = activeConversationId?.toString() === conversation.conversationId.toString();
  const unreadCount = getUnreadCount(conversation.conversationId);

  const participantInfo = useMemo(() => {
    const convParticipants = Array.from(participants.values())
      .filter((p) => p.conversationId.toString() === conversation.conversationId.toString());
    
    const currentParticipant = convParticipants.find(
      (p) => effectiveIdentity && p.userIdentity.isEqual(effectiveIdentity)
    );

    const otherParticipants = convParticipants.filter(
      (p) => effectiveIdentity && !p.userIdentity.isEqual(effectiveIdentity)
    );

    const otherUsers = otherParticipants
      .map((p) => users.get(p.userIdentity.toHexString()))
      .filter(Boolean);
    
    return {
      currentParticipant,
      otherParticipants,
      otherUsers,
    };
  }, [participants, users, effectiveIdentity, conversation.conversationId]);

  const displayInfo = useMemo(() => {
    if (conversation.isGroup) {
      return {
        name: conversation.name || 'Group',
        avatarUrl: conversation.avatarUrl ?? undefined,
        isGroup: true,
        members: participantInfo.otherUsers.map((u) => ({
          name: u?.displayName ?? 'User',
          avatarUrl: u?.avatarUrl ?? undefined,
        })),
      };
    }
    
    const otherUser = participantInfo.otherUsers[0];
    return {
      name: otherUser?.displayName ?? 'User',
      avatarUrl: otherUser?.avatarUrl ?? undefined,
      isGroup: false,
      members: [],
    };
  }, [conversation, participantInfo.otherUsers]);

  const onlineStatus = useMemo(() => {
    if (conversation.isGroup) return 'offline';
    
    const otherParticipant = participantInfo.otherParticipants[0];
    if (!otherParticipant) return 'offline';
    
    const presence = presences.get(otherParticipant.userIdentity.toHexString());
    if (!presence) return 'offline';
    if (!presence.isOnline) return 'offline';
    
    const statusMap: Record<string, 'online' | 'away' | 'busy' | 'offline'> = {
      online: 'online',
      away: 'away',
      busy: 'busy',
    };
    
    return statusMap[presence.status] ?? 'offline';
  }, [conversation.isGroup, participantInfo.otherParticipants, presences]);

  const lastMessage = useMemo(() => {
    const convMessages = Array.from(messages.values())
      .filter((m) => m.conversationId.toString() === conversation.conversationId.toString())
      .sort((a, b) => b.sentAt.toDate().getTime() - a.sentAt.toDate().getTime());
    
    return convMessages[0];
  }, [messages, conversation.conversationId]);

  const lastMessagePreview = useMemo(() => {
    if (!lastMessage) return 'No messages yet';
    
    if (lastMessage.isDeleted) return 'Message deleted';
    
    const sender = users.get(lastMessage.senderIdentity.toHexString());
    const isMe = effectiveIdentity && lastMessage.senderIdentity.isEqual(effectiveIdentity);
    
    let preview = lastMessage.content;
    
    if (preview.length > 50) {
      preview = preview.substring(0, 50) + '...';
    }

    if (conversation.isGroup && !isMe) {
      const senderName = sender?.displayName ?? 'Someone';
      preview = `${senderName}: ${preview}`;
    } else if (isMe) {
      preview = `You: ${preview}`;
    }
    
    return preview;
  }, [lastMessage, users, effectiveIdentity, conversation.isGroup]);
  
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => {
        setActiveConversation(conversation.conversationId);
        onSelect?.();
      }}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors border',
        isActive
          ? 'bg-plasma/15 border-plasma/35 shadow-sm'
          : 'bg-white/45 dark:bg-ghost/5 border-transparent hover:bg-ghost/10 dark:hover:bg-ghost/10'
      )}
    >
      <div className="flex-shrink-0">
        {displayInfo.isGroup && displayInfo.members.length > 1 ? (
          <AvatarGroup
            users={displayInfo.members}
            max={2}
            size="md"
          />
        ) : (
          <Avatar
            src={displayInfo.avatarUrl}
            name={displayInfo.name}
            size="lg"
            showStatus={!displayInfo.isGroup}
            status={onlineStatus}
          />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              'font-semibold truncate',
              unreadCount > 0 ? 'text-graphite dark:text-ghost' : 'text-graphite/80 dark:text-ghost/80'
            )}>
              {displayInfo.name}
            </span>

            {participantInfo.currentParticipant?.isMuted && (
              <BellOff className="w-3.5 h-3.5 text-ghost/40 flex-shrink-0" />
            )}
          </div>

          {conversation.lastMessageAt && (
            <span className={cn(
              'text-xs flex-shrink-0',
              unreadCount > 0 ? 'text-plasma' : 'text-ghost/40'
            )}>
              {formatRelativeTime(conversation.lastMessageAt.toDate())}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className={cn(
            'text-sm truncate',
            unreadCount > 0 ? 'text-graphite/70 dark:text-ghost/70' : 'text-graphite/50 dark:text-ghost/50'
          )}>
            {lastMessagePreview}
          </span>

          {unreadCount > 0 && (
            <span className="flex-shrink-0 bg-plasma text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
