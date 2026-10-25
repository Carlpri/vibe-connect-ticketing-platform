import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatKes } from '../../utils/format';
import { colors } from '../../styles/theme';
import { useEffect, useState } from 'react';
import { bookingService } from '../../services/bookingService';

export interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amountKes: number;
  orderId?: string;
  initialEmail?: string;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({
  open,
  onClose,
  amountKes,
  orderId,
  initialEmail = '',
  onPaymentSuccess,
}: PaymentModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<'INPUT' | 'INITIALIZING' | 'AWAITING_PAYMENT' | 'VERIFYING' | 'PAID' | 'FAILED'>('INPUT');
  const [message, setMessage] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  // Poll or check order status when awaiting payment
  useEffect(() => {
    if (!open || status !== 'AWAITING_PAYMENT' || !orderId) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await bookingService.getOrderById(orderId);
        if (!active) return;
        if (response.data.status === 'PAID') {
          setStatus('PAID');
          setMessage('Payment successfully verified. Your tickets have been issued!');
          return;
        }
        if (response.data.status === 'FAILED' || response.data.status === 'CANCELLED') {
          setStatus('FAILED');
          setMessage('Payment was not completed. You can try again or create a new reservation.');
          return;
        }
      } catch {
        // Soft fail on polling error
      }

      attempts += 1;
      if (attempts < 25) {
        timer = setTimeout(poll, 4000);
      }
    };

    timer = setTimeout(poll, 4000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, status, orderId]);

  const handleInitializePayment = async () => {
    if (!orderId) {
      setStatus('FAILED');
      setMessage('A valid reservation is required before initializing payment.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setMessage('Please enter a valid email address for receipt and payment notification.');
      return;
    }

    setStatus('INITIALIZING');
    setMessage(null);

    try {
      const response = await bookingService.initiatePayment(orderId, {
        email: email.trim(),
        callbackUrl: window.location.origin + '/checkout/verify',
      });

      const { authorizationUrl: url, reference } = response.data;
      setAuthorizationUrl(url);
      setPaymentReference(reference);
      setStatus('AWAITING_PAYMENT');
      setMessage('Payment session created. Complete your checkout securely with Paystack.');

      // Automatically open authorization URL in a new tab if available
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error: any) {
      setStatus('FAILED');
      setMessage(
        error?.response?.data?.message ||
          'Could not initialize Paystack payment. Ensure payment gateway credentials are configured.'
      );
    }
  };

  const handleManualVerify = async () => {
    if (!paymentReference && !orderId) return;

    setStatus('VERIFYING');
    setMessage(null);

    try {
      if (paymentReference) {
        const verifyRes = await bookingService.verifyPayment(paymentReference);
        if (verifyRes.data.status === 'SUCCESS') {
          setStatus('PAID');
          setMessage('Payment verified successfully! Your tickets are ready.');
          return;
        }
      }

      if (orderId) {
        const orderRes = await bookingService.getOrderById(orderId);
        if (orderRes.data.status === 'PAID') {
          setStatus('PAID');
          setMessage('Payment verified! Your tickets are ready.');
          return;
        }
      }

      setStatus('AWAITING_PAYMENT');
      setMessage('Payment confirmation is still pending from provider. Complete payment in the checkout window or check back shortly.');
    } catch (error: any) {
      setStatus('AWAITING_PAYMENT');
      setMessage(error?.response?.data?.message || 'Could not verify payment yet. Please try again.');
    }
  };

  const handleClose = () => {
    setStatus('INPUT');
    setMessage(null);
    setAuthorizationUrl(null);
    setPaymentReference(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: colors.ink,
            color: colors.inkFg,
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            p: 3,
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'rgba(51, 199, 89, 0.15)',
                border: '1px solid rgba(51, 199, 89, 0.3)',
                display: 'grid',
                placeItems: 'center',
                color: colors.lime,
              }}
            >
              {status === 'PAID' ? <CheckCircleIcon /> : <LockIcon sx={{ fontSize: 20 }} />}
            </Box>
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  color: colors.inkFg,
                  letterSpacing: '0.02em',
                }}
              >
                {status === 'PAID' ? 'Payment Verified' : 'Secure Checkout'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.65)' }}>
                Powered by Paystack (Card, Mobile Money, M-Pesa)
              </Typography>
            </Box>
          </Box>

          {/* Amount Summary */}
          <Box
            sx={{
              p: 2,
              borderRadius: '8px',
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.6)', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Due
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: '1.8rem',
                color: colors.lime,
              }}
            >
              {formatKes(amountKes)}
            </Typography>
            {orderId && (
              <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.65)', overflowWrap: 'anywhere', display: 'block', mt: 0.5 }}>
                Order #{orderId.slice(0, 8)}…
              </Typography>
            )}
          </Box>

          {/* Notification Alert */}
          {message && (
            <Alert
              severity={status === 'PAID' ? 'success' : status === 'FAILED' ? 'error' : 'info'}
              sx={{ borderRadius: '8px' }}
            >
              {message}
            </Alert>
          )}

          {/* Modal State Body */}
          {status === 'INPUT' || status === 'INITIALIZING' || status === 'FAILED' ? (
            <>
              <TextField
                label="Customer Email (for receipt)"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                size="small"
                sx={{ bgcolor: '#FEFDFB', borderRadius: '8px' }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(250, 247, 242, 0.7)' }}>
                <CreditCardIcon sx={{ fontSize: 18 }} />
                <Typography variant="caption">
                  Accepts Visa, Mastercard, and Mobile Money via Paystack
                </Typography>
              </Box>

              <Button
                variant="contained"
                fullWidth
                disabled={status === 'INITIALIZING' || !email.trim()}
                onClick={handleInitializePayment}
                sx={{
                  py: 1.4,
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  '&:hover': { bgcolor: colors.limeLt },
                }}
              >
                {status === 'INITIALIZING' ? <CircularProgress size={22} sx={{ color: colors.limeFg }} /> : 'Proceed to Paystack'}
              </Button>
            </>
          ) : status === 'AWAITING_PAYMENT' || status === 'VERIFYING' ? (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, gap: 1.5 }}>
                <CircularProgress sx={{ color: colors.lime }} />
                <Typography variant="body2" sx={{ color: 'rgba(250, 247, 242, 0.8)', textAlign: 'center' }}>
                  Awaiting confirmation from Paystack…
                </Typography>
              </Box>

              {authorizationUrl && (
                <Button
                  variant="outlined"
                  fullWidth
                  component="a"
                  href={authorizationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<OpenInNewIcon />}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: colors.inkFg,
                    '&:hover': { borderColor: colors.lime, color: colors.lime },
                  }}
                >
                  Open Paystack Checkout
                </Button>
              )}

              <Button
                variant="contained"
                fullWidth
                disabled={status === 'VERIFYING'}
                onClick={handleManualVerify}
                startIcon={<RefreshIcon />}
                sx={{
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  fontWeight: 800,
                  '&:hover': { bgcolor: colors.limeLt },
                }}
              >
                {status === 'VERIFYING' ? 'Verifying…' : 'I have completed payment'}
              </Button>
            </>
          ) : (
            /* PAID status */
            <Button
              variant="contained"
              fullWidth
              onClick={onPaymentSuccess}
              sx={{
                py: 1.4,
                bgcolor: colors.lime,
                color: colors.limeFg,
                fontWeight: 800,
                textTransform: 'uppercase',
                '&:hover': { bgcolor: colors.limeLt },
              }}
            >
              View My Tickets
            </Button>
          )}

          <Button
            variant="text"
            fullWidth
            onClick={handleClose}
            sx={{ color: 'rgba(250, 247, 242, 0.65)', '&:hover': { color: colors.inkFg } }}
          >
            {status === 'PAID' ? 'Done' : 'Cancel'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
