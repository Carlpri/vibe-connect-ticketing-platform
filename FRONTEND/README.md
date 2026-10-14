# VIBE-CONNECT — Customer-Facing Frontend

A modern, high-energy event discovery and digital ticketing web application tailored for Kenya's vibrant nightlife, music festivals, parties, sports, and live entertainment.

---

## 🚀 Key Features

1. **Kenyan Event Discovery**:
   - Curated festival, music, party, sports, and comedy listings.
   - Dynamic search by artist/venue/event, category pill filters (Music, Festivals, Parties, Comedy, Sports, Networking), and location filtering (Nairobi, Mombasa, Kilifi, Kisumu, Nakuru).
   - Rich dark glassmorphic UI with responsive event cards, start dates, venues, and live ticket prices in KES.

2. **Event Details & Interactive Ticket Selector**:
   - Comprehensive event experience breakdown with high-resolution hero banners.
   - Real-time tier selection (Early Bird, Regular, VIP, VVIP) with capacity checks, counters, and subtotal calculation in KES.
   - Security middleware status awareness (`requireFullyVerified` policy warnings).

3. **Kenyan M-Pesa STK Push Checkout**:
   - Seamless Lipa na M-Pesa online checkout modal.
   - Instant phone prompt simulation with PIN countdown and instant transaction receipt confirmation.

4. **Digital Pass & QR Code Wallet (My Tickets)**:
   - Digital event tickets stored in the attendee account.
   - Visual scannable QR gate passes with attendee details, ticket tier, and M-Pesa transaction reference.
   - One-click print/download support for entry gates.

5. **Authentication & Verification Hub**:
   - Backend-connected authentication (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`).
   - Email verification flow with `/verify-email?token=...` handling and resend capability.
   - Phone OTP verification via 6-digit SMS code to satisfy the backend `requireFullyVerified` checkout policy.

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Material-UI (MUI) custom dark theme (`#0D0D14` background, `#7C3AED` electric violet primary, `#F59E0B` amber secondary, `#00A651` Safaricom M-Pesa green)
- **Routing**: React Router v7
- **HTTP Client**: Axios with automatic JWT injection and 401 handling
- **Typography**: `@fontsource/inter`
- **Notifications**: `react-hot-toast`

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── assets/               # Images and static media
│   ├── components/
│   │   ├── common/           # ProtectedRoute, EmptyState, LoadingSkeleton
│   │   ├── events/           # EventCard, EventFilters, TicketSelector, MpesaModal
│   │   └── layout/           # Navbar, Footer
│   ├── contexts/             # AuthContext (JWT rehydration, login, register, me)
│   ├── data/                 # Mock Kenyan events catalog (Sol Fest, Blankets & Wine, etc.)
│   ├── pages/
│   │   ├── HomePage.tsx      # Hero, popular tags, trending events, highlights
│   │   ├── EventsPage.tsx    # Search, category & city filters, event grid
│   │   ├── EventDetailPage.tsx # Event breakdown, ticket tier selector, checkout CTA
│   │   ├── CheckoutPage.tsx  # Order summary, verification check, Lipa na M-Pesa
│   │   ├── OrderConfirmationPage.tsx # Receipt, M-Pesa ref, ticket wallet link
│   │   ├── MyTicketsPage.tsx # Scannable digital QR passes & order history
│   │   ├── ProfilePage.tsx   # Email verification & phone SMS OTP verification
│   │   ├── LoginPage.tsx     # Sign in with JWT handling
│   │   ├── RegisterPage.tsx  # Attendee / Organizer registration
│   │   ├── VerifyEmailPage.tsx # Token verification handler
│   │   └── NotFoundPage.tsx  # 404 handler
│   ├── services/
│   │   ├── api.ts            # Axios instance with auth interceptor
│   │   ├── authService.ts    # 7 backend /api/auth endpoints
│   │   ├── eventService.ts   # /api/events with mock fallback for interactive catalog
│   │   └── bookingService.ts # /api/orders stubs aligned with backend contracts
│   ├── styles/
│   │   └── theme.ts          # MUI dark theme configuration
│   ├── types/
│   │   └── index.ts          # Strictly aligned TypeScript backend types
│   ├── utils/
│   │   └── format.ts         # KES formatting, Kenya date formatting, error extractors
│   ├── App.tsx               # Root routes and providers
│   ├── main.tsx              # Application entry point
│   └── index.css             # Dark background resets & sleek scrollbars
├── .env.example
├── index.html
├── package.json
└── vite.config.ts
```

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `VITE_API_URL=http://localhost:3000` points to the running backend.

### 3. Run Development Server
```bash
npm run dev
```
The app will run locally on `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in `dist/`.
