/** Default poster when an event has no coverImage (cards, detail hero, dashboard). */
export const DEFAULT_EVENT_POSTER =
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85';

const rawApiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').trim().replace(/\/+$/, '');
const backendOrigin = rawApiUrl.replace(/\/api$/, '');

const STORED_FLYER_PATH = /^\/uploads\/flyers\/[a-f0-9-]+\.(?:jpe?g|png|webp)$/i;

function resolveEventMediaUrl(value?: string | null): string | null {
  const url = value?.trim();
  if (!url) return null;

  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(url)) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return url;
    }
  } catch {
    if (STORED_FLYER_PATH.test(url)) {
      return `${backendOrigin}${url}`;
    }
  }

  return null;
}

export function isEventMediaUrl(value?: string | null): boolean {
  return resolveEventMediaUrl(value) !== null;
}

export function eventCoverUrl(coverImage?: string | null, fallbackImage?: string | null): string {
  return resolveEventMediaUrl(coverImage) ?? resolveEventMediaUrl(fallbackImage) ?? DEFAULT_EVENT_POSTER;
}

export function formatFlyerUrl(url?: string | null): string {
  return resolveEventMediaUrl(url) ?? DEFAULT_EVENT_POSTER;
}
