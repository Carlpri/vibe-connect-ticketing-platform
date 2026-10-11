#  VIBE-CONNECT

**Kenyan Event Discovery & Digital Ticketing Platform**

> Connecting people to live events across Kenya — from concerts and festivals to community gatherings.

---

##  Tech Stack

| Layer        | Technology                                |
|--------------|-------------------------------------------|
| Runtime      | Node.js                                   |
| Framework    | Express                                   |
| Language     | TypeScript                                |
| Database     | PostgreSQL (hosted on **Supabase** — free) |
| ORM          | Prisma                                    |
| Validation   | Zod                                       |
| API Style    | REST                                      |
| Architecture | Modular Monolith                          |

## 📁 Project Structure

```
src/
├── modules/
│   ├── auth/          # Users, authentication, security (Carlos)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.schemas.ts      # Zod validation
│   │   └── auth.middleware.ts
│   ├── events/        # Events, ticket inventory (Phillip)
│   │   ├── events.controller.ts
│   │   ├── events.service.ts
│   │   ├── events.routes.ts
│   │   └── events.schemas.ts
│   └── orders/        # Orders, payments, QR codes, check-in (Freddy)
│       ├── orders.controller.ts
│       ├── orders.service.ts
│       ├── orders.routes.ts
│       └── orders.schemas.ts
├── shared/            # Common middleware, utilities, types
│   ├── middleware/
│   ├── utils/
│   └── types/
├── config/            # App and environment configuration
│   └── env.ts
└── server.ts          # Express application entry point
prisma/
└── schema.prisma      # Database schema
```

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm (comes with Node.js)
- A [Supabase](https://supabase.com/) account (free tier)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Carlpri/vibe-connect-ticketing-platform.git
cd vibe-connect-ticketing-platform

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your Supabase database credentials
# (find them in Supabase Dashboard → Project Settings → Database)

# 4. Generate Prisma Client
npx prisma generate

# 5. Run database migrations
npx prisma migrate dev

# 6. Start the development server
npm run dev
```

## 👥 Team

| Developer | Domain                                     |
|-----------|---------------------------------------------|
| **Carlos**  | Backend foundation, auth, users, security |
| **Phillip** | Events, ticket inventory                  |
| **Freddy**  | Orders, payments, digital tickets, QR     |

## 🎨 Design Reference

Our frontend prototype is available at:
[https://vibe-connect-ke.lovable.app/](https://vibe-connect-ke.lovable.app/)

## 📄 License

This project is proprietary. All rights reserved.
