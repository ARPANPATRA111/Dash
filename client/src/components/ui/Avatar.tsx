import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  status?: 'online' | 'away' | 'busy' | 'offline';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const statusClasses = {
  online: 'bg-green-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-ghost/40',
};

const statusSizeClasses = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

function getColorFromName(name: string): string {
  const colors = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-violet-500',
    'from-indigo-500 to-blue-500',
    'from-cyan-500 to-teal-500',
    'from-emerald-500 to-green-500',
    'from-amber-500 to-orange-500',
    'from-red-500 to-pink-500',
    'from-plasma to-indigo-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 'md',
  showStatus = false,
  status = 'offline',
  className,
}: AvatarProps) {
  const displayName = name || 'User';
  const initials = getInitials(displayName);
  const gradientColor = getColorFromName(displayName);
  
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name ?? undefined}
          className={cn(
            'rounded-full object-cover',
            sizeClasses[size]
          )}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-medium text-white bg-gradient-to-br',
            gradientColor,
            sizeClasses[size]
          )}
        >
          {initials}
        </div>
      )}
      
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-graphite',
            statusClasses[status],
            statusSizeClasses[size]
          )}
        />
      )}
    </div>
  );
}

interface AvatarGroupProps {
  users: { name: string; avatarUrl?: string }[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function AvatarGroup({
  users,
  max = 3,
  size = 'sm',
  className,
}: AvatarGroupProps) {
  const displayed = users.slice(0, max);
  const remaining = users.length - max;
  
  const overlapClasses = {
    xs: '-ml-2',
    sm: '-ml-2.5',
    md: '-ml-3',
  };
  
  return (
    <div className={cn('flex items-center', className)}>
      {displayed.map((user, index) => (
        <div
          key={index}
          className={cn(
            'ring-2 ring-graphite rounded-full',
            index > 0 && overlapClasses[size]
          )}
        >
          <Avatar
            src={user.avatarUrl}
            name={user.name}
            size={size}
          />
        </div>
      ))}
      
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-ghost/20 ring-2 ring-graphite font-medium text-ghost',
            sizeClasses[size],
            overlapClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
