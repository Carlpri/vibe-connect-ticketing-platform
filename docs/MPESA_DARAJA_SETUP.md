# Daraja M-Pesa Express setup

The backend uses Daraja OAuth, STK Push, and STK Push Query. A payment is not marked paid and tickets are not issued unless a callback matches a stored request, amount, receipt and phone number, and Daraja's server-to-server query confirms the callback result.

## Sandbox setup

1. In the Daraja developer portal, create/select a **Sandbox** app with **M-Pesa Express (STK Push)** enabled.
2. Configure the sandbox shortcode and passkey shown in the Daraja test credentials.
3. Set the Daraja values in `BACKEND/.env` using [the environment template](../BACKEND/.env.example). Keep credentials server-side; never use a `VITE_` prefix or commit them.
4. Set `MPESA_CALLBACK_URL` to an externally reachable HTTPS URL ending in `/api/payments/mpesa/callback`. For local tests, use an HTTPS tunnel pointing to the backend; Daraja cannot call `localhost`.
5. Use the sandbox's provided test shortcode and supported test MSISDN. Sandbox transactions do not move real money.
6. Restart the backend, create an authenticated verified customer's order, and submit the Daraja-supported test MSISDN to trigger the STK prompt.

## Production

Do not set `MPESA_ENV=production` until Safaricom has approved the production app and provided its production shortcode, passkey, and credentials. Configure every `MPESA_*` value as a backend-only secret in Render, and set the callback URL to the deployed API HTTPS URL. Use a dedicated production credential set; do not reuse sandbox credentials.

## Backend variables

| Variable | Purpose |
| --- | --- |
| `MPESA_ENV` | `sandbox` (default) or `production` |
| `MPESA_CONSUMER_KEY` | Daraja app consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja app consumer secret |
| `MPESA_SHORTCODE` | Paybill or till shortcode |
| `MPESA_PASSKEY` | Daraja Lipa Na M-Pesa passkey |
| `MPESA_CALLBACK_URL` | Public HTTPS callback URL |
| `MPESA_TRANSACTION_TYPE` | `CustomerPayBillOnline` by default; choose `CustomerBuyGoodsOnline` only for a compatible till |

Never send credentials, access tokens, passkeys, or callback secrets to the frontend. Do not paste them in chat or source control.
