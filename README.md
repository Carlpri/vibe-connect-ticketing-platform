# 🎟️ VIBE-CONNECT

**Kenyan Event Discovery & Digital Ticketing Platform**

> Connecting people to live events across Kenya — from concerts and festivals to community gatherings, powered by M-Pesa payments and secure digital ticketing.

---

## 🏗️ Architecture & Structure

The repository is organized as a clean monorepo with **`VIBE-CONNECT`** as the root folder, containing two independent subroots:

```
VIBE-CONNECT/
├── BACKEND/                  # Express + TypeScript + Prisma API
│   ├── src/                  # Modular monolith backend source
│   │   ├── modules/
│   │   │   ├── auth/         # Authentication & users (Carlos)
│   │   │   ├── events/       # Events & ticket inventory (Phillip)
│   │   │   └── orders/       # Orders, M-Pesa & tickets (Freddy)
│   │   ├── shared/           # Common utilities, middleware & types
│   │   ├── config/           # Environment configuration
│   │   └── server.ts         # Express server entry point
│   ├── prisma/               # Prisma schema and migrations
│   ├── package.json          # Backend dependencies & scripts
│   ├── tsconfig.json         # TypeScript configuration
│   └── .env                  # Backend environment variables
│
├── FRONTEND/                 # React 19 + TypeScript + Vite + MUI Dark Theme
│   ├── src/
│   │   ├── components/       # Reusable UI (Navbar, Footer, EventCard, etc.)
│   │   ├── pages/            # Feature pages (Home, Events, Details, Checkout, etc.)
│   │   ├── contexts/         # React Contexts (AuthContext)
│   │   ├── services/         # API clients (api, auth, event, booking)
│   │   ├── types/            # TypeScript interfaces matching backend models
│   │   └── data/             # Mock event fallback data for resilience
│   ├── package.json          # Frontend dependencies & scripts
│   ├── vite.config.ts        # Vite build tool configuration
│   └── .env                  # Frontend environment variables
│
├── package.json              # Root monorepo scripts & orchestrator
└── README.md                 # Project documentation
```

---

## ⚡ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Frontend UI/UX** | Material UI (MUI v9) Dark Theme with Glassmorphism |
| **Backend Runtime** | Node.js (>= 18), Express 5, TypeScript |
| **Database & ORM** | PostgreSQL (hosted on Supabase) with Prisma ORM |
| **Authentication** | JWT, bcryptjs |
| **Validation** | Zod schemas |
| **Payments** | M-Pesa STK Push / Lipa Na M-Pesa Simulation & Integration |

---

## 🚀 Quick Start

### 1. Install Dependencies
You can install dependencies for both apps directly from the root:
```bash
npm run install:all
```
Or individually:
```bash
npm run install:backend
npm run install:frontend
```

### 2. Environment Setup

- **Backend**: Configure `BACKEND/.env` with your `DATABASE_URL`, `JWT_SECRET`, and `PORT=3000`.
- **Frontend**: Configure `FRONTEND/.env` with `VITE_API_URL=http://localhost:3000/api/v1`.

### 3. Run Applications in Development

Run both or either from the root folder:

```bash
# Run Backend API (http://localhost:3000)
npm run dev:backend

# Run Frontend Web App (http://localhost:5173)
npm run dev:frontend
```

Alternatively, `cd` into either subfolder:
```bash
cd BACKEND
npm run dev
```
```bash
cd FRONTEND
npm run dev
```

### 4. Build Applications for Production

From root:
```bash
# Build both BACKEND and FRONTEND
npm run build

# Or build individually
npm run build:backend
npm run build:frontend
```

---

## 🧪 Testing Backend
```bash
npm run test:backend
```

## 🗄️ Database Operations
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```
