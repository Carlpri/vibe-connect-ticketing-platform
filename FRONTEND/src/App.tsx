import { useMemo, type PropsWithChildren } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, GlobalStyles } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import theme from './styles/theme';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

import MobileBottomNav from './components/layout/MobileBottomNav';

// Pages
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutVerifyPage from './pages/CheckoutVerifyPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import MyTicketsPage from './pages/MyTicketsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import OrganizerDashboardPage from './pages/OrganizerDashboardPage';
import OrganizerCheckInPage from './pages/OrganizerCheckInPage';
import CreateEventPage from './pages/CreateEventPage';
import NotFoundPage from './pages/NotFoundPage';
import LegalDocumentPage from './pages/legal/LegalDocumentPage';
import AnalyticsProvider from './components/AnalyticsProvider';
import { ThemeModeProvider, useThemeMode } from './contexts/ThemeModeContext';

function AppLayout({ children }: PropsWithChildren) {
  const isOrganizerDashboard = useLocation().pathname === '/organizer';
  const { mode } = useThemeMode();

  return (
    <Box
      className={`app-theme-${mode}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: mode === 'dark' ? '#09090B' : 'background.default',
        color: mode === 'dark' ? '#FAFAFA' : 'text.primary',
      }}
    >
      {!isOrganizerDashboard && <Navbar />}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, overflowX: 'hidden' }}>
        {children}
      </Box>
      {!isOrganizerDashboard && <Footer />}
      {!isOrganizerDashboard && <MobileBottomNav />}
    </Box>
  );
}

export default function App() {
  return (
    <ThemeModeProvider>
      <AppTheme />
    </ThemeModeProvider>
  );
}

function AppTheme() {
  const { mode } = useThemeMode();
  const activeTheme = useMemo(
    () =>
      createTheme(theme, {
        palette:
          mode === 'dark'
            ? {
                mode: 'dark',
                background: { default: '#09090B', paper: '#18181B' },
                text: { primary: '#FAFAFA', secondary: '#A1A1AA' },
                divider: '#27272A',
              }
            : { mode: 'light' },
      }),
    [mode]
  );

  return (
    <ThemeProvider theme={activeTheme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          '.app-theme-dark': { colorScheme: 'dark' },
          '.app-theme-dark main > .MuiBox-root': {
            backgroundColor: '#09090B',
            color: '#FAFAFA',
          },
          '.app-theme-dark .MuiAppBar-root': {
            bgcolor: 'rgba(9,9,11,0.94)',
            color: '#FAFAFA',
            borderColor: '#27272A',
          },
          '.app-theme-dark .MuiAppBar-root .MuiButton-root': { color: '#FAFAFA' },
          '.app-theme-dark .MuiAppBar-root .MuiButton-root.active': {
            color: '#09090B',
            backgroundColor: '#D4FF2A',
          },
          '.app-theme-dark .MuiAppBar-root .MuiButton-contained': {
            color: '#09090B',
            backgroundColor: '#D4FF2A',
          },
          '.app-theme-dark .MuiCard-root, .app-theme-dark .MuiPaper-root, .app-theme-dark .MuiMenu-paper, .app-theme-dark .MuiDrawer-paper, .app-theme-dark .MuiDialog-paper':
            {
              backgroundColor: '#18181B',
              color: '#FAFAFA',
              borderColor: '#27272A',
              backgroundImage: 'none',
            },
          '.app-theme-dark .MuiTypography-root': { color: '#FAFAFA' },
          '.app-theme-dark .organizer-promo .MuiTypography-root': { color: '#09090B' },
          '.app-theme-dark .organizer-promo .MuiButton-outlined': {
            color: '#09090B',
            borderColor: '#09090B',
          },
          '.app-theme-dark .MuiTypography-body2, .app-theme-dark .MuiTypography-caption, .app-theme-dark .MuiTypography-subtitle2':
            { color: '#A1A1AA' },
          '.app-theme-dark .organizer-promo .MuiTypography-root.MuiTypography-body2, .app-theme-dark .organizer-promo .MuiTypography-root.MuiTypography-caption':
            { color: '#09090B' },
          '.app-theme-dark .MuiInputBase-root': {
            bgcolor: '#09090B',
            color: '#FAFAFA',
          },
          '.app-theme-dark .MuiOutlinedInput-notchedOutline': { borderColor: '#3F3F46' },
          '.app-theme-dark .MuiInputLabel-root': { color: '#A1A1AA' },
          '.app-theme-dark .MuiButton-outlined': { color: '#FAFAFA', borderColor: '#3F3F46' },
          '.app-theme-dark .MuiDivider-root': { borderColor: '#27272A' },
          '.app-theme-dark .MuiTab-root': { color: '#A1A1AA' },
          '.app-theme-dark .MuiTab-root.Mui-selected': { color: '#D4FF2A' },
          '.app-theme-dark .MuiTabs-indicator': { backgroundColor: '#D4FF2A' },
        }}
      />
      <AuthProvider>
        <BrowserRouter>
          <AnalyticsProvider>
            <AppLayout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/verify" element={<CheckoutVerifyPage />} />
                <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
                <Route
                  path="/my-tickets"
                  element={
                    <ProtectedRoute>
                      <MyTicketsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer"
                  element={
                    <ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>
                      <OrganizerDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/create-event"
                  element={
                    <ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>
                      <CreateEventPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events/:eventId/edit"
                  element={
                    <ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>
                      <CreateEventPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events/:eventId/check-in"
                  element={
                    <ProtectedRoute requiredRoles={['ORGANIZER', 'ADMIN']}>
                      <OrganizerCheckInPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/privacy" element={<LegalDocumentPage />} />
                <Route path="/terms" element={<LegalDocumentPage />} />
                <Route path="/organizer-agreement" element={<LegalDocumentPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppLayout>
          </AnalyticsProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1C1916',
                color: '#FAF7F2',
                border: '1px solid #D1CBC3',
                borderRadius: '8px',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 600,
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
