import { useLocation, Link, Navigate } from 'react-router-dom';
import { Container, Paper, Box, Typography, Button, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ExploreIcon from '@mui/icons-material/Explore';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { formatKes, formatDate } from '../utils/format';
import { colors } from '../styles/theme';

export default function OrderConfirmationPage() {
  const location = useLocation();
  const order = location.state?.order;

  if (!order) {
    return <Navigate to="/my-tickets" replace />;
  }

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
            Your digital pass has been issued and stored securely. Show your QR code at the gate.
          </Typography>

          {/* High-Contrast QR Code Box */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: '8px',
              bgcolor: '#0E1013',
              color: '#FAF7F2',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
              mb: 3.5,
              width: '100%',
              maxWidth: 320,
            }}
          >
            <Box
              sx={{
                bgcolor: colors.qrBg,
                color: colors.qrFg,
                p: 2,
                borderRadius: '6px',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <QrCode2Icon sx={{ fontSize: 140, color: '#000' }} />
            </Box>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', letterSpacing: '0.08em', color: colors.lime, fontWeight: 700 }}>
              {order.qrCodeData || order.transactionId}
            </Typography>
          </Box>

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
