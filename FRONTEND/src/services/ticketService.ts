import apiClient from './api';
import type { ApiSuccessResponse } from '../types';

export interface DigitalTicketPass {
  id: string;
  orderId: string;
  serialNumber: number;
  status: 'ISSUED' | 'CHECKED_IN' | 'VOID';
  checkedInAt: string | null;
  ticketType: { id: string; name: string; priceKes: number };
  event: {
    id: string;
    title: string;
    slug: string;
    startsAt: string;
    venue: string;
    city: string;
    coverImage: string | null;
  };
  paidAt: string | null;
  paymentRef: string | null;
  attendeePhone: string | null;
  holderName: string;
  holderEmail: string;
  qrPayload: string | null;
}

export interface MyTicketsPayload {
  verificationRequired: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  tickets: DigitalTicketPass[];
}

export const ticketService = {
  async getMyTickets(): Promise<ApiSuccessResponse<MyTicketsPayload>> {
    const { data } = await apiClient.get<ApiSuccessResponse<MyTicketsPayload>>('/tickets/my');
    return data;
  },

  async scanTicket(qrCode: string): Promise<ApiSuccessResponse<unknown>> {
    const { data } = await apiClient.post<ApiSuccessResponse<unknown>>('/tickets/scan', { qrCode });
    return data;
  },
};
