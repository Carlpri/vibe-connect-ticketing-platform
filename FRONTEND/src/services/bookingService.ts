/**
 * Booking / Orders service
 *
 * Connected to Freddy's Orders & Payments Backend module.
 *
 * Endpoints:
 * - POST /api/orders (requires authenticate + requireFullyVerified)
 * - GET  /api/orders/my (requires authenticate)
 * - GET  /api/orders/:id (requires authenticate)
 * Payment endpoints remain unavailable until a provider integration is configured.
 */
import apiClient from './api';
import type { Order, CreateOrderInput, ApiSuccessResponse } from '../types';

export const bookingService = {
  /**
   * POST /api/orders
   * Requires: authenticate + requireFullyVerified middleware
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
    input: { phoneNumber: string }
  ): Promise<ApiSuccessResponse<{
    checkoutRequestId: string | null;
    paymentId: string;
    amountKes: number;
    status: string;
    message: string;
  }>> {
    const { data } = await apiClient.post('/orders/' + orderId + '/pay', input);
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
