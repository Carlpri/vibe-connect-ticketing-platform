import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Button, Divider } from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PrintIcon from '@mui/icons-material/Print';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/format';
import { colors } from '../styles/theme';

interface StoredOrder {
  orderId: string;
  transactionId: string;
  phone: string;
  attendeeName?: string;
  attendeeEmail?: string;
  event: any;
  items: any[];
  totalKes: number;
  createdAt: string;
  qrCodeData: string;
}

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('vibe_connect_orders');
    if (raw) {
      try {
        setOrders(JSON.parse(raw));
      } catch {
        setOrders([]);
      }
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: { xs: 4, md: 6 }, pb: 14 }}>
      <Container maxWidth="lg">
        {/* Header */}
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

          {orders.length > 0 && (
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

        {orders.length === 0 ? (
          <EmptyState
            title="NO TICKETS YET"
            description="You haven't booked any event passes yet. Browse upcoming live concerts, festivals, and campus experiences in Kenya."
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
            {orders.map((order) => (
              <Paper
                key={order.orderId}
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
                {/* Event header strip */}
                <Box sx={{ p: 2.5, bgcolor: colors.bg, borderBottom: `1px dashed ${colors.border}` }}>
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
                      VERIFIED PASS
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: colors.mutedFg, fontWeight: 700 }}>
                      {order.orderId}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      fontWeight: 400,
                      fontSize: '1.2rem',
                      textTransform: 'uppercase',
                      color: colors.fg,
                      mb: 1,
                    }}
                  >
                    {order.event.title}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', color: colors.mutedFg, fontSize: '0.82rem' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <CalendarMonthIcon sx={{ fontSize: 16, color: colors.coral }} />
                      <span>{formatDate(order.event.startsAt)}</span>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <LocationOnIcon sx={{ fontSize: 16, color: colors.coral }} />
                      <span>{order.event.venue}, {order.event.city}</span>
                    </Box>
                  </Box>
                </Box>

                {/* Ticket Details & High-Contrast QR Code */}
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
                      TICKET TIER(S)
                    </Typography>
                    {order.items.map((item, idx) => (
                      <Typography key={idx} variant="subtitle2" sx={{ fontWeight: 800, color: colors.fg }}>
                        {item.quantity} × {item.ticketType.name}
                      </Typography>
                    ))}

                    <Divider sx={{ my: 1.5, borderColor: colors.border }} />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, display: 'block' }}>
                          ATTENDEE
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: colors.fg }}>
                          {order.attendeeName || user?.name || 'Attendee'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, display: 'block' }}>
                          M-PESA REF
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: colors.success }}>
                          {order.transactionId}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Pure High-contrast QR Pass */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      bgcolor: '#0E1013',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.8,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: colors.qrBg,
                        p: 1,
                        borderRadius: '4px',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <QrCode2Icon sx={{ fontSize: 96, color: '#000000' }} />
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: '0.62rem', fontFamily: 'monospace', color: colors.lime, fontWeight: 700 }}>
                      GATE SCAN READY
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
