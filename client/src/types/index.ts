import type { Identity, Timestamp } from 'spacetimedb';

export interface User {
  identity: Identity;
  userId: bigint;
  email: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  statusMessage: string | null;
  bio: string | null;
  online: boolean;
  lastSeen: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserSession {
  sessionId: bigint;
  userIdentity: Identity;
  deviceInfo: string | null;
  ipAddress: string | null;
  connectedAt: Timestamp;
  lastActive: Timestamp;
}

export interface UserPresence {
  userIdentity: Identity;
  status: PresenceStatus;
  customStatus: string | null;
  lastActivity: Timestamp;
  isOnline: boolean;
  lastSeen: Timestamp;
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface Conversation {
  conversationId: bigint;
  conversationType: ConversationType;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  createdBy: Identity;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isArchived: boolean;
  isGroup: boolean;
  lastMessageAt: Timestamp | null;
}

export type ConversationType = 'direct' | 'group';

export interface ConversationParticipant {
  participantId: bigint;
  conversationId: bigint;
  userIdentity: Identity;
  role: ParticipantRole;
  joinedAt: Timestamp;
  isMuted: boolean;
  mutedUntil: Timestamp | null;
  lastReadMessageId: bigint | null;
  isArchived: boolean;
  nickname: string | null;
}

export type ParticipantRole = 'owner' | 'admin' | 'member';

export interface Message {
  messageId: bigint;
  conversationId: bigint;
  senderIdentity: Identity;
  content: string;
  messageType: MessageType;
  replyToMessageId: bigint | null;
  threadRootId: bigint | null;
  sentAt: Timestamp;
  editedAt: Timestamp | null;
  isDeleted: boolean;
  isPinned: boolean;
  metadata: string | null;
  isEdited: boolean;
}

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'system';

export interface MessageReaction {
  reactionId: bigint;
  messageId: bigint;
  userIdentity: Identity;
  emoji: string;
  createdAt: Timestamp;
}

export interface ReadReceipt {
  receiptId: bigint;
  messageId: bigint;
  userIdentity: Identity;
  readAt: Timestamp;
}

export interface TypingIndicator {
  typingId: bigint;
  conversationId: bigint;
  userIdentity: Identity;
  startedAt: Timestamp;
}

export interface FileAttachment {
  attachmentId: bigint;
  messageId: bigint;
  fileName: string;
  fileType: string;
  fileSize: bigint;
  fileUrl: string;
  thumbnailUrl: string | null;
  uploadedAt: Timestamp;
}

export interface Notification {
  notificationId: bigint;
  userIdentity: Identity;
  notificationType: NotificationType;
  title: string;
  body: string;
  data: string | null;
  isRead: boolean;
  createdAt: Timestamp;
}

export type NotificationType = 'message' | 'mention' | 'reaction' | 'system';

export interface ChatState {
  currentUser: User | null;
  activeConversationId: bigint | null;
  conversations: Map<bigint, Conversation>;
  messages: Map<bigint, Message[]>;
  users: Map<string, User>;
  typing: Map<bigint, Identity[]>;
  unreadCounts: Map<bigint, number>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  settingsOpen: boolean;
  emojiPickerOpen: boolean;
  searchQuery: string;
  selectedMessages: Set<bigint>;
  replyingTo: Message | null;
  editingMessage: Message | null;
}

export interface RegisterForm {
  username: string;
  email?: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface ProfileForm {
  displayName?: string;
  avatarUrl?: string;
  statusMessage?: string;
}

export interface CreateGroupForm {
  name: string;
  description?: string;
  memberIdentities: Identity[];
}

export interface SendMessageForm {
  content: string;
  messageType?: MessageType;
  replyToMessageId?: bigint;
  attachments?: File[];
}

export interface ConnectionEvent {
  type: 'connected' | 'disconnected' | 'error';
  identity?: Identity;
  token?: string;
  error?: Error;
}

export interface MessageEvent {
  type: 'insert' | 'update' | 'delete';
  message: Message;
}

export interface PresenceEvent {
  type: 'update';
  presence: UserPresence;
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  cursor?: string;
}

export interface ConversationListItemProps {
  conversation: Conversation;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  isActive: boolean;
  onClick: () => void;
}

export interface MessageBubbleProps {
  message: Message;
  sender: User | null;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
  reactions: MessageReaction[];
  replyTo?: Message;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

export interface UserAvatarProps {
  user: User | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  className?: string;
}

export interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}
