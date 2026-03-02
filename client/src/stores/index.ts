import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Identity } from 'spacetimedb';
import type {
  User,
  Conversation,
  ConversationParticipant,
  Message,
  MessageReaction,
  TypingIndicator,
  UserPresence,
  Notification,
  FileAttachment,
  ReadReceipt,
} from '@/types';

interface ChatStore {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  currentIdentity: Identity | null;
  currentUser: User | null;
  
  users: Map<string, User>;
  conversations: Map<string, Conversation>;
  participants: Map<string, ConversationParticipant>;
  messages: Map<string, Message>;
  reactions: Map<string, MessageReaction>;
  typingIndicators: Map<string, TypingIndicator>;
  presences: Map<string, UserPresence>;
  notifications: Map<string, Notification>;
  attachments: Map<string, FileAttachment>;
  readReceipts: Map<string, ReadReceipt>;
  
  activeConversationId: bigint | null;
  replyingToMessage: Message | null;
  editingMessage: Message | null;
  searchQuery: string;
  isSearching: boolean;
  
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setCurrentIdentity: (identity: Identity | null) => void;
  setCurrentUser: (user: User | null) => void;
  
  setUser: (user: User) => void;
  removeUser: (identityHex: string) => void;
  setConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
  setParticipant: (participant: ConversationParticipant) => void;
  removeParticipant: (id: string) => void;
  setMessage: (message: Message) => void;
  removeMessage: (id: string) => void;
  setReaction: (reaction: MessageReaction) => void;
  removeReaction: (id: string) => void;
  setTypingIndicator: (indicator: TypingIndicator) => void;
  removeTypingIndicator: (id: string) => void;
  setPresence: (presence: UserPresence) => void;
  setNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  setAttachment: (attachment: FileAttachment) => void;
  setReadReceipt: (receipt: ReadReceipt) => void;
  
  setActiveConversation: (id: bigint | null) => void;
  setReplyingTo: (message: Message | null) => void;
  setEditingMessage: (message: Message | null) => void;
  setSearchQuery: (query: string) => void;
  setIsSearching: (searching: boolean) => void;
  
  getConversationMessages: (conversationId: bigint) => Message[];
  getConversationParticipants: (conversationId: bigint) => ConversationParticipant[];
  getConversationTyping: (conversationId: bigint) => TypingIndicator[];
  getMessageReactions: (messageId: bigint) => MessageReaction[];
  getMessageAttachments: (messageId: bigint) => FileAttachment[];
  getUnreadCount: (conversationId: bigint) => number;
  getUserByIdentity: (identity: Identity) => User | undefined;
  getPresenceByIdentity: (identity: Identity) => UserPresence | undefined;
  
  reset: () => void;
}

const initialState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  currentIdentity: null,
  currentUser: null,
  users: new Map<string, User>(),
  conversations: new Map<string, Conversation>(),
  participants: new Map<string, ConversationParticipant>(),
  messages: new Map<string, Message>(),
  reactions: new Map<string, MessageReaction>(),
  typingIndicators: new Map<string, TypingIndicator>(),
  presences: new Map<string, UserPresence>(),
  notifications: new Map<string, Notification>(),
  attachments: new Map<string, FileAttachment>(),
  readReceipts: new Map<string, ReadReceipt>(),
  activeConversationId: null,
  replyingToMessage: null,
  editingMessage: null,
  searchQuery: '',
  isSearching: false,
};

export const useChatStore = create<ChatStore>()((set, get) => ({
  ...initialState,
  
  setConnected: (connected) => set({ isConnected: connected }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setConnectionError: (error) => set({ connectionError: error }),
  setCurrentIdentity: (identity) => set({ currentIdentity: identity }),
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setUser: (user) => set((state) => {
    const users = new Map(state.users);
    users.set(user.identity.toHexString(), user);
    return { users };
  }),
  removeUser: (identityHex) => set((state) => {
    const users = new Map(state.users);
    users.delete(identityHex);
    return { users };
  }),
  
  setConversation: (conversation) => set((state) => {
    const conversations = new Map(state.conversations);
    conversations.set(conversation.conversationId.toString(), conversation);
    return { conversations };
  }),
  removeConversation: (id) => set((state) => {
    const conversations = new Map(state.conversations);
    conversations.delete(id);
    return { conversations };
  }),
  
  setParticipant: (participant) => set((state) => {
    const participants = new Map(state.participants);
    participants.set(participant.participantId.toString(), participant);
    return { participants };
  }),
  removeParticipant: (id) => set((state) => {
    const participants = new Map(state.participants);
    participants.delete(id);
    return { participants };
  }),
  
  setMessage: (message) => set((state) => {
    const messages = new Map(state.messages);
    messages.set(message.messageId.toString(), message);
    return { messages };
  }),
  removeMessage: (id) => set((state) => {
    const messages = new Map(state.messages);
    messages.delete(id);
    return { messages };
  }),
  
  setReaction: (reaction) => set((state) => {
    const reactions = new Map(state.reactions);
    reactions.set(reaction.reactionId.toString(), reaction);
    return { reactions };
  }),
  removeReaction: (id) => set((state) => {
    const reactions = new Map(state.reactions);
    reactions.delete(id);
    return { reactions };
  }),
  
  setTypingIndicator: (indicator) => set((state) => {
    const typingIndicators = new Map(state.typingIndicators);
    typingIndicators.set(indicator.typingId.toString(), indicator);
    return { typingIndicators };
  }),
  removeTypingIndicator: (id) => set((state) => {
    const typingIndicators = new Map(state.typingIndicators);
    typingIndicators.delete(id);
    return { typingIndicators };
  }),
  
  setPresence: (presence) => set((state) => {
    const presences = new Map(state.presences);
    presences.set(presence.userIdentity.toHexString(), presence);
    return { presences };
  }),
  
  setNotification: (notification) => set((state) => {
    const notifications = new Map(state.notifications);
    notifications.set(notification.notificationId.toString(), notification);
    return { notifications };
  }),
  removeNotification: (id) => set((state) => {
    const notifications = new Map(state.notifications);
    notifications.delete(id);
    return { notifications };
  }),
  
  setAttachment: (attachment) => set((state) => {
    const attachments = new Map(state.attachments);
    attachments.set(attachment.attachmentId.toString(), attachment);
    return { attachments };
  }),
  
  setReadReceipt: (receipt) => set((state) => {
    const readReceipts = new Map(state.readReceipts);
    readReceipts.set(receipt.receiptId.toString(), receipt);
    return { readReceipts };
  }),
  
  setActiveConversation: (id) => set({ activeConversationId: id, replyingToMessage: null, editingMessage: null }),
  setReplyingTo: (message) => set({ replyingToMessage: message, editingMessage: null }),
  setEditingMessage: (message) => set({ editingMessage: message, replyingToMessage: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSearching: (searching) => set({ isSearching: searching }),
  
  getConversationMessages: (conversationId) => {
    const state = get();
    return Array.from(state.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => {
        const aTime = a.sentAt.toDate().getTime();
        const bTime = b.sentAt.toDate().getTime();
        return aTime - bTime;
      });
  },
  
  getConversationParticipants: (conversationId) => {
    const state = get();
    return Array.from(state.participants.values())
      .filter((p) => p.conversationId === conversationId);
  },
  
  getConversationTyping: (conversationId) => {
    const state = get();
    return Array.from(state.typingIndicators.values())
      .filter((t) => t.conversationId === conversationId);
  },
  
  getMessageReactions: (messageId) => {
    const state = get();
    return Array.from(state.reactions.values())
      .filter((r) => r.messageId === messageId);
  },
  
  getMessageAttachments: (messageId) => {
    const state = get();
    return Array.from(state.attachments.values())
      .filter((a) => a.messageId === messageId);
  },
  
  getUnreadCount: (conversationId) => {
    const state = get();
    if (!state.currentIdentity) return 0;
    
    const participant = Array.from(state.participants.values())
      .find((p) => p.conversationId === conversationId && 
                   p.userIdentity.isEqual(state.currentIdentity!));
    
    if (!participant || !participant.lastReadMessageId) {
      return state.getConversationMessages(conversationId).length;
    }
    
    const messages = state.getConversationMessages(conversationId);
    const lastReadIndex = messages.findIndex((m) => m.messageId === participant.lastReadMessageId);
    
    return lastReadIndex === -1 ? messages.length : messages.length - lastReadIndex - 1;
  },
  
  getUserByIdentity: (identity) => {
    const state = get();
    return state.users.get(identity.toHexString());
  },
  
  getPresenceByIdentity: (identity) => {
    const state = get();
    return state.presences.get(identity.toHexString());
  },
  
  reset: () => set(initialState),
}));

interface UIStore {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  sidebarWidth: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  compactMode: boolean;
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: true,
      sidebarWidth: 320,
      soundEnabled: true,
      notificationsEnabled: true,
      compactMode: false,
      
      setTheme: (theme) => {
        set({ theme });
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
      },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(280, Math.min(480, width)) }),
      setSoundEnabled: (enabled) => {
        set({ soundEnabled: enabled });
        import('@/lib/notifications').then(({ soundManager }) => {
          soundManager.setEnabled(enabled);
        });
      },
      setNotificationsEnabled: async (enabled) => {
        if (enabled) {
          const { initNotifications } = await import('@/lib/notifications');
          const granted = await initNotifications();
          if (!granted) {
            console.warn('Notification permission denied');
          }
        }
        set({ notificationsEnabled: enabled });
      },
      setCompactMode: (compact) => {
        set({ compactMode: compact });
        const root = document.documentElement;
        if (compact) {
          root.classList.add('compact');
        } else {
          root.classList.remove('compact');
        }
      },
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'dash-ui-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface AuthStore {
  token: string | null;
  isAuthenticated: boolean;
  isRegistered: boolean;
  needsProfileSetup: boolean;
  userEmail: string | null;
  oauthName: string | null;
  oauthAvatarUrl: string | null;
  
  setToken: (token: string | null) => void;
  setIsAuthenticated: (auth: boolean) => void;
  setIsRegistered: (registered: boolean) => void;
  setNeedsProfileSetup: (needsSetup: boolean) => void;
  setUserEmail: (email: string | null) => void;
  setOauthProfile: (profile: { name?: string | null; avatarUrl?: string | null }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      isRegistered: false,
      needsProfileSetup: false,
      userEmail: null,
      oauthName: null,
      oauthAvatarUrl: null,
      
      setToken: (token) => set({ token }),
      setIsAuthenticated: (auth) => set({ isAuthenticated: auth }),
      setIsRegistered: (registered) => set({ isRegistered: registered }),
      setNeedsProfileSetup: (needsSetup) => set({ needsProfileSetup: needsSetup }),
      setUserEmail: (email) => set({ userEmail: email }),
      setOauthProfile: ({ name, avatarUrl }) => set({
        oauthName: name ?? null,
        oauthAvatarUrl: avatarUrl ?? null,
      }),
      logout: () => {
        set({
          token: null,
          isAuthenticated: false,
          isRegistered: false,
          needsProfileSetup: false,
          userEmail: null,
          oauthName: null,
          oauthAvatarUrl: null,
        });
        useChatStore.getState().reset();
      },
    }),
    {
      name: 'dash-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
