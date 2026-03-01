import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '@/stores';
import { MessageBubble } from './MessageBubble';
import { formatDateHeader, isSameDay } from '@/utils/formatters';
import { markAsRead } from '@/lib/spacetimedb';

interface MessageListProps {
  conversationId: bigint;
}

export function MessageList({ conversationId }: MessageListProps) {
  const getConversationMessages = useChatStore((state) => state.getConversationMessages);
  const currentIdentity = useChatStore((state) => state.currentIdentity);
  const users = useChatStore((state) => state.users);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const messages = getConversationMessages(conversationId);
  
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: typeof messages }[] = [];
    let currentGroup: typeof messages = [];
    let currentDate: Date | null = null;
    
    messages.forEach((message) => {
      const messageDate = message.sentAt.toDate();
      
      if (!currentDate || !isSameDay(currentDate, messageDate)) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate!, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });
    
    if (currentGroup.length > 0 && currentDate) {
      groups.push({ date: currentDate, messages: currentGroup });
    }
    
    return groups;
  }, [messages]);
  
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    setShowScrollButton(distanceFromBottom > 200);
    setAutoScroll(distanceFromBottom < 100);
  }, []);
  
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);
  
  useEffect(() => {
    if (autoScroll) {
      scrollToBottom(true);
    }
  }, [messages.length, autoScroll, scrollToBottom]);
  
  useEffect(() => {
    scrollToBottom(false);
  }, [conversationId, scrollToBottom]);
  
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && currentIdentity) {
      markAsRead(conversationId, lastMessage.messageId);
    }
  }, [messages, conversationId, currentIdentity]);
  
  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ghost/5 flex items-center justify-center">
            <span className="text-2xl">👋</span>
          </div>
          <p className="text-ghost/50 text-sm">No messages yet</p>
          <p className="text-ghost/30 text-xs mt-1">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-thin px-4 py-4"
      >
        {groupedMessages.map((group) => (
          <div key={group.date.toISOString()}>
            <div className="flex items-center justify-center my-4">
              <div className="px-3 py-1 bg-graphite/80 rounded-full border border-ghost/10">
                <span className="text-xs text-ghost/50 font-medium">
                  {formatDateHeader(group.date)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              {group.messages.map((message, messageIndex) => {
                const isOwn = currentIdentity && message.senderIdentity.isEqual(currentIdentity);
                const sender = users.get(message.senderIdentity.toHexString());
                
                const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
                const showSender = !isOwn && (
                  !prevMessage ||
                  !prevMessage.senderIdentity.isEqual(message.senderIdentity) ||
                  message.sentAt.toDate().getTime() - prevMessage.sentAt.toDate().getTime() > 5 * 60 * 1000
                );
                
                return (
                  <MessageBubble
                    key={message.messageId.toString()}
                    message={message}
                    isOwn={isOwn ?? false}
                    sender={sender}
                    showSender={showSender}
                  />
                );
              })}
            </div>
          </div>
        ))}
        
        <div ref={bottomRef} />
      </div>
      
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 right-4 p-2 bg-graphite border border-ghost/20 rounded-full shadow-lg hover:bg-ghost/10 transition-colors"
          >
            <ChevronDown className="w-5 h-5 text-ghost" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
