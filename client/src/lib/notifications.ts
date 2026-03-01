let notificationPermission: NotificationPermission = 'default';
export async function initNotifications(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }
  
  notificationPermission = Notification.permission;
  
  if (notificationPermission === 'default') {
    notificationPermission = await Notification.requestPermission();
  }
  
  return notificationPermission === 'granted';
}
export function showNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
  }
): void {
  if (!('Notification' in window) || notificationPermission !== 'granted') {
    return;
  }
  
  if (document.hasFocus()) {
    return;
  }
  
  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/icon.png',
      tag: options?.tag,
      requireInteraction: options?.requireInteraction ?? false,
      silent: true,
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    setTimeout(() => notification.close(), 5000);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}
class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        document.removeEventListener('click', initAudio);
        document.removeEventListener('keydown', initAudio);
      };
      document.addEventListener('click', initAudio);
      document.addEventListener('keydown', initAudio);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async playMessageReceived() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  async playMessageSent() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.08);
      
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  async playUserJoined() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(659, ctx.currentTime);
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.35);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }
}

export const soundManager = new SoundManager();
