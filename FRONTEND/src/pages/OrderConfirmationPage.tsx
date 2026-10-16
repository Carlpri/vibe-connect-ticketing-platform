import { useLocation, Link, Navigate } from 'react-router-dom';
import { Container, Paper, Box, Typography, Button, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ExploreIcon from '@mui/icons-material/Explore';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import EmailIcon from '@mui/icons-material/Email';
import { useAuth } from '../contexts/AuthContext';
import { formatKes, formatDate } from '../utils/format';
import { colors } from '../styles/theme';

export default function OrderConfirmationPage() {
  const location = useLocation();
  const { user } = useAuth();
  const order = location.state?.order;

  if (!order) {
    return <Navigate to="/my-tickets" replace />;
  }

  const isFullyVerified = Boolean(user?.emailVerified && user?.phoneVerified);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: { xs: 5, md: 8 }, pb: 14 }}>
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            textAlign: 'center',
            bgcolor: '#FEFDFB',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Green Check Circle */}
          <Box
            sx={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              bgcolor: 'rgba(43, 184, 90, 0.12)',
              color: colors.success,
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 2.5,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 42 }} />
          </Box>

          <Typography
            variant="caption"
            sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.success, display: 'block', mb: 0.5 }}
          >
            PAYMENT CONFIRMED
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: '"Archivo Black", sans-serif',
              fontWeight: 400,
              fontSize: { xs: '1.8rem', sm: '2.2rem' },
              textTransform: 'uppercase',
              color: colors.fg,
              mb: 1,
            }}
          >
            YOU'RE GOING!
          </Typography>
          <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 3.5 }}>
            Your unique digital passes are ready in My Tickets. Each seat gets its own signed VC1 QR code for gate scanning.
          </Typography>

          {/* Verification Reminder Panel with CTA Button */}
          {isFullyVerified ? (
            <Box
              sx={{
                p: 2.5,
                borderRadius: '8px',
                bgcolor: 'rgba(43, 184, 90, 0.08)',
                border: '1px solid rgba(43, 184, 90, 0.25)',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                mb: 3.5,
                width: '100%',
                maxWidth: 400,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 32, color: colors.success }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.fg }}>
                Account Fully Verified
              </Typography>
              <Typography variant="body2" sx={{ color: colors.mutedFg, textAlign: 'center', fontSize: '0.86rem' }}>
                Your passes and gate QR codes are unlocked and ready to view and download in My Tickets.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                p: 2.5,
                borderRadius: '8px',
                bgcolor: colors.bg,
                border: `1px solid ${colors.border}`,
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.2,
                mb: 3.5,
                width: '100%',
                maxWidth: 400,
              }}
            >
              <VerifiedUserIcon sx={{ fontSize: 36, color: colors.coral }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.fg }}>
                Verify to unlock & download
              </Typography>
              <Typography variant="body2" sx={{ color: colors.mutedFg, textAlign: 'center', fontSize: '0.86rem' }}>
                Confirm your email address to unlock and reveal each pass QR code, print, or download passes.
              </Typography>

              {/* CTA Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                {(!user || !user.emailVerified) && (
                  <Button
                    component={Link}
                    to="/verify-email"
                    variant="contained"
                    size="small"
                    startIcon={<EmailIcon sx={{ fontSize: 17 }} />}
                    sx={{
                      bgcolor: colors.lime,
                      color: colors.limeFg,
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      px: 2.5,
                      py: 0.8,
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(181, 224, 42, 0.25)',
                      '&:hover': { bgcolor: colors.limeLt },
                    }}
                  >
                    Verify Email
                  </Button>
                )}
                {user && !user.phoneVerified && (
                  <Button
                    component={Link}
                    to="/profile"
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: colors.border,
                      color: colors.fg,
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      px: 2,
                      py: 0.8,
                      borderRadius: '6px',
                      '&:hover': { borderColor: colors.fg, bgcolor: 'transparent' },
                    }}
                  >
                    Verify Phone
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* Ticket Information Panel */}
          <Box
            sx={{
              p: 2.5,
              bgcolor: colors.bg,
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              textAlign: 'left',
              mb: 3.5,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700, textTransform: 'uppercase' }}>
                ORDER ID
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: colors.fg }}>
                {order.orderId}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700, textTransform: 'uppercase' }}>
                M-PESA REF
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: colors.success }}>
                {order.transactionId}
              </Typography>
            </Box>

            <Divider sx={{ my: 1.5, borderColor: colors.border }} />

            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontWeight: 400,
                fontSize: '1.05rem',
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 0.5,
              }}
            >
              {order.event.title}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 1 }}>
              {formatDate(order.event.startsAt)} • {order.event.venue}, {order.event.city}
            </Typography>

            <Divider sx={{ my: 1.5, borderColor: colors.border }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: colors.mutedFg, fontWeight: 700 }}>
                Total Paid:
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.3rem',
                  color: colors.fg,
                }}
              >
                {formatKes(order.totalKes)}
              </Typography>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              component={Link}
              to="/my-tickets"
              variant="contained"
              size="large"
              startIcon={<ConfirmationNumberIcon sx={{ fontSize: 18 }} />}
              sx={{
                py: 1.4,
                fontWeight: 800,
                fontSize: '0.92rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: '8px',
                bgcolor: colors.lime,
                color: colors.limeFg,
                '&:hover': { bgcolor: colors.limeLt },
              }}
            >
              View My Tickets & Passes
            </Button>

            <Button
              component={Link}
              to="/events"
              variant="text"
              startIcon={<ExploreIcon sx={{ fontSize: 18 }} />}
              sx={{ color: colors.fg, fontWeight: 700, textTransform: 'none' }}
            >
              Discover More Experiences
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
