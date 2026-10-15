import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import type { UserRole } from '../../types';
import { colors } from '../../styles/theme';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

/**
 * Redirects unauthenticated users to /login, preserving the intended
 * destination so they can be sent back after signing in.
 * If requiredRoles is specified, checks that the user's role is permitted.
 */
export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: colors.fg }}>
          Organizer Privileges Required
        </Typography>
        <Typography variant="body1" sx={{ color: colors.mutedFg, mb: 3, maxWidth: 450 }}>
          This section is reserved for event creators and organizers. Your current account role is {user.role}.
        </Typography>
        <Button variant="contained" href="/events" sx={{ bgcolor: colors.lime, color: colors.limeFg }}>
          Browse Events
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
