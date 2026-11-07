import { Box } from '@mui/material';
import { Link } from 'react-router-dom';

interface BrandLogoProps {
  to?: string;
  size?: 'small' | 'medium' | 'large';
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
          width: '320%',
          height: '320%',
          maxWidth: 'none',
          left: '-65.8%',
          top: '-8.3%',
        }}
      />
    </Box>
  );
}

export default function BrandLogo({ to = '/', size = 'medium' }: BrandLogoProps) {
  const iconSize = size === 'small' ? 24 : size === 'large' ? 38 : 32;

  const content = (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
      <BrandMark size={iconSize} />
    </Box>
  );

  if (to) {
    return (
      <Box
        component={Link}
        to={to}
        aria-label="Vibe Connect home"
        sx={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex' }}
      >
        {content}
      </Box>
    );
  }

  return content;
}
