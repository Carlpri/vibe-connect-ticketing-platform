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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LockIcon from '@mui/icons-material/Lock';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useAuth } from '../contexts/AuthContext';
import MpesaModal from '../components/events/MpesaModal';
import { formatKes, formatDate } from '../utils/format';
import type { Cart } from '../types';
import { colors } from '../styles/theme';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false);

  // Attendee info
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'MPESA' | 'CARD' | 'OTHER'>('MPESA');

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
  const serviceFeeKes = subtotalKes > 0 ? 50 : 0; // Flat KES 50 service fee for live booking
  const grandTotalKes = subtotalKes + serviceFeeKes;

  const handleProceed = () => {
    if (paymentMethod === 'MPESA') {
      setMpesaModalOpen(true);
    } else {
      // Simulate direct completion for other methods
      handlePaymentSuccess({
        phone: phone || '0700000000',
        transactionId: 'TX-' + Math.floor(100000 + Math.random() * 900000),
      });
    }
  };

  const handlePaymentSuccess = ({
    phone: paidPhone,
    transactionId,
  }: {
    phone: string;
    transactionId: string;
  }) => {
    const newOrder = {
      orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      transactionId,
      phone: paidPhone,
      attendeeName: fullName || user?.name || 'Guest Attendee',
      attendeeEmail: email || user?.email || '',
      event: cart.event,
      items: cart.items.map((i) => ({
        ...i,
        quantity: quantities[i.ticketType.id] ?? i.quantity,
      })).filter((i) => i.quantity > 0),
      totalKes: grandTotalKes,
      createdAt: new Date().toISOString(),
      qrCodeData: `VIBE-TICKET-${transactionId}-${cart.event.id}`,
    };

    const existingOrders = JSON.parse(localStorage.getItem('vibe_connect_orders') || '[]');
    existingOrders.unshift(newOrder);
    localStorage.setItem('vibe_connect_orders', JSON.stringify(existingOrders));

    sessionStorage.removeItem('vibe_connect_cart');
    navigate('/order-confirmation', { state: { order: newOrder } });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: 5, pb: 14 }}>
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
          STEP 2 OF 2 • INSTANT M-PESA CHECKOUT
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
                          disabled={qty <= 1}
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
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    fullWidth
                    size="small"
                    required
                    sx={{ bgcolor: colors.bg, borderRadius: '8px' }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.6, display: 'block' }}>
                    PHONE NUMBER (FOR M-PESA & SMS TICKET)
                  </Typography>
                  <TextField
                    placeholder="e.g. 0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    fullWidth
                    size="small"
                    required
                    sx={{ bgcolor: colors.bg, borderRadius: '8px' }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.6, display: 'block' }}>
                    EMAIL ADDRESS (FOR DIGITAL QR TICKET)
                  </Typography>
                  <TextField
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    size="small"
                    required
                    sx={{ bgcolor: colors.bg, borderRadius: '8px' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={forSomeoneElse}
                    onChange={(e) => setForSomeoneElse(e.target.checked)}
                    sx={{ color: colors.border, '&.Mui-checked': { color: colors.limeFg } }}
                  />
                  <Typography variant="body2" sx={{ color: colors.fg, fontWeight: 600 }}>
                    Buy ticket for someone else
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
                3. SELECT PAYMENT METHOD
              </Typography>

              <FormControl component="fieldset" fullWidth>
                <RadioGroup
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
                >
                  {/* M-Pesa (Primary) */}
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '8px',
                      border: `1.5px solid ${paymentMethod === 'MPESA' ? colors.mpesa : colors.border}`,
                      bgcolor: paymentMethod === 'MPESA' ? 'rgba(51, 199, 89, 0.08)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setPaymentMethod('MPESA')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Radio
                        checked={paymentMethod === 'MPESA'}
                        value="MPESA"
                        sx={{ color: colors.mpesa, '&.Mui-checked': { color: colors.mpesa } }}
                      />
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.fg }}>
                          Safaricom Lipa na M-Pesa
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                          Instant STK Push prompt to your phone
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
                      border: `1px solid ${paymentMethod === 'CARD' ? colors.lime : colors.border}`,
                      bgcolor: paymentMethod === 'CARD' ? 'rgba(181, 224, 42, 0.08)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setPaymentMethod('CARD')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Radio
                        checked={paymentMethod === 'CARD'}
                        value="CARD"
                        sx={{ '&.Mui-checked': { color: colors.limeFg } }}
                      />
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.fg }}>
                          Credit or Debit Card
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                          Visa, Mastercard accepted
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
                      border: `1px solid ${paymentMethod === 'OTHER' ? colors.lime : colors.border}`,
                      bgcolor: paymentMethod === 'OTHER' ? 'rgba(181, 224, 42, 0.08)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setPaymentMethod('OTHER')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Radio
                        checked={paymentMethod === 'OTHER'}
                        value="OTHER"
                        sx={{ '&.Mui-checked': { color: colors.limeFg } }}
                      />
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.fg }}>
                          Airtel Money / Other
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                          Alternative local wallets
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
                  Platform & STK Service Fee
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
                TOTAL
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

            {/* Lime Action Button */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleProceed}
              disabled={totalCount === 0 || !phone}
              startIcon={<LockIcon sx={{ fontSize: 18 }} />}
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
              Pay {formatKes(grandTotalKes)} via M-Pesa
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
              🔒 256-bit Encrypted Checkout • Instant M-Pesa STK confirmation
            </Typography>
          </Paper>
        </Box>
      </Container>

      {/* M-Pesa STK Modal */}
      <MpesaModal
        open={mpesaModalOpen}
        onClose={() => setMpesaModalOpen(false)}
        amountKes={grandTotalKes}
        initialPhone={phone}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </Box>
  );
}
