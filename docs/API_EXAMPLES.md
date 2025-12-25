# HustleHub API Examples

> Real-world API usage examples for the MVP

## Authentication Flow

### 1. Send OTP

```bash
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+2348012345678"
  }'
```

Response:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone_number": "+2348012345678",
    "expires_in_minutes": 10,
    "otp_code": "123456"  // Only in development
  }
}
```

### 2. Verify OTP & Get Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+2348012345678",
    "otp_code": "123456"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "phone_number": "+2348012345678",
      "name": null,
      "created_at": "2025-12-25T00:00:00.000Z",
      "updated_at": "2025-12-25T00:00:00.000Z"
    }
  }
}
```

### 3. Update Profile

```bash
curl -X PATCH http://localhost:3000/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "John Doe"
  }'
```

---

## Task Workflow

### 1. Create Task (Poster)

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <poster_token>" \
  -d '{
    "title": "Deliver package to Ikeja",
    "description": "Small package, handle with care",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "fee_amount": 5000
  }'
```

Response:
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": "task-uuid",
    "poster_id": "user-uuid",
    "doer_id": null,
    "title": "Deliver package to Ikeja",
    "description": "Small package, handle with care",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "fee_amount": 5000,
    "status": "POSTED",
    "created_at": "2025-12-25T10:00:00.000Z",
    "updated_at": "2025-12-25T10:00:00.000Z",
    "completed_at": null
  }
}
```

### 2. Find Nearby Tasks (Doer)

```bash
curl "http://localhost:3000/api/v1/tasks/nearby?latitude=6.5244&longitude=3.3792&radius_km=10" \
  -H "Authorization: Bearer <doer_token>"
```

Response:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "task-uuid",
      "title": "Deliver package to Ikeja",
      "latitude": 6.5244,
      "longitude": 3.3792,
      "fee_amount": 5000,
      "status": "POSTED",
      "created_at": "2025-12-25T10:00:00.000Z"
    },
    ...
  ]
}
```

### 3. Accept Task (Doer)

```bash
curl -X POST http://localhost:3000/api/v1/tasks/<task_id>/accept \
  -H "Authorization: Bearer <doer_token>"
```

Response:
```json
{
  "success": true,
  "message": "Task accepted successfully",
  "data": {
    "id": "task-uuid",
    "status": "ACCEPTED",
    "doer_id": "doer-uuid",
    ...
  }
}
```

### 4. Mark as Completed (Doer)

```bash
curl -X POST http://localhost:3000/api/v1/tasks/<task_id>/complete \
  -H "Authorization: Bearer <doer_token>"
```

Response:
```json
{
  "success": true,
  "message": "Task marked as completed. Waiting for poster confirmation.",
  "data": {
    "id": "task-uuid",
    "status": "COMPLETED",
    "completed_at": "2025-12-25T11:00:00.000Z",
    ...
  }
}
```

### 5. Confirm & Release Payment (Poster)

```bash
curl -X POST http://localhost:3000/api/v1/tasks/<task_id>/confirm \
  -H "Authorization: Bearer <poster_token>"
```

Response:
```json
{
  "success": true,
  "message": "Payment released successfully",
  "data": {
    "id": "task-uuid",
    "status": "PAID",
    ...
  }
}
```

---

## Wallet Operations

### Get Wallet Balance

```bash
curl http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "success": true,
  "data": {
    "balance": 45000,
    "currency": "NGN",
    "updated_at": "2025-12-25T12:00:00.000Z"
  }
}
```

### Get Transaction History

```bash
curl "http://localhost:3000/api/v1/wallet/transactions?limit=10&offset=0" \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "txn-uuid",
      "type": "ESCROW_RELEASE",
      "amount": 4250,
      "platform_fee": 750,
      "status": "COMPLETED",
      "created_at": "2025-12-25T11:05:00.000Z"
    },
    ...
  ]
}
```

### Request Withdrawal

```bash
curl -X POST http://localhost:3000/api/v1/wallet/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "amount": 10000,
    "account_number": "0123456789",
    "bank_code": "058"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Withdrawal request received and will be processed",
  "data": {
    "transaction_id": "txn-uuid",
    "amount": 10000,
    "status": "pending"
  }
}
```

---

## Socket.IO Chat

### Connect

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

### Join Task Chat

```javascript
socket.emit('join_task_chat', {
  task_id: 'task-uuid'
});

socket.on('chat_history', (data) => {
  console.log('Chat history:', data.messages);
});
```

### Send Message

```javascript
socket.emit('send_message', {
  task_id: 'task-uuid',
  message: 'On my way!'
});

socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

### Typing Indicator

```javascript
socket.emit('typing', {
  task_id: 'task-uuid',
  is_typing: true
});

socket.on('user_typing', (data) => {
  console.log(`User ${data.user_id} is typing: ${data.is_typing}`);
});
```

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "message": "Invalid phone number format"
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired token"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "message": "Task not found"
  }
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "message": "Too many requests from this IP, please try again later"
  }
}
```

---

## Testing with Postman

Import this collection:

```json
{
  "info": {
    "name": "HustleHub API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api/v1"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

Set `{{token}}` after authentication and use `{{base_url}}` for all requests.
