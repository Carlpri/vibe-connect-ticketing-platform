import { Card, CardContent, Skeleton, Box } from '@mui/material';

/** Skeleton placeholder for an EventCard while data is loading */
export function EventCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" sx={{ paddingTop: '125%' }} animation="wave" />
      <CardContent>
        <Skeleton width="40%" height={16} sx={{ mb: 1 }} />
        <Skeleton width="80%" height={24} sx={{ mb: 0.5 }} />
        <Skeleton width="60%" height={16} />
      </CardContent>
    </Card>
  );
}

/** Grid of N skeletons */
export function EventGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
        gap: { xs: 1.5, md: 2.5 },
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </Box>
  );
}
