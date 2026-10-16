import type { Event, EventsQuery } from '../types';

const STORAGE_KEY = 'vibe_connect_events_list_v1';
const MAX_STALE_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  queryKey: string;
  storedAt: number;
  data: Event[];
}

function queryKey(query?: EventsQuery): string {
  return JSON.stringify({
    search: query?.search ?? '',
    category: query?.category ?? '',
    city: query?.city ?? '',
    page: query?.page ?? '',
    limit: query?.limit ?? '',
  });
}

function readEntry(query?: EventsQuery): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.queryKey !== queryKey(query)) return null;
    if (Date.now() - entry.storedAt > MAX_STALE_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

export function readCachedEvents(query?: EventsQuery): Event[] | null {
  const entry = readEntry(query);
  return entry?.data?.length ? entry.data : null;
}

/** Stale cache (including slightly expired) for instant paint while revalidating. */
export function readStaleEvents(query?: EventsQuery): Event[] | null {
  return readCachedEvents(query);
}

export function writeCachedEvents(query: EventsQuery | undefined, data: Event[]): void {
  if (!data.length) return;
  try {
    const entry: CacheEntry = {
      queryKey: queryKey(query),
      storedAt: Date.now(),
      data,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Private mode / quota — ignore
  }
}
