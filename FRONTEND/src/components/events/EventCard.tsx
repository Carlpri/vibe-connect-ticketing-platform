import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
  Button,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { Link } from 'react-router-dom';
import type { Event } from '../../types';
import { eventCoverUrl } from '../../utils/eventMedia';
import { formatKes, formatDate } from '../../utils/format';
import { colors } from '../../styles/theme';

interface EventCardProps {
  event: Event;
  viewMode?: 'grid' | 'list';
}

export default function EventCard({ event, viewMode = 'grid' }: EventCardProps) {
  const [saved, setSaved] = useState(false);
  const [flyerOpen, setFlyerOpen] = useState(false);

  // Find minimum ticket price
  const minPrice = event.ticketTypes?.length
    ? Math.min(...event.ticketTypes.map((t) => t.priceKes))
    : 0;

  const priceText = minPrice > 0 ? `FROM ${formatKes(minPrice)}` : 'FREE • KES 0';
  const coverUrl = eventCoverUrl(event.coverImage || event.flyers?.[0]?.url);

  const handleOpenFlyer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFlyerOpen(true);
  };

  const flyerModal = (
    <Dialog
      open={flyerOpen}
      onClose={() => setFlyerOpen(false)}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          bgcolor: '#0E1013',
          color: '#FFF',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '1rem',
            textTransform: 'uppercase',
            color: colors.lime,
          }}
        >
          Event Flyer & Details
        </Typography>
        <IconButton onClick={() => setFlyerOpen(false)} size="small" sx={{ color: '#FFF' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, bgcolor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        <Box
          component="img"
          src={coverUrl}
          alt={event.title}
          sx={{
            width: '100%',
            maxHeight: '75vh',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </DialogContent>

      <Box sx={{ p: 2.5, bgcolor: '#14171C', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography
            sx={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: '1.1rem',
              color: '#FFF',
              textTransform: 'uppercase',
              mb: 0.5,
            }}
          >
            {event.title}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.mutedFg }}>
            {formatDate(event.startsAt)} • {event.venue}{event.city ? `, ${event.city}` : ''}
          </Typography>
        </Box>
        <Button
          component={Link}
          to={`/events/${event.id}`}
          onClick={() => setFlyerOpen(false)}
          variant="contained"
          startIcon={<ConfirmationNumberIcon />}
          sx={{
            bgcolor: colors.lime,
            color: colors.limeFg,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            px: 3,
            '&:hover': { bgcolor: colors.limeLt },
          }}
        >
          View Tickets
        </Button>
      </Box>
    </Dialog>
  );

  if (viewMode === 'list') {
    return (
      <>
        {flyerModal}
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
            borderRadius: '10px',
            bgcolor: '#FEFDFB',
            border: `1px solid ${colors.border}`,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
              transform: 'translateY(-2px)',
              '& .card-img': { transform: 'scale(1.03)' },
            },
          }}
        >
          {/* Photo on left in list mode / widescreen banner on mobile */}
          <Box
            sx={{
              position: 'relative',
              width: { xs: '100%', sm: 220 },
              height: { xs: 200, sm: 160 },
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
              bgcolor: colors.mutedBg,
            }}
          >
            <Box
              component="img"
              className="card-img"
              src={coverUrl}
              alt={event.title}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transition: 'transform 0.4s ease',
              }}
            />
            {/* Price badge bottom-left */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                bgcolor: minPrice === 0 ? colors.success : colors.lime,
                color: minPrice === 0 ? '#fff' : colors.limeFg,
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

            {/* Flyer inspection button */}
            <IconButton
              size="small"
              onClick={handleOpenFlyer}
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                width: 30,
                height: 30,
                bgcolor: 'rgba(28, 25, 22, 0.65)',
                backdropFilter: 'blur(8px)',
                color: '#FFF',
                '&:hover': { bgcolor: 'rgba(28, 25, 22, 0.9)', color: colors.lime },
              }}
              aria-label="View Flyer Fullscreen"
              title="View Flyer Fullscreen"
            >
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Content */}
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 0.5, flexGrow: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
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
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                textTransform: 'uppercase',
                lineHeight: 1.25,
                color: colors.fg,
                mb: 1,
              }}
            >
              {event.title}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: colors.mutedFg, mb: 1.5 }}>
              <LocationOnIcon sx={{ fontSize: 16, color: colors.coral, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontSize: '0.88rem' }} noWrap>
                {event.venue}{event.city ? `, ${event.city}` : ''}
              </Typography>
            </Box>

            <Typography
              variant="body2"
              sx={{
                color: colors.mutedFg,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontSize: '0.85rem',
              }}
            >
              {event.description}
            </Typography>
          </Box>
        </Box>
      </>
    );
  }

  // Default Grid layout:
  // On phone screens (xs), the event flyer is shown HORIZONTALLY in landscape (16:9 widescreen)
  // so that the entire flyer and its details are fully visible across the phone screen.
  // On tablet and desktop (sm+), it uses portrait 4:5 for multi-column grids.
  return (
    <>
      {flyerModal}
      <Box
        component={Link}
        to={`/events/${event.id}`}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
          borderRadius: { xs: '12px', sm: '8px' },
          bgcolor: { xs: '#FEFDFB', sm: 'transparent' },
          border: { xs: `1px solid ${colors.border}`, sm: 'none' },
          p: { xs: 1.5, sm: 0 },
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '@media (hover: hover)': {
            '&:hover': {
              transform: 'translateY(-3px)',
              '& .card-img': {
                transform: 'scale(1.03)',
              },
            },
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        }}
      >
        {/* Image container: horizontal 16:9 on mobile phone screens, 4:5 portrait on tablet/desktop */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: { xs: '16 / 9', sm: '4 / 5' },
            borderRadius: '8px',
            overflow: 'hidden',
            bgcolor: colors.mutedBg,
            mb: 1.5,
          }}
        >
          <Box
            component="img"
            className="card-img"
            src={coverUrl}
            alt={event.title}
            loading="lazy"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
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

          {/* View Full Flyer Button at top-left */}
          <Button
            size="small"
            onClick={handleOpenFlyer}
            startIcon={<VisibilityIcon sx={{ fontSize: '15px !important' }} />}
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              bgcolor: 'rgba(28, 25, 22, 0.72)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '999px',
              py: 0.3,
              px: 1.2,
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              '&:hover': {
                bgcolor: 'rgba(28, 25, 22, 0.92)',
                color: colors.lime,
                borderColor: colors.lime,
              },
            }}
            aria-label="View Full Flyer"
          >
            View Flyer
          </Button>

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

        {/* Information below image */}
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: 'uppercase',
              color: colors.coral,
              fontSize: '0.74rem',
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
              fontSize: { xs: '1.05rem', sm: '1rem' },
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
            <LocationOnIcon sx={{ fontSize: 15, color: colors.coral, flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.82rem',
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
    </>
  );
}
