import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  InputBase,
  Paper,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import EventCard from '../components/events/EventCard';
import EventFilters from '../components/events/EventFilters';
import { eventService } from '../services/eventService';
import type { Event } from '../types';
import { colors } from '../styles/theme';

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All Categories';
  const initialLocation = searchParams.get('location') || searchParams.get('city') || 'All Locations';
  const initialDate = searchParams.get('date') || 'Any Date';
  const initialPrice = searchParams.get('price') || 'Any Price';

  const [search, setSearch] = useState(initialSearch);
  const [date, setDate] = useState(initialDate);
  const [location, setLocation] = useState(initialLocation);
  const [category, setCategory] = useState(initialCategory);
  const [price, setPrice] = useState(initialPrice);
  const [timeTab, setTimeTab] = useState<'All' | 'Today' | 'This Weekend' | 'This Month'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (category !== 'All Categories') params.category = category;
    if (location !== 'All Locations') params.location = location;
    if (date !== 'Any Date') params.date = date;
    if (price !== 'Any Price') params.price = price;
    setSearchParams(params, { replace: true });
  }, [search, category, location, date, price, setSearchParams]);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const res = await eventService.getEvents({
          search: search || undefined,
          category: category !== 'All Categories' ? category : undefined,
          city: location !== 'All Locations' ? location : undefined,
        });
        setEvents(res.data || []);
      } catch (err) {
        console.error('Failed to load events', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [search, category, location]);

  const handleClear = () => {
    setSearch('');
    setDate('Any Date');
    setLocation('All Locations');
    setCategory('All Categories');
    setPrice('Any Price');
    setTimeTab('All');
  };

  const hasActiveFilters =
    Boolean(search) ||
    date !== 'Any Date' ||
    location !== 'All Locations' ||
    category !== 'All Categories' ||
    price !== 'Any Price';

  // Client-side filtering for price and time tab if needed
  const filteredEvents = events.filter((ev) => {
    // Price filter
    if (price === 'Free') {
      const minPrice = ev.ticketTypes?.length
        ? Math.min(...ev.ticketTypes.map((t) => t.priceKes))
        : 0;
      if (minPrice > 0) return false;
    } else if (price === 'Under KES 500') {
      const minPrice = ev.ticketTypes?.length
        ? Math.min(...ev.ticketTypes.map((t) => t.priceKes))
        : 0;
      if (minPrice >= 500) return false;
    } else if (price === 'KES 500–1,000') {
      const minPrice = ev.ticketTypes?.length
        ? Math.min(...ev.ticketTypes.map((t) => t.priceKes))
        : 0;
      if (minPrice < 500 || minPrice > 1000) return false;
    } else if (price === 'Over KES 1,000') {
      const minPrice = ev.ticketTypes?.length
        ? Math.min(...ev.ticketTypes.map((t) => t.priceKes))
        : 0;
      if (minPrice <= 1000) return false;
    }
    return true;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: { xs: 4, md: 6 }, pb: 12 }}>
      <Container maxWidth="lg">
        {/* Discovery Header matching SHIKA: Label, Large Heading, Search field beside */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            gap: 3,
            mb: 4,
          }}
        >
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
              FIND YOUR CROWD
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontWeight: 400,
                fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.8rem' },
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: colors.fg,
              }}
            >
              EXPLORE EVENTS
            </Typography>
          </Box>

          {/* Search field beside heading on desktop */}
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: '2px 8px',
              width: { xs: '100%', md: 360 },
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              bgcolor: '#FEFDFB',
            }}
          >
            <SearchIcon sx={{ color: colors.mutedFg, mr: 1, fontSize: 20 }} />
            <InputBase
              placeholder="Search events, artists, venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                flex: 1,
                fontSize: '0.9rem',
                fontFamily: 'Manrope, sans-serif',
                color: colors.fg,
                '& ::placeholder': { color: colors.mutedFg, opacity: 1 },
              }}
            />
          </Paper>
        </Box>

        {/* Four Filter Dropdowns */}
        <EventFilters
          selectedDate={date}
          onDateChange={setDate}
          selectedLocation={location}
          onLocationChange={setLocation}
          selectedCategory={category}
          onCategoryChange={setCategory}
          selectedPrice={price}
          onPriceChange={setPrice}
          onClear={handleClear}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Results Controls: Time tabs, grid/list view icons, event count */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            borderBottom: `1px solid ${colors.border}`,
            pb: 1.5,
            mb: 4,
          }}
        >
          {/* Time tabs */}
          <Tabs
            value={timeTab}
            onChange={(_, val) => setTimeTab(val)}
            sx={{
              minHeight: 36,
              '& .MuiTabs-indicator': { bgcolor: colors.lime, height: 3 },
            }}
          >
            {(['All', 'Today', 'This Weekend', 'This Month'] as const).map((tab) => (
              <Tab
                key={tab}
                value={tab}
                label={tab}
                sx={{
                  minHeight: 36,
                  py: 0.5,
                  px: 1.8,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: timeTab === tab ? colors.fg : colors.mutedFg,
                  '&.Mui-selected': { color: colors.fg },
                }}
              />
            ))}
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: colors.mutedFg }}>
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
            </Typography>

            {/* Grid / List controls */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => setViewMode('grid')}
                sx={{
                  color: viewMode === 'grid' ? colors.limeFg : colors.mutedFg,
                  bgcolor: viewMode === 'grid' ? colors.lime : 'transparent',
                  borderRadius: '6px',
                  p: 0.6,
                  '&:hover': { bgcolor: viewMode === 'grid' ? colors.limeLt : colors.mutedBg },
                }}
                aria-label="Grid view"
              >
                <GridViewIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewMode('list')}
                sx={{
                  color: viewMode === 'list' ? colors.limeFg : colors.mutedFg,
                  bgcolor: viewMode === 'list' ? colors.lime : 'transparent',
                  borderRadius: '6px',
                  p: 0.6,
                  '&:hover': { bgcolor: viewMode === 'list' ? colors.limeLt : colors.mutedBg },
                }}
                aria-label="List view"
              >
                <ViewListIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Results grid or empty state */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: colors.lime }} />
          </Box>
        ) : filteredEvents.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 12,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: colors.mutedBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <SearchIcon sx={{ fontSize: 32, color: colors.mutedFg }} />
            </Box>
            <Typography
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontWeight: 400,
                fontSize: '1.4rem',
                textTransform: 'uppercase',
                color: colors.fg,
                mb: 1,
              }}
            >
              NO EVENTS MATCH
            </Typography>
            <Typography variant="body2" sx={{ color: colors.mutedFg, maxWidth: 400, mb: 3 }}>
              Try adjusting your search keywords, clearing your filters, or picking a different date or city.
            </Typography>
            {hasActiveFilters && (
              <IconButton
                onClick={handleClear}
                sx={{
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  px: 3,
                  py: 1,
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  '&:hover': { bgcolor: colors.limeLt },
                }}
              >
                Clear All Filters
              </IconButton>
            )}
          </Box>
        ) : viewMode === 'grid' ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 2, sm: 3, md: 3.5 },
            }}
          >
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} viewMode="grid" />
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} viewMode="list" />
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
