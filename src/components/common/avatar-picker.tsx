'use client';

import React, { useState } from 'react';
import { UserAvatar } from './user-avatar';
import { Check, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PRESET_AVATARS = [
  { id: 'default', src: '/profile-icon.png', label: 'Default Icon' },
  { id: 'av-1', src: '/avatars/avatar-1.svg', label: 'Indigo' },
  { id: 'av-2', src: '/avatars/avatar-2.svg', label: 'Emerald' },
  { id: 'av-3', src: '/avatars/avatar-3.svg', label: 'Purple' },
  { id: 'av-4', src: '/avatars/avatar-4.svg', label: 'Amber' },
  { id: 'av-5', src: '/avatars/avatar-5.svg', label: 'Pink' },
  { id: 'av-6', src: '/avatars/avatar-6.svg', label: 'Cyan' },
  { id: 'av-7', src: '/avatars/avatar-7.svg', label: 'Rose' },
  { id: 'av-8', src: '/avatars/avatar-8.svg', label: 'Blue' },
];

interface AvatarPickerProps {
  currentAvatar: string;
  onSelectAvatar: (avatarUrl: string) => void;
}

export function AvatarPicker({
  currentAvatar,
  onSelectAvatar,
}: AvatarPickerProps) {
  const [customUrl, setCustomUrl] = useState(
    currentAvatar && !currentAvatar.includes('profile-icon') && !currentAvatar.includes('/avatars/')
      ? currentAvatar
      : ''
  );

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-foreground">
          Select Profile Avatar
        </label>
        <span className="text-[11px] text-muted-foreground">Click any preset or enter URL</span>
      </div>

      {/* Preset Avatars Grid */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {PRESET_AVATARS.map((p) => {
          const isSelected =
            (p.id === 'default' && (!currentAvatar || currentAvatar === '' || currentAvatar === '/profile-icon.png' || currentAvatar.includes('unsplash'))) ||
            currentAvatar === p.src;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelectAvatar(p.src);
              }}
              className={cn(
                'relative p-1 rounded-full border-2 transition-all cursor-pointer hover:scale-105',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/10'
                  : 'border-transparent hover:border-border'
              )}
              title={p.label}
            >
              <img
                src={p.src}
                alt={p.label}
                className="h-9 w-9 rounded-full object-cover bg-background"
              />
              {isSelected && (
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Avatar URL input */}
      <div className="pt-2 border-t border-border/60">
        <div className="relative">
          <ImageIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="url"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value);
              if (e.target.value.trim()) {
                onSelectAvatar(e.target.value.trim());
              }
            }}
            placeholder="Or paste a custom avatar image URL..."
            className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}
