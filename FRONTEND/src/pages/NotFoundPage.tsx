import { Container, Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import { colors } from '../styles/theme';

export default function NotFoundPage() {
  return (
    <Box sx={{ minHeight: '80vh', display: 'grid', placeItems: 'center', py: 8, textAlign: 'center', bgcolor: colors.bg }}>
      <Container maxWidth="xs">
        <SentimentDissatisfiedIcon sx={{ fontSize: 64, color: colors.mutedFg, mb: 2 }} />
        <Typography
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '4rem',
            lineHeight: 1,
            color: colors.fg,
            mb: 1,
          }}
        >
          404
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '1.2rem',
            textTransform: 'uppercase',
            color: colors.coral,
            mb: 1,
          }}
        >
          PAGE NOT FOUND
        </Typography>
        <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 4 }}>
          The page or event you're looking for might have ended, moved, or never existed.
        </Typography>
        <Button
          component={Link}
          to="/"
          variant="contained"
          sx={{
            px: 3.5,
            py: 1.2,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            bgcolor: colors.lime,
            color: colors.limeFg,
            borderRadius: '8px',
            '&:hover': { bgcolor: colors.limeLt },
          }}
        >
          Back to Discover
        </Button>
      </Container>
    </Box>
  );
}
