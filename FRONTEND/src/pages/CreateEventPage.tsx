import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  LinearProgress,
  Chip,
} from '@mui/material';
import { useNavigate, Link, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MapIcon from '@mui/icons-material/Map';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import toast from 'react-hot-toast';

import { eventService } from '../services/eventService';
import type { CreateEventInput, CreateTicketTypeInput, EventFormat, EventStatus, UpdateEventInput } from '../types';
import { colors } from '../styles/theme';
import { getApiErrorMessage } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import LocationMapPicker, { type LocationDetails } from '../components/common/LocationMapPicker';

const CATEGORIES = [
  'Music',
  'Parties',
  'Festivals',
  'Campus',
  'Comedy',
  'Sports',
  'Fashion',
  'Networking',
  'Other',
];

const VENUE_PRESETS = [
  {
    name: 'Sarit Expo Centre',
    venue: 'Sarit Expo Centre',
    city: 'Nairobi',
    county: 'Nairobi County',
    address: 'Pio Gama Pinto Rd, Westlands, Nairobi',
    latitude: -1.2587,
    longitude: 36.7997,
  },
  {
    name: 'Carnivore Grounds',
    venue: 'Carnivore Grounds',
    city: 'Nairobi',
    county: 'Nairobi County',
    address: 'Langata Rd, Nairobi',
    latitude: -1.3283,
    longitude: 36.7958,
  },
  {
    name: 'KICC',
    venue: 'Kenyatta International Convention Centre',
    city: 'Nairobi',
    county: 'Nairobi County',
    address: 'Harambee Ave, Nairobi CBD',
    latitude: -1.2887,
    longitude: 36.8233,
  },
  {
    name: 'The Alchemist',
    venue: 'The Alchemist',
    city: 'Nairobi',
    county: 'Nairobi County',
    address: 'Parklands Rd, Westlands, Nairobi',
    latitude: -1.2644,
    longitude: 36.8041,
  },
  {
    name: 'Uhuru Gardens',
    venue: 'Uhuru Gardens National Monument & Museum',
    city: 'Nairobi',
    county: 'Nairobi County',
    address: 'Langata Rd, Nairobi',
    latitude: -1.3235,
    longitude: 36.8122,
  },
  {
    name: 'Nyayo Stadium',
    venue: 'Nyayo National Stadium',
    city: 'Nairobi',
    county: 'Nairobi County',
    address: 'Aerodrome Rd, Nairobi',
    latitude: -1.3039,
    longitude: 36.8242,
  },
  {
    name: 'Kasarani Stadium',
    venue: 'Moi International Sports Centre Kasarani',
    city: 'Nairobi',
    county: 'Nairobi County',
    address: 'Thika Rd, Kasarani, Nairobi',
    latitude: -1.2267,
    longitude: 36.8928,
  },
  {
    name: 'PrideInn Flamingo (Mombasa)',
    venue: 'PrideInn Flamingo Beach Resort',
    city: 'Mombasa',
    county: 'Mombasa County',
    address: 'Serena Rd, Shanzu, Mombasa',
    latitude: -3.9782,
    longitude: 39.7547,
  },
];

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const isEditMode = Boolean(eventId);
  const canPublish = user?.role === 'ADMIN' || user?.organizerApplicationStatus === 'APPROVED';
  const [submitting, setSubmitting] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Music');
  const [format, setFormat] = useState<EventFormat>('PHYSICAL');
  const [status, setStatus] = useState<EventStatus>(canPublish ? 'PUBLISHED' : 'DRAFT');
  const [coverImage, setCoverImage] = useState('');

  // Default dates: starts tomorrow at 6 PM, ends at 11 PM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 0, 0, 0);

  const formatForInput = (d: Date) => d.toISOString().slice(0, 16);

  const [startsAt, setStartsAt] = useState(formatForInput(tomorrow));
  const [endsAt, setEndsAt] = useState(formatForInput(tomorrowEnd));

  // Location fields
  const [venue, setVenue] = useState('Sarit Expo Centre');
  const [city, setCity] = useState('Nairobi');
  const [county, setCounty] = useState('Nairobi County');
  const [address, setAddress] = useState('Pio Gama Pinto Rd, Westlands, Nairobi');
  const [latitude, setLatitude] = useState<number | string>(-1.2587);
  const [longitude, setLongitude] = useState<number | string>(36.7997);
  const [onlineUrl, setOnlineUrl] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [directions, setDirections] = useState('');

  // Flyer Gallery (up to 10 flyers)
  const [flyers, setFlyers] = useState<Array<{ dataUrl: string; preview: string; id?: string }>>([]);
  const [flyerUploading, setFlyerUploading] = useState(false);
  const flyerInputRef = useRef<HTMLInputElement>(null);

  // Map picker visibility
  const [showMap, setShowMap] = useState(true);

  // Ticket Tiers
  const [ticketTypes, setTicketTypes] = useState<CreateTicketTypeInput[]>([
    {
      name: 'Regular',
      description: 'General admission to event area',
      priceKes: 1500,
      capacity: 300,
      isActive: true,
    },
    {
      name: 'VIP',
      description: 'VIP lounge access, private bar & express entry',
      priceKes: 4000,
      capacity: 50,
      isActive: true,
    },
  ]);

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;
    (async () => {
      setLoadingEvent(true);
      setError(null);
      try {
        const res = await eventService.getEventById(eventId);
        const event = res.data;
        if (!event || cancelled) return;

        setTitle(event.title);
        setDescription(event.description);
        setCategory(event.category);
        setFormat(event.format || 'PHYSICAL');
        setStatus(event.status);
        setCoverImage(event.coverImage || '');
        setStartsAt(formatForInput(new Date(event.startsAt)));
        setEndsAt(formatForInput(new Date(event.endsAt || event.startsAt)));
        setVenue(event.venue || '');
        setCity(event.city || '');
        setCounty(event.county || '');
        setAddress(event.address || '');
        setLatitude(event.latitude ?? '');
        setLongitude(event.longitude ?? '');
        setOnlineUrl(event.onlineUrl || '');
        setPlaceId((event as any).placeId || '');
        setDirections((event as any).directions || '');
        if (event.flyers && event.flyers.length > 0) {
          setFlyers(event.flyers.map((f) => ({ dataUrl: '', preview: f.url, id: f.id })));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoadingEvent(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleAddTicketTier = () => {
    setTicketTypes((prev) => [
      ...prev,
      {
        name: 'Early Bird',
        description: 'Discounted admission for early supporters',
        priceKes: 1000,
        capacity: 100,
        isActive: true,
      },
    ]);
  };

  const handleRemoveTicketTier = (index: number) => {
    if (ticketTypes.length <= 1) {
      toast.error('At least one ticket tier is required');
      return;
    }
    setTicketTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTicketChange = (
    index: number,
    field: keyof CreateTicketTypeInput,
    value: any
  ) => {
    setTicketTypes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleFlyerFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (flyers.length + files.length > 10) {
      toast.error('Maximum 10 flyers allowed');
      return;
    }
    if (files.length === 0) return;
    setFlyerUploading(true);
    let pending = files.length;
    files.forEach((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG, or WebP allowed`);
        pending -= 1;
        if (pending === 0) setFlyerUploading(false);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: max 5 MB per flyer`);
        pending -= 1;
        if (pending === 0) setFlyerUploading(false);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFlyers((prev) => [...prev, { dataUrl, preview: dataUrl }]);
        pending -= 1;
        if (pending === 0) setFlyerUploading(false);
      };
      reader.onerror = () => {
        pending -= 1;
        if (pending === 0) setFlyerUploading(false);
      };
      reader.readAsDataURL(file);
    });
    if (flyerInputRef.current) flyerInputRef.current.value = '';
  };

  const moveFlyerUp = (index: number) => {
    if (index === 0) return;
    setFlyers((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const moveFlyerDown = (index: number) => {
    setFlyers((prev) => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const removeFlyer = (index: number) => {
    setFlyers((prev) => prev.filter((_, i) => i !== index));
  };

  const applyVenuePreset = (preset: typeof VENUE_PRESETS[0]) => {
    setVenue(preset.venue);
    setCity(preset.city);
    setCounty(preset.county);
    setAddress(preset.address);
    setLatitude(preset.latitude);
    setLongitude(preset.longitude);
    setShowMap(true);
    toast.success(`Loaded coordinates for ${preset.name}`);
  };

  const handleMapLocationChange = (lat: number, lng: number, details?: LocationDetails) => {
    setLatitude(lat);
    setLongitude(lng);
    // Auto-fill form fields from reverse geocoding — only overwrite empty fields
    if (details) {
      if (details.address && !address.trim()) setAddress(details.address);
      if (details.city && !city.trim()) setCity(details.city);
      if (details.county && !county.trim()) setCounty(details.county);
      if (details.venue && !venue.trim()) setVenue(details.venue);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim() || title.length < 3) {
      setError('Event title must be at least 3 characters.');
      return;
    }
    if (!description.trim() || description.length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('Event end time must be after start time.');
      return;
    }
    if ((format === 'PHYSICAL' || format === 'HYBRID') && !venue.trim()) {
      setError('Venue name is required for physical and hybrid events.');
      return;
    }
    if (!isEditMode) {
      if (ticketTypes.length === 0) {
        setError('Please add at least one ticket tier.');
        return;
      }
      for (const t of ticketTypes) {
        if (!t.name.trim()) {
          setError('Every ticket tier must have a name.');
          return;
        }
        if (t.capacity <= 0) {
          setError(`Ticket tier "${t.name}" capacity must be greater than 0.`);
          return;
        }
        if (t.priceKes < 0) {
          setError(`Ticket tier "${t.name}" price cannot be negative.`);
          return;
        }
      }
    }

    const payload: CreateEventInput = {
      title: title.trim(),
      description: description.trim(),
      category,
      coverImage: coverImage.trim() || undefined,
      format,
      status,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      venue: format !== 'ONLINE' ? venue.trim() : undefined,
      city: format !== 'ONLINE' ? city.trim() : undefined,
      county: format !== 'ONLINE' ? county.trim() : undefined,
      address: format !== 'ONLINE' ? address.trim() : undefined,
      latitude:
        format !== 'ONLINE' && latitude !== '' ? Number(latitude) : undefined,
      longitude:
        format !== 'ONLINE' && longitude !== '' ? Number(longitude) : undefined,
      placeId: format !== 'ONLINE' && placeId.trim() ? placeId.trim() : undefined,
      directions: format !== 'ONLINE' && directions.trim() ? directions.trim() : undefined,
      onlineUrl: format !== 'PHYSICAL' ? onlineUrl.trim() : undefined,
      ticketTypes: ticketTypes.map((t) => ({
        name: t.name.trim(),
        description: t.description?.trim() || undefined,
        priceKes: Number(t.priceKes),
        capacity: Number(t.capacity),
        isActive: true,
      })),
    };

    setSubmitting(true);
    try {
      if (isEditMode && eventId) {
        const updatePayload: UpdateEventInput = {
          title: payload.title,
          description: payload.description,
          category: payload.category,
          coverImage: payload.coverImage,
          format: payload.format,
          status: payload.status,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          venue: payload.venue,
          city: payload.city,
          county: payload.county,
          address: payload.address,
          latitude: payload.latitude,
          longitude: payload.longitude,
          placeId: payload.placeId,
          directions: payload.directions,
          onlineUrl: payload.onlineUrl,
        };
        const res = await eventService.updateEvent(eventId, updatePayload);

        // Upload any new flyers (those with dataUrl but no id yet)
        const newFlyers = flyers.filter((f) => f.dataUrl && !f.id);
        if (newFlyers.length > 0) {
          await Promise.allSettled(
            newFlyers.map((f, i) =>
              eventService.uploadEventFlyer(eventId, f.dataUrl!, i)
            )
          );
        }

        toast.success('Event updated successfully');
        if (res.data?.slug || res.data?.id) {
          navigate(`/events/${res.data.slug || res.data.id}`);
        } else {
          navigate('/organizer');
        }
      } else {
        // Create event without flyers (flyers are uploaded as a separate step)
        const res = await eventService.createEvent(payload);
        const createdEvent = res.data;

        // Upload flyers after event creation
        const newFlyers = flyers.filter((f) => f.dataUrl);
        if (newFlyers.length > 0 && createdEvent?.id) {
          const flyerResults = await Promise.allSettled(
            newFlyers.map((f, i) =>
              eventService.uploadEventFlyer(createdEvent.id, f.dataUrl!, i)
            )
          );
          const failedCount = flyerResults.filter((r) => r.status === 'rejected').length;
          if (failedCount > 0) {
            toast.error(`${failedCount} flyer(s) failed to upload, but your event was created.`);
          }
        }

        toast.success('Event published successfully! 🎉');
        if (createdEvent?.slug || createdEvent?.id) {
          navigate(`/events/${createdEvent.slug || createdEvent.id}`);
        } else {
          navigate('/organizer');
        }
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '90vh', bgcolor: colors.bg, py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        {!canPublish && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {user?.organizerApplicationStatus === 'REJECTED'
              ? 'Your organizer request was not approved. You can prepare and save drafts, but cannot publish events.'
              : 'Your organizer request is awaiting admin approval. You can prepare and save this event as a draft; publishing will be available after approval.'}
          </Alert>
        )}
        {/* Back Link */}
        <Button
          component={Link}
          to="/organizer"
          startIcon={<ArrowBackIcon />}
          sx={{ color: colors.fg, fontWeight: 700, mb: 3, textTransform: 'none' }}
        >
          Back to Dashboard
        </Button>

        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: { xs: '1.75rem', md: '2.25rem' },
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: colors.fg,
            mb: 1,
          }}
        >
          {isEditMode ? 'Edit Event' : 'Create New Event'}
        </Typography>
        <Typography variant="body1" sx={{ color: colors.mutedFg, mb: 4 }}>
          {isEditMode
            ? 'Update your listing details, schedule, and venue. Ticket tiers stay unchanged for now.'
            : 'Fill in the details below to publish your event to Kenyan discovery channels.'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loadingEvent ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Section 1: Event Details */}
            <Card
              sx={{
                p: { xs: 2.5, md: 3.5 },
                bgcolor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  textTransform: 'uppercase',
                  color: colors.fg,
                  mb: 2.5,
                }}
              >
                1. Basic Event Details
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Event Title"
                  required
                  fullWidth
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Blankets & Wine Nairobi — Festival Edition"
                />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <FormControl fullWidth required>
                    <InputLabel id="category-select-label">Category</InputLabel>
                    <Select
                      labelId="category-select-label"
                      value={category}
                      label="Category"
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required>
                    <InputLabel id="format-select-label">Format</InputLabel>
                    <Select
                      labelId="format-select-label"
                      value={format}
                      label="Format"
                      onChange={(e) => setFormat(e.target.value as EventFormat)}
                    >
                      <MenuItem value="PHYSICAL">Physical</MenuItem>
                      <MenuItem value="ONLINE">Online</MenuItem>
                      <MenuItem value="HYBRID">Hybrid</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required>
                    <InputLabel id="status-select-label">Status</InputLabel>
                    <Select
                      labelId="status-select-label"
                      value={status}
                      label="Status"
                      onChange={(e) => setStatus(e.target.value as EventStatus)}
                    >
                      <MenuItem value="PUBLISHED" disabled={!canPublish}>Published</MenuItem>
                      <MenuItem value="DRAFT">Draft</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <TextField
                    label="Cover Image URL"
                    fullWidth
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14"
                    helperText="Optional link to a promotional poster image"
                  />
                  {coverImage && (
                    <Box
                      component="img"
                      src={coverImage}
                      alt="Cover preview"
                      sx={{
                        mt: 1.5,
                        width: '100%',
                        maxHeight: 200,
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                      }}
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                </Box>

                <TextField
                  label="Event Description"
                  required
                  fullWidth
                  multiline
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the experience, lineup, dress code, age limits, and entry guidelines..."
                />
              </Box>
            </Card>

            {/* Section 2: Dates & Times */}
            <Card
              sx={{
                p: { xs: 2.5, md: 3.5 },
                bgcolor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  textTransform: 'uppercase',
                  color: colors.fg,
                  mb: 2.5,
                }}
              >
                2. Date & Schedule
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2.5,
                }}
              >
                <TextField
                  label="Starts At"
                  type="datetime-local"
                  required
                  fullWidth
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <TextField
                  label="Ends At"
                  type="datetime-local"
                  required
                  fullWidth
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            </Card>

            {/* Section 3: Venue, Location & Map */}
            {format !== 'ONLINE' && (
              <Card
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  bgcolor: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    mb: 2.5,
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      textTransform: 'uppercase',
                      color: colors.fg,
                    }}
                  >
                    3. Location & Directions
                  </Typography>

                  {/* Preset Venue Chips */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: colors.mutedFg }}>
                      Presets:
                    </Typography>
                    {VENUE_PRESETS.map((p) => (
                      <Button
                        key={p.name}
                        size="small"
                        variant="outlined"
                        onClick={() => applyVenuePreset(p)}
                        sx={{
                          py: 0.2,
                          px: 1,
                          fontSize: '0.72rem',
                          textTransform: 'none',
                          color: colors.fg,
                          borderColor: colors.border,
                          borderRadius: '6px',
                        }}
                      >
                        {p.name}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="Venue Name"
                      required
                      fullWidth
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. Sarit Expo Centre"
                    />

                    <TextField
                      label="City / Town"
                      fullWidth
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Nairobi"
                    />

                    <TextField
                      label="County"
                      fullWidth
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      placeholder="e.g. Nairobi County"
                    />
                  </Box>

                  <TextField
                    label="Physical Street Address"
                    fullWidth
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Pio Gama Pinto Rd, Westlands"
                  />

                  {/* Interactive Map Location Picker */}
                  <Box
                    sx={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: '10px',
                      p: 2,
                      bgcolor: colors.mutedBg,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        mb: showMap ? 2 : 0,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MapIcon sx={{ color: colors.accent, fontSize: 22 }} />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.fg }}>
                            Choose Location on Map
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                            Click to pin exact coordinates or search by venue/street
                          </Typography>
                        </Box>
                      </Box>

                      <Button
                        size="small"
                        variant={showMap ? 'contained' : 'outlined'}
                        onClick={() => setShowMap(!showMap)}
                        endIcon={showMap ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          borderRadius: '8px',
                          bgcolor: showMap ? colors.accent : 'transparent',
                          color: showMap ? '#fff' : colors.fg,
                          borderColor: colors.border,
                          '&:hover': {
                            bgcolor: showMap ? colors.accentDark : 'rgba(0,0,0,0.04)',
                          },
                        }}
                      >
                        {showMap ? 'Hide Map' : 'Select on Interactive Map'}
                      </Button>
                    </Box>

                    {showMap && (
                      <LocationMapPicker
                        latitude={latitude}
                        longitude={longitude}
                        onChange={handleMapLocationChange}
                      />
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="Latitude (Google Maps)"
                      type="number"
                      fullWidth
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      slotProps={{ htmlInput: { step: 'any' } }}
                      helperText="Used for the 'Get Directions' Google Maps button"
                    />

                    <TextField
                      label="Longitude (Google Maps)"
                      type="number"
                      fullWidth
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      slotProps={{ htmlInput: { step: 'any' } }}
                      helperText="Used for the 'Get Directions' Google Maps button"
                    />
                  </Box>

                  <TextField
                    label="Custom Directions / Landmarks"
                    fullWidth
                    multiline
                    rows={2}
                    value={directions}
                    onChange={(e) => setDirections(e.target.value)}
                    placeholder="e.g. Enter via Gate 2 on Langata Rd. Parking available on the right."
                    helperText="Optional turn-by-turn guidance or landmark hints shown on event detail page"
                  />
                </Box>
              </Card>
            )}

            {format !== 'PHYSICAL' && (
              <Card
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  bgcolor: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: '"Archivo Black", sans-serif',
                    textTransform: 'uppercase',
                    color: colors.fg,
                    mb: 2.5,
                  }}
                >
                  Online Link
                </Typography>
                <TextField
                  label="Meeting / Stream URL"
                  fullWidth
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  placeholder="https://zoom.us/j/... or YouTube Live URL"
                />
              </Card>
            )}

            {/* Flyer Gallery */}
            <Card
              sx={{
                p: { xs: 2.5, md: 3.5 },
                bgcolor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      textTransform: 'uppercase',
                      color: colors.fg,
                    }}
                  >
                    Event Flyers & Promotional Images
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                    Upload up to 10 flyers (JPEG, PNG, WebP — max 5 MB each). First image shown as hero.
                  </Typography>
                </Box>
                <Chip
                  label={`${flyers.length} / 10 flyers`}
                  size="small"
                  sx={{
                    bgcolor: flyers.length >= 10 ? 'error.main' : colors.accent,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                />
              </Box>

              {flyerUploading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

              {/* Hidden file input */}
              <input
                ref={flyerInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFlyerFilePick}
              />

              {/* Flyer thumbnails */}
              {flyers.length > 0 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  {flyers.map((flyer, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: `2px solid ${idx === 0 ? colors.accent : colors.border}`,
                        aspectRatio: '3/4',
                        bgcolor: colors.border,
                      }}
                    >
                      <Box
                        component="img"
                        src={flyer.preview}
                        alt={`Flyer ${idx + 1}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {idx === 0 && (
                        <Chip
                          label="HERO"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 6,
                            left: 6,
                            bgcolor: colors.accent,
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.6rem',
                            height: 20,
                          }}
                        />
                      )}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          display: 'flex',
                          justifyContent: 'center',
                          gap: 0.5,
                          p: 0.5,
                          bgcolor: 'rgba(0,0,0,0.6)',
                        }}
                      >
                        <Tooltip title="Move up">
                          <span>
                            <IconButton
                              size="small"
                              disabled={idx === 0}
                              onClick={() => moveFlyerUp(idx)}
                              sx={{ color: '#fff', p: 0.25 }}
                            >
                              <KeyboardArrowUpIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move down">
                          <span>
                            <IconButton
                              size="small"
                              disabled={idx === flyers.length - 1}
                              onClick={() => moveFlyerDown(idx)}
                              sx={{ color: '#fff', p: 0.25 }}
                            >
                              <KeyboardArrowDownIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Remove flyer">
                          <IconButton
                            size="small"
                            onClick={() => removeFlyer(idx)}
                            sx={{ color: '#ff6b6b', p: 0.25 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={flyers.length >= 10}
                onClick={() => flyerInputRef.current?.click()}
                sx={{
                  borderColor: colors.accent,
                  color: colors.accent,
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: `${colors.accent}15` },
                }}
              >
                {flyers.length === 0 ? 'Choose Flyer Images' : 'Add More Flyers'}
              </Button>
            </Card>

            {/* Section 4: Ticket Tiers (create only) */}
            {!isEditMode && (
            <Card
              sx={{
                p: { xs: 2.5, md: 3.5 },
                bgcolor: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      textTransform: 'uppercase',
                      color: colors.fg,
                    }}
                  >
                    4. Ticket Tiers & Pricing
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.mutedFg }}>
                    Create multiple pricing tiers (Early Bird, Regular, VIP, VVIP)
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddTicketTier}
                  sx={{
                    color: colors.fg,
                    borderColor: colors.border,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '8px',
                  }}
                >
                  Add Tier
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {ticketTypes.map((tier, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      bgcolor: colors.mutedBg,
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr auto' },
                        gap: 1.5,
                        alignItems: 'center',
                      }}
                    >
                      <TextField
                        label="Tier Name"
                        required
                        fullWidth
                        size="small"
                        value={tier.name}
                        onChange={(e) => handleTicketChange(idx, 'name', e.target.value)}
                        placeholder="e.g. VIP Pass"
                      />

                      <TextField
                        label="Price (KES)"
                        type="number"
                        required
                        fullWidth
                        size="small"
                        value={tier.priceKes}
                        onChange={(e) =>
                          handleTicketChange(idx, 'priceKes', Math.max(0, parseInt(e.target.value) || 0))
                        }
                        slotProps={{ htmlInput: { min: 0 } }}
                        helperText="0 for free"
                      />

                      <TextField
                        label="Capacity"
                        type="number"
                        required
                        fullWidth
                        size="small"
                        value={tier.capacity}
                        onChange={(e) =>
                          handleTicketChange(idx, 'capacity', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        slotProps={{ htmlInput: { min: 1 } }}
                      />

                      <Tooltip title="Remove tier">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveTicketTier(idx)}
                          sx={{ color: colors.coral }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <TextField
                      label="Tier Description / Perks"
                      fullWidth
                      size="small"
                      value={tier.description || ''}
                      onChange={(e) => handleTicketChange(idx, 'description', e.target.value)}
                      placeholder="e.g. Free welcome cocktail, fast track gate"
                    />
                  </Box>
                ))}
              </Box>
            </Card>
            )}

            {isEditMode && (
              <Alert severity="info">
                Ticket pricing and capacity cannot be edited here yet. Contact support if you need tier changes after tickets have sold.
              </Alert>
            )}

            {/* Publish Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
              <Button
                component={Link}
                to="/organizer"
                variant="outlined"
                size="large"
                sx={{
                  color: colors.fg,
                  borderColor: colors.border,
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 4,
                  borderRadius: '8px',
                }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <RocketLaunchIcon />}
                sx={{
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  fontWeight: 800,
                  fontSize: '1rem',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  px: 5,
                  py: 1.5,
                  borderRadius: '8px',
                  boxShadow: '0 4px 14px rgba(181, 224, 42, 0.4)',
                  '&:hover': {
                    bgcolor: colors.limeLt,
                    boxShadow: '0 6px 20px rgba(181, 224, 42, 0.6)',
                  },
                }}
              >
                {submitting
                  ? isEditMode
                    ? 'Saving Changes...'
                    : canPublish
                      ? 'Publishing Event...'
                      : 'Saving Draft...'
                  : isEditMode
                    ? 'Save Changes'
                    : canPublish
                      ? 'Publish Event Live'
                      : 'Save Event Draft'}
              </Button>
            </Box>
          </Box>
        </form>
        )}
      </Container>
    </Box>
  );
}
