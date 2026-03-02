import { useState, useMemo } from 'react';
import {
  Search,
  MessageSquarePlus,
  Users,
  Settings,
  Archive,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import { useChatStore } from '@/stores';
import { ConversationItem } from '../chat/ConversationItem';
import { Avatar } from '../ui/Avatar';

interface SidebarProps {
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onNewConversation: () => void;
  onNewGroup: () => void;
  onClose?: () => void;
}

export function Sidebar({
  onOpenProfile,
  onOpenSettings,
  onNewConversation,
  onNewGroup,
  onClose,
}: SidebarProps) {
  const currentUser = useChatStore((state) => state.currentUser);
  const users = useChatStore((state) => state.users);
  const conversations = useChatStore((state) => state.conversations);
  const participants = useChatStore((state) => state.participants);
  const currentIdentity = useChatStore((state) => state.currentIdentity);
  const effectiveIdentity = currentIdentity ?? currentUser?.identity ?? null;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group'>('all');
  
  const userConversations = useMemo(() => {
    if (!effectiveIdentity) return [];
    
    const participantConvIds = new Set(
      Array.from(participants.values())
        .filter((p) => p.userIdentity.isEqual(effectiveIdentity))
        .map((p) => p.conversationId.toString())
    );
    
    return Array.from(conversations.values())
      .filter((c) => participantConvIds.has(c.conversationId.toString()))
      .sort((a, b) => {
        const aTime = a.lastMessageAt?.toDate().getTime() ?? 0;
        const bTime = b.lastMessageAt?.toDate().getTime() ?? 0;
        return bTime - aTime;
      });
  }, [conversations, participants, effectiveIdentity]);
  
  const filteredConversations = useMemo(() => {
    let filtered = userConversations;
    
    if (filterType === 'direct') {
      filtered = filtered.filter((c) => !c.isGroup);
    } else if (filterType === 'group') {
      filtered = filtered.filter((c) => c.isGroup);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        if (c.name && c.name.toLowerCase().includes(query)) {
          return true;
        }

        const convParticipants = Array.from(participants.values()).filter(
          (p) => p.conversationId.toString() === c.conversationId.toString()
        );

        return convParticipants.some((participant) => {
          const user = users.get(participant.userIdentity.toHexString());
          if (!user) {
            return false;
          }

          return (
            user.username.toLowerCase().includes(query) ||
            (user.displayName?.toLowerCase().includes(query) ?? false)
          );
        });
      });
    }
    
    const archived = filtered.filter((c) => {
      const participant = Array.from(participants.values())
        .find((p) => p.conversationId === c.conversationId && 
                     effectiveIdentity && 
                     p.userIdentity.isEqual(effectiveIdentity));
      return participant?.isArchived;
    });
    
    const active = filtered.filter((c) => {
      const participant = Array.from(participants.values())
        .find((p) => p.conversationId === c.conversationId && 
                     effectiveIdentity && 
                     p.userIdentity.isEqual(effectiveIdentity));
      return !participant?.isArchived;
    });
    
    return { active, archived };
  }, [userConversations, filterType, searchQuery, participants, effectiveIdentity]);
  
  return (
    <div className="h-[100dvh] w-full md:w-80 bg-white dark:bg-gradient-to-b dark:from-graphite dark:to-void border-r border-graphite/10 dark:border-ghost/10 flex flex-col">
      <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-ghost/10 bg-white/85 dark:bg-graphite/65 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-plasma to-plasma/60 flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-graphite dark:text-ghost text-lg">Dash</h1>
              <p className="text-[10px] text-graphite/40 dark:text-ghost/40 -mt-0.5">Secure messaging</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              title="Open settings"
              aria-label="Open settings"
              className="p-2 hover:bg-ghost/10 rounded-xl transition-colors"
            >
              <Settings className="w-5 h-5 text-graphite/60 dark:text-ghost/60" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                title="Close chat list"
                aria-label="Close chat list"
                className="p-2 hover:bg-ghost/10 rounded-xl transition-colors md:hidden"
              >
                <X className="w-5 h-5 text-graphite/60 dark:text-ghost/60" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 hover:bg-ghost/10 rounded-2xl p-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Avatar
            src={currentUser?.avatarUrl ?? undefined}
            name={currentUser?.displayName ?? 'User'}
            size="md"
            showStatus
            status="online"
          />
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-graphite dark:text-ghost truncate">
              {currentUser?.displayName ?? 'User'}
            </p>
            <p className="text-xs text-graphite/50 dark:text-ghost/50 truncate">
              @{currentUser?.username ?? 'username'}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </button>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="input-field pl-10 py-2.5 text-sm bg-ghost/40 dark:bg-void/50"
          />
        </div>

        <div className="flex gap-1 mt-3 p-1 bg-ghost/40 dark:bg-void/30 rounded-xl">
          {(['all', 'direct', 'group'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`
                flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all
                ${filterType === type
                  ? 'bg-plasma text-white shadow-glow'
                  : 'text-graphite/50 dark:text-ghost/50 hover:text-graphite dark:hover:text-ghost hover:bg-ghost/20 dark:hover:bg-ghost/5'
                }
              `}
            >
              {type === 'all' ? 'All' : type === 'direct' ? 'Direct' : 'Groups'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-b border-ghost/10 flex gap-2 bg-white/70 dark:bg-graphite/45 backdrop-blur-sm">
        <button
          onClick={onNewConversation}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-3 bg-plasma hover:bg-plasma/90 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-glow"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
        <button
          onClick={onNewGroup}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-3 bg-ghost/20 dark:bg-ghost/10 hover:bg-ghost/30 dark:hover:bg-ghost/15 text-graphite dark:text-ghost rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Users className="w-4 h-4" />
          <span>New Group</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-2">
          {filteredConversations.active.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-plasma/10 flex items-center justify-center">
                <MessageSquarePlus className="w-8 h-8 text-plasma/60" />
              </div>
              <p className="text-sm font-medium text-graphite/60 dark:text-ghost/60">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-graphite/40 dark:text-ghost/40 mt-1 max-w-[200px] mx-auto">
                Start a new conversation to begin chatting with friends
              </p>
            </div>
          ) : (
            filteredConversations.active.map((conversation) => (
              <ConversationItem
                key={conversation.conversationId.toString()}
                conversation={conversation}
                onSelect={onClose}
              />
            ))
          )}
        </div>

        {filteredConversations.archived.length > 0 && (
          <div className="border-t border-ghost/10">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center gap-2 p-3 text-graphite/50 dark:text-ghost/50 hover:text-graphite/70 dark:hover:text-ghost/70 transition-colors"
            >
              {showArchived ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Archive className="w-4 h-4" />
              <span className="text-sm font-medium">
                Archived ({filteredConversations.archived.length})
              </span>
            </button>
            
            {showArchived && (
              <div className="p-2 pt-0">
                {filteredConversations.archived.map((conversation) => (
                  <ConversationItem
                    key={conversation.conversationId.toString()}
                    conversation={conversation}
                    onSelect={onClose}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
