/**
 * Booking / Orders service
 *
 * Connected to Freddy's Orders & Payments Backend module.
 *
 * Endpoints:
 * - POST /api/orders (requires authenticate + at least one verified contact method)
 * - GET  /api/orders/my (requires authenticate)
 * - GET  /api/orders/:id (requires authenticate)
 * Payment endpoints remain unavailable until a provider integration is configured.
 */
import apiClient from './api';
import type { Order, CreateOrderInput, ApiSuccessResponse } from '../types';

export const bookingService = {
  /**
   * POST /api/orders
   * Requires: authenticate + email or phone verification
   */
  async createOrder(input: CreateOrderInput): Promise<ApiSuccessResponse<Order>> {
    const { data } = await apiClient.post<ApiSuccessResponse<Order>>('/orders', input);
    return data;
  },

  /**
   * GET /api/orders/my
   * Requires: authenticate middleware
   */
  async getMyOrders(): Promise<ApiSuccessResponse<Order[]>> {
    const { data } = await apiClient.get<ApiSuccessResponse<Order[]>>('/orders/my');
    return data;
  },

  /**
   * GET /api/orders/:id
   * Requires: authenticate middleware
   */
  async getOrderById(id: string): Promise<ApiSuccessResponse<Order>> {
    const { data } = await apiClient.get<ApiSuccessResponse<Order>>(`/orders/${id}`);
    return data;
  },

  async initiatePayment(
    orderId: string,
    input?: { email?: string; callbackUrl?: string }
  ): Promise<ApiSuccessResponse<{
    paymentId: string;
    orderId: string;
    reference: string;
    authorizationUrl: string;
    accessCode?: string;
    amountKes: number;
    status: string;
    message: string;
  }>> {
    const { data } = await apiClient.post(`/orders/${orderId}/pay`, input ?? {});
    return data;
  },

  async verifyPayment(reference: string): Promise<ApiSuccessResponse<{
    status: string;
    reference: string;
    amountKes?: number;
    paidAt?: string;
    channel?: string;
    orderId?: string;
  }>> {
    const { data } = await apiClient.get(`/payments/verify/${encodeURIComponent(reference)}`);
    return data;
  },

  async getPaymentConfig(): Promise<ApiSuccessResponse<{
    provider: string;
    configured: boolean;
    isTestMode: boolean;
    publicKey: string | null;
  }>> {
    const { data } = await apiClient.get('/payments/config');
    return data;
  },

  /**
   * POST /api/orders/checkin
   * Scans / validates QR ticket code
   */
  async checkinTicket(qrCode: string): Promise<ApiSuccessResponse<any>> {
    const { data } = await apiClient.post<ApiSuccessResponse<any>>('/tickets/scan', { qrCode });
    return data;
  },
};
