import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisYear, isSameDay } from 'date-fns';
export function formatTimestamp(date: Date): string {
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  if (isThisWeek(date)) {
    return format(date, 'EEEE');
  }
  
  if (isThisYear(date)) {
    return format(date, 'MMM d');
  }
  
  return format(date, 'MMM d, yyyy');
}

export function formatMessageTime(date: Date): string {
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }
  
  if (isThisYear(date)) {
    return format(date, "MMM d 'at' h:mm a");
  }
  
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatLastSeen(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 60000) {
    return 'just now';
  }
  
  if (diffMs < 3600000) {
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  
  if (isToday(date)) {
    return `today at ${format(date, 'h:mm a')}`;
  }
  
  if (isYesterday(date)) {
    return `yesterday at ${format(date, 'h:mm a')}`;
  }
  
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatDateHeader(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  if (isThisWeek(date)) {
    return format(date, 'EEEE');
  }
  
  if (isThisYear(date)) {
    return format(date, 'EEEE, MMMM d');
  }
  
  return format(date, 'EEEE, MMMM d, yyyy');
}

export { isSameDay };

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
