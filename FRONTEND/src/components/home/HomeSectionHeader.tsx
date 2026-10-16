import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { colors } from '../../styles/theme';

type HomeSectionHeaderProps = {
  eyebrow: string;
  title: string;
  eyebrowColor?: string;
  titleColor?: string;
  linkTo: string;
  linkLabel: string;
  linkColor?: string;
  linkHoverColor?: string;
  animationDelay?: string;
};

export default function HomeSectionHeader({
  eyebrow,
  title,
  eyebrowColor = colors.coral,
  titleColor = colors.fg,
  linkTo,
  linkLabel,
  linkColor = colors.fg,
  linkHoverColor = colors.coral,
  animationDelay = '0s',
}: HomeSectionHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'flex-end' },
        gap: 2,
        mb: { xs: 2.5, md: 4 },
        animation: `fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${animationDelay} both`,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: eyebrowColor,
            display: 'block',
            mb: 0.5,
          }}
        >
          {eyebrow}
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontWeight: 400,
            fontSize: { xs: '1.55rem', sm: '2.4rem', md: '2.8rem' },
            textTransform: 'uppercase',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: titleColor,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: { xs: 'block', md: 'none' },
            mt: 1,
            color: titleColor,
            opacity: 0.55,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          Swipe cards to explore →
        </Typography>
      </Box>
      <Button
        component={Link}
        to={linkTo}
        endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
        sx={{
          flexShrink: 0,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: linkColor,
          fontSize: { xs: '0.75rem', sm: '0.85rem' },
          letterSpacing: '0.04em',
          px: { xs: 1, sm: 2 },
          minWidth: 'auto',
          '&:hover': { color: linkHoverColor, bgcolor: 'transparent' },
        }}
      >
        {linkLabel}
      </Button>
    </Box>
  );
}
