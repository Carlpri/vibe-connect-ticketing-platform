import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Divider,
  TextField,
  IconButton,
  Radio,
  RadioGroup,
  FormControl,
  Checkbox,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LockIcon from '@mui/icons-material/Lock';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EmailIcon from '@mui/icons-material/Email';
import { useAuth } from '../contexts/AuthContext';
import MpesaModal from '../components/events/MpesaModal';
import { formatKes, formatDate } from '../utils/format';
import type { Cart } from '../types';
import { colors } from '../styles/theme';
import { bookingService } from '../services/bookingService';
import { authService } from '../services/authService';
import PageMeta from '../components/common/PageMeta';


export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasVerifiedContact = Boolean(user?.emailVerified || user?.phoneVerified);
  const [cart, setCart] = useState<Cart | null>(null);
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false);
  const [backendOrderId, setBackendOrderId] = useState<string | null>(null);
  const [reservationAmount, setReservationAmount] = useState<number | null>(null);
  const [reservationExpiresAt, setReservationExpiresAt] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    directUrl?: string;
  } | null>(null);

  const handleSendVerificationEmail = async () => {
    if (!user?.email) return;
    setSendingVerification(true);
    setVerificationFeedback(null);
    try {
      const returnUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('vibe_verification_return_to', returnUrl);
      const res = await authService.resendVerificationEmail({
        email: user.email,
        redirectUrl: returnUrl,
      });
      setVerificationFeedback({
        type: 'success',
        message: res.data?.message || res.message || `Verification link sent to ${user.email}! Please check your email.`,
        directUrl: res.data?.verificationUrl,
      });
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to send verification email. Please try again.',
      });
    } finally {
      setSendingVerification(false);
    }
  };


  // Quantities state
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const rawCart = sessionStorage.getItem('vibe_connect_cart');
    if (!rawCart) {
      navigate('/events');
      return;
    }
    try {
      const parsed: Cart = JSON.parse(rawCart);
      setCart(parsed);
      const initialQtys: Record<string, number> = {};
      parsed.items.forEach((item) => {
        initialQtys[item.ticketType.id] = item.quantity;
      });
      setQuantities(initialQtys);
    } catch {
      navigate('/events');
    }
  }, [navigate]);

  if (!cart) return null;

  const handleQtyChange = (ticketId: string, newQty: number) => {
    if (newQty < 0) return;
    setQuantities((prev) => ({
      ...prev,
      [ticketId]: newQty,
    }));
  };

  const subtotalKes = cart.items.reduce((sum, item) => {
    const qty = quantities[item.ticketType.id] ?? item.quantity;
    return sum + item.ticketType.priceKes * qty;
  }, 0);

  const totalCount = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const serviceFeeKes = subtotalKes > 0 ? 50 : 0;
  const grandTotalKes = subtotalKes + serviceFeeKes;

  const handleProceed = async () => {
    setBookingError(null);
    if (!user) {
      setBookingError('Sign in before reserving tickets.');
      return;
    }
    if (!hasVerifiedContact) {
      setBookingError('Verify your email or phone number before purchasing tickets.');
      return;
    }
    if (backendOrderId) {
      setMpesaModalOpen(true);
      return;
    }

    const items = cart.items
      .map((item) => ({
        ticketTypeId: item.ticketType.id,
        quantity: quantities[item.ticketType.id] ?? item.quantity,
      }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setBookingError('Choose at least one ticket before reserving.');
      return;
    }

    setReserving(true);
    try {
      const response = await bookingService.createOrder({
        eventId: cart.event.id,
        items,
      });
      setBackendOrderId(response.data.id);
      setReservationAmount(response.data.totalKes);
      setReservationExpiresAt(response.data.expiresAt);
      setMpesaModalOpen(true);
    } catch (err: any) {
      setBookingError(err?.response?.data?.message || 'Could not reserve tickets. Please try again.');
    } finally {
      setReserving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: 5, pb: 14 }}>
      <PageMeta title="Checkout" path="/checkout" noIndex />
      <Container maxWidth="lg">
        <Button
          component={Link}
          to={`/events/${cart.event.id}`}
          startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
          sx={{ color: colors.mutedFg, textTransform: 'none', mb: 3, fontWeight: 600, '&:hover': { color: colors.fg } }}
        >
          Back to Event
        </Button>

        {/* Heading */}
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.coral, letterSpacing: '0.08em', display: 'block', mb: 0.5 }}
        >
          STEP 2 OF 2 • TICKET RESERVATION
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontWeight: 400,
            fontSize: { xs: '2rem', md: '2.8rem' },
            textTransform: 'uppercase',
            color: colors.fg,
            mb: 4,
          }}
        >
          COMPLETE YOUR ORDER
        </Typography>

        {user && !hasVerifiedContact && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: '8px' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Verify at least one contact method before reserving tickets.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {!user.emailVerified && (
                <Button component={Link} to="/verify-email" size="small" variant="contained">
                  VERIFY EMAIL
                </Button>
              )}
              {!user.phoneVerified && (
                <Button component={Link} to="/profile" size="small" variant="outlined">
                  VERIFY PHONE NUMBER
                </Button>
              )}
            </Box>
          </Alert>
        )}

        {/* Sequence: Tickets → Details → Payment with Dark Order Summary */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
            gap: { xs: 4, md: 5 },
            alignItems: 'start',
          }}
        >
          {/* Main Form Left Column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {/* 1. Tickets Section */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '8px',
                bgcolor: '#FEFDFB',
                border: `1px solid ${colors.border}`,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  color: colors.fg,
                  mb: 2,
                }}
              >
                1. SELECTED TICKETS
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {cart.items.map((item) => {
                  const qty = quantities[item.ticketType.id] ?? item.quantity;
                  return (
                    <Box
                      key={item.ticketType.id}
                      sx={{
                        p: 2,
                        borderRadius: '8px',
                        bgcolor: colors.bg,
                        border: `1px solid ${colors.border}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.fg }}>
                          {item.ticketType.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.coral, fontWeight: 700 }}>
                          {item.ticketType.priceKes === 0 ? 'FREE' : formatKes(item.ticketType.priceKes)}
                        </Typography>
                      </Box>

                      {/* +/- controls */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <IconButton
                          size="small"
                          disabled={qty <= 1 || Boolean(backendOrderId) || reserving}
                          onClick={() => handleQtyChange(item.ticketType.id, qty - 1)}
                          sx={{
                            bgcolor: '#FEFDFB',
                            border: `1px solid ${colors.border}`,
                            color: colors.fg,
                            borderRadius: '6px',
                            p: 0.6,
                          }}
                        >
                          <RemoveIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 800, color: colors.fg }}>
                          {qty}
                        </Typography>
                        <IconButton
                          size="small"
                          disabled={Boolean(backendOrderId) || reserving}
                          onClick={() => handleQtyChange(item.ticketType.id, qty + 1)}
                          sx={{
                            bgcolor: colors.lime,
                            color: colors.limeFg,
                            borderRadius: '6px',
                            p: 0.6,
                            '&:hover': { bgcolor: colors.limeLt },
                          }}
                        >
                          <AddIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* 2. Attendee Details Section */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '8px',
                bgcolor: '#FEFDFB',
                border: `1px solid ${colors.border}`,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  color: colors.fg,
                  mb: 2,
                }}
              >
                2. ATTENDEE DETAILS
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.6, display: 'block' }}>
                    FULL NAME
                  </Typography>
                  <TextField
                    placeholder="Enter your full name"
                    value={user?.name ?? ''}
                    slotProps={{ input: { readOnly: true } }}
                    fullWidth
                    size="small"
                    required
                    sx={{ bgcolor: colors.bg, borderRadius: '8px' }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.6, display: 'block' }}>
                    PHONE NUMBER
                  </Typography>
                  <TextField
                    placeholder="e.g. 0712 345 678"
                    value={user?.phone ?? ''}
                    slotProps={{ input: { readOnly: true } }}
                    fullWidth
                    size="small"
                    required
                    sx={{ bgcolor: colors.bg, borderRadius: '8px' }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.6, display: 'block' }}>
                    EMAIL ADDRESS
                  </Typography>
                  <TextField
                    type="email"
                    placeholder="name@example.com"
                    value={user?.email ?? ''}
                    slotProps={{ input: { readOnly: true } }}
                    fullWidth
                    size="small"
                    required
                    sx={{ bgcolor: colors.bg, borderRadius: '8px' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={false}
                    disabled
                    sx={{ color: colors.border, '&.Mui-checked': { color: colors.limeFg } }}
                  />
                  <Typography variant="body2" sx={{ color: colors.fg, fontWeight: 600 }}>
                    Guest attendee details are not supported yet
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* 3. Payment Method Selection (M-Pesa First) */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '8px',
                bgcolor: '#FEFDFB',
                border: `1px solid ${colors.border}`,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase',
                  color: colors.fg,
                  mb: 2,
                }}
              >
                3. PAYMENT AVAILABILITY
              </Typography>

              <FormControl component="fieldset" fullWidth>
                <RadioGroup
                  value="MPESA"
                  sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
                >
                  {/* M-Pesa (Primary) */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '8px',
                      border: `1.5px solid ${colors.mpesa}`,
                      bgcolor: 'rgba(51, 199, 89, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Radio
                        checked
                        value="MPESA"
                        sx={{ color: colors.mpesa, '&.Mui-checked': { color: colors.mpesa } }}
                      />
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.fg }}>
                          Safaricom Lipa na M-Pesa
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                          An STK prompt is sent when Daraja is configured
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: colors.mpesa,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                      }}
                    >
                      M
                    </Box>
                  </Box>

                  {/* Card Alternative */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      bgcolor: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Radio
                        value="CARD"
                        disabled
                        sx={{ '&.Mui-checked': { color: colors.limeFg } }}
                      />
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.fg }}>
                          Credit or Debit Card (Unavailable)
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                          No card provider is configured
                        </Typography>
                      </Box>
                    </Box>
                    <CreditCardIcon sx={{ color: colors.mutedFg }} />
                  </Box>

                  {/* Other / Mobile Money */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      bgcolor: 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Radio
                        value="OTHER"
                        disabled
                        sx={{ '&.Mui-checked': { color: colors.limeFg } }}
                      />
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.fg }}>
                          Airtel Money / Other (Unavailable)
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                          No alternative payment provider is configured
                        </Typography>
                      </Box>
                    </Box>
                    <AccountBalanceWalletIcon sx={{ color: colors.mutedFg }} />
                  </Box>
                </RadioGroup>
              </FormControl>
            </Paper>
          </Box>

          {/* Right Column: Dark INK Order Summary beside form */}
          <Paper
            elevation={0}
            sx={{
              position: { md: 'sticky' },
              top: { md: 80 },
              p: 3.5,
              borderRadius: '8px',
              bgcolor: colors.ink,
              color: colors.inkFg,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: '1.2rem',
                textTransform: 'uppercase',
                color: colors.inkFg,
                mb: 2,
              }}
            >
              ORDER SUMMARY
            </Typography>

            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: colors.lime, mb: 0.5 }}>
              {cart.event.title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.65)', display: 'block', mb: 2 }}>
              {formatDate(cart.event.startsAt)} • {cart.event.venue}
            </Typography>

            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Separated calculations: Subtotal, Service fee, Total */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mb: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'rgba(250, 247, 242, 0.7)' }}>
                  Subtotal ({totalCount} items)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: colors.inkFg }}>
                  {formatKes(subtotalKes)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: 'rgba(250, 247, 242, 0.7)' }}>
                  Platform Service Fee
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: colors.inkFg }}>
                  {serviceFeeKes === 0 ? 'FREE' : formatKes(serviceFeeKes)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.15)' }} />

            {/* Large Total in KES */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 3 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: colors.inkFg, textTransform: 'uppercase' }}>
                ESTIMATED TOTAL
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.9rem',
                  color: colors.lime,
                  letterSpacing: '-0.02em',
                }}
              >
                {formatKes(grandTotalKes)}
              </Typography>
            </Box>

            {bookingError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {bookingError}
              </Alert>
            )}

            {!hasVerifiedContact && user && (
              <Box
                sx={{
                  mb: 2.5,
                  p: 2,
                  borderRadius: '8px',
                  bgcolor: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: colors.inkFg,
                    mb: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <EmailIcon sx={{ fontSize: 18, color: colors.coral }} />
                  EMAIL VERIFICATION REQUIRED
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(250, 247, 242, 0.75)', fontSize: '0.8rem', mb: 1.5 }}>
                  Send a verification link to <strong>{user.email}</strong>. When you click the link, you will be automatically returned to this checkout page.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSendVerificationEmail}
                    disabled={sendingVerification}
                    startIcon={sendingVerification ? <CircularProgress size={16} /> : <EmailIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: colors.lime,
                      color: colors.limeFg,
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      textTransform: 'uppercase',
                      py: 1,
                      borderRadius: '6px',
                      '&:hover': { bgcolor: colors.limeLt },
                    }}
                  >
                    {sendingVerification ? 'Sending Link…' : 'Verify Email'}
                  </Button>

                  {verificationFeedback && (
                    <Alert
                      severity={verificationFeedback.type}
                      sx={{
                        fontSize: '0.78rem',
                        py: 0.5,
                        '& .MuiAlert-message': { width: '100%' },
                      }}
                    >
                      {verificationFeedback.message}
                      {verificationFeedback.directUrl && (
                        <Box sx={{ mt: 1 }}>
                          <Button
                            component="a"
                            href={verificationFeedback.directUrl}
                            variant="outlined"
                            size="small"
                            color="inherit"
                            sx={{ fontSize: '0.74rem', textTransform: 'none', fontWeight: 700 }}
                          >
                            Click here to verify directly
                          </Button>
                        </Box>
                      )}
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography
                      component={Link}
                      to="/profile"
                      sx={{
                        color: colors.lime,
                        fontSize: '0.75rem',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        '&:hover': { color: colors.limeLt },
                      }}
                    >
                      Or verify phone OTP in Profile
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {backendOrderId && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Reservation {backendOrderId} is unpaid and expires at{' '}
                {reservationExpiresAt ? formatDate(reservationExpiresAt) : 'the displayed reservation deadline'}.
                No payment was taken and no tickets have been issued.
              </Alert>
            )}


            {/* Lime Action Button */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleProceed}
              disabled={totalCount === 0 || reserving}
              startIcon={reserving ? <CircularProgress size={18} /> : <LockIcon sx={{ fontSize: 18 }} />}
              sx={{
                py: 1.6,
                bgcolor: colors.lime,
                color: colors.limeFg,
                fontWeight: 900,
                fontSize: '0.98rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: '8px',
                '&:hover': { bgcolor: colors.limeLt },
                '&.Mui-disabled': { bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              {reserving
                ? 'Creating Reservation…'
                : backendOrderId ? 'Continue with M-Pesa' : 'Reserve and Pay with M-Pesa'}
            </Button>

            <Typography
              variant="caption"
              sx={{
                color: 'rgba(250, 247, 242, 0.5)',
                display: 'block',
                textAlign: 'center',
                mt: 2,
                fontSize: '0.75rem',
              }}
            >
              A reservation is not a paid purchase. Tickets are issued only after Daraja verifies the payment.
            </Typography>
          </Paper>
        </Box>
      </Container>

      {/* Payment is intentionally not simulated or confirmed in the frontend. */}
      <MpesaModal
        open={mpesaModalOpen}
        onClose={() => setMpesaModalOpen(false)}
        amountKes={reservationAmount ?? grandTotalKes}
        orderId={backendOrderId || undefined}
        initialPhone={user?.phone ?? ''}
        onPaymentSuccess={() => {
          setMpesaModalOpen(false);
          navigate('/order-confirmation', { state: { orderId: backendOrderId } });
        }}
      />
    </Box>
  );
}
