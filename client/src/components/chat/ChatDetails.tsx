import { useMemo, useState } from 'react';
import {
  X,
  Bell,
  BellOff,
  Archive,
  UserPlus,
  LogOut,
  Pin,
  Search,
  Image as ImageIcon,
  File,
  ChevronRight,
  Shield,
  Crown,
} from 'lucide-react';
import { useChatStore } from '@/stores';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import {
  muteConversation,
  unmuteConversation,
  archiveConversation,
  unarchiveConversation,
  leaveConversation,
} from '@/lib/spacetimedb';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ChatDetailsProps {
  conversation: Conversation;
  onClose: () => void;
}

export function ChatDetails({ conversation, onClose }: ChatDetailsProps) {
  const participants = useChatStore((state) => state.participants);
  const users = useChatStore((state) => state.users);
  const presences = useChatStore((state) => state.presences);
  const currentIdentity = useChatStore((state) => state.currentIdentity);
  const currentUser = useChatStore((state) => state.currentUser);
  const effectiveIdentity = currentIdentity ?? currentUser?.identity ?? null;
  const messages = useChatStore((state) => state.messages);
  
  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'files'>('members');
  
  const participantInfo = useMemo(() => {
    const convParticipants = Array.from(participants.values())
      .filter((p) => p.conversationId.toString() === conversation.conversationId.toString());
    
    const currentParticipant = convParticipants.find(
      (p) => effectiveIdentity && p.userIdentity.isEqual(effectiveIdentity)
    );
    
    const membersWithUsers = convParticipants.map((p) => ({
      participant: p,
      user: users.get(p.userIdentity.toHexString()),
      presence: presences.get(p.userIdentity.toHexString()),
      isCurrentUser: effectiveIdentity && p.userIdentity.isEqual(effectiveIdentity),
    }));
    
    return {
      currentParticipant,
      members: membersWithUsers,
      isOwner: currentParticipant?.role === 'owner',
      isAdmin: currentParticipant?.role === 'admin' || currentParticipant?.role === 'owner',
    };
  }, [participants, users, presences, effectiveIdentity, conversation.conversationId]);
  
  const displayInfo = useMemo(() => {
    if (conversation.isGroup) {
      return {
        name: conversation.name || 'Group',
        avatarUrl: conversation.avatarUrl ?? undefined,
        isGroup: true,
        members: participantInfo.members.map((m) => ({
          name: m.user?.displayName ?? 'User',
          avatarUrl: m.user?.avatarUrl ?? undefined,
        })),
      };
    }
    
    const otherMember = participantInfo.members.find((m) => !m.isCurrentUser);
    return {
      name: otherMember?.user?.displayName ?? 'User',
      avatarUrl: otherMember?.user?.avatarUrl ?? undefined,
      isGroup: false,
      bio: otherMember?.user?.bio,
      username: otherMember?.user?.username,
    };
  }, [conversation, participantInfo.members]);
  
  const pinnedMessages = useMemo(() => {
    return Array.from(messages.values())
      .filter((m) => m.conversationId.toString() === conversation.conversationId.toString() && m.isPinned);
  }, [messages, conversation.conversationId]);
  
  const handleMute = () => {
    if (participantInfo.currentParticipant?.isMuted) {
      unmuteConversation(conversation.conversationId);
    } else {
      muteConversation(conversation.conversationId);
    }
  };
  
  const handleArchive = () => {
    if (participantInfo.currentParticipant?.isArchived) {
      unarchiveConversation(conversation.conversationId);
    } else {
      archiveConversation(conversation.conversationId);
    }
  };
  
  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave this conversation?')) {
      leaveConversation(conversation.conversationId);
    }
  };
  
  return (
    <div className="w-80 h-full bg-white/95 dark:bg-graphite/50 flex flex-col">
      <div className="p-4 border-b border-ghost/10 flex items-center justify-between">
        <h2 className="font-medium text-graphite dark:text-ghost">Details</h2>
        <button
          onClick={onClose}
          title="Close details"
          aria-label="Close details"
          className="p-1.5 hover:bg-ghost/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-graphite/60 dark:text-ghost/60" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6 text-center border-b border-ghost/10">
          <div className="flex justify-center mb-4">
            {displayInfo.isGroup && displayInfo.members && displayInfo.members.length > 1 ? (
              <AvatarGroup
                users={displayInfo.members}
                max={3}
                size="md"
              />
            ) : (
              <Avatar
                src={displayInfo.avatarUrl}
                name={displayInfo.name}
                size="xl"
              />
            )}
          </div>
          
          <h3 className="text-xl font-medium text-graphite dark:text-ghost mb-1">
            {displayInfo.name}
          </h3>
          
          {displayInfo.isGroup ? (
            <p className="text-sm text-graphite/55 dark:text-ghost/50">
              {participantInfo.members.length} members
            </p>
          ) : displayInfo.username ? (
            <p className="text-sm text-graphite/55 dark:text-ghost/50">@{displayInfo.username}</p>
          ) : null}
          
          {!displayInfo.isGroup && displayInfo.bio && (
            <p className="mt-3 text-sm text-graphite/65 dark:text-ghost/60">{displayInfo.bio}</p>
          )}
          
          {conversation.isGroup && conversation.description && (
            <p className="mt-3 text-sm text-graphite/65 dark:text-ghost/60">{conversation.description}</p>
          )}
        </div>
        
        <div className="p-4 border-b border-ghost/10">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleMute}
              className="flex flex-col items-center gap-2 p-3 hover:bg-ghost/10 rounded-xl transition-colors"
            >
              {participantInfo.currentParticipant?.isMuted ? (
                <BellOff className="w-5 h-5 text-ghost/60" />
              ) : (
                <Bell className="w-5 h-5 text-ghost/60" />
              )}
              <span className="text-xs text-ghost/60">
                {participantInfo.currentParticipant?.isMuted ? 'Unmute' : 'Mute'}
              </span>
            </button>
            
            <button className="flex flex-col items-center gap-2 p-3 hover:bg-ghost/10 rounded-xl transition-colors">
              <Search className="w-5 h-5 text-ghost/60" />
              <span className="text-xs text-ghost/60">Search</span>
            </button>
            
            <button
              onClick={handleArchive}
              className="flex flex-col items-center gap-2 p-3 hover:bg-ghost/10 rounded-xl transition-colors"
            >
              <Archive className="w-5 h-5 text-ghost/60" />
              <span className="text-xs text-ghost/60">
                {participantInfo.currentParticipant?.isArchived ? 'Unarchive' : 'Archive'}
              </span>
            </button>
          </div>
        </div>
        
        {pinnedMessages.length > 0 && (
          <div className="p-4 border-b border-ghost/10">
            <button className="w-full flex items-center justify-between p-3 hover:bg-ghost/10 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <Pin className="w-5 h-5 text-amber-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-ghost">Pinned Messages</p>
                  <p className="text-xs text-ghost/50">{pinnedMessages.length} pinned</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-ghost/40" />
            </button>
          </div>
        )}
        
        {conversation.isGroup && (
          <>
            <div className="flex border-b border-ghost/10">
              {(['members', 'media', 'files'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 py-3 text-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'text-plasma border-b-2 border-plasma'
                      : 'text-ghost/50 hover:text-ghost/70'
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="p-4">
              {activeTab === 'members' && (
                <div className="space-y-2">
                  {participantInfo.isAdmin && (
                    <button className="w-full flex items-center gap-3 p-3 hover:bg-ghost/10 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-full bg-plasma/20 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-plasma" />
                      </div>
                      <span className="text-sm text-ghost">Add Member</span>
                    </button>
                  )}
                  
                  {participantInfo.members.map(({ participant, user, presence, isCurrentUser }) => (
                    <div
                      key={participant.participantId.toString()}
                      className="flex items-center gap-3 p-2 rounded-xl"
                    >
                      <Avatar
                        src={user?.avatarUrl ?? undefined}
                        name={user?.displayName ?? 'User'}
                        size="md"
                        showStatus
                        status={presence?.isOnline ? 'online' : 'offline'}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ghost truncate">
                            {user?.displayName ?? 'User'}
                            {isCurrentUser && ' (You)'}
                          </span>
                          {participant.role === 'owner' && (
                            <Crown className="w-4 h-4 text-amber-500" />
                          )}
                          {participant.role === 'admin' && (
                            <Shield className="w-4 h-4 text-plasma" />
                          )}
                        </div>
                        <span className="text-xs text-ghost/50">
                          @{user?.username ?? 'unknown'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {activeTab === 'media' && (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 text-ghost/20 mx-auto mb-2" />
                  <p className="text-sm text-ghost/40">No media yet</p>
                </div>
              )}
              
              {activeTab === 'files' && (
                <div className="text-center py-8">
                  <File className="w-12 h-12 text-ghost/20 mx-auto mb-2" />
                  <p className="text-sm text-ghost/40">No files yet</p>
                </div>
              )}
            </div>
          </>
        )}
        
        <div className="p-4 border-t border-ghost/10">
          <button
            onClick={handleLeave}
            className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 rounded-xl transition-colors text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">
              {conversation.isGroup ? 'Leave Group' : 'Delete Chat'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
