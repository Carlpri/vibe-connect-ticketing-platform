import { z } from 'zod';

/**
 * Kenyan phone number regex: accepts 07..., 01..., 2547..., 2541..., or +254...
 * Automatically transformed to standard 254XXXXXXXXX format matching DB CHECK constraint ^254[17][0-9]{8}$
 */
const kenyanPhoneRegex = /^(?:254|\+254|0)?([17][0-9]{8})$/;

export const normalizeKenyanPhone = (val: string): string => {
  const match = val.replace(/\s+/g, '').match(kenyanPhoneRegex);
  if (!match) return val;
  return `254${match[1]}`;
};

const ensureUuid = (val: string): string => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(val)) return val;
  const hex = Buffer.from(val).toString('hex').padStart(32, '0').slice(-32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

export const createOrderItemSchema = z.object({
  ticketTypeId: z.string().transform(ensureUuid),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPriceKes: z.number().int().nonnegative('Unit price cannot be negative').default(0),
});

export const createOrderSchema = z.object({
  eventId: z.string().transform(ensureUuid),
  items: z.array(createOrderItemSchema).min(1, 'Order must contain at least one item'),
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid('Invalid order ID format'),
});

export const initiatePaymentSchema = z.object({
  phoneNumber: z
    .string()
    .regex(kenyanPhoneRegex, 'Please provide a valid Kenyan phone number (e.g., 0712345678 or 254712345678)')
    .transform(normalizeKenyanPhone),
});

export const confirmPaymentSchema = z.object({
  checkoutRequestId: z.string().optional(),
  mpesaReceiptNumber: z.string().optional(),
});

export const checkinTicketSchema = z.object({
  qrCode: z.string().min(5, 'QR Code is required'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type CheckinTicketInput = z.infer<typeof checkinTicketSchema>;
