import { createTheme, alpha } from '@mui/material/styles';

/**
 * VIBE-CONNECT MUI Theme — Matching the SHIKA design system exactly.
 *
 * Customer pages: warm off-white (light mode) with electric lime + coral accent.
 * Ink sections: near-black warm backgrounds for footer, hero overlays, organizer.
 *
 * Fonts: Archivo Black (display) + Manrope (body).
 * Radius: 0.5rem = 8px (the SHIKA standard).
 *
 * oklch source values converted to hex approximations for MUI compatibility.
 */

/* ── Light-theme colour primitives ─────────────────────── */
const BG            = '#F7F4EE';    // oklch(0.975 0.012 91)  – warm off-white
const FG            = '#262220';    // oklch(0.16 0.015 80)   – near-black
const CARD_BG       = '#FEFDFB';    // oklch(0.995 0.005 91)  – near-white
const CARD_FG       = '#262220';

const LIME          = '#B5E02A';    // oklch(0.84 0.205 123)  – electric lime
const LIME_FG       = '#1A2B08';    // oklch(0.15 0.035 120)  – dark green on lime
const LIME_LIGHT    = '#C8F040';    // brighter for hover
const LIME_DARK     = '#8BBF1A';    // deeper lime

const CORAL         = '#E8503A';    // oklch(0.72 0.21 25)    – accent coral red
const CORAL_FG      = '#FEFDFB';    // oklch(0.99 0.005 91)
const CORAL_LIGHT   = '#F06850';
const CORAL_DARK    = '#C83A28';

const SECONDARY_BG  = '#E8E2D8';    // oklch(0.92 0.025 91)   – warm light gray
const SECONDARY_FG  = '#262220';

const MUTED_BG      = '#ECE8E2';    // oklch(0.93 0.015 91)   – soft neutral
const MUTED_FG      = '#756D65';    // oklch(0.48 0.025 80)   – gray

const INK           = '#1C1916';    // oklch(0.12 0.015 80)   – near-black, warm
const INK_FG        = '#FAF7F2';    // oklch(0.98 0.008 91)   – near-white

const BORDER        = '#D1CBC3';    // oklch(0.84 0.015 83)   – warm gray
const INPUT_BORDER  = '#D1CBC3';
const RING          = '#7DBC20';    // oklch(0.7 0.18 123)    – lime ring / focus

const SUCCESS       = '#2BB85A';    // oklch(0.6 0.17 145)
const SUCCESS_FG    = '#FAFEF5';
const MPESA         = '#33C759';    // oklch(0.64 0.2 145)
const MPESA_FG      = '#FAFEF5';
const WARNING       = '#D4A830';    // oklch(0.78 0.16 78)
const WARNING_FG    = '#302008';
const ERROR_CLR     = '#E53E3E';    // oklch(0.577 0.245 27)
const INFO_CLR      = '#38BDF8';

const QR_BG         = '#FEFEFE';
const QR_FG         = '#181818';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: LIME,
      light: LIME_LIGHT,
      dark: LIME_DARK,
      contrastText: LIME_FG,
    },
    secondary: {
      main: CORAL,
      light: CORAL_LIGHT,
      dark: CORAL_DARK,
      contrastText: CORAL_FG,
    },
    background: {
      default: BG,
      paper: CARD_BG,
    },
    text: {
      primary: FG,
      secondary: MUTED_FG,
    },
    error:   { main: ERROR_CLR },
    warning: { main: WARNING, contrastText: WARNING_FG },
    success: { main: SUCCESS, contrastText: SUCCESS_FG },
    info:    { main: INFO_CLR },
    divider: BORDER,
  },

  typography: {
    fontFamily: '"Manrope", system-ui, -apple-system, sans-serif',

    /* Display headings → Archivo Black, uppercase, tight leading */
    h1: {
      fontFamily: '"Archivo Black", "Manrope", sans-serif',
      fontWeight: 400,
      letterSpacing: '-0.02em',
      lineHeight: 0.95,
      textTransform: 'uppercase' as const,
    },
    h2: {
      fontFamily: '"Archivo Black", "Manrope", sans-serif',
      fontWeight: 400,
      letterSpacing: '-0.02em',
      lineHeight: 1,
      textTransform: 'uppercase' as const,
    },
    h3: {
      fontFamily: '"Manrope", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.01em',
      lineHeight: 1.15,
    },
    h4: {
      fontFamily: '"Manrope", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontFamily: '"Manrope", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Manrope", sans-serif',
      fontWeight: 700,
    },
    subtitle1: { fontWeight: 600, fontSize: '1rem' },
    subtitle2: {
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      fontSize: '0.72rem',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none' as const,
      letterSpacing: '0.01em',
    },
    body1: { fontWeight: 400, lineHeight: 1.7 },
    body2: { fontWeight: 400, lineHeight: 1.6 },
    overline: {
      fontWeight: 700,
      letterSpacing: '0.12em',
      fontSize: '0.68rem',
    },
    caption: { fontSize: '0.78rem', lineHeight: 1.5 },
  },

  shape: { borderRadius: 8 },   // --radius: 0.5rem

  components: {
    /* ── Buttons ──────────────────────────────────────── */
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 22px',
          fontWeight: 700,
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': { boxShadow: 'none' },
        },
        contained: ({ ownerState }) => ({
          background: ownerState.color === 'secondary' ? CORAL : LIME,
          color: ownerState.color === 'secondary' ? '#fff' : LIME_FG,
          '&:hover': {
            background: ownerState.color === 'secondary' ? CORAL_LIGHT : LIME_LIGHT,
            transform: 'translateY(-1px)',
          },
        }),
        outlined: {
          borderColor: BORDER,
          color: FG,
          '&:hover': {
            borderColor: alpha(LIME, 0.6),
            backgroundColor: alpha(LIME, 0.05),
          },
        },
      },
    },

    /* ── Cards ────────────────────────────────────────── */
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
        },
      },
    },

    /* ── TextFields ───────────────────────────────────── */
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset':       { borderColor: INPUT_BORDER },
            '&:hover fieldset': { borderColor: alpha(LIME, 0.5) },
            '&.Mui-focused fieldset': { borderColor: LIME },
          },
        },
      },
    },

    /* ── Chips ────────────────────────────────────────── */
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 600,
          fontSize: '0.82rem',
        },
      },
    },

    /* ── AppBar ───────────────────────────────────────── */
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: alpha(BG, 0.9),
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: `1px solid ${BORDER}`,
          color: FG,
        },
      },
    },

    /* ── Drawer ───────────────────────────────────────── */
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: CARD_BG,
          backgroundImage: 'none',
        },
      },
    },

    /* ── Menu ─────────────────────────────────────────── */
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: CARD_BG,
          backgroundImage: 'none',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
        },
      },
    },

    /* ── Skeleton ─────────────────────────────────────── */
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: MUTED_BG },
      },
    },

    /* ── Alert ────────────────────────────────────────── */
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },

    /* ── Divider ──────────────────────────────────────── */
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: BORDER },
      },
    },

    /* ── CssBaseline ──────────────────────────────────── */
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${MUTED_BG} ${BG}`,
        },
      },
    },
  },
});

export default theme;

/**
 * Re-export colour primitives for one-off inline usage in components.
 * Use these when you need ink sections, brand marks, or special treatments
 * that don't map cleanly to MUI's palette roles.
 */
export const colors = {
  bg: BG,
  background: BG,
  fg: FG,
  foreground: FG,
  cardBg: CARD_BG,
  cardFg: CARD_FG,
  surface: CARD_BG,
  secondaryFg: SECONDARY_FG,
  lime: LIME,
  limeFg: LIME_FG,
  limeInk: LIME_FG,
  limeLt: LIME_LIGHT,
  limeDk: LIME_DARK,
  coral: CORAL,
  coralFg: CORAL_FG,
  coralLt: CORAL_LIGHT,
  coralDk: CORAL_DARK,
  secondaryBg: SECONDARY_BG,
  mutedBg: MUTED_BG,
  mutedFg: MUTED_FG,
  ink: INK,
  inkFg: INK_FG,
  border: BORDER,
  ring: RING,
  success: SUCCESS,
  mpesa: MPESA,
  mpesaFg: MPESA_FG,
  warning: WARNING,
  qrBg: QR_BG,
  qrFg: QR_FG,
} as const;

