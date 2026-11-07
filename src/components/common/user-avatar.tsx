'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function UserAvatar({
  src,
  name,
  className,
  size = 'md',
}: UserAvatarProps) {
  const sizeClasses = {
    xs: 'h-5 w-5',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-16 w-16',
  }[size];

  // If no avatar is provided, or if it points to an old unsplash dummy photo, use default profile-icon.png
  const hasValidCustomAvatar = Boolean(
    src && src.trim() !== '' && !src.includes('unsplash.com')
  );

  const displaySrc = hasValidCustomAvatar ? (src as string) : '/profile-icon.png';

  return (
    <img
      src={displaySrc}
      alt={name || 'Profile'}
      className={cn(
        sizeClasses,
        'rounded-full object-cover border border-border/70 shrink-0 bg-muted/40',
        className
      )}
      onError={(e) => {
        // Fallback to local profile-icon.png if remote custom image fails to load
        (e.currentTarget as HTMLImageElement).src = '/profile-icon.png';
      }}
    />
  );
}
