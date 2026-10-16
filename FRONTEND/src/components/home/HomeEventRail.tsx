import { useRef, type ReactNode } from 'react';
import { Box } from '@mui/material';
import EventCard from '../events/EventCard';
import { EventCardSkeleton } from '../common/LoadingSkeleton';
import type { Event } from '../../types';
import { colors } from '../../styles/theme';

type HomeEventRailProps = {
  events: Event[];
  loading?: boolean;
  /** Dark ink section (Popular This Weekend) — adjusts card text contrast */
  darkSurface?: boolean;
  skeletonCount?: number;
  /** Stagger base delay (seconds) for entrance animation */
  animationBaseDelay?: number;
};

const cardSlotSx = {
  flex: { xs: '0 0 auto', md: 'initial' },
  width: { xs: 'min(78vw, 280px)', sm: 'min(44vw, 300px)', md: 'auto' },
  scrollSnapAlign: 'start',
  scrollSnapStop: 'always',
};

const darkCardWrapperSx = {
  '& h3, & .MuiTypography-h6, & .MuiTypography-root[class*="Archivo"]': {
    color: `${colors.inkFg} !important`,
  },
  '& .MuiTypography-body2': {
    color: 'rgba(250, 247, 242, 0.65) !important',
  },
};

function RailCardSlot({
  children,
  index,
  animationBaseDelay,
  darkSurface,
}: {
  children: ReactNode;
  index: number;
  animationBaseDelay: number;
  darkSurface: boolean;
}) {
  const dragRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  return (
    <Box
      role="listitem"
      sx={{
        ...cardSlotSx,
        animation: `fadeInUp 0.55s cubic-bezier(0.4, 0, 0.2, 1) ${animationBaseDelay + index * 0.07}s both`,
        ...(darkSurface ? darkCardWrapperSx : {}),
      }}
      onTouchStart={(e) => {
        dragRef.current = false;
        startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchMove={(e) => {
        const dx = Math.abs(e.touches[0].clientX - startRef.current.x);
        const dy = Math.abs(e.touches[0].clientY - startRef.current.y);
        if (dx > 10 && dx > dy) {
          dragRef.current = true;
        }
      }}
      onClickCapture={(e) => {
        if (dragRef.current) {
          e.preventDefault();
          e.stopPropagation();
          dragRef.current = false;
        }
      }}
    >
      {children}
    </Box>
  );
}

export default function HomeEventRail({
  events,
  loading = false,
  darkSurface = false,
  skeletonCount = 4,
  animationBaseDelay = 0,
}: HomeEventRailProps) {
  const scrollSx = {
    display: { xs: 'flex', md: 'grid' },
    gridTemplateColumns: { md: 'repeat(4, 1fr)' },
    gap: { xs: 2, md: 3.5 },
    overflowX: { xs: 'auto', md: 'visible' },
    overflowY: { xs: 'hidden', md: 'visible' },
    pb: { xs: 0.5, md: 0 },
    scrollSnapType: { xs: 'x mandatory', md: 'none' },
    touchAction: { xs: 'pan-x pan-y pinch-zoom', md: 'auto' },
    minWidth: 0,
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
        <Box
          className="home-event-rail home-event-rail-scroll"
          sx={scrollSx}
          aria-busy="true"
          aria-label="Loading events"
        >
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Box key={i} sx={cardSlotSx}>
              <EventCardSkeleton />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
      <Box
        className="home-event-rail home-event-rail-scroll"
        sx={scrollSx}
        role="list"
        aria-label="Event carousel — swipe horizontally to browse"
      >
        {events.map((event, index) => (
          <RailCardSlot
            key={event.id}
            index={index}
            animationBaseDelay={animationBaseDelay}
            darkSurface={darkSurface}
          >
            <EventCard event={event} />
          </RailCardSlot>
        ))}
      </Box>
    </Box>
  );
}
