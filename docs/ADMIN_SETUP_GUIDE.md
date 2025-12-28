# HustleHub Admin Dashboard - Setup Guide

## Overview

The admin dashboard provides secure, role-based access to manage users, tasks, transactions, and view system analytics.

## Architecture

### Backend (Node.js + Express)
- **Role-based authentication**: Users with `ADMIN` role can access admin endpoints
- **Admin middleware**: `requireAdmin` checks user role before granting access
- **Admin API endpoints**: `/api/v1/admin/*` for all admin operations
- **Database**: PostgreSQL with new `user_role` ENUM type

### Frontend (React + TypeScript)
- **Framework**: Vite + React 18
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **Styling**: Custom CSS with utility classes
- **Charts**: Recharts for analytics visualization

## Features

### 1. Dashboard Metrics
- Total users, new users (week/month)
- Task statistics by status
- Transaction totals and trends
- Recent activity feed

### 2. User Management
- List all users with pagination and search
- View detailed user profiles
- See user's tasks (posted/completed)
- View user's transaction history
- Update user roles (USER ↔ ADMIN)

### 3. Task Management
- View all tasks with filters (status, search)
- See task details with poster/doer information
- Manually resolve disputed tasks (mark as PAID or CANCELLED)
- Automatic payment handling on resolution

### 4. Transaction Management
- View all transactions with filters
- Filter by type (ESCROW_HOLD, ESCROW_RELEASE, WITHDRAWAL, etc.)
- Filter by status (PENDING, COMPLETED, FAILED)
- See associated user information

### 5. Analytics
- Time-series charts for tasks, users, revenue
- Multiple time periods (24h, 7d, 30d, 90d)
- Trend visualization

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend
npm run migrate
```

This will run `migrations/008_add_user_roles.sql` which:
- Adds `user_role` ENUM type ('USER', 'ADMIN')
- Adds `role` column to users table (default: 'USER')
- Creates a default admin user with phone `+2348000000000`

### 2. Set Up Admin User

The migration creates a default admin account. To use it:

```bash
# Method 1: Update the phone number in the migration before running it
# Edit migrations/008_add_user_roles.sql and change '+2348000000000' to your phone

# Method 2: Manually update an existing user to admin
psql -d hustlehub_dev
UPDATE users SET role = 'ADMIN' WHERE phone_number = '+2348XXXXXXXXX';
```

### 3. Install Admin Dashboard Dependencies

```bash
cd admin
npm install
```

### 4. Start the Admin Dashboard

```bash
# Terminal 1: Start backend (if not already running)
cd backend
npm run dev

# Terminal 2: Start admin dashboard
cd admin
npm run dev
```

The admin dashboard will be available at `http://localhost:3001`

## Admin API Endpoints

### Dashboard
- `GET /api/v1/admin/dashboard` - Get overview metrics

### Users
- `GET /api/v1/admin/users` - List users (pagination, search, filter)
- `GET /api/v1/admin/users/:userId` - Get user details
- `PATCH /api/v1/admin/users/:userId/role` - Update user role

### Tasks
- `GET /api/v1/admin/tasks` - List tasks (pagination, filter)
- `PATCH /api/v1/admin/tasks/:taskId/resolve` - Manually resolve task

### Transactions
- `GET /api/v1/admin/transactions` - List transactions (pagination, filter)

### Analytics
- `GET /api/v1/admin/analytics?period=7d` - Get analytics data

## Authentication Flow

1. Admin enters phone number
2. OTP sent via SMS (same as regular users)
3. Admin enters OTP code
4. Backend verifies OTP and checks if user has ADMIN role
5. If admin, JWT token issued
6. Frontend stores token in localStorage
7. All admin API requests include token in Authorization header
8. Backend middleware validates token and checks admin role

## Security Considerations

### Production Checklist

- [ ] Change default admin phone number
- [ ] Use strong, rotating JWT secrets
- [ ] Enable HTTPS for admin dashboard
- [ ] Implement IP whitelisting for admin endpoints
- [ ] Add audit logging for all admin actions
- [ ] Set up admin action notifications (email/SMS)
- [ ] Implement 2FA for admin accounts (future enhancement)
- [ ] Regular security audits

### Current Security Features

✅ Role-based access control (RBAC)
✅ JWT authentication required
✅ Admin role verification on every request
✅ Protected routes (cannot access without admin role)
✅ Rate limiting on all API endpoints
✅ Input validation with Zod
✅ SQL injection protection (parameterized queries)

## Development

### Adding New Admin Features

1. **Add API endpoint** in `backend/src/controllers/admin.controller.ts`
2. **Add route** in `backend/src/routes/admin.routes.ts`
3. **Add API client method** in `admin/src/lib/api.ts`
4. **Create React component** in `admin/src/pages/`
5. **Add route** in `admin/src/App.tsx`

### Testing Admin Endpoints

```bash
# Get JWT token by logging in as admin
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+2348000000000"}'

curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+2348000000000", "otp_code": "123456"}'

# Use the token for admin requests
curl http://localhost:5000/api/v1/admin/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### "Access denied. Admin privileges required"
- User is not marked as ADMIN in database
- Solution: Update user role in database

### "Authentication required"
- No JWT token in request
- Solution: Login first and include token in Authorization header

### Admin dashboard won't load
- Backend not running on port 5000
- Solution: Start backend with `npm run dev`

### Can't login as admin
- User doesn't exist or doesn't have ADMIN role
- Solution: Check database and ensure user has role = 'ADMIN'

## Future Enhancements

- [ ] Admin action audit log table
- [ ] Email notifications for critical events
- [ ] Two-factor authentication for admins
- [ ] Advanced analytics (cohort analysis, retention)
- [ ] Export data to CSV/Excel
- [ ] Bulk operations (bulk user updates)
- [ ] Real-time dashboard updates (WebSockets)
- [ ] Admin permissions system (different admin levels)

## Database Schema Changes

### New ENUM Type
```sql
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
```

### New Column
```sql
ALTER TABLE users ADD COLUMN role user_role DEFAULT 'USER' NOT NULL;
CREATE INDEX idx_users_role ON users(role);
```

### Future Table (Optional)
```sql
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Support

For issues or questions about the admin dashboard:
1. Check this documentation
2. Review backend logs for errors
3. Check browser console for frontend errors
4. Verify database migration ran successfully
5. Ensure user has ADMIN role in database

---

**Last Updated**: December 28, 2025
**Version**: 1.0.0
