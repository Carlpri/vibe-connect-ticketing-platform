import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../utils/format';
import { colors } from '../styles/theme';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  // Verification state (when ?token is present)
  const [verifying, setVerifying] = useState(Boolean(token));
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState('');

  // Request new link state
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [sendingLink, setSendingLink] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendMessage, setSendMessage] = useState('');
  const [sendError, setSendError] = useState('');
  const [directVerificationUrl, setDirectVerificationUrl] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Sync email input if user loads later
  useEffect(() => {
    if (user?.email && !emailInput) {
      setEmailInput(user.email);
    }
  }, [user, emailInput]);

  // Handle countdown cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // If token is present in URL, verify automatically
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      return;
    }

    async function verify() {
      setVerifying(true);
      try {
        const res = await authService.verifyEmail({ token: token! });
        setVerifiedSuccess(true);
        setVerifiedMessage(res.message || 'Email verified successfully!');
        await refreshUser();
      } catch (err) {
        setVerifiedSuccess(false);
        setVerifiedMessage(getApiErrorMessage(err));
      } finally {
        setVerifying(false);
      }
    }

    verify();
  }, [token, refreshUser]);

  // Handle requesting a verification link
  const handleSendLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = (emailInput || user?.email || '').trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes('@')) {
      setSendError('Please enter a valid email address.');
      return;
    }

    setSendingLink(true);
    setSendError('');
    setSendMessage('');
    setDirectVerificationUrl(null);

    try {
      const res = await authService.resendVerificationEmail({ email: targetEmail });
      setSendSuccess(true);
      setSendMessage(
        res.data?.message || `A verification link has been sent to ${targetEmail}. Please check your inbox.`
      );
      setCooldown(60);

      // If backend returned a verificationUrl (sandbox mode or dev mode)
      if (res.data?.verificationUrl) {
        setDirectVerificationUrl(res.data.verificationUrl);
      }
    } catch (err: any) {
      const errDetail = err.response?.data?.message || getApiErrorMessage(err);
      setSendError(errDetail);
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <Box sx={{ minHeight: '85vh', display: 'grid', placeItems: 'center', py: 8, bgcolor: colors.bg }}>
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3.5, sm: 5 },
            textAlign: 'center',
            bgcolor: '#FEFDFB',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          }}
        >
          {/* CASE 1: Verifying with token */}
          {verifying ? (
            <Box sx={{ py: 4 }}>
              <CircularProgress size={48} sx={{ color: colors.lime, mb: 2.5 }} />
              <Typography
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.25rem',
                  textTransform: 'uppercase',
                  color: colors.fg,
                  mb: 1,
                }}
              >
                VERIFYING YOUR EMAIL...
              </Typography>
              <Typography variant="body2" sx={{ color: colors.mutedFg }}>
                Validating your cryptographic verification token. Please wait a moment.
              </Typography>
            </Box>
          ) : token && verifiedSuccess ? (
            /* CASE 2: Token verification SUCCEEDED */
            <Box sx={{ py: 2 }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  bgcolor: 'rgba(43, 184, 90, 0.12)',
                  color: colors.success,
                  display: 'grid',
                  placeItems: 'center',
                  mx: 'auto',
                  mb: 2.5,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 44 }} />
              </Box>

              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: colors.success,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                ACCOUNT ACTIVE
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: { xs: '1.5rem', sm: '1.8rem' },
                  textTransform: 'uppercase',
                  color: colors.fg,
                  mb: 1.5,
                }}
              >
                EMAIL CONFIRMED!
              </Typography>
              <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 3.5, maxWidth: 420, mx: 'auto' }}>
                {verifiedMessage || 'Your email is verified. Your signed VC1 passes and gate QR codes are completely unlocked.'}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  component={Link}
                  to="/my-tickets"
                  variant="contained"
                  size="large"
                  startIcon={<ConfirmationNumberIcon />}
                  sx={{
                    py: 1.3,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    bgcolor: colors.lime,
                    color: colors.limeFg,
                    borderRadius: '8px',
                    '&:hover': { bgcolor: colors.limeLt },
                  }}
                >
                  View My Tickets & Passes
                </Button>
                <Button
                  component={Link}
                  to="/events"
                  variant="outlined"
                  size="large"
                  sx={{
                    py: 1.2,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderColor: colors.border,
                    color: colors.fg,
                    borderRadius: '8px',
                    '&:hover': { borderColor: colors.fg, bgcolor: 'transparent' },
                  }}
                >
                  Explore More Events
                </Button>
              </Box>
            </Box>
          ) : (
            /* CASE 3: Request / Resend Verification Link (no token or token failed) */
            <Box sx={{ py: 1 }}>
              {token && !verifiedSuccess && (
                <Alert severity="error" sx={{ mb: 3, textAlign: 'left', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Verification Link Expired or Invalid
                  </Typography>
                  <Typography variant="body2">
                    {verifiedMessage || 'This verification link is invalid or has expired. You can request a fresh link below.'}
                  </Typography>
                </Alert>
              )}

              {user?.emailVerified ? (
                <Box sx={{ py: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: 56, color: colors.success, mb: 2 }} />
                  <Typography
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      fontSize: '1.4rem',
                      textTransform: 'uppercase',
                      color: colors.fg,
                      mb: 1,
                    }}
                  >
                    ALREADY VERIFIED
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 3 }}>
                    Your email address (<strong>{user.email}</strong>) is already verified and confirmed.
                  </Typography>
                  <Button
                    component={Link}
                    to="/my-tickets"
                    variant="contained"
                    fullWidth
                    sx={{
                      py: 1.3,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      bgcolor: colors.lime,
                      color: colors.limeFg,
                      borderRadius: '8px',
                      '&:hover': { bgcolor: colors.limeLt },
                    }}
                  >
                    Go to My Tickets
                  </Button>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: 'rgba(232, 80, 58, 0.1)',
                      color: colors.coral,
                      display: 'grid',
                      placeItems: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <EmailIcon sx={{ fontSize: 32 }} />
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: colors.coral,
                      display: 'block',
                      mb: 0.5,
                    }}
                  >
                    SECURITY CHECK
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      fontSize: { xs: '1.4rem', sm: '1.75rem' },
                      textTransform: 'uppercase',
                      color: colors.fg,
                      mb: 1,
                    }}
                  >
                    VERIFY YOUR EMAIL
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 3.5, maxWidth: 440, mx: 'auto' }}>
                    Click below to receive a secure link in your inbox. Confirming your email unlocks your unique signed VC1 QR passes and allows gate entry.
                  </Typography>

                  {/* Feedback Alerts */}
                  {sendSuccess && (
                    <Alert severity="success" sx={{ mb: 3, textAlign: 'left', borderRadius: '8px' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.3 }}>
                        Verification Link Dispatched!
                      </Typography>
                      <Typography variant="body2">{sendMessage}</Typography>
                    </Alert>
                  )}

                  {sendError && (
                    <Alert severity="warning" sx={{ mb: 3, textAlign: 'left', borderRadius: '8px' }}>
                      <Typography variant="body2">{sendError}</Typography>
                    </Alert>
                  )}

                  {/* Dev / Sandbox Direct Link Box */}
                  {directVerificationUrl && (
                    <Box
                      sx={{
                        p: 2.5,
                        mb: 3,
                        borderRadius: '8px',
                        bgcolor: 'rgba(181, 224, 42, 0.12)',
                        border: `1.5px dashed ${colors.lime}`,
                        textAlign: 'left',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                        <OpenInNewIcon sx={{ fontSize: 18, color: colors.limeFg }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.fg }}>
                          Instant Verification Link (Preview / Testing)
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: colors.mutedFg, fontSize: '0.84rem', mb: 1.5 }}>
                        Since the system generated this link, you can click directly below to complete verification without waiting for an external email:
                      </Typography>
                      <Button
                        onClick={() => {
                          const url = new URL(directVerificationUrl);
                          const tokenParam = url.searchParams.get('token');
                          if (tokenParam) {
                            navigate(`/verify-email?token=${encodeURIComponent(tokenParam)}`);
                          } else {
                            window.location.href = directVerificationUrl;
                          }
                        }}
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          bgcolor: colors.lime,
                          color: colors.limeFg,
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          textTransform: 'uppercase',
                          '&:hover': { bgcolor: colors.limeLt },
                        }}
                      >
                        Complete Verification Now
                      </Button>
                    </Box>
                  )}

                  {/* Email Input & Send Action */}
                  <Box component="form" onSubmit={handleSendLink} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Your Account Email Address"
                      type="email"
                      required
                      fullWidth
                      size="medium"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="e.g. yourname@example.com"
                      disabled={sendingLink}
                      sx={{
                        bgcolor: colors.bg,
                        borderRadius: '8px',
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: colors.border },
                          '&:hover fieldset': { borderColor: colors.fg },
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={sendingLink || cooldown > 0}
                      startIcon={sendingLink ? <CircularProgress size={18} sx={{ color: colors.limeFg }} /> : <SendIcon sx={{ fontSize: 18 }} />}
                      sx={{
                        py: 1.4,
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        borderRadius: '8px',
                        bgcolor: colors.lime,
                        color: colors.limeFg,
                        boxShadow: '0 4px 14px rgba(181, 224, 42, 0.3)',
                        '&:hover': { bgcolor: colors.limeLt },
                      }}
                    >
                      {sendingLink
                        ? 'Dispatching Link...'
                        : cooldown > 0
                        ? `Resend in ${cooldown}s`
                        : 'Send Verification Link'}
                    </Button>
                  </Box>

                  <Divider sx={{ my: 3, borderColor: colors.border }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      component={Link}
                      to="/my-tickets"
                      size="small"
                      sx={{ color: colors.mutedFg, fontWeight: 700, textTransform: 'none', '&:hover': { color: colors.fg } }}
                    >
                      ← Back to My Tickets
                    </Button>
                    <Button
                      component={Link}
                      to="/profile"
                      size="small"
                      sx={{ color: colors.mutedFg, fontWeight: 700, textTransform: 'none', '&:hover': { color: colors.fg } }}
                    >
                      Account Settings & Phone OTP →
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
