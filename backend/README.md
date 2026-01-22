# 🎫 Unified Booking Backend

A **production-grade, multi-tenant booking backend** that serves Event, Bus, and Movie booking applications through a unified REST API with atomic seat locking and race-condition-free reservations.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis >= 6.0

### Installation

```bash
# Clone repository
cd hackwow

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# (MongoDB and Redis URLs, JWT secrets, admin credentials)

# Start MongoDB and Redis (if not running)
# MongoDB: mongod
# Redis: redis-server

# Start server
npm start

# Development mode (with auto-reload)
npm run dev
```

The server will start on `http://localhost:5000`

---

## 📖 Architecture Overview

This system implements a **three-layer authentication architecture**:

```
┌─────────────────────────────────────────┐
│  Layer 1: Admin Authentication          │
│  - Platform management                   │
│  - App registration                      │
│  - Global analytics                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Layer 2: App Authentication (Multi-    │
│  Tenant)                                 │
│  - Frontend app identification          │
│  - Domain-based access control          │
│  - App-level isolation                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Layer 3: User Authentication           │
│  - End-user sessions                     │
│  - Booking actions                       │
│  - Shared user pool                     │
└─────────────────────────────────────────┘
```

**Key Features:**
- ✅ Race-condition-free seat locking with Redis
- ✅ Atomic booking operations with MongoDB transactions
- ✅ Multi-tenant app authentication
- ✅ JWT-based session management
- ✅ Domain whitelisting
- ✅ Payment simulation
- ✅ Comprehensive error handling

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

---

## 🔐 Authentication

### Layer 1: Admin Authentication

**Login:**
```bash
POST /admin/login
Content-Type: application/json

{
  "email": "admin@booking-backend.com",
  "password": "admin123"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Use token in subsequent admin requests:**
```bash
Authorization: Bearer <admin_token>
```

### Layer 2: App Authentication (Multi-Tenant)

Every request from frontend apps must include:
```bash
x-app-id: your-app-id
x-api-key: your-32-char-or-longer-api-key
Origin: https://your-frontend-domain.com
```

**Register an app (admin only):**
```bash
POST /admin/apps
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "appId": "event-app-prod",
  "name": "Event Booking Frontend",
  "domain": "EVENT",
  "apiKey": "super-secret-key-at-least-32-characters-long",
  "allowedDomains": ["https://event-app.com", "http://localhost:3000"]
}

Response:
{
  "success": true,
  "data": {
    "app": { ... },
    "apiKey": "super-secret-key-at-least-32-characters-long"
  }
}
```

⚠️ **Store the API key securely** - it's only returned once!

### Layer 3: User Authentication

**Signup:**
```bash
POST /auth/signup
x-app-id: event-app-prod
x-api-key: your-api-key
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+1234567890"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

**Login:**
```bash
POST /auth/login
x-app-id: event-app-prod
x-api-key: your-api-key
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Use user token in booking requests:**
```bash
Authorization: Bearer <user_token>
```

---

## 📚 API Endpoints

### Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/admin/login` | Admin login | None |
| POST | `/admin/apps` | Create new app | Admin |
| GET | `/admin/apps` | List all apps | Admin |
| GET | `/admin/apps/:appId` | Get app details | Admin |
| PATCH | `/admin/apps/:appId` | Update app | Admin |
| POST | `/admin/apps/:appId/rotate-key` | Rotate API key | Admin |
| GET | `/admin/bookings` | View all bookings | Admin |

### Auth Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/signup` | User registration | App |
| POST | `/auth/login` | User login | App |
| POST | `/auth/verify` | Verify token | App |

### Booking Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/seats` | List available seats | App + User |
| POST | `/reserve-seat` | Reserve a seat | App + User |
| POST | `/confirm-booking` | Confirm booking | App + User |
| POST | `/release-seat` | Release reservation | App + User |
| GET | `/my-bookings` | User's bookings | App + User |
| GET | `/booking/:bookingId` | Booking details | App + User |

---

## 🎯 Complete Booking Flow

### Step 1: List Available Seats

```bash
GET /seats?entityId=EVENT_123
x-app-id: event-app-prod
x-api-key: your-api-key
Authorization: Bearer <user_token>

Response:
{
  "success": true,
  "data": {
    "seats": [
      {
        "_id": "65abc123...",
        "seatNumber": "A1",
        "price": 50,
        "status": "AVAILABLE"
      },
      ...
    ],
    "count": 25
  }
}
```

### Step 2: Reserve Seat (Acquires Lock)

```bash
POST /reserve-seat
x-app-id: event-app-prod
x-api-key: your-api-key
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "seatId": "65abc123..."
}

Response:
{
  "success": true,
  "message": "Seat reserved successfully. Complete payment within 2 minutes.",
  "data": {
    "reservationToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "expiresAt": "2026-01-22T12:32:00.000Z",
    "seat": {
      "id": "65abc123...",
      "seatNumber": "A1",
      "price": 50
    },
    "ttl": 120
  }
}
```

⏱️ **Seat is now locked for 2 minutes!**

### Step 3: Process Payment (Frontend)

Your frontend should:
1. Display payment form
2. Process payment through payment gateway
3. Get `paymentId` from gateway

### Step 4: Confirm Booking

```bash
POST /confirm-booking
x-app-id: event-app-prod
x-api-key: your-api-key
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "reservationToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "paymentId": "PAY-12345-ABCDE"
}

Response:
{
  "success": true,
  "message": "Booking confirmed successfully",
  "data": {
    "bookingId": "BK-20260122-XYZ789",
    "booking": {
      "bookingId": "BK-20260122-XYZ789",
      "userId": "...",
      "paymentStatus": "SUCCESS",
      "amount": 50
    }
  }
}
```

✅ **Booking complete! Seat is now BOOKED.**

### Optional: Release Seat (Cancel)

```bash
POST /release-seat
x-app-id: event-app-prod
x-api-key: your-api-key
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "reservationToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

## 🗄️ Database Models

### App
```javascript
{
  appId: "event-app-prod",
  name: "Event Booking Frontend",
  domain: "EVENT" | "BUS" | "MOVIE",
  allowedDomains: ["https://event-app.com"],
  isActive: true
}
```

### User
```javascript
{
  email: "user@example.com",
  name: "John Doe",
  phone: "+1234567890",
  isActive: true
}
```

### Seat
```javascript
{
  appId: "event-app-prod",
  domain: "EVENT",
  entityId: "EVENT_123",
  seatNumber: "A1",
  status: "AVAILABLE" | "BOOKED",
  price: 50,
  bookedBy: userId,
  bookingId: bookingId
}
```

### Reservation
```javascript
{
  reservationToken: "uuid",
  userId: userId,
  seatId: seatId,
  status: "ACTIVE" | "EXPIRED" | "CONFIRMED" | "RELEASED",
  expiresAt: Date
}
```

### Booking
```javascript
{
  bookingId: "BK-20260122-XYZ789",
  userId: userId,
  seatId: seatId,
  paymentStatus: "SUCCESS",
  paymentId: "PAY-12345",
  amount: 50
}
```

---

## 🔒 Security Features

1. **API Key Hashing**: API keys are hashed with bcrypt (never stored in plain text)
2. **JWT Authentication**: Separate secrets for admin and user tokens
3. **Domain Whitelisting**: Origin validation for app requests
4. **Password Hashing**: Bcrypt with cost factor 10
5. **Atomic Operations**: Redis SET NX prevents race conditions
6. **MongoDB Transactions**: ACID guarantees for booking confirmation

---

## 🚦 Error Handling

All errors follow a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "SEAT_LOCK_ERROR",
    "message": "Seat is already locked by another user",
    "details": {
      "seatId": "65abc123...",
      "expiresIn": 87
    }
  },
  "timestamp": "2026-01-22T12:30:00.000Z"
}
```

**Common Error Codes:**
- `AUTHENTICATION_ERROR` (401)
- `AUTHORIZATION_ERROR` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `SEAT_LOCK_ERROR` (409)
- `PAYMENT_ERROR` (402)
- `VALIDATION_ERROR` (400)

---

## 🧪 Testing the System

### 1. Start MongoDB and Redis
```bash
# MongoDB
mongod

# Redis
redis-server
```

### 2. Start the backend
```bash
npm start
```

### 3. Admin Login
```bash
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@booking-backend.com","password":"admin123"}'
```

### 4. Create an App
```bash
curl -X POST http://localhost:5000/admin/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "appId": "test-app",
    "name": "Test App",
    "domain": "EVENT",
    "apiKey": "test-api-key-must-be-at-least-32-characters-long",
    "allowedDomains": ["http://localhost:3000"]
  }'
```

### 5. User Signup
```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -H "x-app-id: test-app" \
  -H "x-api-key: test-api-key-must-be-at-least-32-characters-long" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

---

## 📊 Monitoring

### Health Check
```bash
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2026-01-22T12:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "services": {
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/booking_backend` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET_ADMIN` | Admin JWT secret | - |
| `JWT_SECRET_USER` | User JWT secret | - |
| `ADMIN_EMAIL` | Admin email | - |
| `ADMIN_PASSWORD` | Admin password | - |
| `LOCK_TTL_SECONDS` | Seat lock TTL | `120` |
| `CORS_ORIGIN` | Allowed origins | `*` |

---

## 📁 Project Structure

```
hackwow/
├── src/
│   ├── config/           # Database, Redis, environment config
│   ├── models/           # MongoDB schemas
│   ├── middleware/       # Auth and validation middleware
│   ├── services/         # Business logic services
│   ├── routes/           # API route handlers
│   ├── utils/            # Error handling, response formatting
│   └── server.js         # Express app entry point
├── .env                  # Environment variables
├── package.json
├── ARCHITECTURE.md       # Detailed architecture documentation
└── README.md            # This file
```

---

## 🚀 Deployment Checklist

- [ ] Generate strong JWT secrets (256-bit)
- [ ] Set production MongoDB URI
- [ ] Set production Redis credentials
- [ ] Configure CORS for specific domains
- [ ] Enable MongoDB replica set (for transactions)
- [ ] Enable Redis persistence (AOF)
- [ ] Set strong admin password
- [ ] Configure HTTPS
- [ ] Set up log aggregation
- [ ] Configure health check monitoring
- [ ] Set up backup strategy

---

## 📝 License

MIT

---

## 👨‍💻 Author

System Architect - Unified Booking Backend

---

## 🤝 Support

For issues or questions, please refer to [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design and decision rationale.
