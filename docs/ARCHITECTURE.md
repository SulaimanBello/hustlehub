# HustleHub - Technical Architecture

## Design Principles (MVP)

1. **No premature optimization** - Build for clarity, not scale (yet)
2. **Monolith first** - No microservices until we validate product-market fit
3. **Payments are critical** - Escrow reliability > everything else
4. **Extensibility over abstraction** - Design for future phases, don't build them

---

## System Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Mobile    │◄───────►│   Backend    │◄───────►│ PostgreSQL  │
│  (Expo RN)  │  REST   │   (Express)  │         │             │
│             │◄────────┤   Socket.io  │         └─────────────┘
└─────────────┘  WS     └──────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Flutterwave  │
                        │     API      │
                        └──────────────┘
```

---

## Data Models

### User
```sql
id              UUID PRIMARY KEY
phone_number    VARCHAR(20) UNIQUE NOT NULL
phone_verified  BOOLEAN DEFAULT FALSE
name            VARCHAR(100)
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### Task
```sql
id              UUID PRIMARY KEY
poster_id       UUID REFERENCES users(id)
doer_id         UUID REFERENCES users(id) NULL
title           VARCHAR(200) NOT NULL
description     TEXT
latitude        DECIMAL(10, 8) NOT NULL
longitude       DECIMAL(11, 8) NOT NULL
fee_amount      DECIMAL(10, 2) NOT NULL  -- Total amount including platform fee
status          ENUM('POSTED', 'ACCEPTED', 'COMPLETED', 'PAID', 'CANCELLED')
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
completed_at    TIMESTAMP NULL
```

**Why this design:**
- Lat/lng as decimals for precise geo-queries
- `doer_id` nullable until task is accepted
- `fee_amount` is total (platform fee calculated on payout)
- Timestamp tracking for analytics and dispute resolution

### Wallet
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id) UNIQUE
balance         DECIMAL(10, 2) DEFAULT 0.00
currency        VARCHAR(3) DEFAULT 'NGN'
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

**Why this design:**
- One wallet per user (enforced by UNIQUE constraint)
- Balance stored as decimal for precision
- Currency field for future multi-currency support (Phase 3)

### Transaction
```sql
id                  UUID PRIMARY KEY
wallet_id           UUID REFERENCES wallets(id)
task_id             UUID REFERENCES tasks(id) NULL
type                ENUM('ESCROW_HOLD', 'ESCROW_RELEASE', 'PLATFORM_FEE', 'WITHDRAWAL')
amount              DECIMAL(10, 2) NOT NULL
platform_fee        DECIMAL(10, 2) DEFAULT 0.00
status              ENUM('PENDING', 'COMPLETED', 'FAILED')
payment_provider_id VARCHAR(100) NULL  -- Flutterwave transaction ID
metadata            JSONB NULL
created_at          TIMESTAMP DEFAULT NOW()
```

**Why this design:**
- Every money movement is recorded
- `task_id` nullable for non-task transactions (withdrawals)
- `platform_fee` explicitly tracked for reporting
- `payment_provider_id` for reconciliation with Flutterwave
- `metadata` JSONB for flexible provider-specific data

### ChatMessage
```sql
id              UUID PRIMARY KEY
task_id         UUID REFERENCES tasks(id)
sender_id       UUID REFERENCES users(id)
message         TEXT NOT NULL
created_at      TIMESTAMP DEFAULT NOW()
```

**Why this design:**
- Simple one-to-one chat scoped to tasks
- No read receipts or typing indicators (MVP)
- Created_at for message ordering

---

## API Architecture

### Authentication Flow

```
1. POST /auth/send-otp
   → User enters phone number
   → Backend sends SMS via provider (TODO: choose SMS provider)
   → Returns session_id

2. POST /auth/verify-otp
   → User enters OTP code
   → Backend validates
   → Returns JWT token

3. Subsequent requests
   → Authorization: Bearer {jwt_token}
```

**Key decision**: Stateless JWT (no session storage required)

### Task Lifecycle API

```
POST   /tasks                    → Create task (poster)
GET    /tasks/nearby?lat=&lng=   → Get tasks within radius (doer)
GET    /tasks/:id                → Get task details
POST   /tasks/:id/accept         → Accept task (doer)
POST   /tasks/:id/complete       → Mark complete (doer)
POST   /tasks/:id/confirm        → Confirm & release payment (poster)
DELETE /tasks/:id                → Cancel task (poster, if not accepted)
```

**State machine enforcement:**
- POSTED → ACCEPTED (only by doer)
- ACCEPTED → COMPLETED (only by doer)
- COMPLETED → PAID (only by poster confirmation)

---

## Payment Integration (Flutterwave)

### Escrow Flow

```
1. Task Creation
   └─> Poster funds task via Flutterwave
       └─> Transaction type: ESCROW_HOLD
           └─> Money held by Flutterwave (not in our DB wallet yet)

2. Task Acceptance
   └─> No money movement
       └─> Task status: ACCEPTED

3. Task Completion + Confirmation
   └─> Poster confirms work
       └─> Backend calls Flutterwave payout API
           ├─> Deduct platform fee (10-15%)
           ├─> Transaction type: PLATFORM_FEE
           ├─> Transaction type: ESCROW_RELEASE
           └─> Update doer wallet balance
```

**Why Flutterwave:**
- Regulated PSP (we don't handle money directly)
- Mobile money support for Africa
- Escrow/payout APIs available

**Critical assumption:**
- We rely on Flutterwave webhooks to confirm payment status
- All transactions must be idempotent (handle duplicate webhooks)

---

## Real-Time Features (Socket.io)

### Events

**Client → Server:**
- `join_task_chat`: Subscribe to task chat room
- `send_message`: Send chat message
- `task_status_update`: (from doer/poster for live updates)

**Server → Client:**
- `new_message`: Broadcast message to task participants
- `task_updated`: Task status changed

**Why Socket.io:**
- Simple WebSocket abstraction
- Room-based messaging fits task-scoped chats
- Fallback to long-polling if WebSocket unavailable

---

## Geo-Query Strategy

### Nearby Tasks Query

```sql
SELECT *
FROM tasks
WHERE status = 'POSTED'
  AND ST_DWithin(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint($user_lng, $user_lat)::geography,
    5000  -- 5km radius in meters
  )
ORDER BY created_at DESC
LIMIT 20;
```

**Requires**: PostGIS extension for PostgreSQL

**Why this approach:**
- Accurate distance calculations using geography type
- Index on (latitude, longitude) for performance
- Fixed radius for MVP (future: dynamic radius based on task density)

---

## Environment Configuration

### Backend (.env)

```
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hustlehub

# JWT
JWT_SECRET=<random_string_256_bits>
JWT_EXPIRES_IN=7d

# Flutterwave
FLUTTERWAVE_SECRET_KEY=<from_dashboard>
FLUTTERWAVE_PUBLIC_KEY=<from_dashboard>
FLUTTERWAVE_ENCRYPTION_KEY=<from_dashboard>
FLUTTERWAVE_WEBHOOK_SECRET=<from_dashboard>

# SMS Provider (TBD - Twilio or Termii)
SMS_PROVIDER_API_KEY=<key>

# Platform Fee
PLATFORM_FEE_PERCENT=15
```

---

## Security Considerations (MVP)

1. **No direct P2P payments** - All money flows through Flutterwave escrow
2. **JWT expiration** - Tokens expire after 7 days
3. **OTP validation** - Rate limit to 3 attempts per phone number per hour
4. **Webhook verification** - Validate Flutterwave webhook signatures
5. **SQL injection prevention** - Use parameterized queries (via ORM or pg)
6. **Authorization checks** - Verify user owns resource before mutations

**Out of scope for MVP:**
- Rate limiting (add in Phase 2)
- DDoS protection (rely on hosting provider)
- PII encryption at rest (assume PostgreSQL is secured)

---

## Future Phase Hooks (Design Notes)

### Phase 2 - Scout & Reputation

*Where to extend:*
- Add `task_type` ENUM to Task model ('QUICK_TASK', 'SCOUT_TASK')
- Add `reputation_score` to User model
- Add `TaskReview` table (rating + comment)

### Phase 3 - Skill Marketplace

*Where to extend:*
- Add `TaskProposal` table (many proposals per task)
- Add `Skill` and `UserSkill` junction table
- Extend Task with `required_skills` JSONB

**Key principle:** These extensions should not require rewriting core models.

---

## Deployment Strategy (Future)

**MVP hosting:**
- Backend: Heroku / Railway / Render (with PostgreSQL add-on)
- Mobile: Expo EAS Build → App Store / Play Store (TestFlight for alpha)
- Admin: Vercel / Netlify

**Not doing yet:**
- Docker/Kubernetes
- CI/CD pipelines
- Load balancers

---

## Monitoring & Metrics (MVP)

**Log to stdout:**
- Task creation → completion rate
- Payment success/failure rate
- Average task completion time
- Chat message count

**Tools:**
- Backend: Simple console.log (upgrade to Winston later)
- Error tracking: Sentry (free tier)

**No dashboards yet** - Use PostgreSQL queries for analytics.

---

## Open Questions / TODOs

- [ ] SMS provider choice (Twilio vs Termii vs Africa's Talking)
- [ ] Should we allow task editing after posting? (Currently no)
- [ ] Withdrawal limits/KYC requirements (defer to Phase 2)
- [ ] How to handle stuck tasks (auto-cancel after 48h?)
- [ ] Multi-language support (defer to Phase 2)

---

## Assumptions

1. **Single currency (NGN)** - Expand in Phase 3
2. **Nigeria-only for MVP** - Affects SMS provider and Flutterwave setup
3. **No task photos yet** - Just text descriptions (add in Phase 2)
4. **Manual dispute resolution** - Admin can override any transaction
5. **No tax/invoice generation** - Deferred to Phase 3
