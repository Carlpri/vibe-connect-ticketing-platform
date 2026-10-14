import type { ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import BuildIcon from '@mui/icons-material/Build';

type Variant = 'empty' | 'error' | 'network' | 'coming-soon';

interface EmptyStateProps {
  variant?: Variant;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  actionLabel?: string;
  onAction?: () => void;
  sx?: SxProps<Theme>;
}

const DEFAULTS: Record<Variant, { icon: ReactNode; title: string; description: string }> = {
  empty: {
    icon: <SearchOffIcon sx={{ fontSize: 56, color: 'text.secondary' }} />,
    title: 'Nothing here yet',
    description: 'There are no results to display.',
  },
  error: {
    icon: <ErrorIcon sx={{ fontSize: 56, color: 'error.main' }} />,
    title: 'Something went wrong',
    description: 'An error occurred. Please try again.',
  },
  network: {
    icon: <CloudOffIcon sx={{ fontSize: 56, color: 'text.secondary' }} />,
    title: 'Could not connect',
    description: 'The backend could not be reached. Make sure the API server is running.',
  },
  'coming-soon': {
    icon: <BuildIcon sx={{ fontSize: 56, color: 'primary.main' }} />,
    title: 'Coming soon',
    description: 'This feature is not yet available. The backend integration is in progress.',
  },
};

export default function EmptyState({
  variant = 'empty',
  title,
  description,
  action,
  actionLabel,
  onAction,
  sx,
}: EmptyStateProps) {
  const defaults = DEFAULTS[variant];
  const btnLabel = actionLabel ?? action?.label;
  const btnClick = onAction ?? action?.onClick;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 10,
        px: 2,
        gap: 2,
        ...sx,
      }}
    >
      {defaults.icon}
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title ?? defaults.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        {description ?? defaults.description}
      </Typography>
      {btnLabel && btnClick && (
        <Button variant="contained" onClick={btnClick} sx={{ mt: 1 }}>
          {btnLabel}
        </Button>
      )}
    </Box>
  );
}
