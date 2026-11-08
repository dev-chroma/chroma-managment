import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sorts tasks in descending order by auto_id sequence number:
 * E.g., CD-W-005, CD-W-004, CD-W-003, CD-W-002, CD-W-001
 */
export function sortTasksDescending<T extends { auto_id?: string | null; created_at?: string }>(a: T, b: T): number {
  const aMatch = a.auto_id?.match(/-(\d+)$/);
  const bMatch = b.auto_id?.match(/-(\d+)$/);
  const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
  const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;

  if (aNum !== bNum) {
    return bNum - aNum; // Descending: 005, 004, 003, 002, 001
  }

  if (a.auto_id && b.auto_id) {
    const cmp = b.auto_id.localeCompare(a.auto_id, undefined, { numeric: true });
    if (cmp !== 0) return cmp;
  }

  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bTime - aTime;
}
