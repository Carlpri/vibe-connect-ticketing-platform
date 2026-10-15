import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Alert,
} from '@mui/material';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PaymentsIcon from '@mui/icons-material/Payments';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import PlaceIcon from '@mui/icons-material/Place';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import type { Event } from '../types';
import { colors } from '../styles/theme';
import { formatEventDate, formatKes } from '../utils/format';

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOrganizerEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventService.getEvents();
      if (res.data) {
        // Filter events belonging to this organizer (by ID or organizer name)
        const myEvents = res.data.filter(
          (e) =>
            (user?.id && e.organizerId === user.id) ||
            (user?.name && e.organizerName?.toLowerCase() === user.name.toLowerCase())
        );
        // If no events match this specific organizer yet, show all events with a clear label or myEvents
        setEvents(myEvents.length > 0 ? myEvents : res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerEvents();
  }, [user]);

  const handleDelete = async (eventId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to cancel or remove "${title}"?`)) {
      return;
    }
    setDeletingId(eventId);
    try {
      await eventService.deleteEvent(eventId);
      toast.success(`"${title}" removed successfully`);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not delete event');
    } finally {
      setDeletingId(null);
    }
  };

  // Compute metrics
  const totalEvents = events.length;
  const totalCapacity = events.reduce(
    (acc, ev) => acc + (ev.ticketTypes?.reduce((tAcc, t) => tAcc + (t.capacity || 0), 0) || 0),
    0
  );
  const totalSold = events.reduce(
    (acc, ev) => acc + (ev.ticketTypes?.reduce((tAcc, t) => tAcc + ((t as any).sold || 0), 0) || 0),
    0
  );
  const estimatedRevenue = events.reduce(
    (acc, ev) =>
      acc +
      (ev.ticketTypes?.reduce(
        (tAcc, t) => tAcc + ((t as any).sold || 0) * (t.priceKes || 0),
        0
      ) || 0),
    0
  );

  return (
    <Box sx={{ minHeight: '90vh', bgcolor: colors.bg, py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        {/* Top Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 4,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                  color: colors.fg,
                }}
              >
                Organizer Dashboard
              </Typography>
              <Chip
                label="ORGANIZER"
                size="small"
                sx={{
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  letterSpacing: '0.04em',
                }}
              />
            </Box>
            <Typography variant="body1" sx={{ color: colors.mutedFg, fontWeight: 500 }}>
              Welcome back, <strong>{user?.name || 'Creator'}</strong>. Manage your ticket inventory, dates, and live events.
            </Typography>
          </Box>

          <Button
            component={Link}
            to="/create-event"
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            sx={{
              bgcolor: colors.lime,
              color: colors.limeFg,
              fontWeight: 800,
              fontSize: '0.92rem',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              px: 3,
              py: 1.4,
              borderRadius: '8px',
              boxShadow: '0 4px 14px rgba(181, 224, 42, 0.4)',
              '&:hover': {
                bgcolor: colors.limeLt,
                boxShadow: '0 6px 20px rgba(181, 224, 42, 0.6)',
              },
            }}
          >
            Create New Event
          </Button>
        </Box>

        {/* Stats Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2.5,
            mb: 5,
          }}
        >
          <Card
            sx={{
              p: 2.5,
              bgcolor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Events
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: colors.fg, mt: 0.5 }}>
                  {totalEvents}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '10px',
                  bgcolor: 'rgba(181, 224, 42, 0.2)',
                  color: colors.limeFg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <EventAvailableIcon />
              </Box>
            </Box>
          </Card>

          <Card
            sx={{
              p: 2.5,
              bgcolor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700, textTransform: 'uppercase' }}>
                  Tickets Sold
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: colors.fg, mt: 0.5 }}>
                  {totalSold}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '10px',
                  bgcolor: 'rgba(232, 80, 58, 0.15)',
                  color: colors.coral,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConfirmationNumberIcon />
              </Box>
            </Box>
          </Card>

          <Card
            sx={{
              p: 2.5,
              bgcolor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Capacity
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: colors.fg, mt: 0.5 }}>
                  {totalCapacity}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '10px',
                  bgcolor: 'rgba(56, 189, 248, 0.15)',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ConfirmationNumberIcon />
              </Box>
            </Box>
          </Card>

          <Card
            sx={{
              p: 2.5,
              bgcolor: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: colors.mutedFg, fontWeight: 700, textTransform: 'uppercase' }}>
                  Estimated Revenue
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: colors.fg, mt: 0.5 }}>
                  {formatKes(estimatedRevenue)}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '10px',
                  bgcolor: 'rgba(43, 184, 90, 0.15)',
                  color: colors.success,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PaymentsIcon />
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Section: Your Events */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Archivo Black", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              color: colors.fg,
            }}
          >
            Your Published Events ({events.length})
          </Typography>
          <Button
            size="small"
            onClick={fetchOrganizerEvents}
            sx={{ color: colors.mutedFg, textTransform: 'none', fontWeight: 600 }}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : events.length === 0 ? (
          <Card
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: colors.cardBg,
              border: `1px dashed ${colors.border}`,
              borderRadius: '16px',
            }}
          >
            <ConfirmationNumberIcon sx={{ fontSize: 60, color: colors.mutedFg, mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: colors.fg }}>
              No Events Found
            </Typography>
            <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 3, maxWidth: 450, mx: 'auto' }}>
              You haven't published any events yet. Create your first event now and start selling digital tickets.
            </Typography>
            <Button
              component={Link}
              to="/create-event"
              variant="contained"
              sx={{ bgcolor: colors.lime, color: colors.limeFg, fontWeight: 700 }}
            >
              Create My First Event
            </Button>
          </Card>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 3,
            }}
          >
            {events.map((event) => {
              const minPrice =
                event.ticketTypes && event.ticketTypes.length > 0
                  ? Math.min(...event.ticketTypes.map((t) => t.priceKes))
                  : 0;
              const totalEventCap =
                event.ticketTypes?.reduce((acc, t) => acc + (t.capacity || 0), 0) || 0;
              const totalEventAvail =
                event.ticketTypes?.reduce((acc, t) => acc + (t.available ?? t.capacity ?? 0), 0) || 0;

              return (
                <Card
                  key={event.id}
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    bgcolor: colors.cardBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                    },
                  }}
                >
                  {/* Event Cover Image */}
                  <CardMedia
                    component="img"
                    sx={{
                      width: { xs: '100%', sm: 180 },
                      height: { xs: 160, sm: 'auto' },
                      objectFit: 'cover',
                      bgcolor: colors.ink,
                    }}
                    image={
                      event.coverImage ||
                      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={event.title}
                  />

                  {/* Event Info */}
                  <CardContent sx={{ flex: 1, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        label={event.category}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          bgcolor: colors.mutedBg,
                          color: colors.fg,
                        }}
                      />
                      <Chip
                        label={event.status}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          bgcolor: event.status === 'PUBLISHED' ? 'rgba(43, 184, 90, 0.15)' : colors.mutedBg,
                          color: event.status === 'PUBLISHED' ? colors.success : colors.mutedFg,
                        }}
                      />
                    </Box>

                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        lineHeight: 1.3,
                        color: colors.fg,
                        mb: 1,
                      }}
                    >
                      {event.title}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: colors.mutedFg, fontSize: '0.82rem' }}>
                        <CalendarMonthIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {formatEventDate(event.startsAt)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: colors.mutedFg, fontSize: '0.82rem' }}>
                        <PlaceIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {event.venue}, {event.city}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Ticket Tiers overview */}
                    <Box
                      sx={{
                        bgcolor: colors.mutedBg,
                        borderRadius: '8px',
                        p: 1.2,
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', color: colors.mutedFg, fontWeight: 600 }}>
                          Starting Price
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: colors.fg }}>
                          {minPrice === 0 ? 'FREE' : formatKes(minPrice)}
                        </Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', color: colors.mutedFg, fontWeight: 600 }}>
                          Available / Total
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: colors.fg }}>
                          {totalEventAvail} / {totalEventCap}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Button
                        component={Link}
                        to={`/events/${event.slug || event.id}`}
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        sx={{
                          color: colors.fg,
                          borderColor: colors.border,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          '&:hover': { borderColor: colors.fg, bgcolor: 'transparent' },
                        }}
                      >
                        View Public Page
                      </Button>
                      <Tooltip title="Delete Event">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(event.id, event.title)}
                          disabled={deletingId === event.id}
                          sx={{
                            color: colors.coral,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            '&:hover': { bgcolor: 'rgba(232, 80, 58, 0.1)' },
                          }}
                        >
                          {deletingId === event.id ? (
                            <CircularProgress size={16} sx={{ color: colors.coral }} />
                          ) : (
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}
