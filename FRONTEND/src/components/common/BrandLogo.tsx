import { Box, Typography } from '@mui/material';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';

interface BrandLogoProps {
  to?: string;
  size?: 'small' | 'medium' | 'large';
  lightText?: boolean; // when rendered on dark/ink backgrounds
}

export default function BrandLogo({ to = '/', size = 'medium', lightText = false }: BrandLogoProps) {
  const iconSize = size === 'small' ? 24 : size === 'large' ? 38 : 32;
  const boltSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  const fontSize = size === 'small' ? '1.1rem' : size === 'large' ? '1.6rem' : '1.35rem';

  const content = (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.2, textDecoration: 'none' }}>
      {/* Lime circle with dark lightning bolt */}
      <Box
        sx={{
          width: iconSize,
          height: iconSize,
          borderRadius: '50%',
          bgcolor: colors.lime,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(181, 224, 42, 0.4)',
        }}
      >
        <FlashOnIcon sx={{ fontSize: boltSize, color: colors.limeFg }} />
      </Box>

      {/* Brand text */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        <Typography
          component="span"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontWeight: 400,
            fontSize,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: lightText ? colors.inkFg : colors.fg,
            lineHeight: 1,
          }}
        >
          VIBE
        </Typography>
        <Typography
          component="span"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontWeight: 400,
            fontSize,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: colors.lime,
            lineHeight: 1,
          }}
        >
          CONNECT
        </Typography>
      </Box>
    </Box>
  );

  if (to) {
    return (
      <Box component={Link} to={to} sx={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex' }}>
        {content}
      </Box>
    );
  }

  return content;
}
