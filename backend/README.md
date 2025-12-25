# HustleHub Backend API

> Node.js + Express + PostgreSQL + Socket.IO backend for HustleHub MVP

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14 with PostGIS extension
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Database Setup

```bash
# Create PostgreSQL database
createdb hustlehub

# Enable PostGIS extension (run in psql)
psql hustlehub -c "CREATE EXTENSION postgis;"

# Run migrations
npm run migrate
```

### Development

```bash
# Start development server (with hot reload)
npm run dev

# API will be available at http://localhost:3000/api/v1
```

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

### Endpoints

#### Authentication

```
POST   /auth/send-otp          Send OTP to phone number
POST   /auth/verify-otp        Verify OTP and get JWT token
GET    /auth/me                Get current user (protected)
PATCH  /auth/profile           Update user profile (protected)
```

#### Tasks

```
POST   /tasks                  Create a new task (protected)
GET    /tasks/nearby           Get nearby tasks (query params: lat, lng, radius_km, limit)
GET    /tasks/:id              Get task details
GET    /tasks/my/posted        Get my posted tasks (protected)
GET    /tasks/my/accepted      Get my accepted tasks (protected)
POST   /tasks/:id/accept       Accept a task (protected)
POST   /tasks/:id/complete     Mark task as completed (protected)
POST   /tasks/:id/confirm      Confirm completion & release payment (protected)
DELETE /tasks/:id              Cancel task (protected)
```

#### Wallet

```
GET    /wallet                 Get wallet details + recent transactions (protected)
GET    /wallet/balance         Get current balance (protected)
GET    /wallet/transactions    Get transaction history (protected)
POST   /wallet/withdraw        Request withdrawal (protected)
```

#### Payments

```
POST   /payments/webhook       Flutterwave webhook (public, signature verified)
POST   /payments/verify/:id    Verify payment status
```

### Socket.IO Events

#### Client → Server

```javascript
// Join task chat
socket.emit('join_task_chat', { task_id: 'uuid' });

// Send message
socket.emit('send_message', {
  task_id: 'uuid',
  message: 'Hello!'
});

// Typing indicator
socket.emit('typing', {
  task_id: 'uuid',
  is_typing: true
});

// Leave chat
socket.emit('leave_task_chat', { task_id: 'uuid' });
```

#### Server → Client

```javascript
// Chat history
socket.on('chat_history', (data) => {
  console.log(data.messages);
});

// New message
socket.on('new_message', (message) => {
  console.log(message);
});

// User typing
socket.on('user_typing', (data) => {
  console.log(data.user_id, data.is_typing);
});

// Task updated
socket.on('task_updated', (task) => {
  console.log('Task status changed:', task);
});

// Errors
socket.on('error', (error) => {
  console.error(error.message);
});
```

## 🔐 Environment Variables

See [.env.example](.env.example) for all required environment variables.

### Critical Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWT tokens (256-bit recommended)
- `FLUTTERWAVE_SECRET_KEY` - Flutterwave API secret key
- `FLUTTERWAVE_PUBLIC_KEY` - Flutterwave public key
- `SMS_PROVIDER` - SMS provider (twilio, termii, or africas-talking)

## 📊 Database Schema

### Task States

```
POSTED → ACCEPTED → COMPLETED → PAID
         └→ CANCELLED (only from POSTED)
```

### Transaction Types

- `ESCROW_HOLD` - Money held when task is created
- `ESCROW_RELEASE` - Payment released to doer
- `PLATFORM_FEE` - Platform commission
- `WITHDRAWAL` - User withdrawal request

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🛠️ Scripts

```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm start            # Start production server
npm run migrate      # Run database migrations
npm run migrate:down # Rollback last migration
npm run lint         # Lint code
```

## 📝 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Express middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   ├── app.ts            # Express app setup
│   └── index.ts          # Server entry point
├── migrations/           # SQL migration files
└── package.json
```

## 🔒 Security Notes

- All payments go through Flutterwave escrow
- Webhook signatures are verified
- Rate limiting enabled (100 req/15min per IP)
- JWT tokens expire after 7 days
- OTP max 3 attempts per phone number

## 🚨 Important for MVP

**Payment flow is critical:**

1. Task creation should trigger Flutterwave payment initialization
2. Escrow funds are held by Flutterwave (not in our database)
3. Completion triggers escrow release with platform fee deduction
4. All transactions must be idempotent (handle duplicate webhooks)

Currently, payment integration has placeholder TODOs marked for actual Flutterwave API calls.

## 📈 Monitoring

Logs are output to stdout in JSON format. Use a log aggregation service (LogDNA, Datadog) in production.

Key metrics to monitor:
- Task completion rate
- Payment success/failure rate
- Average task completion time
- API response times

## 🐛 Troubleshooting

### Database connection failed

```bash
# Check PostgreSQL is running
pg_ctl status

# Test connection
psql -U postgres -d hustlehub
```

### PostGIS not found

```bash
# Install PostGIS
sudo apt-get install postgresql-14-postgis-3

# Enable in database
psql hustlehub -c "CREATE EXTENSION postgis;"
```

### Migration errors

```bash
# Drop and recreate database (⚠️ DESTRUCTIVE)
dropdb hustlehub
createdb hustlehub
npm run migrate
```

## 📞 Support

For issues, check [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for technical details.
