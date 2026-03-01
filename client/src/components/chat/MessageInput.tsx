import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Smile,
  Paperclip,
  X,
  Image as ImageIcon,
  File,
  Camera,
  Loader2,
  AtSign,
} from 'lucide-react';
import { useChatStore } from '@/stores';
import { sendMessage, editMessage, startTyping, stopTyping, sendMessageWithAttachment } from '@/lib/spacetimedb';
import { cn } from '@/lib/utils';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface MessageInputProps {
  conversationId: bigint;
}

interface PendingFile {
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const replyingToMessage = useChatStore((state) => state.replyingToMessage);
  const editingMessage = useChatStore((state) => state.editingMessage);
  const setReplyingTo = useChatStore((state) => state.setReplyingTo);
  const setEditingMessage = useChatStore((state) => state.setEditingMessage);
  const users = useChatStore((state) => state.users);
  const participants = useChatStore((state) => state.participants);
  
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  const mentionableUsers = useMemo(() => {
    const convParticipants = Array.from(participants.values())
      .filter((p) => p.conversationId.toString() === conversationId.toString());
    
    return convParticipants
      .map((p) => users.get(p.userIdentity.toHexString()))
      .filter(Boolean)
      .filter((u) => {
        if (!mentionQuery) return true;
        const query = mentionQuery.toLowerCase();
        return (
          u?.username.toLowerCase().includes(query) ||
          u?.displayName?.toLowerCase().includes(query)
        );
      });
  }, [participants, users, conversationId, mentionQuery]);
  
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);
  
  useEffect(() => {
    setContent('');
    setReplyingTo(null);
    setEditingMessage(null);
    setPendingFiles([]);
  }, [conversationId, setReplyingTo, setEditingMessage]);
  
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(conversationId);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(conversationId);
    }, 3000);
  }, [conversationId, isTyping]);
  
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping(conversationId);
      }
    };
  }, [conversationId, isTyping]);
  
  const handleContentChange = (value: string) => {
    setContent(value);
    handleTyping();
    
    const cursorPos = inputRef.current?.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };
  
  const insertMention = (username: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? content.length;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);
    
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newContent = textBeforeCursor.slice(0, lastAtIndex) + `@${username} ` + textAfterCursor;
      setContent(newContent);
    }
    
    setShowMentions(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };
  
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newPendingFiles: PendingFile[] = [];
    
    for (const file of Array.from(files)) {
      const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Max size is ${type === 'image' ? '10MB' : '50MB'}.`);
        continue;
      }
      
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }
      
      newPendingFiles.push({ file, preview, type });
    }
    
    setPendingFiles((prev) => [...prev, ...newPendingFiles]);
    setShowAttachments(false);
    
    e.target.value = '';
  };
  
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };
  
  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && pendingFiles.length === 0) return;
    
    if (isTyping) {
      setIsTyping(false);
      stopTyping(conversationId);
    }
    
    if (editingMessage) {
      editMessage(editingMessage.messageId, trimmedContent);
      setEditingMessage(null);
      setContent('');
      inputRef.current?.focus();
      return;
    }
    
    if (pendingFiles.length > 0) {
      setIsUploading(true);
      
      try {
        for (const pendingFile of pendingFiles) {
          const dataUrl = await fileToDataUrl(pendingFile.file);
          
          sendMessageWithAttachment(
            conversationId,
            trimmedContent || pendingFile.file.name,
            pendingFile.file.name,
            pendingFile.file.type,
            BigInt(pendingFile.file.size),
            dataUrl,
            pendingFile.preview
          );
        }
        
        pendingFiles.forEach((f) => {
          if (f.preview) URL.revokeObjectURL(f.preview);
        });
        setPendingFiles([]);
      } catch (error) {
        console.error('Failed to upload files:', error);
        alert('Failed to upload files. Please try again.');
      } finally {
        setIsUploading(false);
      }
    } else {
      sendMessage(
        conversationId,
        trimmedContent,
        'text',
        replyingToMessage?.messageId
      );
    }
    
    setReplyingTo(null);
    setContent('');
    inputRef.current?.focus();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && mentionableUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionableUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionableUsers.length) % mentionableUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const user = mentionableUsers[mentionIndex];
        if (user) {
          insertMention(user.username);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleEmojiSelect = (emojiData: { native: string }) => {
    setContent((prev) => prev + emojiData.native);
    inputRef.current?.focus();
  };
  
  const replyToSender = replyingToMessage
    ? users.get(replyingToMessage.senderIdentity.toHexString())
    : undefined;
  
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }, [content]);
  
  return (
    <div className="border-t border-ghost/10 p-2 sm:p-4 bg-gradient-to-t from-void to-transparent relative">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e, 'image')}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileSelect(e, 'file')}
        className="hidden"
      />
      
      <AnimatePresence>
        {pendingFiles.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pendingFiles.map((file, index) => (
                <div
                  key={index}
                  className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-ghost/20 bg-graphite/50"
                >
                  {file.preview ? (
                    <img src={file.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <File className="w-6 h-6 text-ghost/60 mb-1" />
                      <span className="text-[8px] text-ghost/40 text-center truncate w-full">
                        {file.file.name}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removePendingFile(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {(replyingToMessage || editingMessage) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-2 sm:mb-3 overflow-hidden"
          >
            <div className={cn(
              'flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border backdrop-blur-sm',
              editingMessage
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-plasma/10 border-plasma/30'
            )}>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-xs font-medium',
                  editingMessage ? 'text-amber-400' : 'text-plasma'
                )}>
                  {editingMessage ? 'Editing message' : `Replying to ${replyToSender?.displayName ?? 'Unknown'}`}
                </p>
                <p className="text-xs sm:text-sm text-ghost/60 truncate">
                  {(editingMessage ?? replyingToMessage)?.content}
                </p>
              </div>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setEditingMessage(null);
                  setContent('');
                }}
                className="p-1.5 hover:bg-ghost/10 rounded-lg transition-colors touch-manipulation"
              >
                <X className="w-4 h-4 text-ghost/60" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showMentions && mentionableUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-4 right-4 mb-2 max-h-48 overflow-y-auto bg-graphite/95 backdrop-blur-xl border border-ghost/20 rounded-xl shadow-lg"
          >
            {mentionableUsers.slice(0, 6).map((user, index) => (
              <button
                key={user?.identity.toHexString()}
                onClick={() => user && insertMention(user.username)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 text-left hover:bg-ghost/10 transition-colors',
                  index === mentionIndex && 'bg-ghost/10'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-plasma/20 flex items-center justify-center">
                  <AtSign className="w-4 h-4 text-plasma" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ghost">{user?.displayName}</p>
                  <p className="text-xs text-ghost/50">@{user?.username}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex items-end gap-2 sm:gap-3">
        <div className="relative">
          <button
            onClick={() => {
              setShowAttachments(!showAttachments);
              setShowEmoji(false);
            }}
            className="p-2 sm:p-2.5 hover:bg-ghost/10 active:bg-ghost/20 rounded-xl transition-colors touch-manipulation"
          >
            <Paperclip className="w-5 h-5 text-ghost/60" />
          </button>
          
          <AnimatePresence>
            {showAttachments && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-full left-0 mb-2 p-2 bg-graphite/95 backdrop-blur-xl border border-ghost/20 rounded-xl shadow-lg shadow-void/50"
              >
                <div className="flex gap-1 sm:gap-2">
                  <button 
                    onClick={() => imageInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 hover:bg-ghost/10 active:bg-ghost/20 rounded-xl transition-colors touch-manipulation"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-ghost/60">Photo</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 hover:bg-ghost/10 active:bg-ghost/20 rounded-xl transition-colors touch-manipulation"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <File className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-ghost/60">File</span>
                  </button>
                  <button 
                    onClick={() => imageInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 hover:bg-ghost/10 active:bg-ghost/20 rounded-xl transition-colors touch-manipulation"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-ghost/60">Camera</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? 'Edit your message...' : 'Type a message... (use @ to mention)'}
            rows={1}
            className="input-field w-full resize-none py-2.5 sm:py-3 pr-10 sm:pr-12 min-h-[42px] sm:min-h-[48px] max-h-[120px] sm:max-h-[150px] text-sm sm:text-base"
          />
          
          <button
            onClick={() => {
              setShowEmoji(!showEmoji);
              setShowAttachments(false);
            }}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-ghost/10 active:bg-ghost/20 rounded-lg transition-colors touch-manipulation"
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-ghost/40" />
          </button>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={(!content.trim() && pendingFiles.length === 0) || isUploading}
          className={cn(
            'p-2.5 sm:p-3 rounded-xl transition-all touch-manipulation',
            (content.trim() || pendingFiles.length > 0) && !isUploading
              ? 'bg-plasma text-white shadow-lg shadow-plasma/30'
              : 'bg-ghost/10 text-ghost/40'
          )}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </motion.button>
      </div>
      
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-20 right-2 sm:right-4 z-50"
          >
            <Picker
              data={data}
              theme="dark"
              onEmojiSelect={handleEmojiSelect}
              previewPosition="none"
              perLine={7}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
