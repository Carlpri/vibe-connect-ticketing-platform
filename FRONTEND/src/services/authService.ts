import apiClient from './api';
import type {
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  MeResponse,
  VerifyEmailInput,
  ResendVerificationEmailInput,
  ResendVerificationEmailResponse,
  SendPhoneOtpInput,
  VerifyPhoneInput,
  OrganizerApplication,
  User,
  ApiSuccessResponse,
} from '../types';

/**
 * Auth service — wraps all verified /api/auth endpoints.
 *
 * Verified backend endpoints:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   GET  /api/auth/me          (requires Bearer token)
 *   POST /api/auth/verify-email
 *   POST /api/auth/resend-verification-email
 *   POST /api/auth/send-phone-otp   (requires Bearer token)
 *   POST /api/auth/verify-phone     (requires Bearer token)
 */

export const authService = {
  async register(input: RegisterInput): Promise<ApiSuccessResponse<RegisterResponse>> {
    const { data } = await apiClient.post<ApiSuccessResponse<RegisterResponse>>(
      '/auth/register',
      input
    );
    return data;
  },

  async login(input: LoginInput): Promise<ApiSuccessResponse<LoginResponse>> {
    const { data } = await apiClient.post<ApiSuccessResponse<LoginResponse>>(
      '/auth/login',
      input
    );
    return data;
  },

  async getMe(): Promise<ApiSuccessResponse<MeResponse>> {
    const { data } = await apiClient.get<ApiSuccessResponse<MeResponse>>('/auth/me');
    return data;
  },

  async getOrganizerApplications(): Promise<ApiSuccessResponse<OrganizerApplication[]>> {
    const { data } = await apiClient.get<ApiSuccessResponse<OrganizerApplication[]>>('/auth/organizer-requests');
    return data;
  },

  async approveOrganizerApplication(userId: string): Promise<ApiSuccessResponse<User>> {
    const { data } = await apiClient.post<ApiSuccessResponse<User>>(`/auth/organizer-requests/${userId}/approve`);
    return data;
  },

  async rejectOrganizerApplication(userId: string): Promise<ApiSuccessResponse<User>> {
    const { data } = await apiClient.post<ApiSuccessResponse<User>>(`/auth/organizer-requests/${userId}/reject`);
    return data;
  },

  async verifyMpesaSandbox(): Promise<ApiSuccessResponse<{ authenticated: boolean }>> {
    const { data } = await apiClient.post<ApiSuccessResponse<{ authenticated: boolean }>>(
      '/payments/mpesa/sandbox/diagnostics'
    );
    return data;
  },

  async verifyEmail(input: VerifyEmailInput): Promise<ApiSuccessResponse<{ emailVerified: boolean; email: string }>> {
    const { data } = await apiClient.post('/auth/verify-email', input);
    return data;
  },

  async resendVerificationEmail(
    input: ResendVerificationEmailInput
  ): Promise<ApiSuccessResponse<ResendVerificationEmailResponse>> {
    const { data } = await apiClient.post('/auth/resend-verification-email', input);
    return data;
  },

  async sendPhoneOtp(
    input: SendPhoneOtpInput
  ): Promise<ApiSuccessResponse<{ phone: string; expiresInMinutes: number }>> {
    const { data } = await apiClient.post('/auth/send-phone-otp', input);
    return data;
  },

  async verifyPhone(
    input: VerifyPhoneInput
  ): Promise<ApiSuccessResponse<{ phoneVerified: boolean; phone: string }>> {
    const { data } = await apiClient.post('/auth/verify-phone', input);
    return data;
  },
};
