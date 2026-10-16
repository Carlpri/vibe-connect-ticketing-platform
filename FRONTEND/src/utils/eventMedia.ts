/** Default poster when an event has no coverImage (cards, detail hero, dashboard). */
export const DEFAULT_EVENT_POSTER =
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85';

export function eventCoverUrl(coverImage?: string | null): string {
  return coverImage?.trim() ? coverImage.trim() : DEFAULT_EVENT_POSTER;
}
