# Paystack Integration Guide — Vibe-Connect

Vibe-Connect uses **Paystack** as its secure payment processing partner for event ticket sales in Kenya (KES) and regional currencies. Paystack supports Credit/Debit Cards (Visa, Mastercard), Mobile Money (M-Pesa via Paystack), and direct bank transfers.

---

## 1. Prerequisites & Test Account Setup

1. Sign up or log in to the **[Paystack Dashboard](https://dashboard.paystack.com)**.
2. Ensure your account is in **Test Mode** (toggle at top of the Paystack dashboard).
3. Navigate to **Settings > API Keys & Webhooks** (`https://dashboard.paystack.com/#/settings/developer`).
4. Note your test keys:
   - **Secret Key:** `sk_test_...`
   - **Public Key:** `pk_test_...`

> [!WARNING]
> Never expose `PAYSTACK_SECRET_KEY` to the frontend or commit real API keys into git.

---

## 2. Environment Variables Configuration

### Local Development (`BACKEND/.env`)
```env
# Paystack Payment Gateway
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
PAYSTACK_CALLBACK_URL=http://localhost:5173/checkout/verify
```

### Production Deployment (Render Backend Service)
In your Render Dashboard for `vibe-connect-api`:
1. Go to **Environment**.
2. Add or update the following environment variables:
   - `PAYSTACK_SECRET_KEY`: Your live secret key (`sk_live_...`) or test secret key (`sk_test_...`).
   - `PAYSTACK_PUBLIC_KEY`: Your corresponding public key (`pk_live_...` or `pk_test_...`).
   - `PAYSTACK_CALLBACK_URL`: `https://vibe-connect-ticketing-platform.vercel.app/checkout/verify` (or custom domain).

---

## 3. Webhook Setup (Crucial for Ticket Issuance)

Paystack sends webhook events whenever a customer completes a charge. Vibe-Connect validates webhook requests using HMAC SHA512 signature verification.

1. In the Paystack Dashboard, navigate to **Settings > API Keys & Webhooks**.
2. Under **Live Webhook URL** (or **Test Webhook URL**), set:
   ```text
   https://vibe-connect-ticketing-platform.onrender.com/api/payments/webhook
   ```
3. When local testing with webhooks:
   - Use a tunnel like ngrok / localtunnel: `https://<tunnel-id>.ngrok.io/api/payments/webhook`
   - Paystack will automatically sign each event using your secret key in the `x-paystack-signature` HTTP header.

---

## 4. Payment Flow & Safety Architecture

1. **Reservation & Idempotency:**
   - A buyer creates an order with reserved tickets (15-minute lock).
   - Calling `POST /api/orders/:id/pay` (or `POST /api/payments/initialize`) creates a `PENDING` payment with a unique reference `VC-<orderId>-<timestamp>` and requests an authorization URL from Paystack.
2. **Payment Execution:**
   - Buyer completes payment on Paystack's hosted checkout (Cards or Mobile Money).
3. **Verification & Ticket Generation:**
   - On payment completion, Paystack triggers the webhook `POST /api/payments/webhook` and redirects the buyer to `PAYSTACK_CALLBACK_URL`.
   - Vibe-Connect verifies the payment via HMAC SHA512 signature or via `GET /api/payments/verify/:reference` against Paystack's verify API (`/transaction/verify/:reference`).
   - The order status is transitioned to `PAID`.
   - `TicketsService.issueTicketsForPaidOrder()` generates cryptographically signed QR tickets with unique serial numbers within a serializable database transaction.
   - Any duplicate callbacks or verification calls are idempotent and will not re-issue tickets or double-charge.
