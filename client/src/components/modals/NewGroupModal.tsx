import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Users,
  Check,
  ArrowRight,
  ArrowLeft,
  ImageIcon,
} from 'lucide-react';
import { useChatStore } from '@/stores';
import { createGroupConversation, Identity } from '@/lib/spacetimedb';
import { Avatar } from '../ui/Avatar';
import { cn } from '@/lib/utils';

interface NewGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewGroupModal({ open, onClose }: NewGroupModalProps) {
  const users = useChatStore((state) => state.users);
  const presences = useChatStore((state) => state.presences);
  const currentIdentity = useChatStore((state) => state.currentIdentity);
  
  const [step, setStep] = useState<'members' | 'details'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupAvatarUrl, setGroupAvatarUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const handleClose = () => {
    setStep('members');
    setSearchQuery('');
    setSelectedMembers(new Set());
    setGroupName('');
    setGroupAvatarUrl('');
    onClose();
  };
  
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
  
  const toggleMember = (identityHex: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(identityHex)) {
      newSelected.delete(identityHex);
    } else {
      newSelected.add(identityHex);
    }
    setSelectedMembers(newSelected);
  };
  
  const handleNext = () => {
    if (selectedMembers.size < 1) return;
    setStep('details');
  };
  
  const handleBack = () => {
    setStep('members');
  };
  
  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.size < 1) return;
    
    setIsCreating(true);
    try {
      const memberIdentities = Array.from(selectedMembers).map(hex => new Identity(hex));
      createGroupConversation(
        groupName.trim(),
        memberIdentities
      );
      handleClose();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  const selectedMemberInfo = useMemo(() => {
    return Array.from(selectedMembers)
      .map((hex) => users.get(hex))
      .filter(Boolean);
  }, [selectedMembers, users]);
  
  if (!open) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {step === 'details' && (
                    <button
                      onClick={handleBack}
                      className="p-2 hover:bg-ghost/10 rounded-xl transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-ghost/60" />
                    </button>
                  )}
                  <h2 className="text-xl font-heading font-bold text-ghost">
                    {step === 'members' ? 'Select Members' : 'Group Details'}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-ghost/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-ghost/60" />
                </button>
              </div>
              
              <div className="flex gap-2 mt-4">
                <div className={cn(
                  'flex-1 h-1 rounded-full transition-colors',
                  'bg-plasma'
                )} />
                <div className={cn(
                  'flex-1 h-1 rounded-full transition-colors',
                  step === 'details' ? 'bg-plasma' : 'bg-ghost/20'
                )} />
              </div>
            </div>
            
            {step === 'members' && (
              <>
                <div className="p-4 border-b border-ghost/10">
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
                  
                  {selectedMemberInfo.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedMemberInfo.map((user) => (
                        <motion.button
                          key={user?.identity.toHexString()}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          onClick={() => toggleMember(user!.identity.toHexString())}
                          className="flex items-center gap-1.5 pl-1 pr-2 py-1 bg-plasma/20 rounded-full"
                        >
                          <Avatar
                            src={user?.avatarUrl ?? undefined}
                            name={user?.displayName ?? 'User'}
                            size="xs"
                          />
                          <span className="text-sm text-plasma">{user?.displayName}</span>
                          <X className="w-3 h-3 text-plasma/70" />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="max-h-72 overflow-y-auto scrollbar-thin p-2">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-ghost/20 mx-auto mb-3" />
                      <p className="text-ghost/50">No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map(({ user, presence }) => {
                      const isSelected = selectedMembers.has(user.identity.toHexString());
                      const isOnline = presence?.isOnline ?? false;
                      
                      return (
                        <button
                          key={user.identity.toHexString()}
                          onClick={() => toggleMember(user.identity.toHexString())}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                            isSelected
                              ? 'bg-plasma/10 border border-plasma/30'
                              : 'hover:bg-ghost/5 border border-transparent'
                          )}
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
                          <div className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                            isSelected
                              ? 'bg-plasma border-plasma'
                              : 'border-ghost/30'
                          )}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                
                <div className="p-4 border-t border-ghost/10">
                  <button
                    onClick={handleNext}
                    disabled={selectedMembers.size < 1}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-ghost/40 text-center mt-2">
                    {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </>
            )}
            
            {step === 'details' && (
              <>
                <div className="p-6">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      {groupAvatarUrl ? (
                        <img
                          src={groupAvatarUrl}
                          alt="Group"
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-plasma/20 flex items-center justify-center">
                          <Users className="w-10 h-10 text-plasma" />
                        </div>
                      )}
                      <button className="absolute bottom-0 right-0 p-2 bg-plasma rounded-full">
                        <ImageIcon className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-ghost/80 mb-2">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Enter group name"
                      className="input-field"
                      maxLength={50}
                      autoFocus
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-ghost/80 mb-2">
                      Avatar URL <span className="text-ghost/40">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={groupAvatarUrl}
                      onChange={(e) => setGroupAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-ghost/80 mb-2">
                      Members ({selectedMemberInfo.length + 1})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedMemberInfo.slice(0, 5).map((user) => (
                        <div
                          key={user?.identity.toHexString()}
                          className="flex items-center gap-2 px-2 py-1 bg-ghost/10 rounded-full"
                        >
                          <Avatar
                            src={user?.avatarUrl ?? undefined}
                            name={user?.displayName ?? 'User'}
                            size="xs"
                          />
                          <span className="text-sm text-ghost">{user?.displayName}</span>
                        </div>
                      ))}
                      {selectedMemberInfo.length > 5 && (
                        <div className="flex items-center px-2 py-1 bg-ghost/10 rounded-full">
                          <span className="text-sm text-ghost/60">
                            +{selectedMemberInfo.length - 5} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-ghost/10">
                  <button
                    onClick={handleCreate}
                    disabled={!groupName.trim() || isCreating}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-5 h-5" />
                        <span>Create Group</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
