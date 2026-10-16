/**
 * Event service
 *
 * Checks the backend endpoint (reserved for Phillip).
 * When backend returns empty or placeholder, seamlessly provides
 * the rich mock Kenyan events catalog so the frontend remains fully interactive.
 */
import apiClient from './api';
import type { Event, EventsQuery, ApiSuccessResponse, CreateEventInput, UpdateEventInput } from '../types';
import { MOCK_EVENTS } from '../data/mockEvents';
import { readStaleEvents, writeCachedEvents } from '../utils/eventsListCache';

const useMockFallback = import.meta.env.VITE_MOCK_DATA === 'true';

type GetEventsOptions = {
  /** Called immediately when session cache exists (stale-while-revalidate). */
  onStale?: (events: Event[]) => void;
};

let inflightListRequest: Promise<ApiSuccessResponse<Event[]>> | null = null;
let inflightListKey = '';

function filterMockEvents(query?: EventsQuery): Event[] {
  let filtered = [...MOCK_EVENTS];
  if (query?.category && query.category !== 'All') {
    filtered = filtered.filter((e) => e.category.toLowerCase() === query.category?.toLowerCase());
  }
  if (query?.city && query.city !== 'All') {
    filtered = filtered.filter((e) => e.city.toLowerCase() === query.city?.toLowerCase());
  }
  if (query?.search) {
    const term = query.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        e.venue.toLowerCase().includes(term) ||
        e.city.toLowerCase().includes(term)
    );
  }
  return filtered;
}

async function fetchEventsFromApi(query?: EventsQuery): Promise<ApiSuccessResponse<Event[]> | null> {
  const res = await apiClient.get<ApiSuccessResponse<Event[]>>('/events', { params: query });
  if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
    return res.data;
  }
  return null;
}

export const eventService = {
  /**
   * GET /api/events?search=&category=&city=&page=&limit=
   */
  async getEvents(
    query?: EventsQuery,
    options?: GetEventsOptions
  ): Promise<ApiSuccessResponse<Event[]>> {
    const listKey = JSON.stringify(query ?? {});
    const stale = readStaleEvents(query);
    if (stale?.length) {
      options?.onStale?.(stale);
    }

    if (inflightListRequest && inflightListKey === listKey) {
      return inflightListRequest;
    }

    inflightListKey = listKey;
    inflightListRequest = (async () => {
      try {
        const fromApi = await fetchEventsFromApi(query);
        if (fromApi) {
          writeCachedEvents(query, fromApi.data);
          return fromApi;
        }
      } catch (err) {
        console.warn('Backend /events not yet ready or returning error', err);
        if (stale?.length) {
          return {
            success: true,
            data: stale,
            message: 'Events loaded from cache',
          };
        }
      } finally {
        inflightListRequest = null;
      }

      if (useMockFallback) {
        return {
          success: true,
          data: filterMockEvents(query),
          message: 'Events fetched successfully',
        };
      }

      if (stale?.length) {
        return {
          success: true,
          data: stale,
          message: 'Events loaded from cache',
        };
      }

      return {
        success: true,
        data: [],
        message: 'No events available',
      };
    })();

    return inflightListRequest;
  },

  /**
   * GET /api/events/:id
   */
  async getEventById(id: string): Promise<ApiSuccessResponse<Event>> {
    try {
      const res = await apiClient.get<ApiSuccessResponse<Event>>(`/events/${id}`);
      if (res.data?.data?.id) {
        return res.data;
      }
    } catch {
      // Backend endpoint for single event not ready
    }

    const cachedList = readStaleEvents();
    const fromCache = cachedList?.find((e) => e.id === id || e.slug === id);
    if (fromCache) {
      return {
        success: true,
        data: fromCache,
        message: 'Event found',
      };
    }

    if (useMockFallback) {
      const found = MOCK_EVENTS.find((e) => e.id === id || e.slug === id);
      if (found) {
        return {
          success: true,
          data: found,
          message: 'Event found',
        };
      }
    }

    throw new Error('Event not found');
  },

  /**
   * POST /api/events (Organizer / Admin only)
   */
  async createEvent(input: CreateEventInput): Promise<ApiSuccessResponse<Event>> {
    const res = await apiClient.post<ApiSuccessResponse<Event>>('/events', input);
    return res.data;
  },

  /**
   * PATCH /api/events/:id (Organizer / Admin only)
   */
  async updateEvent(id: string, input: UpdateEventInput): Promise<ApiSuccessResponse<Event>> {
    const res = await apiClient.patch<ApiSuccessResponse<Event>>(`/events/${id}`, input);
    return res.data;
  },

  /**
   * DELETE /api/events/:id (Organizer / Admin only)
   */
  async deleteEvent(id: string): Promise<ApiSuccessResponse<void>> {
    const res = await apiClient.delete<ApiSuccessResponse<void>>(`/events/${id}`);
    return res.data;
  },
};
