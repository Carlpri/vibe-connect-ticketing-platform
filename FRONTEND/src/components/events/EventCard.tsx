import { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { Link } from 'react-router-dom';
import type { Event } from '../../types';
import { formatKes, formatDate } from '../../utils/format';
import { colors } from '../../styles/theme';

interface EventCardProps {
  event: Event;
  viewMode?: 'grid' | 'list';
}

export default function EventCard({ event, viewMode = 'grid' }: EventCardProps) {
  const [saved, setSaved] = useState(false);

  // Find minimum ticket price
  const minPrice = event.ticketTypes?.length
    ? Math.min(...event.ticketTypes.map((t) => t.priceKes))
    : 0;

  const priceText = minPrice > 0 ? `FROM ${formatKes(minPrice)}` : 'FREE • KES 0';

  if (viewMode === 'list') {
    return (
      <Box
        component={Link}
        to={`/events/${event.id}`}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2.5,
          textDecoration: 'none',
          color: 'inherit',
          p: 1.5,
          borderRadius: '8px',
          bgcolor: 'transparent',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.03)',
            '& .card-img': { transform: 'scale(1.04)' },
          },
        }}
      >
        {/* Photo on left in list mode */}
        <Box
          sx={{
            position: 'relative',
            width: { xs: '100%', sm: 200 },
            height: { xs: 200, sm: 150 },
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            className="card-img"
            src={event.coverImage || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80'}
            alt={event.title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease',
            }}
          />
          {/* Price badge bottom-left */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              bgcolor: colors.lime,
              color: colors.limeFg,
              px: 1,
              py: 0.3,
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.72rem',
              letterSpacing: '0.02em',
            }}
          >
            {priceText}
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 0.5, flexGrow: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              color: colors.coral,
              letterSpacing: '0.06em',
              mb: 0.5,
            }}
          >
            {formatDate(event.startsAt)} {event.category ? `• ${event.category}` : ''}
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Archivo Black", "Manrope", sans-serif',
              fontWeight: 400,
              fontSize: '1.15rem',
              textTransform: 'uppercase',
              lineHeight: 1.25,
              color: colors.fg,
              mb: 1,
            }}
          >
            {event.title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: colors.mutedFg }}>
            <LocationOnIcon sx={{ fontSize: 16, color: colors.coral }} />
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }} noWrap>
              {event.venue}{event.city ? `, ${event.city}` : ''}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // Default Grid layout: 4:5 portrait photo with info below
  return (
    <Box
      component={Link}
      to={`/events/${event.id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        '&:hover': {
          '& .card-img': {
            transform: 'scale(1.04)',
          },
        },
      }}
    >
      {/* Image container: 4:5 portrait ratio, 8px radius */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 5',
          borderRadius: '8px',
          overflow: 'hidden',
          bgcolor: colors.mutedBg,
          mb: 1.5,
        }}
      >
        <Box
          component="img"
          className="card-img"
          src={event.coverImage || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80'}
          alt={event.title}
          loading="lazy"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.4s cubic-bezier(0.2, 0, 0.2, 1)',
          }}
        />

        {/* Gradient shadow at bottom of image for readability */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            background: 'linear-gradient(to top, rgba(14, 16, 19, 0.65), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Price badge at bottom-left */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            bgcolor: minPrice === 0 ? colors.success : colors.lime,
            color: minPrice === 0 ? '#fff' : colors.limeFg,
            px: 1.2,
            py: 0.4,
            borderRadius: '6px',
            fontWeight: 800,
            fontSize: '0.74rem',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {priceText}
        </Box>

        {/* Heart/save control at top-right */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSaved(!saved);
          }}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            bgcolor: 'rgba(28, 25, 22, 0.6)',
            backdropFilter: 'blur(8px)',
            color: saved ? colors.coral : '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            '&:hover': {
              bgcolor: 'rgba(28, 25, 22, 0.85)',
              color: colors.coral,
            },
          }}
          aria-label="Save event"
        >
          {saved ? <FavoriteIcon sx={{ fontSize: 16 }} /> : <FavoriteBorderIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>

      {/* Information below image:
          1. Small uppercase date and category
          2. Bold uppercase event name
          3. Muted venue and town with location icon
      */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            color: colors.coral,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            mb: 0.4,
          }}
        >
          {formatDate(event.startsAt)} {event.category ? `• ${event.category}` : ''}
        </Typography>

        <Typography
          sx={{
            fontFamily: '"Archivo Black", "Manrope", sans-serif',
            fontWeight: 400,
            fontSize: '1rem',
            lineHeight: 1.25,
            textTransform: 'uppercase',
            color: colors.fg,
            mb: 0.6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {event.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: colors.mutedFg }}>
          <LocationOnIcon sx={{ fontSize: 14, color: colors.coral, flexShrink: 0 }} />
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.8rem',
              color: colors.mutedFg,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {event.venue}{event.city ? `, ${event.city}` : ''}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
