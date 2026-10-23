import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';

const API_BASE_URL =
  env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
const REQUEST_TIMEOUT_MS = 15_000;

type DarajaConfiguration = {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  transactionType: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
};

type StkPushResponse = {
  ResponseCode?: string;
  ResponseDescription?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  CustomerMessage?: string;
};

type StkQueryResponse = {
  ResponseCode?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export function getDarajaConfiguration(): DarajaConfiguration | null {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL } = env;
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY || !MPESA_CALLBACK_URL) {
    return null;
  }

  try {
    const callbackUrl = new URL(MPESA_CALLBACK_URL);
    if (callbackUrl.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  return {
    consumerKey: MPESA_CONSUMER_KEY,
    consumerSecret: MPESA_CONSUMER_SECRET,
    shortcode: MPESA_SHORTCODE,
    passkey: MPESA_PASSKEY,
    callbackUrl: MPESA_CALLBACK_URL,
    transactionType: env.MPESA_TRANSACTION_TYPE,
  };
}

export function formatDarajaTimestamp(date: Date): string {
  const values = new Map(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  return `${values.get('year')}${values.get('month')}${values.get('day')}${values.get('hour')}${values.get('minute')}${values.get('second')}`;
}

function requiredConfiguration(): DarajaConfiguration {
  const config = getDarajaConfiguration();
  if (!config) {
    throw new AppError('M-Pesa is not configured. Configure the Daraja backend environment variables and HTTPS callback URL.', 503);
  }
  return config;
}

async function getAccessToken(config: DarajaConfiguration): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token;
  }

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
  } catch {
    throw new AppError('Could not connect to the M-Pesa service', 502);
  }

  const body = await response.json().catch(() => null) as { access_token?: unknown; expires_in?: unknown } | null;
  if (!response.ok || typeof body?.access_token !== 'string') {
    throw new AppError('M-Pesa authentication failed. Check the Daraja application credentials.', 502);
  }

  const expiresIn = Number(body.expires_in);
  cachedAccessToken = {
    token: body.access_token,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? Math.max(0, expiresIn - 60) : 300) * 1000,
  };
  return cachedAccessToken.token;
}

async function postDaraja<T>(
  config: DarajaConfiguration,
  path: string,
  payload: Record<string, string | number>
): Promise<T> {
  const accessToken = await getAccessToken(config);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new AppError('Could not connect to the M-Pesa service', 502);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== 'object') {
    throw new AppError('M-Pesa rejected the request. Check the Daraja configuration and try again.', 502);
  }
  return body as T;
}

export class MpesaService {
  static isConfigured(): boolean {
    return getDarajaConfiguration() !== null;
  }

  static async initiateStkPush(input: {
    amountKes: number;
    orderId: string;
    phoneNumber: string;
  }): Promise<StkPushResponse> {
    const config = requiredConfiguration();
    const timestamp = formatDarajaTimestamp(new Date());
    const password = Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString('base64');
    const accountReference = `VC${input.orderId.replace(/-/g, '').slice(0, 10)}`;

    const response = await postDaraja<StkPushResponse>(config, '/mpesa/stkpush/v1/processrequest', {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: config.transactionType,
      Amount: input.amountKes,
      PartyA: input.phoneNumber,
      PartyB: config.shortcode,
      PhoneNumber: input.phoneNumber,
      CallBackURL: config.callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: 'Ticket purchase',
    });

    if (
      response.ResponseCode !== '0' ||
      typeof response.CheckoutRequestID !== 'string' ||
      typeof response.MerchantRequestID !== 'string'
    ) {
      throw new AppError('M-Pesa did not accept the payment request. Please check the number and try again.', 502);
    }

    return response;
  }

  static async queryStkPush(checkoutRequestId: string): Promise<StkQueryResponse> {
    const config = requiredConfiguration();
    const timestamp = formatDarajaTimestamp(new Date());
    const password = Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString('base64');

    return postDaraja<StkQueryResponse>(config, '/mpesa/stkpushquery/v1/query', {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    });
  }
}
