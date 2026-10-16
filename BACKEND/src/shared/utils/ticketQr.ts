import crypto from 'crypto';
import { env } from '../../config/env';
import { timingSafeMatch } from './crypto';

const QR_PREFIX = 'VC1';

function ticketQrSecret(): string {
  return env.TICKET_QR_SECRET || env.JWT_SECRET;
}

/** HMAC signature embedded in the QR payload (forgery-resistant without storing secrets per ticket). */
export function signTicketId(ticketId: string): string {
  return crypto
    .createHmac('sha256', ticketQrSecret())
    .update(ticketId)
    .digest('base64url')
    .slice(0, 22);
}

/** Payload scanned at the gate: VC1:{ticketUuid}:{signature} */
export function buildTicketQrPayload(ticketId: string): string {
  return `${QR_PREFIX}:${ticketId}:${signTicketId(ticketId)}`;
}

/** Returns ticket UUID when payload is authentic, otherwise null. */
export function parseAndVerifyTicketQrPayload(payload: string): string | null {
  const trimmed = payload.trim();
  const parts = trimmed.split(':');
  if (parts.length !== 3 || parts[0] !== QR_PREFIX) {
    return null;
  }
  const ticketId = parts[1];
  const signature = parts[2];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(ticketId)) {
    return null;
  }
  if (!timingSafeMatch(signature, signTicketId(ticketId))) {
    return null;
  }
  return ticketId;
}
