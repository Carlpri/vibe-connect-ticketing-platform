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
  ToggleButtonGroup,
  ToggleButton,
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

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ATTENDEE' | 'ORGANIZER'>('ORGANIZER');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || (location.state as any)?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name,
        email,
        phone: phone || undefined,
        password,
        role,
      });
      toast.success('Account created! Please check your email to verify.');
      if (role === 'ORGANIZER') {
        navigate('/organizer', { replace: true });
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
      <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
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
            fontSize: '1.75rem',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            textAlign: 'center',
            color: colors.inkFg,
            mb: 1,
          }}
        >
          {role === 'ORGANIZER' ? 'CREATE ORGANIZER ACCOUNT' : 'CREATE ACCOUNT'}
        </Typography>

        {/* Short supporting description */}
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(250, 247, 242, 0.65)',
            textAlign: 'center',
            mb: 3,
          }}
        >
          Start listing experiences, selling tickets via M-Pesa, and tracking attendance.
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

          {/* Account Type Toggle */}
          <Box sx={{ mb: 2.5 }}>
            <ToggleButtonGroup
              value={role}
              exclusive
              onChange={(_, newRole) => newRole && setRole(newRole)}
              fullWidth
              size="small"
              sx={{
                bgcolor: colors.bg,
                borderRadius: '8px',
                p: '3px',
                '& .MuiToggleButton-root': {
                  borderRadius: '6px !important',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  color: colors.mutedFg,
                  py: 0.8,
                  '&.Mui-selected': {
                    bgcolor: colors.lime,
                    color: colors.limeFg,
                    '&:hover': { bgcolor: colors.limeLt },
                  },
                },
              }}
            >
              <ToggleButton value="ORGANIZER">Event Organizer</ToggleButton>
              <ToggleButton value="ATTENDEE">Event Attendee</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Continue with Google */}
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleSignIn}
            startIcon={<GoogleIcon sx={{ color: '#EA4335' }} />}
            sx={{
              py: 1.1,
              borderRadius: '8px',
              borderColor: colors.border,
              color: colors.fg,
              fontWeight: 700,
              fontSize: '0.86rem',
              textTransform: 'none',
              '&:hover': {
                bgcolor: colors.mutedBg,
                borderColor: colors.border,
              },
            }}
          >
            Continue with Google
          </Button>

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', my: 2.2 }}>
            <Divider sx={{ flex: 1, borderColor: colors.border }} />
            <Typography variant="caption" sx={{ px: 2, color: colors.mutedFg, fontWeight: 700, textTransform: 'uppercase' }}>
              OR
            </Typography>
            <Divider sx={{ flex: 1, borderColor: colors.border }} />
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.5, display: 'block' }}>
                FULL NAME
              </Typography>
              <TextField
                placeholder="e.g. Wangari Maathai"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                size="small"
                autoComplete="name"
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

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.5, display: 'block' }}>
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

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.5, display: 'block' }}>
                M-PESA PHONE NUMBER (OPTIONAL)
              </Typography>
              <TextField
                type="tel"
                placeholder="0712345678 or 254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                size="small"
                autoComplete="tel"
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

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: colors.mutedFg, mb: 0.5, display: 'block' }}>
                PASSWORD
              </Typography>
              <TextField
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                size="small"
                autoComplete="new-password"
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

            {/* Submit Button */}
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
              {loading ? <CircularProgress size={22} sx={{ color: colors.limeFg }} /> : 'Create Account'}
            </Button>
          </Box>
        </Paper>

        {/* Switch to sign-in */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: 'rgba(250, 247, 242, 0.65)' }}>
            Already have an account?{' '}
            <MuiLink
              component={Link}
              to="/login"
              sx={{
                color: colors.lime,
                fontWeight: 700,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Sign In
            </MuiLink>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
