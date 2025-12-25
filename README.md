# HustleHub MVP

> Location-based micro-task and wallet platform

## 🎯 MVP Goal

Validate the core transaction loop:

**Post Task → Accept Task → Complete Task → Release Payment**

## 🏗️ Architecture

```
hustlehub/
├── backend/          # Node.js + Express + PostgreSQL + Socket.io
├── mobile/           # React Native (Expo) - iOS & Android
├── admin/            # React.js admin dashboard
├── shared/           # Shared TypeScript types and utilities
└── docs/             # Architecture and API documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Expo CLI (for mobile development)

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials and API keys

# Run database migrations
npm run db:migrate

# Start development servers
npm run backend    # API server (port 3000)
npm run mobile     # Expo dev server
npm run admin      # Admin dashboard (port 3001)
```

## 📦 Tech Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Socket.io
- **Mobile**: React Native, Expo
- **Admin**: React.js
- **Payments**: Flutterwave (escrow + mobile money)
- **Auth**: JWT + SMS OTP

## 🔐 Core Features (MVP)

- ✅ Phone number authentication (SMS OTP)
- ✅ Task creation with location and escrow
- ✅ Geo-query for nearby tasks
- ✅ Real-time chat per task
- ✅ Wallet with transaction history
- ✅ Escrow-based payments (10-15% platform fee)
- ✅ Admin dashboard for manual overrides

## 📊 Task States

```
POSTED → ACCEPTED → COMPLETED → PAID
```

## 🛡️ Business Rules

- All payments go through escrow (no direct P2P)
- Platform fee: 10-15% (deducted on payout)
- Admin can manually resolve disputes
- All transactions are auditable

## 📈 Future Phases (NOT IMPLEMENTED YET)

**Phase 2**: Scout (data collection tasks), reputation system
**Phase 3**: Skill marketplace, bidding, WebRTC support

## 📚 Documentation

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed technical design.

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Mobile tests
cd mobile && npm test
```

## 📝 License

UNLICENSED - Proprietary
