import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Breadcrumbs,
  IconButton,
  Paper,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DirectionsIcon from '@mui/icons-material/Directions';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import TicketSelector from '../components/events/TicketSelector';
import EmptyState from '../components/common/EmptyState';
import { eventService } from '../services/eventService';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatKes } from '../utils/format';
import type { Event } from '../types';
import { colors } from '../styles/theme';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await eventService.getEventById(id);
        setEvent(res.data);
      } catch (err: any) {
        setError(err.message || 'Event not found');
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id]);

  const handleQuantityChange = (ticketTypeId: string, newQty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: newQty,
    }));
  };

  const handleProceedToCheckout = () => {
    if (!event) return;
    const selectedItems = (event.ticketTypes || [])
      .filter((t) => (quantities[t.id] || 0) > 0)
      .map((t) => ({
        ticketType: t,
        quantity: quantities[t.id],
      }));

    if (selectedItems.length === 0) return;

    sessionStorage.setItem(
      'vibe_connect_cart',
      JSON.stringify({
        event,
        items: selectedItems,
      })
    );

    navigate('/checkout');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: colors.lime }} />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <EmptyState
          title="Event Not Found"
          description="The event you are looking for might have been moved or is currently unavailable."
          actionLabel="Back to Events"
          onAction={() => navigate('/events')}
        />
      </Container>
    );
  }

  const isFullyVerified = Boolean(user?.emailVerified && user?.phoneVerified);
  const minPrice = event.ticketTypes?.length
    ? Math.min(...event.ticketTypes.map((t) => t.priceKes))
    : 0;

  const scrollToTickets = () => {
    const el = document.getElementById('ticket-selection-area');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, pb: { xs: 16, md: 10 } }}>
      {/* Breadcrumb Bar */}
      <Container maxWidth="lg" sx={{ pt: 2.5, pb: 1.5 }}>
        <Breadcrumbs sx={{ color: colors.mutedFg, fontSize: '0.85rem' }}>
          <Button
            component={Link}
            to="/events"
            startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            sx={{
              color: colors.mutedFg,
              textTransform: 'none',
              px: 0,
              fontSize: '0.85rem',
              fontWeight: 600,
              '&:hover': { color: colors.fg },
            }}
          >
            All Events
          </Button>
          <Typography sx={{ fontSize: '0.85rem', color: colors.fg, fontWeight: 700 }} noWrap>
            {event.title}
          </Typography>
        </Breadcrumbs>
      </Container>

      {/* ── Cover Photo Banner: Compact on mobile, taller on desktop ── */}
      <Container maxWidth="lg">
        <Box
          sx={{
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
            height: { xs: 260, sm: 340, md: 420 },
            bgcolor: colors.ink,
          }}
        >
          <Box
            component="img"
            src={event.coverImage || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85'}
            alt={event.title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Dark gradient overlay */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(14, 16, 19, 0.85) 0%, rgba(14, 16, 19, 0.2) 60%, transparent 100%)',
            }}
          />

          {/* Badges near bottom-left of photo */}
          <Box sx={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {event.category && (
              <Box
                sx={{
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {event.category}
              </Box>
            )}
            {minPrice === 0 ? (
              <Box
                sx={{
                  bgcolor: colors.success,
                  color: '#fff',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                }}
              >
                FREE ADMISSION
              </Box>
            ) : (
              <Box
                sx={{
                  bgcolor: 'rgba(28, 25, 22, 0.75)',
                  backdropFilter: 'blur(8px)',
                  color: colors.inkFg,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                FROM {formatKes(minPrice)}
              </Box>
            )}
          </Box>
        </Box>
      </Container>

      {/* ── Main Information Area (Below Photo on Normal Page Background) ── */}
      <Container maxWidth="lg" sx={{ mt: 3.5 }}>
        {/* Title and Controls Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'flex-start' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ maxWidth: 800 }}>
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontWeight: 400,
                fontSize: { xs: '2rem', sm: '2.8rem', md: '3.4rem' },
                lineHeight: 1,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 1.5,
              }}
            >
              {event.title}
            </Typography>

            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                color: minPrice === 0 ? colors.success : colors.coral,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {minPrice === 0 ? 'FREE • KES 0 ADMISSION' : `STARTING AT ${formatKes(minPrice)}`}
            </Typography>
          </Box>

          {/* Save & Share actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={() => setSaved(!saved)}
              sx={{
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                p: 1,
                color: saved ? colors.coral : colors.fg,
                bgcolor: '#FEFDFB',
                '&:hover': { bgcolor: colors.mutedBg },
              }}
              aria-label="Save event"
            >
              {saved ? <FavoriteIcon sx={{ fontSize: 20 }} /> : <FavoriteBorderIcon sx={{ fontSize: 20 }} />}
            </IconButton>
            <IconButton
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: event.title, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              sx={{
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                p: 1,
                color: colors.fg,
                bgcolor: '#FEFDFB',
                '&:hover': { bgcolor: colors.mutedBg },
              }}
              aria-label="Share event"
            >
              <ShareIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* ── Lower Layout: Main Column (Left) + 360px Sidebar (Right) ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 360px' },
            gap: { xs: 4, md: 5 },
            alignItems: 'start',
          }}
        >
          {/* Main Information Column */}
          <Box>
            {/* Quick Details Strip: Date, Time, Venue */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '8px',
                bgcolor: '#FEFDFB',
                border: `1px solid ${colors.border}`,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2.5,
                mb: 4,
              }}
            >
              {/* Date & Time */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <CalendarMonthIcon sx={{ color: colors.limeFg, fontSize: 24, mt: 0.2 }} />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg }}>
                    DATE
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: colors.fg }}>
                    {formatDate(event.startsAt)}
                  </Typography>
                  {event.endsAt && (
                    <Typography variant="caption" sx={{ color: colors.mutedFg, display: 'block' }}>
                      Until: {formatDate(event.endsAt)}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Venue & Location */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <LocationOnIcon sx={{ color: colors.coral, fontSize: 24, mt: 0.2 }} />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg }}>
                    VENUE & LOCATION
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: colors.fg }}>
                    {event.venue}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.mutedFg, display: 'block' }}>
                    {event.city || 'Nairobi'}, Kenya
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* About / Description */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.25rem',
                  textTransform: 'uppercase',
                  color: colors.fg,
                  mb: 1.5,
                }}
              >
                ABOUT THIS EXPERIENCE
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: colors.fg,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                  fontSize: '0.98rem',
                }}
              >
                {event.description}
              </Typography>
            </Box>

            {/* Organizer Info panel */}
            {event.organizerName && (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '8px',
                  bgcolor: '#FEFDFB',
                  border: `1px solid ${colors.border}`,
                  mb: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    bgcolor: colors.lime,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.limeFg,
                  }}
                >
                  <PersonOutlinedIcon />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: colors.mutedFg, textTransform: 'uppercase' }}>
                    HOSTED BY
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: colors.fg }}>
                    {event.organizerName}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* ── Event Location & Directions ── */}
            {(() => {
              const isOnline = event.format === 'ONLINE';
              const isHybrid = event.format === 'HYBRID';
              const isPhysical = !event.format || event.format === 'PHYSICAL';

              const hasCoords =
                typeof event.latitude === 'number' &&
                typeof event.longitude === 'number' &&
                isFinite(event.latitude) &&
                isFinite(event.longitude);

              // Build an address string from available parts
              const addressParts = [
                event.venue,
                event.address,
                event.city,
                event.county,
                'Kenya',
              ].filter(Boolean);
              const hasAddress = addressParts.length > 1; // more than just "Kenya"

              // Construct Google Maps directions URL
              const buildDirectionsUrl = (): string | null => {
                const base = 'https://www.google.com/maps/dir/?api=1&destination=';
                if (hasCoords) {
                  return `${base}${event.latitude},${event.longitude}`;
                }
                if (hasAddress) {
                  return `${base}${encodeURIComponent(addressParts.join(', '))}`;
                }
                return null;
              };

              const directionsUrl = (isPhysical || isHybrid) ? buildDirectionsUrl() : null;

              return (
                <Box sx={{ mb: 4 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      fontSize: '1.25rem',
                      textTransform: 'uppercase',
                      color: colors.fg,
                      mb: 1.5,
                    }}
                  >
                    EVENT LOCATION
                  </Typography>

                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: '8px',
                      bgcolor: '#FEFDFB',
                      border: `1px solid ${colors.border}`,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Physical / Hybrid venue details */}
                    {(isPhysical || isHybrid) && (event.venue || hasAddress) && (
                      <Box sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <LocationOnIcon sx={{ color: colors.coral, fontSize: 28, mt: 0.2 }} />
                          <Box sx={{ flex: 1 }}>
                            {event.venue && (
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 800, color: colors.fg, mb: 0.25 }}
                              >
                                {event.venue}
                              </Typography>
                            )}
                            {event.address && (
                              <Typography variant="body2" sx={{ color: colors.fg, mb: 0.25 }}>
                                {event.address}
                              </Typography>
                            )}
                            <Typography variant="body2" sx={{ color: colors.mutedFg }}>
                              {[event.city, event.county, 'Kenya'].filter(Boolean).join(', ')}
                            </Typography>
                          </Box>
                        </Box>

                        {directionsUrl && (
                          <Button
                            component="a"
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<DirectionsIcon />}
                            endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                            sx={{
                              mt: 2,
                              bgcolor: colors.coral,
                              color: '#fff',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              px: 3,
                              py: 1.1,
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              letterSpacing: '0.03em',
                              '&:hover': {
                                bgcolor: colors.coralLt,
                                transform: 'translateY(-1px)',
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            Get Directions
                          </Button>
                        )}
                      </Box>
                    )}

                    {/* Online event link */}
                    {(isOnline || isHybrid) && (
                      <Box
                        sx={{
                          p: 2.5,
                          borderTop:
                            isHybrid && (event.venue || hasAddress)
                              ? `1px solid ${colors.border}`
                              : 'none',
                          display: 'flex',
                          gap: 1.5,
                          alignItems: 'flex-start',
                        }}
                      >
                        <LinkIcon sx={{ color: colors.lime, fontSize: 28, mt: 0.2 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 800, color: colors.fg, mb: 0.25 }}
                          >
                            {isHybrid ? 'Also Available Online' : 'Online Event'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 1 }}>
                            {event.onlineUrl
                              ? 'Join from anywhere — a link will be shared upon purchase.'
                              : 'Online access details will be shared closer to the event date.'}
                          </Typography>
                          {event.onlineUrl && (
                            <Button
                              component="a"
                              href={event.onlineUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="outlined"
                              size="small"
                              sx={{
                                borderColor: colors.lime,
                                color: colors.limeFg,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                fontSize: '0.8rem',
                                '&:hover': {
                                  bgcolor: 'rgba(181, 224, 42, 0.08)',
                                  borderColor: colors.limeLt,
                                },
                              }}
                            >
                              Open Link
                            </Button>
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Fallback: no location data at all */}
                    {isPhysical && !event.venue && !hasAddress && !hasCoords && (
                      <Box sx={{ p: 2.5, textAlign: 'center' }}>
                        <LocationOnIcon sx={{ color: colors.mutedFg, fontSize: 32, mb: 1 }} />
                        <Typography variant="body2" sx={{ color: colors.mutedFg }}>
                          Venue details will be announced soon — check back later.
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>
              );
            })()}

            {/* Event Guidance Notice */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: '8px',
                bgcolor: 'rgba(181, 224, 42, 0.1)',
                border: `1px solid ${colors.lime}`,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.limeFg, mb: 0.8 }}>
                IMPORTANT ATTENDEE NOTICE
              </Typography>
              <Typography variant="body2" sx={{ color: colors.fg, fontSize: '0.88rem', lineHeight: 1.6 }}>
                • Instant M-Pesa STK push generates your digital QR ticket immediately upon payment.<br />
                • Digital tickets with live QR code are stored in your account under <strong>My Tickets</strong>.<br />
                • Fast gate check-in powered by real-time scanner verification.
              </Typography>
            </Box>
          </Box>

          {/* Right Column: Ticket Selector area */}
          <Box id="ticket-selection-area" sx={{ position: { md: 'sticky' }, top: { md: 80 } }}>
            <TicketSelector
              ticketTypes={event.ticketTypes || []}
              quantities={quantities}
              onQuantityChange={handleQuantityChange}
              onProceedToCheckout={handleProceedToCheckout}
              isFullyVerified={isFullyVerified}
            />
          </Box>
        </Box>
      </Container>

      {/* ── Mobile Fixed Purchase Bar: sits above bottom navigation ── */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 74, // above mobile bottom nav
          left: 0,
          right: 0,
          zIndex: 1050,
          bgcolor: 'rgba(254, 253, 251, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${colors.border}`,
          px: 2.5,
          py: 1.2,
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700, textTransform: 'uppercase' }}>
            STARTING PRICE
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: '1.1rem',
              color: minPrice === 0 ? colors.success : colors.fg,
            }}
          >
            {minPrice === 0 ? 'FREE' : formatKes(minPrice)}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={scrollToTickets}
          startIcon={<ConfirmationNumberIcon sx={{ fontSize: 18 }} />}
          sx={{
            bgcolor: colors.lime,
            color: colors.limeFg,
            fontWeight: 800,
            textTransform: 'uppercase',
            px: 3,
            py: 1,
            borderRadius: '8px',
            fontSize: '0.85rem',
            '&:hover': { bgcolor: colors.limeLt },
          }}
        >
          {minPrice === 0 ? 'Reserve Spot' : 'Get Tickets'}
        </Button>
      </Box>
    </Box>
  );
}
