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

export type CheckInOutcome =
  | 'VALID'
  | 'ALREADY_USED'
  | 'EXPIRED'
  | 'INVALID'
  | 'PAYMENT_PENDING'
  | 'CANCELLED'
  | 'UNAUTHORIZED';

export interface CheckInResponseData {
  outcome: CheckInOutcome;
  valid: boolean;
  alreadyCheckedIn?: boolean;
  message: string;
  ticketId?: string;
  ticketCode?: string;
  serialNumber?: number;
  checkedInAt?: string;
  previousCheckInAt?: string | null;
  ticketType?: {
    id?: string;
    name: string;
    priceKes?: number;
  };
  event?: {
    id: string;
    title: string;
    startsAt: string;
    venue?: string | null;
    city?: string | null;
  };
  attendee?: {
    name: string;
    emailMasked?: string | null;
  };
}

export interface CheckInStatsData {
  event: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: string;
    venue?: string | null;
    city?: string | null;
  };
  counts: {
    total: number;
    checkedIn: number;
    remaining: number;
    percentage: number;
  };
  ticketTypes: Array<{
    id: string;
    name: string;
    sold: number;
    checkedIn: number;
    remaining: number;
  }>;
  recentScans: Array<{
    id: string;
    outcome: CheckInOutcome;
    ticketCode?: string | null;
    serialNumber?: number | null;
    ticketTypeName?: string | null;
    attendeeName?: string | null;
    attendeeEmailMasked?: string | null;
    scannedByName: string;
    notes?: string | null;
    scannedAt: string;
  }>;
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

  async checkIn(eventId: string, identifier: string): Promise<ApiSuccessResponse<CheckInResponseData>> {
    const { data } = await apiClient.post<ApiSuccessResponse<CheckInResponseData>>(
      `/events/${eventId}/check-in`,
      { identifier }
    );
    return data;
  },

  async getCheckInStats(eventId: string): Promise<ApiSuccessResponse<CheckInStatsData>> {
    const { data } = await apiClient.get<ApiSuccessResponse<CheckInStatsData>>(
      `/events/${eventId}/check-in/stats`
    );
    return data;
  },
};
