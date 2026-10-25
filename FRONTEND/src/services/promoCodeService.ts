import apiClient from './api';
import type {
  PromoCode,
  ValidatePromoCodeResponse,
  InfluencerAttributionItem,
  ApiSuccessResponse,
  DiscountType,
} from '../types';

export interface CreatePromoCodeData {
  code: string;
  eventId?: string | null;
  influencerName?: string | null;
  influencerEmail?: string | null;
  discountType: DiscountType;
  discountValue: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  minOrderKes?: number | null;
  isActive?: boolean;
  notes?: string | null;
}

export const promoCodeService = {
  /**
   * Validate promo code at checkout
   */
  async validatePromoCode(
    code: string,
    eventId: string,
    subtotalKes: number
  ): Promise<ApiSuccessResponse<ValidatePromoCodeResponse>> {
    const res = await apiClient.post<ApiSuccessResponse<ValidatePromoCodeResponse>>(
      '/promo-codes/validate',
      { code, eventId, subtotalKes }
    );
    return res.data;
  },

  /**
   * List promo codes for organizer or admin
   */
  async listPromoCodes(params?: {
    eventId?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiSuccessResponse<{ items: PromoCode[]; pagination: any }>> {
    const res = await apiClient.get<ApiSuccessResponse<{ items: PromoCode[]; pagination: any }>>(
      '/promo-codes',
      { params }
    );
    return res.data;
  },

  /**
   * Create a new promo code
   */
  async createPromoCode(data: CreatePromoCodeData): Promise<ApiSuccessResponse<PromoCode>> {
    const res = await apiClient.post<ApiSuccessResponse<PromoCode>>('/promo-codes', data);
    return res.data;
  },

  /**
   * Update promo code
   */
  async updatePromoCode(
    id: string,
    data: Partial<CreatePromoCodeData>
  ): Promise<ApiSuccessResponse<PromoCode>> {
    const res = await apiClient.patch<ApiSuccessResponse<PromoCode>>(`/promo-codes/${id}`, data);
    return res.data;
  },

  /**
   * Delete / deactivate promo code
   */
  async deletePromoCode(id: string): Promise<ApiSuccessResponse<void>> {
    const res = await apiClient.delete<ApiSuccessResponse<void>>(`/promo-codes/${id}`);
    return res.data;
  },

  /**
   * Influencer attribution report
   */
  async getInfluencerAttribution(
    eventId?: string
  ): Promise<ApiSuccessResponse<InfluencerAttributionItem[]>> {
    const res = await apiClient.get<ApiSuccessResponse<InfluencerAttributionItem[]>>(
      '/promo-codes/influencers/attribution',
      { params: eventId ? { eventId } : undefined }
    );
    return res.data;
  },
};
