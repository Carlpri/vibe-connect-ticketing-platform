// ============================================================
// VIBE-CONNECT Frontend Types
// Derived from actual backend contracts — do not invent fields.
// ============================================================

// ----------------------------------------------------------
// Auth / User  (mirrors AuthService response shapes)
// ----------------------------------------------------------

export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
export type OrganizerApplicationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  organizerApplicationStatus: OrganizerApplicationStatus;
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
  redirectUrl?: string;
}

export interface ResendVerificationEmailResponse {
  sent: boolean;
  message: string;
  verificationUrl?: string;
}


/** POST /api/auth/send-phone-otp — request body (authenticated) */
export interface SendPhoneOtpInput {
  phone?: string;
}

/** POST /api/auth/verify-phone — request body (authenticated) */
export interface VerifyPhoneInput {
  code: string; // 6-digit numeric OTP
}

export interface OrganizerApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
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

export interface EventFlyer {
  id: string;
  eventId: string;
  url: string;
  order: number;
  createdAt: string;
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
  placeId?: string;
  directions?: string;
  onlineUrl?: string;
  startsAt: string;
  endsAt?: string;
  status: EventStatus;
  organizerId: string;
  organizerName?: string;
  ticketTypes: TicketType[];
  flyers?: EventFlyer[];
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
  placeId?: string;
  directions?: string;
  onlineUrl?: string;
  ticketTypes: CreateTicketTypeInput[];
  flyers?: Array<{ url: string; order: number }>;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {}

// ----------------------------------------------------------
// Orders and booking API
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
  subtotalKes?: number;
  discountKes?: number;
  serviceFeeKes?: number;
  promoCodeId?: string;
  promoCodeSnapshot?: string;
  discountTypeSnapshot?: string;
  discountValueSnapshot?: number;
  influencerSnapshot?: string;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
  items: OrderItem[];
  payments?: Array<{
    status: PaymentStatus;
    resultDesc?: string | null;
  }>;
}

/** POST /api/orders — request body */
export interface CreateOrderInput {
  eventId: string;
  items: Array<{ ticketTypeId: string; quantity: number }>;
  promoCode?: string;
}

// ----------------------------------------------------------
// Promo Codes & Discounts
// ----------------------------------------------------------

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface PromoCode {
  id: string;
  code: string;
  eventId?: string | null;
  createdByUserId: string;
  influencerName?: string | null;
  influencerEmail?: string | null;
  discountType: DiscountType;
  discountValue: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  currentUses: number;
  minOrderKes?: number | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  event?: { id: string; title: string; slug?: string } | null;
  stats?: {
    totalUsages: number;
    paidOrdersCount: number;
    totalDiscountGivenKes: number;
    grossSalesGeneratedKes: number;
    netRevenueAfterDiscountKes: number;
  };
}

export interface ValidatePromoCodeResponse {
  valid: boolean;
  promoCodeId: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  influencerName?: string | null;
  discountKes: number;
  subtotalKes: number;
  netSubtotalKes: number;
  message: string;
}

export interface InfluencerAttributionItem {
  id: string;
  code: string;
  influencerName: string;
  influencerEmail?: string | null;
  eventTitle: string;
  eventId?: string | null;
  discountType: DiscountType;
  discountValue: number;
  isActive: boolean;
  currentUses: number;
  paidOrdersCount: number;
  totalTicketsSold: number;
  totalGrossSalesKes: number;
  totalDiscountGivenKes: number;
  netRevenueGeneratedKes: number;
}

// ----------------------------------------------------------
// Platform Fee Configuration
// ----------------------------------------------------------

export interface PlatformConfig {
  id: string;
  serviceFeePercent: number;
  serviceFeeFixedKes: number;
  serviceFeePolicy: 'CUSTOMER_SURCHARGE' | 'ORGANIZER_ABSORBS';
  updatedAt: string;
  updatedByUserId?: string | null;
}

// ----------------------------------------------------------
// Analytics & Dashboards
// ----------------------------------------------------------

export interface OrganizerPerformanceEvent {
  id: string;
  title: string;
  slug?: string;
  status: EventStatus;
  format?: EventFormat;
  city?: string;
  startsAt: string;
  capacity: number;
  sold: number;
  remaining: number;
  soldPercentage: number;
  isSoldOut: boolean;
  grossRevenueKes?: number;
}

export interface OrganizerRecentOrder {
  id: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  status: OrderStatus;
  subtotalKes: number;
  discountKes: number;
  serviceFeeKes: number;
  totalKes: number;
  promoCode?: string | null;
  ticketsCount: number;
  items: Array<{ ticketTypeId: string; quantity: number; unitPriceKes: number }>;
  createdAt: string;
  paymentReference?: string | null;
}

export interface OrganizerDashboardData {
  metrics: {
    totalEvents: number;
    publishedEvents: number;
    soldOutEventsCount: number;
    totalCapacity: number;
    totalTicketsSold: number;
    remainingTickets: number;
    soldPercentage: number;
    grossTicketSalesKes: number;
    totalDiscountsKes: number;
    totalServiceFeesKes: number;
    netOrganizerRevenueKes: number;
    totalPaidOrders: number;
  };
  events: OrganizerPerformanceEvent[];
  recentOrders: OrganizerRecentOrder[];
  salesTrend: Array<{ date: string; grossKes: number; ordersCount: number }>;
}

export interface AdminDashboardData {
  kpis: {
    totalUsers: number;
    totalOrganizers: number;
    totalEvents: number;
    publishedEvents: number;
    totalTicketsSold: number;
    totalPlatformCapacity: number;
    paidOrdersCount: number;
    grossSalesKes: number;
    platformServiceFeesKes: number;
    totalDiscountsKes: number;
    totalPaidKes: number;
  };
  recentUsers: Array<{ id: string; name: string; email: string; role: string; createdAt: string }>;
  recentEvents: Array<{ id: string; title: string; city?: string; status: string; startsAt: string; organizer?: { name: string } }>;
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
