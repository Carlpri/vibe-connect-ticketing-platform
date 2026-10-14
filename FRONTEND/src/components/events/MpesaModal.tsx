import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { formatKes } from '../../utils/format';
import { colors } from '../../styles/theme';

interface MpesaModalProps {
  open: boolean;
  onClose: () => void;
  amountKes: number;
  initialPhone?: string;
  onPaymentSuccess: (details: { phone: string; transactionId: string }) => void;
}

export default function MpesaModal({
  open,
  onClose,
  amountKes,
  initialPhone = '',
  onPaymentSuccess,
}: MpesaModalProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [step, setStep] = useState<'INPUT' | 'PENDING' | 'SUCCESS'>('INPUT');
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === 'PENDING') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      } else {
        setStep('SUCCESS');
      }
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleStartStkPush = () => {
    if (!phone || phone.length < 9) return;
    setStep('PENDING');
    setCountdown(6);
  };

  const handleFinish = () => {
    const fakeTxId = 'QA' + Math.random().toString(36).substring(2, 8).toUpperCase() + '9X';
    onPaymentSuccess({ phone, transactionId: fakeTxId });
    onClose();
    setStep('INPUT');
  };

  return (
    <Dialog
      open={open}
      onClose={step === 'PENDING' ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: colors.ink,
            color: colors.inkFg,
            borderRadius: '8px',
            border: `1px solid rgba(255, 255, 255, 0.12)`,
            p: 3,
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {step === 'INPUT' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Header with M-Pesa green mark */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: colors.mpesa,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '1rem',
                  }}
                >
                  M
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      fontSize: '1.1rem',
                      letterSpacing: '-0.01em',
                      textTransform: 'uppercase',
                      color: colors.inkFg,
                    }}
                  >
                    LIPA NA M-PESA
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.65)' }}>
                    Instant STK Push Notification
                  </Typography>
                </Box>
              </Box>
              <Button onClick={onClose} sx={{ minWidth: 'auto', p: 0.5, color: 'rgba(250, 247, 242, 0.5)' }}>
                <CloseIcon fontSize="small" />
              </Button>
            </Box>

            {/* Total box */}
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.6)', textTransform: 'uppercase', fontWeight: 700 }}>
                AMOUNT TO PAY
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
            </Box>

            <Typography variant="body2" sx={{ color: 'rgba(250, 247, 242, 0.75)', lineHeight: 1.5 }}>
              Enter your Safaricom mobile number. An instant PIN prompt will appear on your screen.
            </Typography>

            <TextField
              label="M-Pesa Phone Number"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIphoneIcon sx={{ color: colors.mpesa }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                bgcolor: '#FEFDFB',
                borderRadius: '8px',
                '& .MuiOutlinedInput-root': { borderRadius: '8px' },
              }}
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleStartStkPush}
              disabled={!phone || phone.length < 9}
              sx={{
                py: 1.4,
                bgcolor: colors.lime,
                color: colors.limeFg,
                fontWeight: 800,
                fontSize: '0.92rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: '8px',
                '&:hover': { bgcolor: colors.limeLt },
              }}
            >
              Send M-Pesa Prompt
            </Button>
          </Box>
        )}

        {step === 'PENDING' && (
          <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={56} sx={{ color: colors.mpesa }} thickness={4} />

            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: '1.25rem',
                textTransform: 'uppercase',
                color: colors.inkFg,
              }}
            >
              CHECK YOUR PHONE
            </Typography>

            <Typography variant="body2" sx={{ color: 'rgba(250, 247, 242, 0.7)', maxWidth: 280, mx: 'auto' }}>
              We sent an M-Pesa prompt to <strong>{phone}</strong>. Enter your M-Pesa PIN to complete payment of <strong>{formatKes(amountKes)}</strong>.
            </Typography>

            <Box sx={{ mt: 2, display: 'flex', gap: 1.5, width: '100%' }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setStep('INPUT')}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: colors.inkFg,
                  borderRadius: '8px',
                  fontWeight: 700,
                }}
              >
                Cancel / Change
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setStep('SUCCESS')}
                sx={{
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  borderRadius: '8px',
                  fontWeight: 800,
                  '&:hover': { bgcolor: colors.limeLt },
                }}
              >
                Simulate Success
              </Button>
            </Box>
          </Box>
        )}

        {step === 'SUCCESS' && (
          <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: colors.mpesa }} />

            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: '1.35rem',
                textTransform: 'uppercase',
                color: colors.inkFg,
              }}
            >
              PAYMENT RECEIVED!
            </Typography>

            <Typography variant="body2" sx={{ color: 'rgba(250, 247, 242, 0.75)', maxWidth: 280, mx: 'auto' }}>
              Your M-Pesa transaction was confirmed. Your ticket has been generated with a verified QR code.
            </Typography>

            <Button
              variant="contained"
              fullWidth
              onClick={handleFinish}
              sx={{
                mt: 1,
                py: 1.4,
                bgcolor: colors.lime,
                color: colors.limeFg,
                borderRadius: '8px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                '&:hover': { bgcolor: colors.limeLt },
              }}
            >
              View My Ticket
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
