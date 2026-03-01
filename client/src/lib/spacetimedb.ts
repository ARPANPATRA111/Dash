import { DbConnection, type ErrorContext } from '@/module_bindings';
import { Identity, Timestamp } from 'spacetimedb';
import { useChatStore, useAuthStore, useUIStore } from '@/stores';
import type {
  User,
  UserPresence,
  Conversation,
  ConversationParticipant,
  Message,
  MessageReaction,
  TypingIndicator,
  Notification,
  FileAttachment,
  ReadReceipt,
} from '@/types';

const SPACETIMEDB_MODULE = import.meta.env.VITE_SPACETIMEDB_MODULE || 'test1-3edho';
const SPACETIMEDB_HOST = import.meta.env.VITE_SPACETIMEDB_HOST || 'wss://mainnet.spacetimedb.com';

let dbConnection: DbConnection | null = null;
let notificationsModulePromise: Promise<typeof import('@/lib/notifications')> | null = null;

function getNotificationsModule() {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('@/lib/notifications');
  }
  return notificationsModulePromise;
}

function toTimestamp(ts: { __timestamp_micros_since_unix_epoch__: bigint } | Timestamp): Timestamp {
  if (ts instanceof Timestamp) {
    return ts;
  }
  return new Timestamp(ts.__timestamp_micros_since_unix_epoch__);
}

export async function connectToSpacetimeDB(): Promise<DbConnection> {
  const chatStore = useChatStore.getState();
  const authStore = useAuthStore.getState();

  if (dbConnection && chatStore.isConnected) {
    return dbConnection;
  }

  if (chatStore.isConnecting) {
    return new Promise((resolve, reject) => {
      const unsubscribe = useChatStore.subscribe((state) => {
        if (state.isConnected && dbConnection) {
          unsubscribe();
          resolve(dbConnection);
        } else if (state.connectionError) {
          unsubscribe();
          reject(new Error(state.connectionError));
        }
      });
    });
  }

  chatStore.setConnecting(true);
  chatStore.setConnectionError(null);

  try {
    console.log(`[SpacetimeDB] Connecting to ${SPACETIMEDB_HOST}/${SPACETIMEDB_MODULE}...`);
    
    const builder = DbConnection.builder()
      .withUri(SPACETIMEDB_HOST)
      .withDatabaseName(SPACETIMEDB_MODULE);
    
    if (authStore.token) {
      builder.withToken(authStore.token);
    }

    return new Promise((resolve, reject) => {
      builder
        .onConnect((conn: DbConnection, identity: Identity, token: string) => {
          console.log('[SpacetimeDB] Connected!', identity.toHexString());
          dbConnection = conn;
          
          chatStore.setCurrentIdentity(identity);
          useAuthStore.getState().setToken(token);

          setupTableSubscriptions(conn);

          conn.subscriptionBuilder().subscribeToAllTables();
          
          chatStore.setConnected(true);
          chatStore.setConnecting(false);
          resolve(conn);
        })
        .onConnectError((_ctx: ErrorContext, error: Error) => {
          console.error('[SpacetimeDB] Connection error:', error);
          chatStore.setConnecting(false);
          chatStore.setConnectionError(error.message);
          reject(error);
        })
        .onDisconnect(() => {
          console.log('[SpacetimeDB] Disconnected');
          chatStore.setConnected(false);
          dbConnection = null;
        })
        .build();
    });
  } catch (error) {
    chatStore.setConnecting(false);
    chatStore.setConnectionError(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

function setupTableSubscriptions(conn: DbConnection) {
  const chatStore = useChatStore.getState();

  conn.db.user.onInsert((_ctx, row) => {
    const user: User = {
      identity: row.identity,
      userId: row.userId,
      email: row.email ?? null,
      username: row.username,
      displayName: row.displayName ?? null,
      avatarUrl: row.avatarUrl ?? null,
      statusMessage: row.statusMessage ?? null,
      bio: row.statusMessage ?? null,
      online: row.online,
      lastSeen: toTimestamp(row.lastSeen),
      createdAt: toTimestamp(row.createdAt),
      updatedAt: toTimestamp(row.updatedAt),
    };
    chatStore.setUser(user);
    
    const currentIdentity = useChatStore.getState().currentIdentity;
    if (currentIdentity && row.identity.toHexString() === currentIdentity.toHexString()) {
      useChatStore.getState().setCurrentUser(user);
      useAuthStore.getState().setIsRegistered(true);
      console.log('[SpacetimeDB] Current user loaded:', user.username);
    }
  });

  conn.db.user.onUpdate((_ctx, _oldRow, newRow) => {
    const user: User = {
      identity: newRow.identity,
      userId: newRow.userId,
      email: newRow.email ?? null,
      username: newRow.username,
      displayName: newRow.displayName ?? null,
      avatarUrl: newRow.avatarUrl ?? null,
      statusMessage: newRow.statusMessage ?? null,
      bio: newRow.statusMessage ?? null,
      online: newRow.online,
      lastSeen: toTimestamp(newRow.lastSeen),
      createdAt: toTimestamp(newRow.createdAt),
      updatedAt: toTimestamp(newRow.updatedAt),
    };
    chatStore.setUser(user);
    
    const currentIdentity = useChatStore.getState().currentIdentity;
    if (currentIdentity && newRow.identity.toHexString() === currentIdentity.toHexString()) {
      useChatStore.getState().setCurrentUser(user);
      useAuthStore.getState().setIsRegistered(true);
      console.log('[SpacetimeDB] Current user updated:', user.username);
    }
  });

  conn.db.user.onDelete((_ctx, row) => {
    chatStore.removeUser(row.identity.toHexString());
  });

  conn.db.user_presence.onInsert((_ctx, row) => {
    const presence: UserPresence = {
      userIdentity: row.userIdentity,
      status: row.status as 'online' | 'away' | 'busy' | 'offline',
      customStatus: row.customStatus ?? null,
      lastActivity: toTimestamp(row.lastActivity),
      isOnline: row.status === 'online',
      lastSeen: toTimestamp(row.lastActivity),
    };
    chatStore.setPresence(presence);
  });

  conn.db.user_presence.onUpdate((_ctx, _oldRow, newRow) => {
    const presence: UserPresence = {
      userIdentity: newRow.userIdentity,
      status: newRow.status as 'online' | 'away' | 'busy' | 'offline',
      customStatus: newRow.customStatus ?? null,
      lastActivity: toTimestamp(newRow.lastActivity),
      isOnline: newRow.status === 'online',
      lastSeen: toTimestamp(newRow.lastActivity),
    };
    chatStore.setPresence(presence);
  });

  conn.db.conversation.onInsert((_ctx, row) => {
    const conv: Conversation = {
      conversationId: row.conversationId,
      conversationType: row.conversationType as 'direct' | 'group',
      name: row.name ?? null,
      description: row.description ?? null,
      avatarUrl: row.avatarUrl ?? null,
      createdBy: row.createdBy,
      createdAt: toTimestamp(row.createdAt),
      updatedAt: toTimestamp(row.updatedAt),
      isArchived: row.isArchived,
      isGroup: row.conversationType === 'group',
      lastMessageAt: toTimestamp(row.updatedAt),
    };
    chatStore.setConversation(conv);
  });

  conn.db.conversation.onUpdate((_ctx, _oldRow, newRow) => {
    const conv: Conversation = {
      conversationId: newRow.conversationId,
      conversationType: newRow.conversationType as 'direct' | 'group',
      name: newRow.name ?? null,
      description: newRow.description ?? null,
      avatarUrl: newRow.avatarUrl ?? null,
      createdBy: newRow.createdBy,
      createdAt: toTimestamp(newRow.createdAt),
      updatedAt: toTimestamp(newRow.updatedAt),
      isArchived: newRow.isArchived,
      isGroup: newRow.conversationType === 'group',
      lastMessageAt: toTimestamp(newRow.updatedAt),
    };
    chatStore.setConversation(conv);
  });

  conn.db.conversation.onDelete((_ctx, row) => {
    chatStore.removeConversation(row.conversationId.toString());
  });

  conn.db.conversation_participant.onInsert((_ctx, row) => {
    const participant: ConversationParticipant = {
      participantId: row.participantId,
      conversationId: row.conversationId,
      userIdentity: row.userIdentity,
      role: row.role as 'owner' | 'admin' | 'member',
      joinedAt: toTimestamp(row.joinedAt),
      isMuted: row.isMuted,
      mutedUntil: row.mutedUntil ? toTimestamp(row.mutedUntil) : null,
      lastReadMessageId: row.lastReadMessageId ?? null,
      isArchived: row.isArchived,
      nickname: row.nickname ?? null,
    };
    chatStore.setParticipant(participant);
  });

  conn.db.conversation_participant.onUpdate((_ctx, _oldRow, newRow) => {
    const participant: ConversationParticipant = {
      participantId: newRow.participantId,
      conversationId: newRow.conversationId,
      userIdentity: newRow.userIdentity,
      role: newRow.role as 'owner' | 'admin' | 'member',
      joinedAt: toTimestamp(newRow.joinedAt),
      isMuted: newRow.isMuted,
      mutedUntil: newRow.mutedUntil ? toTimestamp(newRow.mutedUntil) : null,
      lastReadMessageId: newRow.lastReadMessageId ?? null,
      isArchived: newRow.isArchived,
      nickname: newRow.nickname ?? null,
    };
    chatStore.setParticipant(participant);
  });

  conn.db.conversation_participant.onDelete((_ctx, row) => {
    chatStore.removeParticipant(row.participantId.toString());
  });

  conn.db.message.onInsert((_ctx, row) => {
    const message: Message = {
      messageId: row.messageId,
      conversationId: row.conversationId,
      senderIdentity: row.senderIdentity,
      content: row.content,
      messageType: row.messageType as 'text' | 'image' | 'video' | 'file' | 'system',
      replyToMessageId: row.replyToMessageId ?? null,
      threadRootId: row.threadRootId ?? null,
      sentAt: toTimestamp(row.sentAt),
      editedAt: row.editedAt ? toTimestamp(row.editedAt) : null,
      isDeleted: row.isDeleted,
      isPinned: row.isPinned,
      metadata: row.metadata ?? null,
      isEdited: row.editedAt !== null,
    };
    chatStore.setMessage(message);
    
    const { currentIdentity } = useChatStore.getState();
    const { soundEnabled, notificationsEnabled } = useUIStore.getState();
    
    const myIdentityHex = currentIdentity?.toHexString();
    if (myIdentityHex && row.senderIdentity.toHexString() !== myIdentityHex && row.messageType !== 'system') {
      getNotificationsModule().then(({ soundManager, showNotification }) => {
        if (soundEnabled) {
          soundManager.playMessageReceived();
        }

        if (notificationsEnabled) {
          const sender = chatStore.users.get(row.senderIdentity.toHexString());
          const senderName = sender?.displayName || 'Someone';
          const content = row.content.length > 100 ? row.content.slice(0, 100) + '...' : row.content;

          showNotification(`${senderName} sent a message`, {
            body: content,
            tag: row.messageId.toString(),
          });
        }
      }).catch((error) => {
        console.warn('[Notifications] Failed to load notification module:', error);
      });
    }
  });

  conn.db.message.onUpdate((_ctx, _oldRow, newRow) => {
    const message: Message = {
      messageId: newRow.messageId,
      conversationId: newRow.conversationId,
      senderIdentity: newRow.senderIdentity,
      content: newRow.content,
      messageType: newRow.messageType as 'text' | 'image' | 'video' | 'file' | 'system',
      replyToMessageId: newRow.replyToMessageId ?? null,
      threadRootId: newRow.threadRootId ?? null,
      sentAt: toTimestamp(newRow.sentAt),
      editedAt: newRow.editedAt ? toTimestamp(newRow.editedAt) : null,
      isDeleted: newRow.isDeleted,
      isPinned: newRow.isPinned,
      metadata: newRow.metadata ?? null,
      isEdited: newRow.editedAt !== null,
    };
    chatStore.setMessage(message);
  });

  conn.db.message.onDelete((_ctx, row) => {
    chatStore.removeMessage(row.messageId.toString());
  });

  conn.db.message_reaction.onInsert((_ctx, row) => {
    const reaction: MessageReaction = {
      reactionId: row.reactionId,
      messageId: row.messageId,
      userIdentity: row.userIdentity,
      emoji: row.emoji,
      createdAt: toTimestamp(row.createdAt),
    };
    chatStore.setReaction(reaction);
  });

  conn.db.message_reaction.onDelete((_ctx, row) => {
    chatStore.removeReaction(row.reactionId.toString());
  });

  conn.db.typing_indicator.onInsert((_ctx, row) => {
    const typing: TypingIndicator = {
      typingId: row.typingId,
      conversationId: row.conversationId,
      userIdentity: row.userIdentity,
      startedAt: toTimestamp(row.startedAt),
    };
    chatStore.setTypingIndicator(typing);
  });

  conn.db.typing_indicator.onDelete((_ctx, row) => {
    chatStore.removeTypingIndicator(row.typingId.toString());
  });

  conn.db.notification.onInsert((_ctx, row) => {
    const notif: Notification = {
      notificationId: row.notificationId,
      userIdentity: row.userIdentity,
      notificationType: row.notificationType as 'message' | 'mention' | 'reaction' | 'system',
      title: row.title,
      body: row.body,
      data: row.data ?? null,
      isRead: row.isRead,
      createdAt: toTimestamp(row.createdAt),
    };
    chatStore.setNotification(notif);
  });

  conn.db.notification.onUpdate((_ctx, _oldRow, newRow) => {
    const notif: Notification = {
      notificationId: newRow.notificationId,
      userIdentity: newRow.userIdentity,
      notificationType: newRow.notificationType as 'message' | 'mention' | 'reaction' | 'system',
      title: newRow.title,
      body: newRow.body,
      data: newRow.data ?? null,
      isRead: newRow.isRead,
      createdAt: toTimestamp(newRow.createdAt),
    };
    chatStore.setNotification(notif);
  });

  conn.db.notification.onDelete((_ctx, row) => {
    chatStore.removeNotification(row.notificationId.toString());
  });

  conn.db.read_receipt.onInsert((_ctx, row) => {
    const receipt: ReadReceipt = {
      receiptId: row.receiptId,
      messageId: row.messageId,
      userIdentity: row.userIdentity,
      readAt: toTimestamp(row.readAt),
    };
    chatStore.setReadReceipt(receipt);
  });

  conn.db.file_attachment.onInsert((_ctx, row) => {
    const attachment: FileAttachment = {
      attachmentId: row.attachmentId,
      messageId: row.messageId,
      fileName: row.fileName,
      fileType: row.fileType,
      fileSize: row.fileSize,
      fileUrl: row.fileUrl,
      thumbnailUrl: row.thumbnailUrl ?? null,
      uploadedAt: toTimestamp(row.uploadedAt),
    };
    chatStore.setAttachment(attachment);
  });
}

export function getConnection(): DbConnection | null {
  return dbConnection;
}

export function disconnectFromSpacetimeDB(): void {
  if (dbConnection) {
    dbConnection.disconnect();
    dbConnection = null;
  }
  useChatStore.getState().reset();
}

function ensureConnection(): DbConnection {
  if (!dbConnection) {
    throw new Error('Not connected to SpacetimeDB');
  }
  return dbConnection;
}

export function registerUser(username: string, email?: string): Promise<unknown> {
  return ensureConnection().reducers.registerUser({ username, email });
}

export function requestEmailVerification(email: string, username: string, displayName?: string): void {
  ensureConnection().reducers.requestEmailVerification({ email, username, displayName });
}

export function verifyEmailAndRegister(email: string, code: string): void {
  ensureConnection().reducers.verifyEmailAndRegister({ email, code });
}

export function checkEmailExists(email: string): void {
  ensureConnection().reducers.checkEmailExists({ email });
}

export function loginWithEmail(email: string): Promise<unknown> {
  return ensureConnection().reducers.loginWithEmail({ email });
}

export function getPendingVerificationCode(email: string): string | null {
  const conn = ensureConnection();
  const normalizedEmail = email.trim().toLowerCase();
  const row = conn.db.email_verification.email.find(normalizedEmail);
  if (!row) {
    return null;
  }

  const currentIdentity = useChatStore.getState().currentIdentity;
  if (!currentIdentity) {
    return null;
  }

  if (row.identity.toHexString() !== currentIdentity.toHexString()) {
    return null;
  }

  return row.verificationCode;
}

export function updateProfile(displayName?: string, avatarUrl?: string, statusMessage?: string): Promise<unknown> {
  return ensureConnection().reducers.updateProfile({ displayName, avatarUrl, statusMessage });
}

export function updateUsername(newUsername: string): void {
  ensureConnection().reducers.updateUsername({ username: newUsername });
}

export function setPresence(status: string, customStatus?: string): void {
  ensureConnection().reducers.setPresence({ status, customStatus });
}

export function createDirectConversation(otherUserIdentity: Identity): void {
  ensureConnection().reducers.createDirectConversation({ otherUserIdentity });
}

export function createGroupConversation(name: string, memberIdentities: Identity[], description?: string): void {
  ensureConnection().reducers.createGroupConversation({ name, description, memberIdentities });
}

export function updateGroup(conversationId: bigint, name?: string, description?: string, avatarUrl?: string): void {
  ensureConnection().reducers.updateGroup({ conversationId, name, description, avatarUrl });
}

export function addGroupMember(conversationId: bigint, userIdentity: Identity): void {
  ensureConnection().reducers.addGroupMember({ conversationId, userIdentity });
}

export function removeGroupMember(conversationId: bigint, userIdentity: Identity): void {
  ensureConnection().reducers.removeGroupMember({ conversationId, userIdentity });
}

export function leaveConversation(conversationId: bigint): void {
  ensureConnection().reducers.leaveConversation({ conversationId });
}

export function muteConversation(conversationId: bigint, muteUntil?: Timestamp): void {
  ensureConnection().reducers.muteConversation({ conversationId, muteUntil });
}

export function unmuteConversation(conversationId: bigint): void {
  ensureConnection().reducers.unmuteConversation({ conversationId });
}

export function archiveConversation(conversationId: bigint): void {
  ensureConnection().reducers.archiveConversation({ conversationId });
}

export function unarchiveConversation(conversationId: bigint): void {
  ensureConnection().reducers.unarchiveConversation({ conversationId });
}

export function sendMessage(conversationId: bigint, content: string, messageType?: string, replyToMessageId?: bigint): void {
  ensureConnection().reducers.sendMessage({ conversationId, content, messageType, replyToMessageId });
}

export function sendMessageWithAttachment(
  conversationId: bigint,
  content: string,
  fileName: string,
  fileType: string,
  fileSize: bigint,
  fileUrl: string,
  thumbnailUrl?: string
): void {
  ensureConnection().reducers.sendMessageWithAttachment({
    conversationId,
    content,
    fileName,
    fileType,
    fileSize,
    fileUrl,
    thumbnailUrl,
  });
}

export function editMessage(messageId: bigint, newContent: string): void {
  ensureConnection().reducers.editMessage({ messageId, newContent });
}

export function deleteMessage(messageId: bigint): void {
  ensureConnection().reducers.deleteMessage({ messageId });
}

export function pinMessage(messageId: bigint): void {
  ensureConnection().reducers.pinMessage({ messageId });
}

export function unpinMessage(messageId: bigint): void {
  ensureConnection().reducers.unpinMessage({ messageId });
}

export function addReaction(messageId: bigint, emoji: string): void {
  ensureConnection().reducers.addReaction({ messageId, emoji });
}

export function removeReaction(messageId: bigint, emoji: string): void {
  ensureConnection().reducers.removeReaction({ messageId, emoji });
}

export function markAsRead(conversationId: bigint, messageId: bigint): void {
  ensureConnection().reducers.markAsRead({ conversationId, messageId });
}

export function startTyping(conversationId: bigint): void {
  ensureConnection().reducers.startTyping({ conversationId });
}

export function stopTyping(conversationId: bigint): void {
  ensureConnection().reducers.stopTyping({ conversationId });
}

export function promoteToAdmin(conversationId: bigint, userIdentity: Identity): void {
  ensureConnection().reducers.promoteToAdmin({ conversationId, userIdentity });
}

export function demoteFromAdmin(conversationId: bigint, userIdentity: Identity): void {
  ensureConnection().reducers.demoteFromAdmin({ conversationId, userIdentity });
}

export function transferOwnership(conversationId: bigint, newOwnerIdentity: Identity): void {
  ensureConnection().reducers.transferOwnership({ conversationId, newOwnerIdentity });
}

export function markNotificationRead(notificationId: bigint): void {
  ensureConnection().reducers.markNotificationRead({ notificationId });
}

export function markAllNotificationsRead(): void {
  ensureConnection().reducers.markAllNotificationsRead({});
}

export function deleteNotification(notificationId: bigint): void {
  ensureConnection().reducers.deleteNotification({ notificationId });
}

export function addAttachment(
  messageId: bigint,
  fileName: string,
  fileType: string,
  fileSize: bigint,
  fileUrl: string,
  thumbnailUrl?: string
): void {
  ensureConnection().reducers.addAttachment({ messageId, fileName, fileType, fileSize, fileUrl, thumbnailUrl });
}

export { Identity };
export type { DbConnection };
