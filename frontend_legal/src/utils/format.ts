export const formatDate = (isoString?: string): string => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (isoString?: string): string => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calendar-day difference (target minus today), ignoring time-of-day on both sides.
export const daysFromToday = (isoString: string): number => {
  const TODAY = new Date('2026-09-02T09:00:00+05:30');
  const startOfToday = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()).getTime();
  const target = new Date(isoString);
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((startOfTarget - startOfToday) / 86400000);
};

export const formatRelativeToToday = (isoString?: string): string => {
  if (!isoString) return '—';
  const diffDays = daysFromToday(isoString);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
};

export const shortHash = (hash: string, chars = 10): string =>
  `${hash.slice(0, chars)}…${hash.slice(-6)}`;

export const initials = (name: string): string =>
  name
    .replace(/^(Hon'ble\s+)?Justice\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const formatFileSize = (kbOrMb: number, unit: 'KB' | 'MB'): string => {
  if (unit === 'KB') {
    return kbOrMb >= 1024 ? `${(kbOrMb / 1024).toFixed(1)} MB` : `${kbOrMb} KB`;
  }
  return `${kbOrMb} MB`;
};
