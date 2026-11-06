import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';

interface BrandLogoProps {
  to?: string;
  size?: 'small' | 'medium' | 'large';
  lightText?: boolean; // when rendered on dark/ink backgrounds
}

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box
        component="img"
        src="/vibe-connect-logo.png"
        alt=""
        sx={{
          position: 'absolute',
          width: '200%',
          height: '200%',
          maxWidth: 'none',
          left: '-46%',
          top: '-25%',
        }}
      />
    </Box>
  );
}

export default function BrandLogo({ to = '/', size = 'medium', lightText = false }: BrandLogoProps) {
  const iconSize = size === 'small' ? 24 : size === 'large' ? 38 : 32;
  const fontSize = size === 'small' ? '1.1rem' : size === 'large' ? '1.6rem' : '1.35rem';

  const content = (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.2, textDecoration: 'none' }}>
      <BrandMark size={iconSize} />

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
