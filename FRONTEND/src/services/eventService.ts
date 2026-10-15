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

export const eventService = {
  /**
   * GET /api/events?search=&category=&city=&page=&limit=
   */
  async getEvents(query?: EventsQuery): Promise<ApiSuccessResponse<Event[]>> {
    try {
      const res = await apiClient.get<ApiSuccessResponse<Event[]>>('/events', { params: query });
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data;
      }
    } catch (err) {
      console.warn('Backend /events not yet ready or returning error, using curated catalog', err);
    }

    // Filter mock events based on query
    let filtered = [...MOCK_EVENTS];
    if (query?.category && query.category !== 'All') {
      filtered = filtered.filter(
        (e) => e.category.toLowerCase() === query.category?.toLowerCase()
      );
    }
    if (query?.city && query.city !== 'All') {
      filtered = filtered.filter(
        (e) => e.city.toLowerCase() === query.city?.toLowerCase()
      );
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

    return {
      success: true,
      data: filtered,
      message: 'Events fetched successfully',
    };
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

    const found = MOCK_EVENTS.find((e) => e.id === id || e.slug === id);
    if (found) {
      return {
        success: true,
        data: found,
        message: 'Event found',
      };
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
