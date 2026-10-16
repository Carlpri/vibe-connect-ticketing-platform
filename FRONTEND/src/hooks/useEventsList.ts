import { useEffect, useState } from 'react';
import { eventService } from '../services/eventService';
import { readStaleEvents } from '../utils/eventsListCache';
import type { Event, EventsQuery } from '../types';

export function useEventsList(query?: EventsQuery) {
  const [events, setEvents] = useState<Event[]>(() => readStaleEvents(query) ?? []);
  const [loading, setLoading] = useState(() => !readStaleEvents(query));
  const [error, setError] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);

  const queryKey = JSON.stringify(query ?? {});

  useEffect(() => {
    let cancelled = false;
    const cached = readStaleEvents(query);

    if (cached?.length) {
      setEvents(cached);
      setLoading(false);
      setIsRevalidating(true);
    } else {
      setEvents([]);
      setLoading(true);
      setIsRevalidating(false);
    }
    setError(null);

    async function load() {
      try {
        const res = await eventService.getEvents(query, {
          onStale: (stale) => {
            if (!cancelled) {
              setEvents(stale);
              setLoading(false);
            }
          },
        });
        if (!cancelled) {
          setEvents(res.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load events', err);
          setError('Could not load events. Check your connection and try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRevalidating(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  return { events, loading, error, isRevalidating };
}
