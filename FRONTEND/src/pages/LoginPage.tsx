import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Link as MuiLink,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../utils/format';
import { colors } from '../styles/theme';
import BrandLogo from '../components/common/BrandLogo';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || (location.state as any)?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login({ email, password });
      toast.success(`Welcome back, ${loggedInUser.name}!`);
      
      if (loggedInUser.role === 'ORGANIZER' || loggedInUser.role === 'ADMIN') {
        const target = from && from !== '/' ? from : '/organizer';
        navigate(target, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    toast('Google Sign-In integration is in preview mode.', { icon: '⚡' });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: colors.ink,
        color: colors.inkFg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 8,
        mt: '-64px',
        pt: '96px',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 384, mx: 'auto' }}>
        {/* Brand above heading */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <BrandLogo to="/" size="medium" lightText />
        </Box>

        {/* Large uppercase heading */}
        <Typography
          component="h1"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontWeight: 400,
            fontSize: '1.8rem',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            textAlign: 'center',
            color: colors.inkFg,
            mb: 1,
          }}
        >
          ORGANIZER SIGN IN
        </Typography>

        {/* Short supporting description */}
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(250, 247, 242, 0.65)',
            textAlign: 'center',
            mb: 3.5,
          }}
        >
          Sign in to manage your events, ticket inventory, gate check-in, and payouts.
        </Typography>

        {/* Contrasting Form Panel */}
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            borderRadius: '8px',
            bgcolor: '#FEFDFB',
            color: colors.fg,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}

          {/* 1. Continue with Google */}
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleSignIn}
            startIcon={<GoogleIcon sx={{ color: '#EA4335' }} />}
            sx={{
              py: 1.2,
              borderRadius: '8px',
              borderColor: colors.border,
              color: colors.fg,
              fontWeight: 700,
              fontSize: '0.88rem',
              textTransform: 'none',
              '&:hover': {
                bgcolor: colors.mutedBg,
                borderColor: colors.border,
              },
            }}
          >
            Continue with Google
          </Button>

          {/* 2. "or" divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', my: 2.5 }}>
            <Divider sx={{ flex: 1, borderColor: colors.border }} />
            <Typography variant="caption" sx={{ px: 2, color: colors.mutedFg, fontWeight: 700, textTransform: 'uppercase' }}>
              OR
            </Typography>
            <Divider sx={{ flex: 1, borderColor: colors.border }} />
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 3. Email */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.6, display: 'block' }}>
                EMAIL ADDRESS
              </Typography>
              <TextField
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                size="small"
                autoComplete="email"
                sx={{
                  bgcolor: colors.bg,
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': { borderColor: colors.border },
                  },
                }}
              />
            </Box>

            {/* 4. Password */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg }}>
                  PASSWORD
                </Typography>
                <MuiLink
                  href="#"
                  variant="caption"
                  sx={{ color: colors.coral, textDecoration: 'none', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
                >
                  Forgot?
                </MuiLink>
              </Box>
              <TextField
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                size="small"
                autoComplete="current-password"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          sx={{ color: colors.mutedFg }}
                        >
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  bgcolor: colors.bg,
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': { borderColor: colors.border },
                  },
                }}
              />
            </Box>

            {/* 5. Lime Sign in button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                mt: 1,
                py: 1.3,
                bgcolor: colors.lime,
                color: colors.limeFg,
                fontWeight: 800,
                fontSize: '0.92rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: '8px',
                '&:hover': { bgcolor: colors.limeLt },
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: colors.limeFg }} /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>

        {/* 6. Text action to switch modes */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: 'rgba(250, 247, 242, 0.65)' }}>
            Need an organizer account?{' '}
            <MuiLink
              component={Link}
              to="/register"
              sx={{
                color: colors.lime,
                fontWeight: 700,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Create Account
            </MuiLink>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
