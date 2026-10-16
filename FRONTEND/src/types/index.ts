// ============================================================
// VIBE-CONNECT Frontend Types
// Derived from actual backend contracts — do not invent fields.
// ============================================================

// ----------------------------------------------------------
// Auth / User  (mirrors AuthService response shapes)
// ----------------------------------------------------------

export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

/** POST /api/auth/register — request body (matches registerSchema) */
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'ATTENDEE' | 'ORGANIZER';
}

/** POST /api/auth/login — request body (matches loginSchema) */
export interface LoginInput {
  email: string;
  password: string;
}

/** POST /api/auth/register — response data */
export interface RegisterResponse {
  user: User;
  token: string;
  verificationEmailSent: boolean;
  verificationUrl?: string;
}

export interface ResendVerificationEmailResponse {
  sent: boolean;
  message: string;
  verificationUrl?: string;
}

/** POST /api/auth/login — response data */
export interface LoginResponse {
  user: User;
  token: string;
}

/** GET /api/auth/me — response data */
export type MeResponse = User;

/** POST /api/auth/verify-email — request body */
export interface VerifyEmailInput {
  token: string;
}

/** POST /api/auth/resend-verification-email — request body */
export interface ResendVerificationEmailInput {
  email: string;
}

/** POST /api/auth/send-phone-otp — request body (authenticated) */
export interface SendPhoneOtpInput {
  phone?: string;
}

/** POST /api/auth/verify-phone — request body (authenticated) */
export interface VerifyPhoneInput {
  code: string; // 6-digit numeric OTP
}

// ----------------------------------------------------------
// Events (mirrors backend EventsService response shapes)
// ----------------------------------------------------------

export type EventFormat = 'PHYSICAL' | 'ONLINE' | 'HYBRID';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type EventCategory =
  | 'Music'
  | 'Parties'
  | 'Festivals'
  | 'Campus'
  | 'Comedy'
  | 'Sports'
  | 'Fashion'
  | 'Networking'
  | 'Other';

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  priceKes: number;
  capacity: number;
  available: number;
  eventId: string;
}

export interface Event {
  id: string;
  title: string;
  slug?: string;
  description: string;
  coverImage?: string;
  category: EventCategory | string;
  format?: EventFormat;
  venue: string;
  city: string;
  county?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  onlineUrl?: string;
  startsAt: string;
  endsAt?: string;
  status: EventStatus;
  organizerId: string;
  organizerName?: string;
  ticketTypes: TicketType[];
  createdAt: string;
}

/** Query params for GET /api/events */
export interface EventsQuery {
  search?: string;
  category?: string;
  city?: string;
  page?: number;
  limit?: number;
}

export interface CreateTicketTypeInput {
  name: string;
  description?: string;
  priceKes: number;
  capacity: number;
  salesStart?: string;
  salesEnd?: string;
  isActive?: boolean;
}

export interface CreateEventInput {
  title: string;
  slug?: string;
  description: string;
  category: string;
  coverImage?: string;
  format: EventFormat;
  status?: EventStatus;
  startsAt: string;
  endsAt: string;
  venue?: string;
  city?: string;
  county?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  onlineUrl?: string;
  ticketTypes: CreateTicketTypeInput[];
}

export interface UpdateEventInput extends Partial<CreateEventInput> {}

// ----------------------------------------------------------
// Orders (Freddy's domain — NOT YET IMPLEMENTED in backend)
// Types represent the INTENDED shape. Not verified endpoints.
// ----------------------------------------------------------

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface OrderItem {
  id: string;
  orderId: string;
  ticketTypeId: string;
  quantity: number;
  unitPriceKes: number;
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  status: OrderStatus;
  totalKes: number;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
  items: OrderItem[];
}

/** POST /api/orders — request body */
export interface CreateOrderInput {
  eventId: string;
  items: Array<{ ticketTypeId: string; quantity: number; unitPriceKes?: number }>;
}

/** POST /api/orders/:id/pay — request body */
export interface InitiatePaymentInput {
  phoneNumber: string; // Kenyan M-Pesa number
}

// ----------------------------------------------------------
// API response envelope (matches backend apiResponse.ts)
// ----------------------------------------------------------

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ----------------------------------------------------------
// Cart (frontend-only, never persisted without backend)
// ----------------------------------------------------------

export interface CartItem {
  ticketType: TicketType;
  quantity: number;
}

export interface Cart {
  event: Event;
  items: CartItem[];
}
