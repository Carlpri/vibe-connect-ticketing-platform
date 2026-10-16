/**
 * Booking / Orders service
 *
 * Connected to Freddy's Orders & Payments Backend module.
 *
 * Endpoints:
 * - POST /api/orders (requires authenticate + requireFullyVerified)
 * - GET  /api/orders/my (requires authenticate)
 * - GET  /api/orders/:id (requires authenticate)
 * - POST /api/orders/:id/pay (requires authenticate)
 * - POST /api/orders/:id/confirm-payment (requires authenticate)
 * - POST /api/orders/checkin (requires authenticate)
 */
import apiClient from './api';
import type { Order, CreateOrderInput, InitiatePaymentInput, ApiSuccessResponse } from '../types';

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

  /**
   * POST /api/orders/:id/pay
   * Requires: authenticate middleware
   * Initiates M-Pesa STK push to customer's phone.
   */
  async initiatePayment(
    orderId: string,
    input: InitiatePaymentInput
  ): Promise<ApiSuccessResponse<{ checkoutRequestId: string; paymentId: string; amountKes: number }>> {
    const { data } = await apiClient.post(`/orders/${orderId}/pay`, input);
    return data;
  },

  /**
   * POST /api/orders/:id/confirm-payment
   * Confirms payment and issues digital ticket
   */
  async confirmPayment(orderId: string, mpesaReceiptNumber?: string): Promise<ApiSuccessResponse<Order>> {
    const { data } = await apiClient.post<ApiSuccessResponse<Order>>(`/orders/${orderId}/confirm-payment`, {
      mpesaReceiptNumber,
    });
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
