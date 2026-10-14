/**
 * Booking / Orders service
 *
 * ⚠️ BACKEND STATUS: NOT YET IMPLEMENTED
 * The orders module is reserved for Freddy. The POST /api/orders,
 * GET /api/orders/my, GET /api/orders/:id, and POST /api/orders/:id/pay
 * endpoints do not yet exist.
 *
 * Security note: POST /api/orders will require BOTH emailVerified AND
 * phoneVerified (requireFullyVerified middleware). The UI must guide
 * users through verification before reaching checkout.
 */
import type { Order, CreateOrderInput, InitiatePaymentInput, ApiSuccessResponse } from '../types';

export const bookingService = {
  /**
   * POST /api/orders
   * Requires: authenticate + requireFullyVerified middleware
   * NOT IMPLEMENTED — awaiting Freddy's orders module.
   */
  async createOrder(_input: CreateOrderInput): Promise<ApiSuccessResponse<Order>> {
    // When implemented:
    // const { data } = await apiClient.post<ApiSuccessResponse<Order>>('/orders', _input);
    // return data;
    throw new Error('Order creation endpoint is not yet implemented by the backend team.');
  },

  /**
   * GET /api/orders/my
   * Requires: authenticate middleware
   * NOT IMPLEMENTED — awaiting Freddy's orders module.
   */
  async getMyOrders(): Promise<ApiSuccessResponse<Order[]>> {
    // When implemented:
    // const { data } = await apiClient.get<ApiSuccessResponse<Order[]>>('/orders/my');
    // return data;
    throw new Error('Order history endpoint is not yet implemented by the backend team.');
  },

  /**
   * GET /api/orders/:id
   * Requires: authenticate middleware
   * NOT IMPLEMENTED — awaiting Freddy's orders module.
   */
  async getOrderById(_id: string): Promise<ApiSuccessResponse<Order>> {
    // When implemented:
    // const { data } = await apiClient.get<ApiSuccessResponse<Order>>(`/orders/${_id}`);
    // return data;
    throw new Error('Order details endpoint is not yet implemented by the backend team.');
  },

  /**
   * POST /api/orders/:id/pay
   * Requires: authenticate middleware
   * NOT IMPLEMENTED — awaiting Freddy's orders module.
   * Will initiate M-Pesa STK push to customer's phone.
   */
  async initiatePayment(
    _orderId: string,
    _input: InitiatePaymentInput
  ): Promise<ApiSuccessResponse<{ checkoutRequestId: string }>> {
    // When implemented:
    // const { data } = await apiClient.post(`/orders/${_orderId}/pay`, _input);
    // return data;
    throw new Error('Payment initiation endpoint is not yet implemented by the backend team.');
  },
};
