/** Default poster when an event has no coverImage (cards, detail hero, dashboard). */
export const DEFAULT_EVENT_POSTER =
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85';

const rawApiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').trim().replace(/\/+$/, '');
const backendOrigin = rawApiUrl.replace(/\/api$/, '');

export function eventCoverUrl(coverImage?: string | null): string {
  if (!coverImage || !coverImage.trim()) return DEFAULT_EVENT_POSTER;
  const url = coverImage.trim();
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function formatFlyerUrl(url?: string | null): string {
  if (!url || !url.trim()) return DEFAULT_EVENT_POSTER;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `${backendOrigin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}
