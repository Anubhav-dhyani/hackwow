# 🏗️ UNIFIED BOOKING BACKEND - SYSTEM ARCHITECTURE

## 📋 Executive Summary

A **multi-tenant booking backend** that serves multiple independent frontends (Event, Bus, Movie) through a unified REST API. The system implements three-layer authentication, atomic seat locking, and race-condition-free booking flows.

---

## 🎯 Core Design Principles

### 1. **Multi-Tenancy by Design**
- Each frontend app is a separate tenant with isolated credentials
- Shared user pool across all apps (users can book across domains)
- Domain-based access control prevents unauthorized app access
- APP_ID + API_KEY authentication for tenant identification

**WHY**: Allows horizontal scaling of frontends without backend changes. New booking domains can be added by registering new apps.

### 2. **Three-Layer Authentication**
```
Layer 1: Admin Auth (Platform Owner)
         ↓ Manages
Layer 2: App Auth (Frontend Tenants)
         ↓ Serves
Layer 3: User Auth (End Users)
```

**WHY**: Separates concerns - admin manages platform, apps authenticate as tenants, users authenticate per session. Enables fine-grained access control.

### 3. **Atomic Seat Locking**
- Redis-based distributed locks with TTL
- Token-based reservation system
- State machine: AVAILABLE → LOCKED → BOOKED
- Auto-expiry prevents deadlocks

**WHY**: Prevents double-booking in high-concurrency scenarios. Redis provides atomic operations with millisecond precision.

---

## 🔐 AUTHENTICATION ARCHITECTURE

### Layer 1: Admin Authentication

```
┌─────────────────────────────────────┐
│   Admin Login (POST /admin/login)  │
│   - Email: ADMIN_EMAIL (.env)      │
│   - Password: ADMIN_PASSWORD (.env) │
└─────────────────┬───────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  bcrypt.compare()  │
         └────────┬───────────┘
                  │
                  ▼
         ┌─────────────────────┐
         │  JWT Token Issued   │
         │  Role: ADMIN        │
         │  Expiry: 24h        │
         └─────────────────────┘
```

**Storage**: `.env` file (not in DB for security)
**Purpose**: Platform management, app registration, global analytics

### Layer 2: App Authentication (Multi-Tenant)

```
┌───────────────────────────────────────┐
│  Every API Request Must Include:     │
│  - Header: x-app-id                   │
│  - Header: x-api-key                  │
│  - Header: origin                     │
└───────────────┬───────────────────────┘
                │
                ▼
     ┌──────────────────────────┐
     │  Validate in MongoDB:    │
     │  1. App exists           │
     │  2. API key hash matches │
     │  3. Origin in whitelist  │
     │  4. App is active        │
     └──────────┬───────────────┘
                │
                ▼
     ┌─────────────────────────┐
     │  Attach app to req.app  │
     │  Continue to next layer │
     └─────────────────────────┘
```

**Storage**: MongoDB `apps` collection
**Purpose**: Isolate tenant data, enforce domain restrictions, track usage

**App Schema**:
```javascript
{
  appId: String (unique, indexed),
  apiKeyHash: String (bcrypt),
  name: String,
  domain: Enum [EVENT, BUS, MOVIE],
  allowedDomains: [String],
  isActive: Boolean,
  createdAt: Date
}
```

### Layer 3: User Authentication

```
┌─────────────────────────────────────┐
│  User Signup (POST /auth/signup)   │
│  - Email, Password, Name            │
└─────────────────┬───────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  Create User in DB │
         │  Hash password     │
         └────────┬───────────┘
                  │
                  ▼
         ┌─────────────────────┐
         │  JWT Token Issued   │
         │  userId in payload  │
         │  Expiry: 7 days     │
         └─────────────────────┘

┌─────────────────────────────────────┐
│  User Login (POST /auth/login)     │
│  - Email, Password                  │
└─────────────────┬───────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  Validate Password │
         └────────┬───────────┘
                  │
                  ▼
         ┌─────────────────────┐
         │  JWT Token Issued   │
         └─────────────────────┘
```

**Storage**: MongoDB `users` collection
**Purpose**: End-user sessions, booking attribution

---

## 🔒 SEAT RESERVATION LOGIC (CRITICAL)

### State Machine

```
AVAILABLE ──┐
            │
            ├─► LOCKED ─────┐
            │   (Redis)     │
            │   TTL: 2min   │
            │               │
            │               ├─► BOOKED (MongoDB)
            │               │   (payment success)
            │               │
            │               └─► AVAILABLE
            │                   (timeout/failure)
            │
            └─────────────────► AVAILABLE
                                (never locked)
```

### Redis Lock Implementation

**Key Structure**:
```
seat:lock:{seatId} = {
  reservationToken: String,
  userId: String,
  timestamp: Number,
  expiresAt: Number
}
TTL: 120 seconds
```

**Atomic Operations**:
1. **Reserve**: `SET NX` (only if key doesn't exist)
2. **Check**: `GET` and validate token + expiry
3. **Release**: `DEL` (manual or TTL expiry)

**Race Condition Prevention**:
```javascript
// WRONG (race condition possible):
if (await redis.get(key) === null) {
  await redis.set(key, value); // ❌ Another process can slip in here
}

// CORRECT (atomic):
const result = await redis.set(key, value, 'NX', 'EX', 120); // ✅ Atomic operation
if (result === null) {
  throw new Error('Seat already locked');
}
```

---

## 📊 DATA MODELS

### 1. Admin
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  passwordHash: String,
  role: "ADMIN",
  createdAt: Date
}
```
**WHY stored in .env, not DB**: Simplicity, fewer attack vectors, immutable credentials

### 2. App
```javascript
{
  _id: ObjectId,
  appId: String (unique, indexed),      // "event-app-prod"
  apiKeyHash: String,                    // bcrypt(API_KEY)
  name: String,                          // "Event Booking Frontend"
  domain: Enum [EVENT, BUS, MOVIE],     // Business domain
  allowedDomains: [String],             // ["https://event.com", "https://app.event.com"]
  isActive: Boolean,                     // Master kill switch
  createdBy: ObjectId (ref: Admin),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- appId (unique)
- domain
- isActive
```

### 3. User
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  passwordHash: String,
  name: String,
  phone: String (optional),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- email (unique)
```
**WHY shared across apps**: Users can book events, buses, movies with one account. Better UX.

### 4. Seat
```javascript
{
  _id: ObjectId,
  appId: String (indexed, ref: App),    // Which app owns this seat
  domain: Enum [EVENT, BUS, MOVIE],
  entityId: String,                      // Event ID, Bus ID, Movie Show ID
  seatNumber: String,                    // "A1", "12", "Row-5-Seat-3"
  status: Enum [AVAILABLE, BOOKED],     // MongoDB status (not LOCKED - that's Redis)
  price: Number,
  metadata: Object,                      // Seat type, tier, extras
  bookedBy: ObjectId (ref: User, optional),
  bookingId: ObjectId (ref: Booking, optional),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- compound: (appId, entityId, seatNumber) - unique
- compound: (appId, status) - for listing available seats
- bookingId
```

### 5. Reservation (Tracking)
```javascript
{
  _id: ObjectId,
  reservationToken: String (unique, indexed),
  userId: ObjectId (ref: User),
  appId: String (ref: App),
  seatId: ObjectId (ref: Seat),
  status: Enum [ACTIVE, EXPIRED, CONFIRMED, RELEASED],
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- reservationToken (unique)
- compound: (userId, status)
- expiresAt (for cleanup jobs)
```
**WHY**: Audit trail, analytics, debugging failed bookings

### 6. Booking
```javascript
{
  _id: ObjectId,
  bookingId: String (unique, indexed),   // "BK-20260122-ABC123"
  userId: ObjectId (ref: User),
  appId: String (ref: App),
  seatId: ObjectId (ref: Seat),
  reservationToken: String (ref: Reservation),
  
  // Payment
  paymentStatus: Enum [PENDING, SUCCESS, FAILED],
  paymentId: String,                     // Simulated payment ID
  amount: Number,
  
  // Metadata
  bookingDate: Date,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- bookingId (unique)
- userId
- compound: (appId, bookingDate)
- paymentStatus
```

---

## 🔄 BOOKING FLOW (END-TO-END)

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: List Available Seats                              │
│  GET /seats?entityId=EVENT_123                             │
│  Headers: x-app-id, x-api-key, Authorization (User JWT)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  MongoDB Query:                                              │
│  Find seats where:                                           │
│    - appId matches                                           │
│    - entityId matches                                        │
│    - status = AVAILABLE                                      │
│  Check Redis: Filter out seats with active locks            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Reserve Seat                                       │
│  POST /reserve-seat                                         │
│  Body: { seatId: "..." }                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  1. Validate seat exists and is AVAILABLE                    │
│  2. Generate reservationToken (UUID)                         │
│  3. ATOMIC: Redis SET NX with TTL=120s                       │
│     Key: seat:lock:{seatId}                                  │
│     Value: { token, userId, timestamp, expiresAt }           │
│  4. Create Reservation doc in MongoDB (status: ACTIVE)       │
│  5. Return: { reservationToken, expiresAt, price }           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Payment (Frontend Handles This)                   │
│  - User enters payment info                                 │
│  - Frontend calls payment gateway                           │
│  - Gets paymentId                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Confirm Booking                                    │
│  POST /confirm-booking                                      │
│  Body: { reservationToken, paymentId }                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  1. Validate reservationToken exists in Redis                │
│  2. Validate token belongs to authenticated user             │
│  3. Check token not expired                                  │
│  4. Simulate payment verification (mock)                     │
│  5. BEGIN TRANSACTION:                                       │
│     a. Update Seat: status = BOOKED, bookedBy = userId       │
│     b. Create Booking doc                                    │
│     c. Update Reservation: status = CONFIRMED                │
│  6. Delete Redis lock                                        │
│  7. COMMIT TRANSACTION                                       │
│  8. Return: { bookingId, booking details }                   │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Alternative: Release Seat (Cancel/Timeout)                 │
│  POST /release-seat                                         │
│  Body: { reservationToken }                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  1. Validate reservationToken                                │
│  2. Delete Redis lock                                        │
│  3. Update Reservation: status = RELEASED                    │
│  4. Return: { success: true }                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗂️ PROJECT STRUCTURE

```
hackwow/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   ├── redis.js             # Redis client
│   │   └── env.js               # Environment validation
│   │
│   ├── models/
│   │   ├── Admin.js
│   │   ├── App.js
│   │   ├── User.js
│   │   ├── Seat.js
│   │   ├── Reservation.js
│   │   └── Booking.js
│   │
│   ├── middleware/
│   │   ├── adminAuth.js         # Layer 1: Admin JWT validation
│   │   ├── appAuth.js           # Layer 2: App authentication
│   │   ├── userAuth.js          # Layer 3: User JWT validation
│   │   ├── validator.js         # Request validation
│   │   └── errorHandler.js      # Centralized error handler
│   │
│   ├── services/
│   │   ├── lockService.js       # Redis locking logic
│   │   ├── paymentService.js    # Payment simulation
│   │   ├── bookingService.js    # Booking business logic
│   │   └── tokenService.js      # JWT helpers
│   │
│   ├── routes/
│   │   ├── admin.routes.js      # Admin APIs
│   │   ├── auth.routes.js       # User auth APIs
│   │   └── booking.routes.js    # Booking APIs
│   │
│   ├── utils/
│   │   ├── response.js          # Standardized API responses
│   │   ├── errors.js            # Custom error classes
│   │   └── logger.js            # Logging utility
│   │
│   └── server.js                # Express app entry point
│
├── .env.example
├── .env
├── .gitignore
├── package.json
└── ARCHITECTURE.md (this file)
```

---

## 🔐 SECURITY CONSIDERATIONS

### 1. **API Key Storage**
- Never store plain API keys
- Use bcrypt (cost factor 10) for hashing
- Rotate keys periodically

### 2. **JWT Security**
- Use strong secret (256-bit minimum)
- Set appropriate expiry (admin: 24h, user: 7d)
- Include `iat` (issued at) and `exp` (expiry)
- Validate signature on every request

### 3. **Domain Whitelisting**
- Validate `Origin` header against `allowedDomains`
- Reject requests from unknown origins
- Support wildcard subdomains cautiously

### 4. **Rate Limiting**
- Implement per-IP rate limits (future: express-rate-limit)
- Prevent brute force on login endpoints
- Throttle seat reservation attempts

### 5. **Input Validation**
- Validate all inputs against schema
- Sanitize user inputs (prevent NoSQL injection)
- Use parameterized queries

### 6. **Redis Security**
- Use unique key prefixes
- Set TTL on all locks
- Monitor for memory leaks

---

## 📈 SCALABILITY CONSIDERATIONS

### Horizontal Scaling
- **Stateless API**: All session data in JWT/Redis/MongoDB
- **Load Balancer**: Can run multiple instances behind nginx/ALB
- **Redis Cluster**: Distribute locks across nodes
- **MongoDB Replica Set**: Read replicas for seat listings

### Performance Optimizations
1. **Indexing Strategy**:
   - Compound indexes on frequently queried fields
   - Index on `status` for seat availability queries

2. **Caching**:
   - Cache app credentials (reduce DB lookups)
   - Cache seat availability (invalidate on booking)

3. **Connection Pooling**:
   - MongoDB: connection pool size = 10
   - Redis: connection pool for high concurrency

### Monitoring
- Log all booking attempts (success/failure)
- Track Redis lock acquisition time
- Alert on high lock contention
- Monitor payment failure rates

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Generate strong JWT secrets (256-bit)
- [ ] Set MongoDB indexes
- [ ] Configure Redis persistence (AOF mode)
- [ ] Set up environment variables
- [ ] Enable CORS for allowed domains
- [ ] Configure log aggregation
- [ ] Set up health check endpoints
- [ ] Enable HTTPS only
- [ ] Configure firewall rules (MongoDB, Redis ports)
- [ ] Set up backup strategy (MongoDB daily snapshots)

---

## 📝 API RESPONSE FORMAT

**Success**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "SEAT_ALREADY_LOCKED",
    "message": "This seat is currently locked by another user",
    "details": { "expiresIn": 87 }
  }
}
```

---

## 🎯 FUTURE ENHANCEMENTS

1. **Webhook Support**: Notify frontends of booking events
2. **Real-time Updates**: WebSocket for seat availability
3. **Analytics Dashboard**: Booking metrics per app/domain
4. **Dynamic Pricing**: Peak hour pricing engine
5. **Bulk Booking**: Lock multiple seats atomically
6. **Waitlist**: Queue for sold-out events
7. **Cancellation**: Refund flow with seat release

---

**Architecture Version**: 1.0  
**Last Updated**: January 22, 2026  
**Author**: System Architect
