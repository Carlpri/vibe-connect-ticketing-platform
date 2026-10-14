import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useScrollTrigger,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/format';
import { colors } from '../../styles/theme';
import BrandLogo from '../common/BrandLogo';

const NAV_LINKS = [
  { label: 'Discover', to: '/events' },
  { label: 'My Tickets', to: '/my-tickets' },
  { label: 'For Organizers', to: '/login' },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 10 });

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/');
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          transition: 'all 0.25s ease',
          height: 64,
          justifyContent: 'center',
          borderBottom: scrolled
            ? `1px solid ${colors.border}`
            : '1px solid transparent',
          bgcolor: scrolled
            ? 'rgba(247, 244, 238, 0.94)'
            : 'rgba(247, 244, 238, 0.85)',
          backdropFilter: 'blur(16px)',
          color: colors.fg,
        }}
      >
        <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', px: { xs: 2, md: 3 }, minHeight: '64px !important' }}>
          {/* Brand Logo with Lime Circle + Lightning Bolt */}
          <BrandLogo to="/" size="medium" />

          {/* Centered Desktop nav links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mx: 'auto' }}>
            {NAV_LINKS.map((link) => (
              <Button
                key={link.to}
                component={NavLink}
                to={link.to}
                sx={{
                  color: colors.fg,
                  fontWeight: 600,
                  px: 2,
                  py: 0.8,
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  '&.active': {
                    color: colors.limeFg,
                    bgcolor: colors.lime,
                  },
                  '&:hover': {
                    bgcolor: 'rgba(181, 224, 42, 0.15)',
                  },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Box>

          {/* Right-side controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: { xs: 'auto', md: 0 } }}>
            {/* Search Icon */}
            <IconButton
              component={Link}
              to="/events"
              size="small"
              sx={{
                color: colors.fg,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                p: 0.8,
                '&:hover': { bgcolor: colors.mutedBg },
              }}
              aria-label="Search events"
            >
              <SearchIcon sx={{ fontSize: 20 }} />
            </IconButton>

            {isAuthenticated && user ? (
              <>
                <IconButton onClick={handleMenuOpen} size="small" sx={{ p: 0.5 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      bgcolor: colors.lime,
                      color: colors.limeFg,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {getInitials(user.name)}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 1.5,
                        minWidth: 220,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                    My Profile
                  </MenuItem>
                  <MenuItem onClick={() => { handleMenuClose(); navigate('/my-tickets'); }}>
                    My Tickets
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout} sx={{ color: colors.coral, fontWeight: 600 }}>
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
                <Button
                  component={Link}
                  to="/login"
                  variant="text"
                  sx={{ color: colors.fg, fontWeight: 600, textTransform: 'none' }}
                >
                  Sign In
                </Button>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  size="small"
                  sx={{
                    px: 2.5,
                    py: 0.9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.82rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  Get Started
                </Button>
              </Box>
            )}

            {/* Mobile menu button */}
            <IconButton
              sx={{ display: { md: 'none' }, color: colors.fg, ml: 0.5 }}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 300,
              px: 2,
              bgcolor: colors.bg,
            },
          },
        }}
      >
        <Box sx={{ pt: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <BrandLogo to="/" size="small" />
          <IconButton onClick={() => setDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ my: 1 }} />
        <List>
          {NAV_LINKS.map((link) => (
            <ListItem key={link.to} disablePadding>
              <ListItemButton
                component={Link}
                to={link.to}
                onClick={() => setDrawerOpen(false)}
                sx={{ borderRadius: '8px', mb: 0.5 }}
              >
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{link.label}</Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 1 }} />
        {isAuthenticated ? (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/profile"
                onClick={() => setDrawerOpen(false)}
                sx={{ borderRadius: '8px' }}
              >
                <ListItemText primary="My Profile" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => { setDrawerOpen(false); handleLogout(); }}
                sx={{ borderRadius: '8px' }}
              >
                <ListItemText
                  primary={
                    <Typography sx={{ color: colors.coral, fontWeight: 600 }}>Sign Out</Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              fullWidth
              component={Link}
              to="/login"
              variant="outlined"
              onClick={() => setDrawerOpen(false)}
            >
              Sign In
            </Button>
            <Button
              fullWidth
              component={Link}
              to="/register"
              variant="contained"
              onClick={() => setDrawerOpen(false)}
            >
              Get Started
            </Button>
          </Box>
        )}
      </Drawer>

      {/* Toolbar spacer */}
      <Toolbar sx={{ minHeight: '64px !important' }} />
    </>
  );
}
