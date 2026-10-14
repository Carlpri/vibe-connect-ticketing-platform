import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Container, Paper, Box, Typography, Button, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../utils/format';
import { colors } from '../styles/theme';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setLoading(false);
        setMessage('No verification token provided in URL.');
        return;
      }

      try {
        const res = await authService.verifyEmail({ token });
        setSuccess(true);
        setMessage(res.message || 'Email verified successfully!');
        await refreshUser();
      } catch (err) {
        setSuccess(false);
        setMessage(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [token, refreshUser]);

  return (
    <Box sx={{ minHeight: '80vh', display: 'grid', placeItems: 'center', py: 8, bgcolor: colors.bg }}>
      <Container maxWidth="xs">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: '#FEFDFB',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          }}
        >
          {loading ? (
            <Box sx={{ py: 4 }}>
              <CircularProgress size={44} sx={{ color: colors.lime, mb: 2 }} />
              <Typography sx={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.1rem', textTransform: 'uppercase', color: colors.fg }}>
                VERIFYING YOUR EMAIL...
              </Typography>
            </Box>
          ) : success ? (
            <Box sx={{ py: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 56, color: colors.success, mb: 2 }} />
              <Typography
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.4rem',
                  textTransform: 'uppercase',
                  color: colors.fg,
                  mb: 1,
                }}
              >
                EMAIL CONFIRMED!
              </Typography>
              <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 3 }}>
                {message}
              </Typography>
              <Button
                component={Link}
                to="/events"
                variant="contained"
                fullWidth
                sx={{
                  py: 1.3,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  bgcolor: colors.lime,
                  color: colors.limeFg,
                  borderRadius: '8px',
                  '&:hover': { bgcolor: colors.limeLt },
                }}
              >
                Explore Events
              </Button>
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              <ErrorIcon sx={{ fontSize: 56, color: colors.coral, mb: 2 }} />
              <Typography
                sx={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.4rem',
                  textTransform: 'uppercase',
                  color: colors.coral,
                  mb: 1,
                }}
              >
                VERIFICATION FAILED
              </Typography>
              <Typography variant="body2" sx={{ color: colors.mutedFg, mb: 3 }}>
                {message}
              </Typography>
              <Button
                component={Link}
                to="/profile"
                variant="outlined"
                fullWidth
                sx={{
                  py: 1.3,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  borderRadius: '8px',
                  borderColor: colors.border,
                  color: colors.fg,
                }}
              >
                Go to Profile
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
