import { z } from 'zod';

export const scanTicketSchema = z.object({
  qrCode: z.string().min(1, 'QR code payload is required'),
});

export const checkInTicketSchema = z
  .object({
    identifier: z.string().optional(),
    qrCode: z.string().optional(),
  })
  .refine(
    (data) => Boolean((data.identifier && data.identifier.trim()) || (data.qrCode && data.qrCode.trim())),
    {
      message: 'Ticket identifier or QR code payload is required',
      path: ['identifier'],
    }
  );

export type ScanTicketInput = z.infer<typeof scanTicketSchema>;
export type CheckInTicketInput = z.infer<typeof checkInTicketSchema>;

