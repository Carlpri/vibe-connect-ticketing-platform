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
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import { formatKes } from '../../utils/format';
import { colors } from '../../styles/theme';
import { useEffect, useState } from 'react';
import { bookingService } from '../../services/bookingService';

interface MpesaModalProps {
  open: boolean;
  onClose: () => void;
  amountKes: number;
  orderId?: string;
  initialPhone?: string;
  onPaymentSuccess: () => void;
}

export default function MpesaModal({
  open,
  onClose,
  amountKes,
  orderId,
  initialPhone = '',
  onPaymentSuccess,
}: MpesaModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [status, setStatus] = useState<'INPUT' | 'STARTING' | 'PENDING' | 'PAID' | 'FAILED'>('INPUT');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialPhone) setPhoneNumber(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    if (!open || status !== 'PENDING' || !orderId) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await bookingService.getOrderById(orderId);
        if (!active) return;
        if (response.data.status === 'PAID') {
          setStatus('PAID');
          setMessage('Payment verified. Your tickets are ready.');
          return;
        }
        if (response.data.status === 'FAILED' || response.data.status === 'CANCELLED') {
          setStatus('FAILED');
          setMessage('M-Pesa payment was not completed. You can try again or create a new reservation.');
          return;
        }
        if (response.data.payments?.[0]?.status === 'FAILED') {
          setStatus('FAILED');
          setMessage(response.data.payments[0].resultDesc || 'M-Pesa payment was not completed. Try again.');
          return;
        }
      } catch {
        if (!active) return;
        setMessage('Could not refresh payment status. You can check again shortly.');
      }

      attempts += 1;
      if (attempts < 30) {
        timer = setTimeout(poll, 4000);
      } else {
        setMessage('Payment is still pending. Check your phone, or check the status again.');
      }
    };

    timer = setTimeout(poll, 3000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, status, orderId]);

  const handleStartPayment = async () => {
    if (!orderId) {
      setStatus('FAILED');
      setMessage('Create a reservation before starting payment.');
      return;
    }
    setStatus('STARTING');
    setMessage(null);
    try {
      const response = await bookingService.initiatePayment(orderId, { phoneNumber });
      setStatus(response.data.status === 'SUCCESS' ? 'PAID' : 'PENDING');
      setMessage(response.data.message);
    } catch (error: any) {
      setStatus('FAILED');
      setMessage(error?.response?.data?.message || 'Could not start M-Pesa payment. Please try again.');
    }
  };

  const handleClose = () => {
    setStatus('INPUT');
    setMessage(null);
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
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            p: 3,
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: colors.mpesa,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
              }}
            >
              <PhoneIphoneIcon />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  color: colors.inkFg,
                }}
              >
                {status === 'PAID' ? 'Payment verified' : 'M-Pesa payment'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.65)' }}>
                {status === 'PENDING' || status === 'STARTING'
                  ? 'Awaiting secure provider confirmation'
                  : 'Daraja STK Push'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: '8px',
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.6)', textTransform: 'uppercase', fontWeight: 700 }}>
              Reservation total
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: '1.8rem',
                color: colors.mpesa,
              }}
            >
              {formatKes(amountKes)}
            </Typography>
            {orderId && (
              <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.65)', overflowWrap: 'anywhere' }}>
                Reservation ID: {orderId}
              </Typography>
            )}
          </Box>

          {status === 'INPUT' || status === 'STARTING' || status === 'FAILED' ? (
            <>
              <TextField
                label="M-Pesa phone number"
                placeholder="0712 345 678"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                fullWidth
                size="small"
                sx={{ bgcolor: '#FEFDFB', borderRadius: '8px' }}
              />
              {message && <Alert severity="error">{message}</Alert>}
              <Button
                variant="contained"
                fullWidth
                disabled={status === 'STARTING' || !phoneNumber.trim()}
                onClick={handleStartPayment}
                sx={{
                  py: 1.4,
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  '&:hover': { bgcolor: colors.limeLt },
                }}
              >
                {status === 'STARTING' ? <CircularProgress size={22} /> : 'Send M-Pesa prompt'}
              </Button>
            </>
          ) : status === 'PENDING' ? (
            <>
              <Alert severity="info">
                {message || 'Check your phone and approve the payment request. Tickets are issued only after Daraja confirms payment.'}
              </Alert>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <CircularProgress sx={{ color: colors.mpesa }} />
              </Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={async () => {
                  if (!orderId) return;
                  try {
                    const response = await bookingService.getOrderById(orderId);
                    if (response.data.status === 'PAID') {
                      setStatus('PAID');
                      setMessage('Payment verified. Your tickets are ready.');
                    } else if (response.data.payments?.[0]?.status === 'FAILED') {
                      setStatus('FAILED');
                      setMessage(response.data.payments[0].resultDesc || 'M-Pesa payment was not completed. Try again.');
                    }
                  } catch {
                    setMessage('Could not refresh payment status. Please try again.');
                  }
                }}
              >
                Check payment status
              </Button>
            </>
          ) : (
            <>
              <Alert severity="success">{message}</Alert>
              <Button
                variant="contained"
                fullWidth
                onClick={onPaymentSuccess}
                sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 800 }}
              >
                View my tickets
              </Button>
            </>
          )}

          <Button
            variant="text"
            fullWidth
            onClick={handleClose}
            sx={{ color: colors.inkFg }}
          >
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
