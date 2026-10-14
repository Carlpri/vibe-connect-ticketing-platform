import { Box, Paper, IconButton, Typography } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useLocation, useNavigate } from 'react-router-dom';
import { colors } from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <Box
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        bottom: 12,
        left: 0,
        right: 0,
        zIndex: 1100,
        px: 2,
        pointerEvents: 'none',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          maxWidth: 420,
          mx: 'auto',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          py: 0.8,
          px: 1.5,
          borderRadius: '24px',
          bgcolor: 'rgba(254, 253, 251, 0.92)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 8px 32px rgba(28, 25, 22, 0.12)',
        }}
      >
        {/* Home */}
        <Box
          onClick={() => navigate('/')}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            minWidth: 48,
          }}
        >
          <IconButton
            size="small"
            sx={{
              color: isCurrent('/') ? colors.limeFg : colors.mutedFg,
              bgcolor: isCurrent('/') ? colors.lime : 'transparent',
              p: 0.8,
              '&:hover': { bgcolor: isCurrent('/') ? colors.limeLt : 'rgba(0,0,0,0.04)' },
            }}
          >
            <HomeOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: isCurrent('/') ? colors.fg : colors.mutedFg,
              mt: 0.2,
            }}
          >
            Home
          </Typography>
        </Box>

        {/* Discover */}
        <Box
          onClick={() => navigate('/events')}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            minWidth: 48,
          }}
        >
          <IconButton
            size="small"
            sx={{
              color: isCurrent('/events') ? colors.limeFg : colors.mutedFg,
              bgcolor: isCurrent('/events') ? colors.lime : 'transparent',
              p: 0.8,
              '&:hover': { bgcolor: isCurrent('/events') ? colors.limeLt : 'rgba(0,0,0,0.04)' },
            }}
          >
            <ExploreOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: isCurrent('/events') ? colors.fg : colors.mutedFg,
              mt: 0.2,
            }}
          >
            Discover
          </Typography>
        </Box>

        {/* Center Lime Explore Button with Sparkle */}
        <Box
          onClick={() => navigate('/events?trending=true')}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            mt: -2.5,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: colors.lime,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(181, 224, 42, 0.6)',
              border: `3px solid #FEFDFB`,
              transition: 'transform 0.2s ease',
              '&:active': { transform: 'scale(0.95)' },
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 24, color: colors.limeFg }} />
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: colors.fg,
              mt: 0.3,
            }}
          >
            Explore
          </Typography>
        </Box>

        {/* Tickets */}
        <Box
          onClick={() => navigate('/my-tickets')}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            minWidth: 48,
          }}
        >
          <IconButton
            size="small"
            sx={{
              color: isCurrent('/my-tickets') ? colors.limeFg : colors.mutedFg,
              bgcolor: isCurrent('/my-tickets') ? colors.lime : 'transparent',
              p: 0.8,
              '&:hover': { bgcolor: isCurrent('/my-tickets') ? colors.limeLt : 'rgba(0,0,0,0.04)' },
            }}
          >
            <ConfirmationNumberOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: isCurrent('/my-tickets') ? colors.fg : colors.mutedFg,
              mt: 0.2,
            }}
          >
            Tickets
          </Typography>
        </Box>

        {/* Profile */}
        <Box
          onClick={() => navigate(isAuthenticated ? '/profile' : '/login')}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            minWidth: 48,
          }}
        >
          <IconButton
            size="small"
            sx={{
              color: isCurrent('/profile') || isCurrent('/login') ? colors.limeFg : colors.mutedFg,
              bgcolor: isCurrent('/profile') || isCurrent('/login') ? colors.lime : 'transparent',
              p: 0.8,
              '&:hover': { bgcolor: isCurrent('/profile') ? colors.limeLt : 'rgba(0,0,0,0.04)' },
            }}
          >
            <PersonOutlineOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: isCurrent('/profile') || isCurrent('/login') ? colors.fg : colors.mutedFg,
              mt: 0.2,
            }}
          >
            Profile
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
