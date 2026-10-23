import { Box, Container, Typography, Link as MuiLink, IconButton, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import FacebookIcon from '@mui/icons-material/Facebook';
import { colors } from '../../styles/theme';
import BrandLogo from '../common/BrandLogo';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: colors.ink,
        color: colors.inkFg,
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        pt: { xs: 6, md: 8 },
        pb: { xs: 10, md: 6 }, // Extra bottom padding for mobile bottom nav
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        {/* 3 Columns matching SHIKA specification */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr 1fr' },
            gap: { xs: 4, md: 6 },
          }}
        >
          {/* Column 1: Brand & short description */}
          <Box>
            <Box sx={{ mb: 2 }}>
              <BrandLogo to="/" size="medium" lightText />
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(250, 247, 242, 0.65)',
                maxWidth: 340,
                lineHeight: 1.6,
                mb: 3,
              }}
            >
              Kenya's modern cultural discovery and event ticketing platform for live experiences and verified event access.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                sx={{
                  color: 'rgba(250, 247, 242, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  '&:hover': { color: colors.lime, borderColor: colors.lime },
                }}
              >
                <InstagramIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  color: 'rgba(250, 247, 242, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  '&:hover': { color: colors.lime, borderColor: colors.lime },
                }}
              >
                <XIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{
                  color: 'rgba(250, 247, 242, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  '&:hover': { color: colors.lime, borderColor: colors.lime },
                }}
              >
                <FacebookIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Column 2: Explore links */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                letterSpacing: '0.08em',
                color: colors.inkFg,
                display: 'block',
                mb: 2.5,
              }}
            >
              EXPLORE
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <MuiLink
                component={Link}
                to="/events"
                sx={{
                  color: 'rgba(250, 247, 242, 0.7)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': { color: colors.lime },
                }}
              >
                All Events
              </MuiLink>
              <MuiLink
                component={Link}
                to="/events?category=Music"
                sx={{
                  color: 'rgba(250, 247, 242, 0.7)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': { color: colors.lime },
                }}
              >
                Live Concerts & Music
              </MuiLink>
              <MuiLink
                component={Link}
                to="/events?category=Festivals"
                sx={{
                  color: 'rgba(250, 247, 242, 0.7)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': { color: colors.lime },
                }}
              >
                Festivals & Culture
              </MuiLink>
              <MuiLink
                component={Link}
                to="/events?category=Parties"
                sx={{
                  color: 'rgba(250, 247, 242, 0.7)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': { color: colors.lime },
                }}
              >
                Nightlife & Parties
              </MuiLink>
              <MuiLink
                component={Link}
                to="/my-tickets"
                sx={{
                  color: 'rgba(250, 247, 242, 0.7)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': { color: colors.lime },
                }}
              >
                My Tickets & Passes
              </MuiLink>
            </Box>
          </Box>

          {/* Column 3: BASED IN KENYA */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                fontFamily: '"Archivo Black", sans-serif',
                letterSpacing: '0.08em',
                color: colors.inkFg,
                display: 'block',
                mb: 2.5,
              }}
            >
              BASED IN KENYA
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(250, 247, 242, 0.65)',
                lineHeight: 1.6,
                mb: 3,
              }}
            >
              Engineered in Nairobi for East Africa’s entertainment ecosystem, with event discovery and secure ticket check-in.
            </Typography>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '8px',
                bgcolor: 'rgba(232, 80, 58, 0.08)',
                border: '1px solid rgba(232, 80, 58, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: colors.coral,
                }}
              />
              <Typography variant="caption" sx={{ color: colors.coral, fontWeight: 700, letterSpacing: '0.02em' }}>
                Payment integration not configured
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Bottom credits */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(250, 247, 242, 0.45)' }}>
            © {new Date().getFullYear()} VIBE-CONNECT. All rights reserved. Made in Nairobi, Kenya.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <MuiLink component={Link} to="/privacy" sx={{ color: 'rgba(250, 247, 242, 0.45)', fontSize: '0.75rem', textDecoration: 'none', '&:hover': { color: colors.lime } }}>
              Privacy Policy
            </MuiLink>
            <MuiLink component={Link} to="/terms" sx={{ color: 'rgba(250, 247, 242, 0.45)', fontSize: '0.75rem', textDecoration: 'none', '&:hover': { color: colors.lime } }}>
              Terms of Service
            </MuiLink>
            <MuiLink component={Link} to="/organizer-agreement" sx={{ color: 'rgba(250, 247, 242, 0.45)', fontSize: '0.75rem', textDecoration: 'none', '&:hover': { color: colors.lime } }}>
              Organizer Agreement
            </MuiLink>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
