import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { bookingService } from '../services/bookingService';
import type { Order } from '../types';
import { formatKes } from '../utils/format';
import { colors } from '../styles/theme';

export default function OrderConfirmationPage() {
  const location = useLocation();
  const orderId = location.state?.orderId ?? location.state?.order?.id ?? location.state?.order?.orderId;
  const hasOrderId = typeof orderId === 'string' && orderId.length > 0;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!hasOrderId) return;

    bookingService.getOrderById(orderId)
      .then((response) => {
        if (active) setOrder(response.data);
      })
      .catch((requestError: any) => {
        if (active) {
          setError(requestError?.response?.data?.message || 'Could not verify this order.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, hasOrderId]);

  const paid = order?.status === 'PAID';
  const loadingOrder = hasOrderId && loading;
  const visibleError = hasOrderId ? error : 'No order was provided to verify.';

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
          <Typography
            component="h1"
            sx={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: { xs: '1.8rem', sm: '2.2rem' },
              textTransform: 'uppercase',
              color: colors.fg,
              mb: 2,
            }}
          >
            Order status
          </Typography>

          {loadingOrder ? (
            <CircularProgress sx={{ color: colors.lime, my: 3 }} />
          ) : visibleError ? (
            <Alert severity="warning" sx={{ textAlign: 'left' }}>{visibleError}</Alert>
          ) : order ? (
            <>
              <Alert severity={paid ? 'success' : 'info'} sx={{ textAlign: 'left', mb: 2 }}>
                {paid
                  ? 'Payment was verified by the backend. Check My Tickets for issued passes.'
                  : 'Payment has not been verified. This order is not a paid purchase, and no tickets are available yet.'}
              </Alert>
              <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 1 }}>
                Order: {order.id}
              </Typography>
              <Typography variant="h6" sx={{ color: colors.fg, fontWeight: 800 }}>
                {formatKes(order.totalKes)}
              </Typography>
            </>
          ) : null}

          <Button
            component={Link}
            to="/my-tickets"
            variant="contained"
            sx={{
              mt: 3,
              bgcolor: colors.lime,
              color: colors.limeFg,
              fontWeight: 800,
              '&:hover': { bgcolor: colors.limeLt },
            }}
          >
            View My Tickets
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
