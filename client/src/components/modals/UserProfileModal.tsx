import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  AtSign,
  FileText,
  ImageIcon,
  Edit2,
  Check,
  LogOut,
} from 'lucide-react';
import { useChatStore, useAuthStore } from '@/stores';
import { updateProfile, updateUsername, disconnectFromSpacetimeDB } from '@/lib/spacetimedb';
import { Avatar } from '../ui/Avatar';

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const currentUser = useChatStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? '');
  const [username, setUsername] = useState(currentUser?.username ?? '');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleOpen = () => {
    setDisplayName(currentUser?.displayName ?? '');
    setBio(currentUser?.bio ?? '');
    setAvatarUrl(currentUser?.avatarUrl ?? '');
    setUsername(currentUser?.username ?? '');
    setIsEditing(false);
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      updateProfile(
        displayName !== currentUser?.displayName ? displayName : undefined,
        bio !== (currentUser?.bio ?? '') ? bio : undefined,
        avatarUrl !== (currentUser?.avatarUrl ?? '') ? avatarUrl : undefined
      );
      
      if (username !== currentUser?.username) {
        updateUsername(username);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      disconnectFromSpacetimeDB();
      logout();
      onClose();
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
          onAnimationStart={handleOpen}
        >
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-ghost">Profile</h2>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-2 hover:bg-ghost/10 rounded-xl transition-colors text-ghost/60"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="p-2 bg-plasma/20 hover:bg-plasma/30 rounded-xl transition-colors text-plasma"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 hover:bg-ghost/10 rounded-xl transition-colors text-ghost/60"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-ghost/10 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-ghost/60" />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Avatar
                  src={avatarUrl || undefined}
                  name={displayName || 'User'}
                  size="xl"
                />
                {isEditing && (
                  <button className="absolute bottom-0 right-0 p-2 bg-plasma rounded-full">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-ghost/80 mb-2">
                  <User className="w-4 h-4" />
                  Display Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-field"
                    maxLength={50}
                  />
                ) : (
                  <p className="text-ghost px-4 py-2.5">{currentUser?.displayName}</p>
                )}
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-ghost/80 mb-2">
                  <AtSign className="w-4 h-4" />
                  Username
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-field"
                    maxLength={20}
                  />
                ) : (
                  <p className="text-ghost px-4 py-2.5">@{currentUser?.username}</p>
                )}
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-ghost/80 mb-2">
                  <FileText className="w-4 h-4" />
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="input-field resize-none"
                    rows={3}
                    maxLength={200}
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-ghost/70 px-4 py-2.5">
                    {currentUser?.bio || 'No bio yet'}
                  </p>
                )}
              </div>
              
              {isEditing && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-ghost/80 mb-2">
                    <ImageIcon className="w-4 h-4" />
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="input-field"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-ghost/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
