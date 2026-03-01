import { useState, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Reply,
  Edit2,
  Trash2,
  Pin,
  Copy,
  SmilePlus,
  CheckCheck,
  FileIcon,
  Download,
  ImageIcon,
} from 'lucide-react';
import { useChatStore } from '@/stores';
import { Avatar } from '../ui/Avatar';
import { formatMessageTime, formatFileSize } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { deleteMessage, pinMessage, unpinMessage, addReaction } from '@/lib/spacetimedb';
import type { Message, User } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  sender?: User;
  showSender: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function renderContentWithMentions(content: string, users: Map<string, User>, isOwn: boolean): ReactNode {
  const mentionRegex = /@(\w+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    
    const username = match[1];
    const mentionedUser = Array.from(users.values()).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    
    parts.push(
      <span
        key={`mention-${keyIndex}`}
        className={cn(
          'font-semibold px-0.5 rounded',
          isOwn
            ? 'bg-white/20 text-white'
            : 'bg-plasma/20 text-plasma'
        )}
        title={mentionedUser?.displayName ?? username}
      >
        @{username}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
    keyIndex++;
  }
  
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : content;
}

export function MessageBubble({ message, isOwn, sender, showSender }: MessageBubbleProps) {
  const setReplyingTo = useChatStore((state) => state.setReplyingTo);
  const setEditingMessage = useChatStore((state) => state.setEditingMessage);
  const messages = useChatStore((state) => state.messages);
  const users = useChatStore((state) => state.users);
  const getMessageReactions = useChatStore((state) => state.getMessageReactions);
  const getMessageAttachments = useChatStore((state) => state.getMessageAttachments);
  
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  
  const reactions = getMessageReactions(message.messageId);
  const attachments = getMessageAttachments(message.messageId);
  
  const groupedReactions = useMemo(() => {
    const groups: Record<string, number> = {};
    reactions.forEach((r) => {
      groups[r.emoji] = (groups[r.emoji] || 0) + 1;
    });
    return Object.entries(groups);
  }, [reactions]);
  
  const imageAttachments = attachments.filter(a => a.fileType.startsWith('image/'));
  const fileAttachments = attachments.filter(a => !a.fileType.startsWith('image/'));
  
  const replyToMessage = message.replyToMessageId
    ? messages.get(message.replyToMessageId.toString())
    : undefined;
  
  const replyToSender = replyToMessage
    ? users.get(replyToMessage.senderIdentity.toHexString())
    : undefined;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowActions(false);
  };
  
  const handleReply = () => {
    setReplyingTo(message as any);
    setShowActions(false);
  };
  
  const handleEdit = () => {
    setEditingMessage(message as any);
    setShowActions(false);
  };
  
  const handleDelete = () => {
    deleteMessage(message.messageId);
    setShowActions(false);
  };
  
  const handlePin = () => {
    if (message.isPinned) {
      unpinMessage(message.messageId);
    } else {
      pinMessage(message.messageId);
    }
    setShowActions(false);
  };
  
  const handleAddReaction = (emoji: string) => {
    addReaction(message.messageId, emoji);
    setShowReactions(false);
    setShowActions(false);
  };
  
  if (message.isDeleted) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="px-3 sm:px-4 py-2 rounded-2xl bg-ghost/5 border border-ghost/10 italic text-ghost/40 text-xs sm:text-sm">
          This message was deleted
        </div>
      </div>
    );
  }
  
  return (
    <div
      className={cn(
        'group flex gap-2',
        isOwn ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
      onTouchStart={() => setShowActions(true)}
    >
      {!isOwn && showSender && (
        <Avatar
          src={sender?.avatarUrl ?? undefined}
          name={sender?.displayName ?? 'User'}
          size="sm"
          className="mt-auto hidden sm:flex"
        />
      )}
      
      {!isOwn && !showSender && <div className="w-0 sm:w-8" />}
      
      <div className={cn('max-w-[85%] sm:max-w-[70%] relative', isOwn && 'order-first')}>
        {showSender && !isOwn && (
          <p className="text-[10px] sm:text-xs text-ghost/50 mb-1 ml-2 sm:ml-3">
            {sender?.displayName ?? 'Unknown'}
          </p>
        )}
        
        {replyToMessage && (
          <div className={cn(
            'mb-1 ml-2 sm:ml-3 pl-2 sm:pl-3 border-l-2 rounded-r-lg py-1 pr-2 sm:pr-3 text-[10px] sm:text-xs',
            isOwn
              ? 'border-plasma/50 bg-plasma/10'
              : 'border-ghost/30 bg-ghost/5'
          )}>
            <p className="text-ghost/50 font-medium">
              {replyToSender?.displayName ?? 'Unknown'}
            </p>
            <p className="text-ghost/40 truncate">
              {replyToMessage.isDeleted ? 'Deleted message' : replyToMessage.content}
            </p>
          </div>
        )}
        
        {message.isPinned && (
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-amber-500 mb-1 ml-2 sm:ml-3">
            <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span>Pinned</span>
          </div>
        )}
        
        <div
          className={cn(
            'rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 break-words',
            isOwn
              ? 'bg-gradient-to-br from-plasma to-plasma/80 text-white rounded-br-md shadow-lg shadow-plasma/20'
              : 'bg-graphite/80 text-ghost border border-ghost/10 rounded-bl-md backdrop-blur-sm'
          )}
        >
          {imageAttachments.length > 0 && (
            <div className={cn(
              'mb-2 grid gap-1',
              imageAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            )}>
              {imageAttachments.map((attachment) => (
                <div key={attachment.attachmentId.toString()} className="relative rounded-lg overflow-hidden">
                  {imageError[attachment.attachmentId.toString()] ? (
                    <div className="w-full h-32 bg-ghost/10 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-ghost/40" />
                    </div>
                  ) : (
                    <img
                      src={attachment.fileUrl}
                      alt={attachment.fileName}
                      className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(attachment.fileUrl, '_blank')}
                      onError={() => setImageError(prev => ({ ...prev, [attachment.attachmentId.toString()]: true }))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          
          {fileAttachments.length > 0 && (
            <div className="mb-2 space-y-1">
              {fileAttachments.map((attachment) => (
                <a
                  key={attachment.attachmentId.toString()}
                  href={attachment.fileUrl}
                  download={attachment.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg transition-colors',
                    isOwn
                      ? 'bg-white/10 hover:bg-white/20'
                      : 'bg-ghost/10 hover:bg-ghost/20'
                  )}
                >
                  <FileIcon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                    <p className={cn(
                      'text-xs',
                      isOwn ? 'text-white/60' : 'text-ghost/50'
                    )}>
                      {formatFileSize(Number(attachment.fileSize))}
                    </p>
                  </div>
                  <Download className="w-4 h-4 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}
          
          {message.content && (
            <p className="whitespace-pre-wrap text-sm sm:text-base">
              {renderContentWithMentions(message.content, users, isOwn)}
            </p>
          )}
          
          <div className={cn(
            'flex items-center gap-1.5 sm:gap-2 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              'text-[10px] sm:text-xs',
              isOwn ? 'text-white/60' : 'text-ghost/40'
            )}>
              {formatMessageTime(message.sentAt.toDate())}
            </span>
            
            {message.isEdited && (
              <span className={cn(
                'text-[10px] sm:text-xs',
                isOwn ? 'text-white/50' : 'text-ghost/30'
              )}>
                edited
              </span>
            )}
            
            {isOwn && (
              <CheckCheck className={cn(
                'w-3 h-3 sm:w-4 sm:h-4',
                'text-white/60'
              )} />
            )}
          </div>
        </div>
        
        {groupedReactions.length > 0 && (
          <div className={cn(
            'flex flex-wrap gap-1 mt-1',
            isOwn ? 'justify-end mr-1 sm:mr-2' : 'justify-start ml-1 sm:ml-2'
          )}>
            {groupedReactions.map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleAddReaction(emoji)}
                className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-ghost/10 hover:bg-ghost/20 active:bg-ghost/30 rounded-full text-xs sm:text-sm transition-colors touch-manipulation"
              >
                <span>{emoji}</span>
                <span className="text-[10px] sm:text-xs text-ghost/60">{count}</span>
              </button>
            ))}
          </div>
        )}
        
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'absolute flex items-center gap-0.5 p-1 bg-graphite/95 backdrop-blur-sm border border-ghost/20 rounded-xl shadow-lg z-10',
                'top-0 sm:top-0',
                isOwn 
                  ? 'right-full mr-1 sm:mr-1' 
                  : 'left-full ml-1 sm:ml-1'
              )}
            >
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 sm:p-1.5 hover:bg-ghost/10 active:bg-ghost/20 rounded-lg transition-colors touch-manipulation"
              >
                <SmilePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ghost/60" />
              </button>
              
              <button
                onClick={handleReply}
                className="p-1.5 sm:p-1.5 hover:bg-ghost/10 active:bg-ghost/20 rounded-lg transition-colors touch-manipulation"
              >
                <Reply className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ghost/60" />
              </button>
              
              <button
                onClick={handleCopy}
                className="p-1.5 sm:p-1.5 hover:bg-ghost/10 active:bg-ghost/20 rounded-lg transition-colors touch-manipulation"
              >
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ghost/60" />
              </button>
              
              {isOwn && (
                <button
                  onClick={handleEdit}
                  className="p-1.5 sm:p-1.5 hover:bg-ghost/10 active:bg-ghost/20 rounded-lg transition-colors touch-manipulation"
                >
                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ghost/60" />
                </button>
              )}
              
              <button
                onClick={handlePin}
                className="p-1.5 sm:p-1.5 hover:bg-ghost/10 active:bg-ghost/20 rounded-lg transition-colors touch-manipulation"
              >
                <Pin className={cn(
                  'w-3.5 h-3.5 sm:w-4 sm:h-4',
                  message.isPinned ? 'text-amber-500' : 'text-ghost/60'
                )} />
              </button>
              
              {isOwn && (
                <button
                  onClick={handleDelete}
                  className="p-1.5 sm:p-1.5 hover:bg-red-500/20 active:bg-red-500/30 rounded-lg transition-colors touch-manipulation"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={cn(
                'absolute -top-12 flex items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 bg-graphite/95 backdrop-blur-sm border border-ghost/20 rounded-xl shadow-lg z-20',
                isOwn ? 'right-0' : 'left-0'
              )}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddReaction(emoji)}
                  className="w-7 h-7 sm:w-8 sm:h-8 hover:bg-ghost/10 active:bg-ghost/20 rounded-lg flex items-center justify-center text-base sm:text-lg transition-colors touch-manipulation"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
