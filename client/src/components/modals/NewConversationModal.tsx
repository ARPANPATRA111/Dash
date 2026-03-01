import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MessageSquare } from 'lucide-react';
import { useChatStore } from '@/stores';
import { createDirectConversation } from '@/lib/spacetimedb';
import { Avatar } from '../ui/Avatar';

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewConversationModal({ open, onClose }: NewConversationModalProps) {
  const users = useChatStore((state) => state.users);
  const presences = useChatStore((state) => state.presences);
  const currentIdentity = useChatStore((state) => state.currentIdentity);
  const conversations = useChatStore((state) => state.conversations);
  const participants = useChatStore((state) => state.participants);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const availableUsers = useMemo(() => {
    if (!currentIdentity) return [];
    
    return Array.from(users.values())
      .filter((user) => !user.identity.isEqual(currentIdentity))
      .map((user) => ({
        user,
        presence: presences.get(user.identity.toHexString()),
      }));
  }, [users, presences, currentIdentity]);
  
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(
      ({ user }) =>
        (user.displayName?.toLowerCase().includes(query) ?? false) ||
        user.username.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);
  
  const getExistingConversation = (userIdentityHex: string) => {
    if (!currentIdentity) return null;
    
    for (const conversation of conversations.values()) {
      if (conversation.isGroup) continue;
      
      const convParticipants = Array.from(participants.values())
        .filter((p) => p.conversationId.toString() === conversation.conversationId.toString());
      
      const hasCurrentUser = convParticipants.some(
        (p) => p.userIdentity.isEqual(currentIdentity)
      );
      const hasOtherUser = convParticipants.some(
        (p) => p.userIdentity.toHexString() === userIdentityHex
      );
      
      if (hasCurrentUser && hasOtherUser) {
        return conversation;
      }
    }
    
    return null;
  };
  
  const handleSelectUser = async (user: any) => {
    const existingConversation = getExistingConversation(user.identity.toHexString());
    
    if (existingConversation) {
      setActiveConversation(existingConversation.conversationId);
      onClose();
      return;
    }
    
    setIsCreating(true);
    try {
      createDirectConversation(user.identity);
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
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
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-ghost/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading font-bold text-ghost">New Chat</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-ghost/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-ghost/60" />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="input-field pl-10"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-ghost/20 mx-auto mb-3" />
                  <p className="text-ghost/50">
                    {searchQuery ? 'No users found' : 'No users available'}
                  </p>
                  <p className="text-xs text-ghost/30 mt-1">
                    Try searching for someone by name or username
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredUsers.map(({ user, presence }) => {
                    const isOnline = presence?.isOnline ?? false;
                    
                    return (
                      <button
                        key={user.identity.toHexString()}
                        onClick={() => handleSelectUser(user)}
                        disabled={isCreating}
                        className="w-full flex items-center gap-3 p-3 hover:bg-ghost/5 rounded-xl transition-colors"
                      >
                        <Avatar
                          src={user.avatarUrl ?? undefined}
                          name={user.displayName ?? user.username}
                          size="md"
                          showStatus
                          status={isOnline ? 'online' : 'offline'}
                        />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-ghost">{user.displayName ?? user.username}</p>
                          <p className="text-sm text-ghost/50">@{user.username}</p>
                        </div>
                        {getExistingConversation(user.identity.toHexString()) && (
                          <span className="text-xs text-ghost/40 bg-ghost/10 px-2 py-1 rounded-full">
                            Existing chat
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
