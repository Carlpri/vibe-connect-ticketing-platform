import { z } from 'zod';

export const scanTicketSchema = z.object({
  qrCode: z.string().min(8, 'QR code payload is required'),
});

export type ScanTicketInput = z.infer<typeof scanTicketSchema>;
