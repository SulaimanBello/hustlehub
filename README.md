# HustleHub MVP

> Location-based micro-task and wallet platform

## 🎯 MVP Goal

Validate the core transaction loop:

**Post Task → Accept Task → Complete Task → Release Payment**

## 📊 Progress Report

> **Last Updated**: December 28, 2025

### Overall Status: ~95% Complete

| Component | Progress | Status |
|-----------|----------|--------|
| Backend API | 95% | ✅ Production-ready (sandbox testing pending) |
| Mobile App | 95% | ✅ Core features complete |
| Admin Dashboard | 60% | ⚠️ Basic pages, needs polish |
| Documentation | 90% | ✅ Well-documented |

### Component Breakdown

**Backend** (5 controllers, 3 services, 40+ tests)
- ✅ Auth: Phone + SMS OTP, JWT, multi-provider SMS
- ✅ Tasks: Full CRUD, geo-queries, state machine
- ✅ Payments: Flutterwave escrow, refunds, webhooks
- ✅ Wallet: Balance, transactions, withdrawals
- ✅ Real-time: Socket.IO chat, typing indicators

**Mobile** (10 screens)
- ✅ Auth flow (phone, OTP, profile setup)
- ✅ Task screens (map, list, detail, create)
- ✅ Wallet & chat screens

**Admin** (5 pages)
- ✅ Login, Dashboard, Users, Tasks, Transactions

### 🚨 Critical Blockers

| Blocker | Impact | Priority |
|---------|--------|----------|
| SMS provider not configured | Users can't sign up | 🔴 High |
| Payment sandbox untested | Money handling risks | 🔴 High |
| No database backups | Data loss risk | 🔴 High |
| No monitoring (Sentry) | Can't catch errors | 🟡 Medium |

### 🎯 Next Steps (Priority Order)

1. Configure Termii SMS provider for production
2. Complete Flutterwave sandbox end-to-end testing
3. Set up automated database backups
4. Integrate Sentry error monitoring
5. Polish admin dashboard UI
6. Add legal terms & privacy policy
7. Deploy to staging environment
8. Run alpha tests with 5 users

**Estimated time to MVP launch**: 2-3 weeks

See [docs/MVP_STATUS.md](docs/MVP_STATUS.md) for detailed status tracking.

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

## 🐳 Docker Deployment

HustleHub includes complete Docker support for both development and production environments.

### Quick Start with Docker

**Development:**
```bash
# Linux/macOS
./docker-dev.sh start

# Windows
docker-dev.bat start
```

**Production:**
```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Start services
./docker-prod.sh start

# Run migrations
./docker-prod.sh migrate
```

### Services

- **Backend API**: Port 5000 - Node.js/Express backend
- **Admin Dashboard**: Port 3001 - React admin interface
- **Database**: PostgreSQL 15 with PostGIS

### Complete Documentation

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for:
- Development setup with hot-reload
- Production deployment guide
- EasyPanel deployment instructions
- Database migrations and backups
- Environment variables reference
- Troubleshooting guide
- Docker commands reference

## 📦 Tech Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Socket.io
- **Mobile**: React Native, Expo
- **Admin**: React.js
- **Payments**: Flutterwave (escrow + mobile money)
- **Auth**: JWT + SMS OTP
- **Deployment**: Docker, Docker Compose, EasyPanel-ready

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
