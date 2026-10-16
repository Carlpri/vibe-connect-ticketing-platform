import { useState, useEffect, useMemo } from 'react';
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
  Button,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import EventCard from '../components/events/EventCard';
import EventFilters from '../components/events/EventFilters';
import PageMeta from '../components/common/PageMeta';
import { EventGridSkeleton } from '../components/common/LoadingSkeleton';
import { useEventsList } from '../hooks/useEventsList';
import { colors } from '../styles/theme';

/**
 * Robust date matching for 'Today', 'This Weekend', and 'This Month'.
 */
function matchesDateFilter(eventDateStr: string, eventEndStr: string | undefined, filter: string): boolean {
  if (filter === 'Any Date' || filter === 'All') return true;

  const eventStart = new Date(eventDateStr);
  if (isNaN(eventStart.getTime())) return true;
  const eventEnd = eventEndStr ? new Date(eventEndStr) : eventStart;

  const now = new Date();

  if (filter === 'Today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    // Event starts today or is ongoing today
    return (
      (eventStart >= todayStart && eventStart <= todayEnd) ||
      (eventStart <= todayStart && eventEnd >= todayStart)
    );
  }

  if (filter === 'This Weekend') {
    // Current or upcoming weekend: Friday to Sunday
    const currentDay = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
    const friday = new Date(now);

    if (currentDay === 0) {
      // It's Sunday today -> weekend started 2 days ago (Friday)
      friday.setDate(now.getDate() - 2);
    } else if (currentDay === 6) {
      // It's Saturday today -> weekend started yesterday (Friday)
      friday.setDate(now.getDate() - 1);
    } else if (currentDay === 5) {
      // It's Friday today
    } else {
      // Monday to Thursday -> upcoming Friday
      friday.setDate(now.getDate() + (5 - currentDay));
    }
    friday.setHours(0, 0, 0, 0);

    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    sunday.setHours(23, 59, 59, 999);

    return (
      (eventStart >= friday && eventStart <= sunday) ||
      (eventStart <= friday && eventEnd >= friday)
    );
  }

  if (filter === 'This Month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return (
      (eventStart >= monthStart && eventStart <= monthEnd) ||
      (eventStart <= monthStart && eventEnd >= monthStart)
    );
  }

  return true;
}

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All Categories';
  const initialLocation = searchParams.get('location') || searchParams.get('city') || 'All Locations';
  const isWeekendParam = searchParams.get('weekend') === 'true';
  const initialDate = isWeekendParam ? 'This Weekend' : (searchParams.get('date') || 'Any Date');
  const initialPrice = searchParams.get('price') || 'Any Price';

  const [search, setSearch] = useState(initialSearch);
  const [date, setDate] = useState(initialDate);
  const [location, setLocation] = useState(initialLocation);
  const [category, setCategory] = useState(initialCategory);
  const [price, setPrice] = useState(initialPrice);
  const [timeTab, setTimeTab] = useState<'All' | 'Today' | 'This Weekend' | 'This Month'>(
    initialDate === 'Today' || initialDate === 'This Weekend' || initialDate === 'This Month'
      ? initialDate
      : 'All'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Query backend with base params (without overly restrictive parameters so client-side filter is instant)
  const listQuery = useMemo(
    () => ({
      search: search || undefined,
      category: category !== 'All Categories' ? category : undefined,
      city: location !== 'All Locations' ? location : undefined,
    }),
    [search, category, location]
  );

  const { events, loading, error } = useEventsList(listQuery);
  const awaitingFirstLoad = loading && events.length === 0;

  // Sync state to URL search parameters
  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (category !== 'All Categories') params.category = category;
    if (location !== 'All Locations') params.location = location;
    if (date !== 'Any Date') params.date = date;
    if (price !== 'Any Price') params.price = price;
    setSearchParams(params, { replace: true });
  }, [search, category, location, date, price, setSearchParams]);

  // Synchronize Date dropdown changes with Time tabs
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (newDate === 'Any Date') {
      setTimeTab('All');
    } else if (newDate === 'Today' || newDate === 'This Weekend' || newDate === 'This Month') {
      setTimeTab(newDate);
    }
  };

  // Synchronize Time tabs changes with Date dropdown
  const handleTimeTabChange = (newTab: 'All' | 'Today' | 'This Weekend' | 'This Month') => {
    setTimeTab(newTab);
    if (newTab === 'All') {
      setDate('Any Date');
    } else {
      setDate(newTab);
    }
  };

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
    timeTab !== 'All' ||
    location !== 'All Locations' ||
    category !== 'All Categories' ||
    price !== 'Any Price';

  // 100% effective client-side filtering on all attributes
  const filteredEvents = events.filter((ev) => {
    // 1. Text search (matches title, description, venue, city, category, or organizer)
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      const titleMatch = ev.title?.toLowerCase().includes(term);
      const descMatch = ev.description?.toLowerCase().includes(term);
      const venueMatch = ev.venue?.toLowerCase().includes(term);
      const cityMatch = ev.city?.toLowerCase().includes(term);
      const catMatch = ev.category?.toLowerCase().includes(term);
      const orgMatch = ev.organizerName?.toLowerCase().includes(term);
      if (!titleMatch && !descMatch && !venueMatch && !cityMatch && !catMatch && !orgMatch) {
        return false;
      }
    }

    // 2. Category filter
    if (category !== 'All Categories') {
      if (ev.category?.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
    }

    // 3. Location filter (matches city, venue, or county)
    if (location !== 'All Locations') {
      const loc = location.toLowerCase();
      const cityMatch = ev.city?.toLowerCase().includes(loc);
      const venueMatch = ev.venue?.toLowerCase().includes(loc);
      const countyMatch = ev.county?.toLowerCase().includes(loc);
      if (!cityMatch && !venueMatch && !countyMatch) {
        return false;
      }
    }

    // 4. Date / Time tab filter
    const activeDateFilter = date !== 'Any Date' ? date : (timeTab !== 'All' ? timeTab : 'Any Date');
    if (!matchesDateFilter(ev.startsAt, ev.endsAt, activeDateFilter)) {
      return false;
    }

    // 5. Price filter
    const ticketPrices = ev.ticketTypes?.map((t) => t.priceKes) ?? [];
    const minPrice = ticketPrices.length > 0 ? Math.min(...ticketPrices) : 0;

    if (price === 'Free') {
      const hasFree = ticketPrices.length === 0 || minPrice === 0 || ticketPrices.some((p) => p === 0);
      if (!hasFree) return false;
    } else if (price === 'Under KES 500') {
      const hasUnder500 = minPrice < 500 || ticketPrices.some((p) => p < 500);
      if (!hasUnder500) return false;
    } else if (price === 'KES 500–1,000') {
      const hasInRange =
        (minPrice >= 500 && minPrice <= 1000) ||
        ticketPrices.some((p) => p >= 500 && p <= 1000);
      if (!hasInRange) return false;
    } else if (price === 'Over KES 1,000') {
      const hasOver1000 = minPrice > 1000 || ticketPrices.some((p) => p > 1000);
      if (!hasOver1000) return false;
    }

    return true;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: { xs: 4, md: 6 }, pb: 12 }}>
      <PageMeta title="Explore Events" path="/events" />
      <Container maxWidth="lg">
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
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
              p: '2px 10px',
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
          onDateChange={handleDateChange}
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
          {/* Time tabs synchronized with Date dropdown */}
          <Tabs
            value={timeTab}
            onChange={(_, val) => handleTimeTabChange(val)}
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
            <Typography variant="body2" sx={{ fontWeight: 700, color: colors.mutedFg }}>
              {awaitingFirstLoad
                ? 'Loading events…'
                : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'event' : 'events'} found`}
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
        {awaitingFirstLoad ? (
          <EventGridSkeleton count={8} />
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
            <Typography variant="body2" sx={{ color: colors.mutedFg, maxWidth: 420, mb: 3 }}>
              Try adjusting your search keywords, clearing your filters, or picking a different date or city.
            </Typography>
            {hasActiveFilters && (
              <Button
                variant="contained"
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
              </Button>
            )}
          </Box>
        ) : viewMode === 'grid' ? (
          /* Single event per row horizontally on phone screens (xs: 1fr), 2 on tablet, 4 on desktop */
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 2.5, sm: 3, md: 3.5 },
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
