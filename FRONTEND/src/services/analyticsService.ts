import apiClient from './api';
import type {
  OrganizerDashboardData,
  AdminDashboardData,
  PlatformConfig,
  ApiSuccessResponse,
} from '../types';

export const analyticsService = {
  /**
   * GET /api/analytics/organizer
   */
  async getOrganizerDashboard(): Promise<ApiSuccessResponse<OrganizerDashboardData>> {
    const res = await apiClient.get<ApiSuccessResponse<OrganizerDashboardData>>('/analytics/organizer');
    return res.data;
  },

  /**
   * GET /api/analytics/events/:eventId
   */
  async getEventAnalytics(eventId: string): Promise<ApiSuccessResponse<any>> {
    const res = await apiClient.get<ApiSuccessResponse<any>>(`/analytics/events/${eventId}`);
    return res.data;
  },

  /**
   * GET /api/analytics/admin
   */
  async getAdminDashboard(): Promise<ApiSuccessResponse<AdminDashboardData>> {
    const res = await apiClient.get<ApiSuccessResponse<AdminDashboardData>>('/analytics/admin');
    return res.data;
  },

  /**
   * GET /api/admin/config
   */
  async getPlatformConfig(): Promise<ApiSuccessResponse<PlatformConfig>> {
    const res = await apiClient.get<ApiSuccessResponse<PlatformConfig>>('/admin/config');
    return res.data;
  },

  /**
   * PUT /api/admin/config
   */
  async updatePlatformConfig(
    data: Partial<PlatformConfig>
  ): Promise<ApiSuccessResponse<PlatformConfig>> {
    const res = await apiClient.put<ApiSuccessResponse<PlatformConfig>>('/admin/config', data);
    return res.data;
  },

  /**
   * GET /api/admin/users
   */
  async listUsers(
    page = 1,
    limit = 50,
    role?: string,
    search?: string
  ): Promise<ApiSuccessResponse<{ items: any[]; pagination: any }>> {
    const res = await apiClient.get<ApiSuccessResponse<{ items: any[]; pagination: any }>>(
      '/admin/users',
      { params: { page, limit, role, search } }
    );
    return res.data;
  },
};
