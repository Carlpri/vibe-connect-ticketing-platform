import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import toast from 'react-hot-toast';

import { bookingService } from '../services/bookingService';
import { type DigitalTicketPass } from '../services/ticketService';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../styles/theme';
import { formatKes, formatDate } from '../utils/format';
import { eventCoverUrl } from '../utils/eventMedia';
import TicketQrBlock from '../components/tickets/TicketQrBlock';
import { downloadTicketPdf, downloadAllTicketsPdf } from '../utils/ticketPdf';
import PageMeta from '../components/common/PageMeta';

type PaymentState = 'VERIFYING' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'ERROR' | 'MISSING_REFERENCE';

interface VerificationDetails {
  orderId?: string;
  reference?: string;
  amountKes?: number;
  paidAt?: string;
  channel?: string;
  message?: string;
}

export default function CheckoutVerifyPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Read reference or trxref from URL
  const reference = (searchParams.get('reference') || searchParams.get('trxref') || '').trim();

  const [paymentState, setPaymentState] = useState<PaymentState>('VERIFYING');
  const [details, setDetails] = useState<VerificationDetails | null>(null);
  const [tickets, setTickets] = useState<DigitalTicketPass[]>([]);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);

  // Polling management for PENDING state
  const [pollAttempt, setPollAttempt] = useState(0);
  const maxPollAttempts = 8;
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVerifyingRef = useRef(false);

  const fetchOrderTickets = useCallback(async (orderId: string) => {
    try {
      const res = await bookingService.getOrderTickets(orderId);
      const data = res.data;
      setTickets(data?.tickets ?? []);
      setVerificationRequired(Boolean(data?.verificationRequired));
      setEmailVerified(Boolean(data?.emailVerified));
      setPhoneVerified(Boolean(data?.phoneVerified));
    } catch (err: any) {
      console.warn('Could not load tickets for order immediately', err);
      // If unauthorized (e.g. session expired), tickets can still be viewed in My Tickets
    }
  }, []);

  const verifyPayment = useCallback(
    async (isRetry: boolean = false) => {
      if (!reference) {
        setPaymentState('MISSING_REFERENCE');
        return;
      }

      if (isVerifyingRef.current && !isRetry) return;
      isVerifyingRef.current = true;

      if (isRetry) {
        setPaymentState('VERIFYING');
        setErrorMessage(null);
      }

      try {
        const response = await bookingService.verifyPayment(reference);
        const data = response.data;

        setDetails({
          orderId: data.orderId,
          reference: data.reference,
          amountKes: data.amountKes,
          paidAt: data.paidAt,
          channel: data.channel,
          message: response.message,
        });

        if (data.status === 'SUCCESS') {
          setPaymentState('SUCCESS');
          // Clear cart on successful checkout
          sessionStorage.removeItem('vibe_connect_cart');

          if (data.orderId) {
            await fetchOrderTickets(data.orderId);
          }
        } else if (data.status === 'PENDING') {
          setPaymentState('PENDING');
        } else {
          setPaymentState('FAILED');
          setErrorMessage(response.message || 'Payment was declined or not completed by the provider.');
        }
      } catch (err: any) {
        console.error('Payment verification request failed', err);
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message;

        if (status === 400 || status === 404) {
          setPaymentState('FAILED');
          setErrorMessage(serverMsg || 'Payment verification failed. Invalid transaction reference or order.');
        } else {
          setPaymentState('ERROR');
          setErrorMessage(
            serverMsg ||
              'Unable to reach payment verification servers at this moment. If payment was deducted, your order is safe.'
          );
        }
      } finally {
        isVerifyingRef.current = false;
      }
    },
    [reference, fetchOrderTickets]
  );

  // Initial verification on mount
  useEffect(() => {
    verifyPayment();

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [verifyPayment]);

  // Bounded polling effect for PENDING status
  useEffect(() => {
    if (paymentState === 'PENDING' && pollAttempt < maxPollAttempts) {
      pollTimerRef.current = setTimeout(() => {
        setPollAttempt((prev) => prev + 1);
        verifyPayment(true);
      }, 3500);
    }

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [paymentState, pollAttempt, verifyPayment]);

  // Handle single ticket PDF download
  const handleDownloadTicketPdf = async (ticket: DigitalTicketPass) => {
    try {
      setDownloadingTicketId(ticket.id);
      await downloadTicketPdf(ticket);
      toast.success(`Downloaded ticket #${ticket.serialNumber} PDF`);
    } catch (err) {
      console.error('Error generating single ticket PDF', err);
      toast.error('Could not generate PDF pass. Please try printing or download image.');
    } finally {
      setDownloadingTicketId(null);
    }
  };

  // Handle download all tickets
  const handleDownloadAllTickets = async () => {
    if (tickets.length === 0 || !details?.orderId) return;
    try {
      setIsDownloadingAll(true);
      await downloadAllTicketsPdf(tickets, details.orderId);
      toast.success('Downloaded all ticket passes in PDF');
    } catch (err) {
      console.error('Error generating all tickets PDF', err);
      toast.error('Could not generate tickets PDF. You can download passes individually below.');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Handle share ticket
  const handleShareTicket = async (ticket: DigitalTicketPass) => {
    const eventUrl = `${window.location.origin}/events/${ticket.event.slug || ticket.event.id}`;
    const shareData = {
      title: `I'm attending ${ticket.event.title} on Vibe-Connect!`,
      text: `I just secured my ticket for ${ticket.event.title} at ${ticket.event.venue}, ${ticket.event.city} on ${formatDate(
        ticket.event.startsAt
      )}! Join me:`,
      url: eventUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User closed dialog
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      toast.success('Event invitation link copied to clipboard!');
    } catch {
      toast.error('Could not copy link to clipboard.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: { xs: 4, md: 7 }, pb: 16 }}>
      <PageMeta title="Payment Verification | Vibe-Connect" path="/checkout/verify" noIndex />
      <Container maxWidth="md">
        {/* State: MISSING REFERENCE */}
        {paymentState === 'MISSING_REFERENCE' && (
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
            <ErrorIcon sx={{ fontSize: 60, color: colors.coral, mb: 2 }} />
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: { xs: '1.6rem', sm: '2rem' },
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 1.5,
              }}
            >
              No Transaction Reference Found
            </Typography>
            <Typography variant="body1" sx={{ color: colors.mutedFg, mb: 3, maxWidth: 500, mx: 'auto' }}>
              We could not verify your payment because the required transaction reference is missing from the URL.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                to="/events"
                variant="contained"
                sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 800, '&:hover': { bgcolor: colors.limeLt } }}
              >
                Browse Events
              </Button>
              <Button
                component={Link}
                to="/my-tickets"
                variant="outlined"
                sx={{ borderColor: colors.border, color: colors.fg, fontWeight: 700 }}
              >
                View My Tickets
              </Button>
            </Box>
          </Paper>
        )}

        {/* State: VERIFYING */}
        {paymentState === 'VERIFYING' && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              textAlign: 'center',
              bgcolor: '#FEFDFB',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
            }}
          >
            <CircularProgress size={56} sx={{ color: colors.lime, mb: 3 }} />
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: { xs: '1.6rem', sm: '2.1rem' },
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 1.5,
              }}
            >
              Verifying Payment
            </Typography>
            <Typography variant="body1" sx={{ color: colors.mutedFg, mb: 2 }}>
              Securely verifying your transaction with Paystack...
            </Typography>
            {reference && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: colors.mutedFg, display: 'block' }}>
                Reference: {reference}
              </Typography>
            )}
          </Paper>
        )}

        {/* State: PENDING */}
        {paymentState === 'PENDING' && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              textAlign: 'center',
              bgcolor: '#FEFDFB',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
            }}
          >
            <HourglassEmptyIcon sx={{ fontSize: 56, color: colors.coral, mb: 2 }} />
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: { xs: '1.6rem', sm: '2.1rem' },
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 1.5,
              }}
            >
              Payment Processing
            </Typography>
            <Typography variant="body1" sx={{ color: colors.mutedFg, mb: 2, maxWidth: 540, mx: 'auto' }}>
              Your transaction is currently awaiting confirmation from Paystack (e.g. M-Pesa PIN prompt or bank verification).
            </Typography>
            <Typography variant="caption" sx={{ color: colors.mutedFg, display: 'block', mb: 3 }}>
              Checking status automatically (Attempt {pollAttempt + 1} of {maxPollAttempts})...
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => verifyPayment(true)}
                sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 800, '&:hover': { bgcolor: colors.limeLt } }}
              >
                Check Status Now
              </Button>
              <Button
                component={Link}
                to="/my-tickets"
                variant="outlined"
                sx={{ borderColor: colors.border, color: colors.fg, fontWeight: 700 }}
              >
                Check My Tickets
              </Button>
            </Box>
          </Paper>
        )}

        {/* State: FAILED */}
        {paymentState === 'FAILED' && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              textAlign: 'center',
              bgcolor: '#FEFDFB',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
            }}
          >
            <ErrorIcon sx={{ fontSize: 60, color: colors.coral, mb: 2 }} />
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: { xs: '1.6rem', sm: '2.1rem' },
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 1.5,
              }}
            >
              Payment Not Completed
            </Typography>
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left', maxWidth: 540, mx: 'auto' }}>
              {errorMessage || 'The payment could not be completed or was cancelled. No tickets were issued.'}
            </Alert>
            <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 3 }}>
              Transaction Reference: {reference}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                to="/checkout"
                variant="contained"
                sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 800, '&:hover': { bgcolor: colors.limeLt } }}
              >
                Return to Checkout
              </Button>
              <Button
                component={Link}
                to="/events"
                variant="outlined"
                sx={{ borderColor: colors.border, color: colors.fg, fontWeight: 700 }}
              >
                Browse Events
              </Button>
            </Box>
          </Paper>
        )}

        {/* State: ERROR */}
        {paymentState === 'ERROR' && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              textAlign: 'center',
              bgcolor: '#FEFDFB',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
            }}
          >
            <ErrorIcon sx={{ fontSize: 60, color: colors.coral, mb: 2 }} />
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: { xs: '1.6rem', sm: '2.1rem' },
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 1.5,
              }}
            >
              Verification Temporarily Unavailable
            </Typography>
            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left', maxWidth: 540, mx: 'auto' }}>
              {errorMessage ||
                'We could not verify your payment due to a temporary network issue. If your payment was deducted, your order is recorded.'}
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => verifyPayment(true)}
                sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 800, '&:hover': { bgcolor: colors.limeLt } }}
              >
                Retry Verification
              </Button>
              <Button
                component={Link}
                to="/my-tickets"
                variant="outlined"
                sx={{ borderColor: colors.border, color: colors.fg, fontWeight: 700 }}
              >
                View My Tickets
              </Button>
            </Box>
          </Paper>
        )}

        {/* State: SUCCESS */}
        {paymentState === 'SUCCESS' && (
          <Box>
            {/* Success Celebration Banner */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 4 },
                bgcolor: '#FEFDFB',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                mb: 4,
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'rgba(181, 224, 42, 0.2)',
                  color: colors.limeFg,
                  mb: 2,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 44, color: '#3A7D0A' }} />
              </Box>

              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: colors.coral,
                  letterSpacing: '0.08em',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                PAYMENT CONFIRMED
              </Typography>

              <Typography
                component="h1"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: { xs: '1.8rem', sm: '2.5rem' },
                  textTransform: 'uppercase',
                  color: colors.fg,
                  lineHeight: 1.15,
                  mb: 1.5,
                }}
              >
                YOUR TICKETS ARE READY!
              </Typography>

              <Typography variant="body1" sx={{ color: colors.mutedFg, maxWidth: 540, mx: 'auto', mb: 3 }}>
                Thank you for your purchase. Your digital tickets with secure QR codes have been issued and saved to your account.
              </Typography>

              {/* Order summary pill grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' },
                  gap: 1.5,
                  p: 2,
                  bgcolor: colors.bg,
                  borderRadius: '6px',
                  border: `1px solid ${colors.border}`,
                  mb: 3,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: colors.mutedFg, display: 'block' }}>
                    AMOUNT PAID
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: colors.fg }}>
                    {details?.amountKes ? formatKes(details.amountKes) : 'Confirmed'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: colors.mutedFg, display: 'block' }}>
                    PAYMENT REF
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800, color: colors.fg, fontFamily: 'monospace', fontSize: '0.78rem' }}
                  >
                    {reference.slice(0, 12)}…
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: colors.mutedFg, display: 'block' }}>
                    DATE & TIME
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.fg, fontSize: '0.78rem' }}>
                    {details?.paidAt ? formatDate(details.paidAt) : 'Just now'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: colors.mutedFg, display: 'block' }}>
                    STATUS
                  </Typography>
                  <Chip
                    size="small"
                    label="PAID"
                    sx={{
                      bgcolor: colors.lime,
                      color: colors.limeFg,
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      height: 22,
                    }}
                  />
                </Box>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                {tickets.length > 0 && (
                  <Button
                    variant="contained"
                    startIcon={
                      isDownloadingAll ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon sx={{ fontSize: 20 }} />
                    }
                    onClick={handleDownloadAllTickets}
                    disabled={isDownloadingAll}
                    sx={{
                      bgcolor: colors.lime,
                      color: colors.limeFg,
                      fontWeight: 800,
                      px: 3,
                      py: 1.2,
                      fontSize: '0.9rem',
                      '&:hover': { bgcolor: colors.limeLt },
                    }}
                  >
                    {isDownloadingAll
                      ? 'Generating PDF...'
                      : tickets.length > 1
                      ? `Download All ${tickets.length} Tickets (PDF)`
                      : 'Download Ticket (PDF)'}
                  </Button>
                )}

                <Button
                  component={Link}
                  to="/my-tickets"
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    borderColor: colors.border,
                    color: colors.fg,
                    fontWeight: 700,
                    px: 3,
                    py: 1.2,
                    bgcolor: '#fff',
                    '&:hover': { bgcolor: colors.mutedBg },
                  }}
                >
                  View in My Tickets
                </Button>
              </Box>
            </Paper>

            {/* Verification Notice if Email/Phone Verification is Required for QR unlock */}
            {verificationRequired && (
              <Alert
                severity="info"
                icon={<VerifiedUserIcon fontSize="inherit" />}
                sx={{ mb: 4, borderRadius: '8px', border: `1px solid ${colors.border}` }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Verify your email or phone number to reveal QR entry codes
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  To prevent unauthorized duplicate entry, each paid ticket requires at least one verified contact method to unlock gate scanning.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {!emailVerified && (
                    <Button
                      component={Link}
                      to="/verify-email"
                      size="small"
                      variant="contained"
                      sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 800 }}
                    >
                      VERIFY EMAIL
                    </Button>
                  )}
                  {!phoneVerified && (
                    <Button component={Link} to="/profile" size="small" variant="outlined" sx={{ fontWeight: 800 }}>
                      VERIFY PHONE NUMBER
                    </Button>
                  )}
                </Box>
              </Alert>
            )}

            {/* Unauthenticated notice if user session expired */}
            {!user && (
              <Alert severity="warning" sx={{ mb: 4, borderRadius: '8px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Signed out session
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Please sign in with the account you used for checkout to view full ticket passes and signed gate QR codes.
                </Typography>
                <Button
                  component={Link}
                  to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                  variant="contained"
                  size="small"
                  sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 800 }}
                >
                  Sign In to Access Tickets
                </Button>
              </Alert>
            )}

            {/* Issued Ticket Passes List */}
            {tickets.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      fontSize: '1.3rem',
                      textTransform: 'uppercase',
                      color: colors.fg,
                    }}
                  >
                    Issued Passes ({tickets.length})
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700 }}>
                    Gate check-in ready
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                  {tickets.map((ticket) => (
                    <Paper
                      key={ticket.id}
                      elevation={0}
                      sx={{
                        bgcolor: '#FEFDFB',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        overflow: 'hidden',
                        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      {/* Ticket Card Header with Event Banner */}
                      <Box
                        sx={{
                          height: 96,
                          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.78)), url(${eventCoverUrl(
                            ticket.event.coverImage
                          )})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          p: 2.5,
                          color: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip
                            size="small"
                            label={ticket.status === 'CHECKED_IN' ? 'ADMITTED' : ticket.status === 'VOID' ? 'VOID' : 'VALID PASS'}
                            sx={{
                              bgcolor: colors.lime,
                              color: colors.limeFg,
                              fontWeight: 900,
                              fontSize: '0.68rem',
                              height: 22,
                            }}
                          />
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, opacity: 0.9 }}>
                            Pass #{ticket.serialNumber}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: '"Archivo Black", sans-serif',
                            fontSize: { xs: '1.05rem', sm: '1.25rem' },
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                          }}
                        >
                          {ticket.event.title}
                        </Typography>
                      </Box>

                      {/* Event Date & Location Strip */}
                      <Box sx={{ p: 2, bgcolor: colors.bg, borderBottom: `1px dashed ${colors.border}` }}>
                        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', color: colors.mutedFg, fontSize: '0.84rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                            <CalendarMonthIcon sx={{ fontSize: 18, color: colors.coral }} />
                            <span>{formatDate(ticket.event.startsAt)}</span>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                            <LocationOnIcon sx={{ fontSize: 18, color: colors.coral }} />
                            <span>
                              {ticket.event.venue}, {ticket.event.city}
                            </span>
                          </Box>
                        </Box>
                      </Box>

                      {/* Ticket Body: Details & QR Code */}
                      <Box
                        sx={{
                          p: 3,
                          display: 'flex',
                          gap: 3,
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        }}
                      >
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, display: 'block' }}
                          >
                            TICKET TIER
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: colors.fg, mb: 1 }}>
                            {ticket.ticketType.name}
                          </Typography>

                          <Divider sx={{ my: 1.5, borderColor: colors.border }} />

                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, display: 'block' }}
                              >
                                TICKET HOLDER
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: colors.fg }}>
                                {ticket.holderName || ticket.holderEmail}
                              </Typography>
                            </Box>
                            {ticket.paymentRef && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, display: 'block' }}
                                >
                                  PAYMENT REF
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: colors.success, fontFamily: 'monospace' }}>
                                  {ticket.paymentRef}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          <Typography
                            variant="caption"
                            sx={{ display: 'block', mt: 1.5, fontFamily: 'monospace', color: colors.mutedFg }}
                          >
                            Ticket ID: {ticket.id.slice(0, 8)}…
                          </Typography>

                          {/* Individual Action Buttons */}
                          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 2.5 }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={
                                downloadingTicketId === ticket.id ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <DownloadIcon sx={{ fontSize: 16 }} />
                                )
                              }
                              onClick={() => handleDownloadTicketPdf(ticket)}
                              disabled={downloadingTicketId === ticket.id}
                              sx={{
                                bgcolor: colors.fg,
                                color: '#fff',
                                fontWeight: 700,
                                textTransform: 'none',
                                fontSize: '0.82rem',
                                '&:hover': { bgcolor: '#2C2825' },
                              }}
                            >
                              Download PDF
                            </Button>

                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ShareIcon sx={{ fontSize: 16 }} />}
                              onClick={() => handleShareTicket(ticket)}
                              sx={{
                                borderColor: colors.border,
                                color: colors.fg,
                                fontWeight: 700,
                                textTransform: 'none',
                                fontSize: '0.82rem',
                                '&:hover': { bgcolor: colors.mutedBg },
                              }}
                            >
                              Share Ticket
                            </Button>
                          </Box>
                        </Box>

                        {/* Interactive QR Code Pass */}
                        <TicketQrBlock
                          qrPayload={ticket.qrPayload}
                          ticketLabel={`${ticket.event.title}-${ticket.serialNumber}`}
                          locked={verificationRequired || !ticket.qrPayload}
                          emailVerified={emailVerified}
                          phoneVerified={phoneVerified}
                          ticketDetails={{
                            eventTitle: ticket.event.title,
                            ticketType: ticket.ticketType.name,
                            holderName: ticket.holderName,
                            date: formatDate(ticket.event.startsAt),
                            venue: ticket.event.venue,
                            city: ticket.event.city,
                            serialNumber: ticket.serialNumber,
                            ticketId: ticket.id,
                          }}
                          lockedMessage={
                            verificationRequired
                              ? 'Verify email or phone to unlock'
                              : ticket.status === 'VOID'
                              ? 'Ticket voided'
                              : undefined
                          }
                        />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}
