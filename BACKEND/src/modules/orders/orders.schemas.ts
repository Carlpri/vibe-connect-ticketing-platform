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

export const createOrderItemSchema = z.object({
  ticketTypeId: z.string().uuid('Invalid ticket type ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const createOrderSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  items: z.array(createOrderItemSchema).min(1, 'Order must contain at least one item'),
}).superRefine((order, context) => {
  const ticketTypeIds = order.items.map((item) => item.ticketTypeId);
  if (new Set(ticketTypeIds).size !== ticketTypeIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['items'],
      message: 'Each ticket type may only appear once in an order',
    });
  }
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

const callbackMetadataSchema = z.object({
  Item: z.array(z.object({
    Name: z.string(),
    Value: z.union([z.string(), z.number()]).optional(),
  }).passthrough()),
}).passthrough().optional();

export const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string().min(1),
      CheckoutRequestID: z.string().min(1),
      ResultCode: z.number().int(),
      ResultDesc: z.string(),
      CallbackMetadata: callbackMetadataSchema,
    }).passthrough(),
  }).passthrough(),
}).passthrough();

export const checkinTicketSchema = z.object({
  qrCode: z.string().min(5, 'QR Code is required'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type MpesaCallbackInput = z.infer<typeof mpesaCallbackSchema>;
export type CheckinTicketInput = z.infer<typeof checkinTicketSchema>;
