import type { PropsWithChildren } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
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

function AppLayout({ children }: PropsWithChildren) {
  const isOrganizerDashboard = useLocation().pathname === '/organizer';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
