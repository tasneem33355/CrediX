import React from 'react';
import { clsx } from 'clsx';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'busy' | 'offline';
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  className,
  status,
}) => {
  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return n.slice(0, 2) || '?';
  };

  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  };

  const statusColors = {
    online: 'bg-semantic-success',
    busy: 'bg-semantic-error',
    offline: 'bg-text-muted',
  };

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={clsx(
          'rounded-full flex items-center justify-center font-bold bg-[#E8EEF5] text-brand-navy border border-border select-none overflow-hidden',
          sizeStyles[size],
          className
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 end-0 block w-2.5 h-2.5 rounded-full ring-2 ring-surface',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};
