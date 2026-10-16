import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  InputBase,
  Paper,
  Alert,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EventCard from '../components/events/EventCard';
import PageMeta from '../components/common/PageMeta';
import { EventGridSkeleton } from '../components/common/LoadingSkeleton';
import { useEventsList } from '../hooks/useEventsList';
import { colors } from '../styles/theme';

const CATEGORIES = [
  'Music',
  'Parties',
  'Festivals',
  'Campus',
  'Comedy',
  'Sports',
  'Fashion',
  'Networking',
];

export default function HomePage() {
  const navigate = useNavigate();
  const { events, loading, error } = useEventsList();
  const [searchQuery, setSearchQuery] = useState('');
  const showEventSkeleton = loading && events.length === 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/events');
    }
  };

  // Group events into collections for alternating sections
  const trendingEvents = events.slice(0, 4);
  const weekendEvents = events.slice(2, 6).length ? events.slice(2, 6) : events.slice(0, 4);
  const nearYouEvents = events.slice(4, 8).length ? events.slice(4, 8) : events.slice(0, 4);

  return (
    <Box sx={{ width: '100%', bgcolor: colors.bg, minHeight: '100vh' }}>
      <PageMeta path="/" />
      {error && (
        <Container maxWidth="lg" sx={{ pt: 2 }}>
          <Alert severity="warning">{error}</Alert>
        </Container>
      )}
      {/* ── Section 1: Hero — Full-width event photograph with dark bottom overlay ── */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          minHeight: { xs: '80vh', md: '86vh' },
          display: 'flex',
          alignItems: 'flex-end',
          backgroundImage: `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          overflow: 'hidden',
          mt: '-64px', // pull up underneath transparent/blurred navbar
          pt: '64px',
        }}
      >
        {/* Strong dark gradient overlay at bottom for readability */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(14, 16, 19, 0.95) 0%, rgba(14, 16, 19, 0.65) 45%, rgba(14, 16, 19, 0.25) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Content sits toward bottom-left directly over photograph */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pb: { xs: 6, md: 8 } }}>
          <Box sx={{ maxWidth: 860 }}>
            {/* 1. Lime badge */}
            <Box
              sx={{
                display: 'inline-block',
                bgcolor: colors.lime,
                color: colors.limeFg,
                px: 1.5,
                py: 0.6,
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: { xs: '0.72rem', sm: '0.8rem' },
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                mb: { xs: 1.5, md: 2 },
              }}
            >
              LIVE EXPERIENCES • KENYA
            </Box>

            {/* 2. Large heading */}
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontWeight: 400,
                fontSize: { xs: '2.8rem', sm: '4.5rem', md: '5.8rem' },
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                mb: { xs: 2, md: 2.5 },
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              DISCOVER YOUR NEXT EXPERIENCE
            </Typography>

            {/* 3. Supporting description */}
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: { xs: '0.95rem', md: '1.2rem' },
                lineHeight: 1.5,
                maxWidth: 620,
                mb: { xs: 3, md: 4 },
                textShadow: '0 2px 10px rgba(0,0,0,0.4)',
              }}
            >
              Kenya’s front row to live concerts, cultural festivals, parties, and campus vibes. Instant M-Pesa checkout, verified tickets.
            </Typography>

            {/* 4. Search field directly over photo */}
            <Paper
              component="form"
              onSubmit={handleSearchSubmit}
              elevation={4}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: '4px 6px',
                width: '100%',
                maxWidth: 600,
                borderRadius: '8px',
                bgcolor: '#FEFDFB',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
              }}
            >
              <Box sx={{ p: 1, display: 'flex', color: colors.mutedFg }}>
                <SearchIcon />
              </Box>
              <InputBase
                sx={{
                  ml: 1,
                  flex: 1,
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 600,
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  color: colors.fg,
                  '& ::placeholder': { color: colors.mutedFg, opacity: 1 },
                }}
                placeholder="Search events, artists, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  px: { xs: 2.5, sm: 3.5 },
                  py: 1.1,
                  fontWeight: 800,
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontSize: '0.88rem',
                  '&:hover': {
                    bgcolor: colors.limeLt,
                  },
                }}
              >
                Search
              </Button>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* ── Section 2: Full-width lime category strip ── */}
      <Box
        sx={{
          width: '100%',
          bgcolor: colors.lime,
          py: 2,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              overflowX: 'auto',
              py: 0.5,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {CATEGORIES.map((cat) => (
              <Box
                key={cat}
                onClick={() => navigate(`/events?category=${cat}`)}
                sx={{
                  flexShrink: 0,
                  px: 2.2,
                  py: 0.9,
                  borderRadius: '999px',
                  border: `1.5px solid ${colors.limeFg}`,
                  color: colors.limeFg,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: colors.limeFg,
                    color: colors.lime,
                  },
                }}
              >
                {cat}
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── Collection 1: Trending Now (Light Theme #F7F4EE) ── */}
      <Box sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: colors.coral,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                HOT RIGHT NOW
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontWeight: 400,
                  fontSize: { xs: '1.8rem', sm: '2.4rem', md: '2.8rem' },
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: colors.fg,
                }}
              >
                TRENDING NOW
              </Typography>
            </Box>
            <Button
              component={Link}
              to="/events"
              endIcon={<ArrowForwardIcon />}
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                color: colors.fg,
                fontSize: '0.85rem',
                letterSpacing: '0.04em',
                '&:hover': { color: colors.coral },
              }}
            >
              View All
            </Button>
          </Box>

          {showEventSkeleton ? (
            <EventGridSkeleton count={4} />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: { xs: 2, sm: 3, md: 3.5 },
              }}
            >
              {trendingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </Box>
          )}
        </Container>
      </Box>

      {/* ── Collection 2: Popular This Weekend — Near-Black INK Background (#1C1916) ── */}
      <Box
        sx={{
          bgcolor: colors.ink,
          color: colors.inkFg,
          py: { xs: 7, md: 10 },
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: colors.lime,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                FRIDAY TO SUNDAY
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontWeight: 400,
                  fontSize: { xs: '1.8rem', sm: '2.4rem', md: '2.8rem' },
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: colors.inkFg,
                }}
              >
                POPULAR THIS WEEKEND
              </Typography>
            </Box>
            <Button
              component={Link}
              to="/events?weekend=true"
              endIcon={<ArrowForwardIcon />}
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                color: colors.lime,
                fontSize: '0.85rem',
                letterSpacing: '0.04em',
                '&:hover': { color: colors.limeLt },
              }}
            >
              See Weekend
            </Button>
          </Box>

          {showEventSkeleton ? (
            <EventGridSkeleton count={4} />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: { xs: 2, sm: 3, md: 3.5 },
              }}
            >
              {weekendEvents.map((event) => (
                <Box
                  key={`wknd-${event.id}`}
                  sx={{
                    '& .MuiTypography-root': {
                      '&:has(LocationOnIcon)': { color: 'rgba(250, 247, 242, 0.65)' },
                    },
                    '& h3, & .MuiTypography-h6, & .MuiTypography-root[class*="Archivo"]': {
                      color: `${colors.inkFg} !important`,
                    },
                  }}
                >
                  <EventCard event={event} />
                </Box>
              ))}
            </Box>
          )}
        </Container>
      </Box>

      {/* ── Collection 3: Events Near You (Light Theme #F7F4EE) ── */}
      <Box sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: colors.coral,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                NAIROBI • MOMBASA • KISUMU
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontWeight: 400,
                  fontSize: { xs: '1.8rem', sm: '2.4rem', md: '2.8rem' },
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: colors.fg,
                }}
              >
                EVENTS NEAR YOU
              </Typography>
            </Box>
            <Button
              component={Link}
              to="/events"
              endIcon={<ArrowForwardIcon />}
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                color: colors.fg,
                fontSize: '0.85rem',
                letterSpacing: '0.04em',
                '&:hover': { color: colors.coral },
              }}
            >
              Discover More
            </Button>
          </Box>

          {showEventSkeleton ? (
            <EventGridSkeleton count={4} />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: { xs: 2, sm: 3, md: 3.5 },
              }}
            >
              {nearYouEvents.map((event) => (
                <EventCard key={`near-${event.id}`} event={event} />
              ))}
            </Box>
          )}
        </Container>
      </Box>

      {/* ── Section 4: Lime Promotional Block: “YOUR CITY IS SHOWING UP.” ── */}
      <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 10 } }}>
        <Box
          sx={{
            bgcolor: colors.lime,
            borderRadius: '8px',
            p: { xs: 4, sm: 6, md: 8 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 4,
            boxShadow: '0 12px 40px rgba(181, 224, 42, 0.25)',
          }}
        >
          <Box sx={{ maxWidth: 640 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: colors.limeFg,
                display: 'block',
                mb: 1,
              }}
            >
              ARE YOU AN ORGANIZER OR CREATOR?
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontWeight: 400,
                fontSize: { xs: '2.2rem', sm: '3rem', md: '3.6rem' },
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: colors.limeFg,
                mb: 2,
              }}
            >
              YOUR CITY IS SHOWING UP.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: colors.limeFg,
                fontWeight: 500,
                fontSize: { xs: '1rem', md: '1.15rem' },
                lineHeight: 1.5,
                opacity: 0.9,
              }}
            >
              Sell tickets directly via M-Pesa STK Push. Fast payouts, zero hidden charges, real-time attendee check-in and QR verification at the gate.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, width: { xs: '100%', sm: 'auto' } }}>
            <Button
              component={Link}
              to="/login"
              variant="contained"
              sx={{
                bgcolor: colors.ink,
                color: colors.inkFg,
                px: 4,
                py: 1.6,
                fontWeight: 800,
                fontSize: '0.95rem',
                borderRadius: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: '#000000',
                  color: colors.lime,
                },
              }}
            >
              Host An Event
            </Button>
            <Button
              component={Link}
              to="/events"
              variant="outlined"
              sx={{
                borderColor: colors.limeFg,
                color: colors.limeFg,
                px: 3.5,
                py: 1.6,
                fontWeight: 800,
                fontSize: '0.95rem',
                borderRadius: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: 'rgba(26, 43, 8, 0.1)',
                  borderColor: colors.limeFg,
                },
              }}
            >
              Explore Events
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
