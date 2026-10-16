import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PrintIcon from '@mui/icons-material/Print';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import EmptyState from '../components/common/EmptyState';
import TicketQrBlock from '../components/tickets/TicketQrBlock';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/format';
import { colors } from '../styles/theme';
import { ticketService, type DigitalTicketPass } from '../services/ticketService';
import { eventCoverUrl } from '../utils/eventMedia';

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<DigitalTicketPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTickets() {
      setLoading(true);
      setError(null);
      try {
        const res = await ticketService.getMyTickets();
        if (!isMounted) return;
        const payload = res.data;
        setTickets(payload?.tickets ?? []);
        setVerificationRequired(Boolean(payload?.verificationRequired));
        setEmailVerified(Boolean(payload?.emailVerified));
        setPhoneVerified(Boolean(payload?.phoneVerified));
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.message || 'Could not load your tickets. Try signing in again.');
          setTickets([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTickets();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handlePrint = () => {
    window.print();
  };

  const statusLabel = (ticket: DigitalTicketPass) => {
    if (ticket.status === 'CHECKED_IN') return 'ADMITTED';
    if (ticket.status === 'VOID') return 'VOID';
    return 'VALID';
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: { xs: 4, md: 6 }, pb: 14 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.coral, letterSpacing: '0.08em', display: 'block', mb: 0.5 }}
            >
              DIGITAL WALLET & PASSES
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontWeight: 400,
                fontSize: { xs: '2.2rem', md: '3rem' },
                textTransform: 'uppercase',
                color: colors.fg,
              }}
            >
              MY TICKETS
            </Typography>
          </Box>

          {tickets.length > 0 && !verificationRequired && (
            <Button
              variant="outlined"
              startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
              onClick={handlePrint}
              sx={{
                borderColor: colors.border,
                color: colors.fg,
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                textTransform: 'none',
                bgcolor: '#FEFDFB',
                '&:hover': { bgcolor: colors.mutedBg },
              }}
            >
              Print Passes
            </Button>
          )}
        </Box>

        {verificationRequired && (
          <Alert
            severity="info"
            icon={<VerifiedUserIcon fontSize="inherit" />}
            sx={{ mb: 3, borderRadius: '8px' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
              Verify your email and phone to reveal QR codes and download tickets
            </Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Each pass gets a unique signed QR code after verification. Gate scanners only accept authentic VC1 tickets.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {!emailVerified && (
                <Button component={Link} to="/verify-email" size="small" variant="contained" sx={{ bgcolor: colors.lime, color: colors.limeFg }}>
                  Verify email
                </Button>
              )}
              {!phoneVerified && (
                <Button component={Link} to="/profile" size="small" variant="outlined">
                  Verify phone (Profile)
                </Button>
              )}
            </Box>
          </Alert>
        )}

        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: colors.lime }} />
          </Box>
        ) : tickets.length === 0 ? (
          <EmptyState
            title="NO TICKETS YET"
            description="After you complete M-Pesa checkout for an event like VIBE-CONNECT 001 GOSPEL MIX, your unique passes appear here."
            actionLabel="Discover Events"
            onAction={() => window.location.assign('/events')}
          />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3.5,
            }}
          >
            {tickets.map((ticket) => (
              <Paper
                key={ticket.id}
                elevation={0}
                sx={{
                  bgcolor: '#FEFDFB',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Box
                  sx={{
                    height: 88,
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url(${eventCoverUrl(ticket.event.coverImage)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    p: 2.5,
                    color: '#fff',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        bgcolor: colors.lime,
                        color: colors.limeFg,
                        px: 1.2,
                        py: 0.3,
                        borderRadius: '4px',
                        fontWeight: 900,
                        fontSize: '0.7rem',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {statusLabel(ticket)}
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, opacity: 0.85 }}>
                      #{ticket.serialNumber}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      fontSize: '1.05rem',
                      textTransform: 'uppercase',
                      lineHeight: 1.2,
                    }}
                  >
                    {ticket.event.title}
                  </Typography>
                </Box>

                <Box sx={{ p: 2.5, bgcolor: colors.bg, borderBottom: `1px dashed ${colors.border}` }}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', color: colors.mutedFg, fontSize: '0.82rem' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <CalendarMonthIcon sx={{ fontSize: 16, color: colors.coral }} />
                      <span>{formatDate(ticket.event.startsAt)}</span>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <LocationOnIcon sx={{ fontSize: 16, color: colors.coral }} />
                      <span>
                        {ticket.event.venue}, {ticket.event.city}
                      </span>
                    </Box>
                  </Box>
                </Box>

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
                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, display: 'block', mb: 0.5 }}>
                      TICKET TIER
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.fg }}>
                      {ticket.ticketType.name}
                    </Typography>

                    <Divider sx={{ my: 1.5, borderColor: colors.border }} />

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, display: 'block' }}>
                          ATTENDEE
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: colors.fg }}>
                          {ticket.holderName}
                        </Typography>
                      </Box>
                      {ticket.paymentRef && (
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, display: 'block' }}>
                            M-PESA REF
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: colors.success }}>
                            {ticket.paymentRef}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1.5, fontFamily: 'monospace', color: colors.mutedFg }}>
                      Ticket ID: {ticket.id.slice(0, 8)}…
                    </Typography>
                  </Box>

                  <TicketQrBlock
                    qrPayload={ticket.qrPayload}
                    ticketLabel={`${ticket.event.title}-${ticket.serialNumber}`}
                    locked={verificationRequired || !ticket.qrPayload}
                    lockedMessage={
                      verificationRequired
                        ? 'Verify email & phone to unlock'
                        : ticket.status === 'VOID'
                          ? 'Ticket voided'
                          : undefined
                    }
                  />
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
