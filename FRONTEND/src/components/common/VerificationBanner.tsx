import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { colors } from '../../styles/theme';

interface VerificationBannerProps {
  sx?: any;
  compact?: boolean;
}

export default function VerificationBanner({ sx, compact: _compact = false }: VerificationBannerProps) {
  const { user, refreshUser } = useAuth();

  // Email verification state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Phone modal state
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'PHONE_INPUT' | 'OTP_INPUT'>('PHONE_INPUT');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user?.phone]);

  // Handle email cooldown timer
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  if (!user) return null;

  const emailVerified = Boolean(user.emailVerified);
  const phoneVerified = Boolean(user.phoneVerified);
  const isFullyVerified = emailVerified && phoneVerified;

  const handleSendVerificationEmail = async () => {
    if (!user.email || emailCooldown > 0) return;
    setSendingEmail(true);
    try {
      const returnUrl = window.location.pathname + window.location.search;
      const res = await authService.resendVerificationEmail({
        email: user.email,
        redirectUrl: returnUrl,
      });

      toast.success(res.message || `Verification link sent to ${user.email}! Please check your email.`);
      setEmailCooldown(60);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not send verification email. Please try again.';
      toast.error(msg);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError('Please enter a valid phone number (e.g. 0712345678 or +254712345678)');
      return;
    }
    setSendingOtp(true);
    setPhoneError(null);
    try {
      await authService.sendPhoneOtp({ phone: phoneNumber.trim() });
      toast.success('SMS verification code sent!');
      setStep('OTP_INPUT');
    } catch (err: any) {
      setPhoneError(err?.response?.data?.message || 'Failed to send SMS code. Check phone format.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      setPhoneError('Please enter the complete 6-digit code sent to your phone');
      return;
    }
    setVerifyingOtp(true);
    setPhoneError(null);
    try {
      await authService.verifyPhone({
        code: otpCode.trim(),
      });

      toast.success('Phone number verified successfully!');
      setPhoneModalOpen(false);
      setStep('PHONE_INPUT');
      setOtpCode('');
      await refreshUser();
    } catch (err: any) {
      setPhoneError(err?.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <Box sx={sx}>
      {isFullyVerified ? (
        <Alert
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{
            borderRadius: '8px',
            bgcolor: 'rgba(43, 184, 90, 0.08)',
            border: `1px solid ${colors.success}`,
            color: colors.fg,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Your account is fully verified.
            </Typography>
            <Chip size="small" icon={<CheckCircleIcon />} label="Email Verified" sx={{ bgcolor: 'rgba(43, 184, 90, 0.15)', color: colors.success, fontWeight: 800, height: 24 }} />
            <Chip size="small" icon={<CheckCircleIcon />} label="Phone Verified" sx={{ bgcolor: 'rgba(43, 184, 90, 0.15)', color: colors.success, fontWeight: 800, height: 24 }} />
          </Box>
        </Alert>
      ) : (
        <Alert
          severity="warning"
          icon={<VerifiedUserIcon />}
          sx={{
            borderRadius: '8px',
            bgcolor: '#FFFBF5',
            border: `1px solid ${colors.border}`,
            color: colors.fg,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.fg, mb: 0.2 }}>
                Account Verification Required
              </Typography>
              <Typography variant="body2" sx={{ color: colors.mutedFg }}>
                You need to verify your email and phone number to prevent fraud, make ticket reservations, and unlock entry QR codes.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {/* Email Status & Action */}
              {emailVerified ? (
                <Chip
                  size="small"
                  icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                  label="Email Verified"
                  sx={{ bgcolor: 'rgba(43, 184, 90, 0.15)', color: '#2B8A3E', fontWeight: 800 }}
                />
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={
                    sendingEmail ? <CircularProgress size={14} color="inherit" /> : <EmailIcon sx={{ fontSize: 16 }} />
                  }
                  onClick={handleSendVerificationEmail}
                  disabled={sendingEmail || emailCooldown > 0}
                  sx={{
                    bgcolor: colors.lime,
                    color: colors.limeFg,
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    '&:hover': { bgcolor: colors.limeLt },
                  }}
                >
                  {sendingEmail
                    ? 'Sending Link...'
                    : emailCooldown > 0
                    ? `Resend Email in ${emailCooldown}s`
                    : 'Verify Email'}
                </Button>
              )}

              {/* Phone Status & Action */}
              {phoneVerified ? (
                <Chip
                  size="small"
                  icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                  label="Phone Verified"
                  sx={{ bgcolor: 'rgba(43, 184, 90, 0.15)', color: '#2B8A3E', fontWeight: 800 }}
                />
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PhoneIphoneIcon sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    setPhoneModalOpen(true);
                    setStep(user.phone ? 'PHONE_INPUT' : 'PHONE_INPUT');
                    setPhoneError(null);
                  }}
                  sx={{
                    borderColor: colors.border,
                    color: colors.fg,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    bgcolor: '#fff',
                    '&:hover': { bgcolor: colors.mutedBg },
                  }}
                >
                  Verify Phone
                </Button>
              )}
            </Box>
          </Box>
        </Alert>
      )}

      {/* Phone OTP Verification Modal */}
      <Dialog
        open={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              p: 1,
              bgcolor: '#FEFDFB',
              border: `1px solid ${colors.border}`,
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: '1.15rem',
              textTransform: 'uppercase',
              color: colors.fg,
            }}
          >
            {step === 'PHONE_INPUT' ? 'Verify Phone Number' : 'Enter 6-Digit OTP'}
          </Typography>
          <IconButton size="small" onClick={() => setPhoneModalOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {step === 'PHONE_INPUT' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <Typography variant="body2" sx={{ color: colors.mutedFg }}>
                We will send a one-time SMS verification code to your Kenyan mobile number.
              </Typography>
              <TextField
                label="Mobile Phone Number"
                placeholder="e.g. 0712345678 or +254712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                fullWidth
                size="small"
                autoFocus
                disabled={sendingOtp}
              />
              {phoneError && <Alert severity="error" sx={{ py: 0.5, fontSize: '0.8rem' }}>{phoneError}</Alert>}
              <Button
                variant="contained"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                fullWidth
                sx={{
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  fontWeight: 800,
                  py: 1,
                  '&:hover': { bgcolor: colors.limeLt },
                }}
              >
                {sendingOtp ? <CircularProgress size={20} color="inherit" /> : 'Send Verification Code'}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <Typography variant="body2" sx={{ color: colors.mutedFg }}>
                Enter the 6-digit code sent via SMS to <strong>{phoneNumber}</strong>:
              </Typography>
              <TextField
                label="6-Digit Verification Code"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                fullWidth
                size="small"
                autoFocus
                slotProps={{
                  htmlInput: {
                    maxLength: 6,
                    style: { letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem', fontWeight: 800 },
                  },
                }}
                disabled={verifyingOtp}
              />
              {phoneError && <Alert severity="error" sx={{ py: 0.5, fontSize: '0.8rem' }}>{phoneError}</Alert>}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => setStep('PHONE_INPUT')}
                  disabled={verifyingOtp}
                  fullWidth
                  sx={{ borderColor: colors.border, color: colors.fg, fontWeight: 700 }}
                >
                  Change Number
                </Button>
                <Button
                  variant="contained"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otpCode.length !== 6}
                  fullWidth
                  sx={{
                    bgcolor: colors.lime,
                    color: colors.limeFg,
                    fontWeight: 800,
                    '&:hover': { bgcolor: colors.limeLt },
                  }}
                >
                  {verifyingOtp ? <CircularProgress size={20} color="inherit" /> : 'Confirm OTP'}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
