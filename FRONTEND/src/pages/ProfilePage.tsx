import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { colors } from '../styles/theme';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [resendingEmail, setResendingEmail] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  if (!user) return null;

  const handleResendEmail = async () => {
    setResendingEmail(true);
    try {
      const returnUrl = sessionStorage.getItem('vibe_verification_return_to') || undefined;
      const res = await authService.resendVerificationEmail({
        email: user.email,
        redirectUrl: returnUrl,
      });
      toast.success(res.data?.message || res.message || 'Verification email sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResendingEmail(false);
    }
  };


  const handleSendPhoneOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await authService.sendPhoneOtp({ phone: user.phone || undefined });
      toast.success(res.message || 'OTP sent to your phone!');
      setOtpSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send phone OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await authService.verifyPhone({ code: otpCode });
      toast.success(res.message || 'Phone number verified successfully!');
      setOtpSent(false);
      setOtpCode('');
      await refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const isFullyVerified = user.emailVerified && user.phoneVerified;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: { xs: 5, md: 7 }, pb: 14 }}>
      <Container maxWidth="md">
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.coral, letterSpacing: '0.08em', display: 'block', mb: 0.5 }}
        >
          ACCOUNT SETTINGS
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontWeight: 400,
            fontSize: { xs: '2.2rem', md: '3rem' },
            textTransform: 'uppercase',
            color: colors.fg,
            mb: 1,
          }}
        >
          MY PROFILE
        </Typography>
        <Typography variant="body1" sx={{ color: colors.mutedFg, mb: 4 }}>
          Manage your personal credentials, contact numbers, and security verification.
        </Typography>

        {/* Verification Status Banner */}
        {isFullyVerified ? (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            sx={{ mb: 4, borderRadius: '8px', bgcolor: 'rgba(43, 184, 90, 0.1)', color: colors.success, border: `1px solid ${colors.success}` }}
          >
            Your account is fully verified. You can create events and make ticket reservations.
          </Alert>
        ) : (
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{ mb: 4, borderRadius: '8px' }}
          >
            Account policy notice: Email and phone verification ensure ticket delivery and fraud protection.
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 4,
          }}
        >
          {/* User Details */}
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              bgcolor: '#FEFDFB',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: '1.15rem',
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 2,
              }}
            >
              PERSONAL INFO
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
              <TextField label="Full Name" value={user.name} fullWidth size="small" disabled sx={{ bgcolor: colors.bg, borderRadius: '8px' }} />
              <TextField label="Account Email" value={user.email} fullWidth size="small" disabled sx={{ bgcolor: colors.bg, borderRadius: '8px' }} />
              <TextField
                label="Phone Number"
                value={user.phone || 'Not provided'}
                fullWidth
                size="small"
                disabled
                sx={{ bgcolor: colors.bg, borderRadius: '8px' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: colors.mutedFg, fontWeight: 700 }}>
                  Role:
                </Typography>
                <Chip
                  label={user.role}
                  size="small"
                  sx={{
                    bgcolor: colors.lime,
                    color: colors.limeFg,
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    letterSpacing: '0.04em',
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* Verification Center */}
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              bgcolor: '#FEFDFB',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: '1.15rem',
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 2,
              }}
            >
              VERIFICATION CENTER
            </Typography>

            {/* Email Verification Box */}
            <Box sx={{ mt: 2, p: 2, borderRadius: '8px', bgcolor: colors.bg, border: `1px solid ${colors.border}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon sx={{ color: colors.coral, fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.fg }}>
                    Email Address
                  </Typography>
                </Box>
                <Chip
                  label={user.emailVerified ? 'Verified' : 'Unverified'}
                  size="small"
                  color={user.emailVerified ? 'success' : 'warning'}
                  sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: colors.mutedFg, fontSize: '0.82rem', mb: 1.5 }}>
                {user.emailVerified
                  ? 'Your email address is active and confirmed.'
                  : 'We sent a verification link to your email upon signup.'}
              </Typography>
              {!user.emailVerified && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleResendEmail}
                    disabled={resendingEmail}
                    sx={{
                      borderRadius: '8px',
                      fontWeight: 700,
                      bgcolor: colors.lime,
                      color: colors.limeFg,
                      '&:hover': { bgcolor: colors.limeLt },
                    }}
                  >
                    {resendingEmail ? 'Sending...' : 'VERIFY EMAIL'}
                  </Button>
                  <Button
                    component={Link}
                    to="/verify-email"
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: '8px', fontWeight: 700, borderColor: colors.border, color: colors.fg }}
                  >
                    Open Verification Hub
                  </Button>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2.5, borderColor: colors.border }} />

            {/* Phone Verification Box */}
            <Box sx={{ p: 2, borderRadius: '8px', bgcolor: colors.bg, border: `1px solid ${colors.border}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIphoneIcon sx={{ color: colors.mpesa, fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.fg }}>
                    Phone (SMS OTP)
                  </Typography>
                </Box>
                <Chip
                  label={user.phoneVerified ? 'Verified' : 'Unverified'}
                  size="small"
                  color={user.phoneVerified ? 'success' : 'warning'}
                  sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: colors.mutedFg, fontSize: '0.82rem', mb: 1.5 }}>
                {user.phoneVerified
                  ? 'Phone is verified for account security and ticket contact information.'
                  : 'Confirm your phone with a 6-digit SMS code.'}
              </Typography>

              {!user.phoneVerified && (
                <>
                  {!otpSent ? (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSendPhoneOtp}
                      disabled={sendingOtp}
                      sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 800, borderRadius: '8px', '&:hover': { bgcolor: colors.limeLt } }}
                    >
                      {sendingOtp ? 'Sending...' : 'VERIFY PHONE NUMBER'}
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField
                        placeholder="6-digit OTP"
                        size="small"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        slotProps={{ htmlInput: { maxLength: 6 } }}
                        sx={{ maxWidth: 140, bgcolor: '#FEFDFB', borderRadius: '8px' }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleVerifyPhoneOtp}
                        disabled={verifyingOtp || otpCode.length !== 6}
                        sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 800, borderRadius: '8px', '&:hover': { bgcolor: colors.limeLt } }}
                      >
                        {verifyingOtp ? 'Verifying...' : 'Confirm'}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
