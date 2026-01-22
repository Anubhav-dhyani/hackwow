# 🏗️ Unified Booking Platform - Architecture Overview

## System Components

### 1. Main Platform (hackwow)
**Location**: `d:\hee\hackwow`

#### A. Backend API (Node.js + Express)
- **Purpose**: Multi-tenant booking backend service
- **Features**:
  - ✅ Race condition prevention (Redis locks)
  - ✅ Prevent multiple payment clicks
  - ✅ Seat reservation with 120-second TTL
  - ✅ Multi-tenant data isolation
  - ✅ JWT-based authentication
  - ✅ Payment confirmation workflow

#### B. Admin Dashboard (React + Vite)
- **Purpose**: Platform management for admin
- **Features**:
  - Create/manage client applications
  - Generate API credentials (appId + apiKey)
  - View all bookings across clients
  - Rotate API keys
  - Monitor platform usage

---

## 2. Reference Frontend (frontend1)
**Location**: `d:\hee\frontend1`

- **Purpose**: Example implementation for clients
- **Status**: Optional - clients can use or customize
- **Features**:
  - Complete booking flow
  - Seat selection UI
  - Payment integration
  - User authentication
  - Pre-configured with API client

---

## Client Options

### Option A: Use Your Own Frontend ✅
**Clients build their own frontend application**

#### What They Get:
- Full control over UI/UX
- Custom branding
- Their own tech stack (React, Vue, Angular, etc.)
- Their own hosting

#### What They Must Do:
1. **Get API Credentials**:
   - Register on admin dashboard
   - Receive `appId` and `apiKey`

2. **Integrate Backend API**:
   ```javascript
   // Their frontend code
   const API_URL = 'https://your-backend.com';
   const APP_ID = 'APP-xxxx-xxxx-xxxx';
   const API_KEY = 'sk_live_xxxxx';

   // Every API request must include headers
   axios.post(`${API_URL}/auth/signup`, data, {
     headers: {
       'x-app-id': APP_ID,
       'x-api-key': API_KEY,
       'Content-Type': 'application/json'
     }
   });
   ```

3. **Follow API Contracts**:
   - Use documented endpoints
   - Send required headers
   - Handle response formats

#### Benefits They Get:
- ✅ **Race Condition Prevention**: Backend handles concurrent requests
- ✅ **Seat Locking**: 120-second Redis locks prevent double booking
- ✅ **Payment Safety**: Single-use reservation tokens
- ✅ **Data Isolation**: Only see their own data
- ✅ **Scalability**: Backend handles load

---

### Option B: Use Reference Frontend (frontend1) ✅
**Clients use/customize the provided frontend**

#### What They Get:
- Pre-built booking UI
- Working integration with backend
- Example components and flows
- Best practices implementation

#### What They Must Do:
1. **Clone frontend1**:
   ```bash
   git clone <frontend1-repo>
   cd frontend1
   ```

2. **Configure Their Credentials**:
   ```env
   # .env file
   VITE_API_BASE_URL=https://your-backend.com
   VITE_APP_ID=APP-their-app-id
   VITE_API_KEY=sk_live_their_key
   ```

3. **Customize** (Optional):
   - Change branding/colors
   - Modify UI components
   - Add custom features
   - Deploy to their hosting

#### Benefits:
- ✅ **Faster Time to Market**: Already built
- ✅ **Tested Integration**: Known to work
- ✅ **Reference Implementation**: Learn best practices
- ✅ **All Backend Features**: Race condition prevention, locks, etc.

---

## How It Works

### Scenario 1: Client Uses Their Own Frontend

```
┌─────────────────────┐
│   Client's Custom   │
│      Frontend       │
│  (Any Tech Stack)   │
└──────────┬──────────┘
           │ API Request with
           │ x-app-id: APP-client-123
           │ x-api-key: sk_live_xxx
           ↓
┌─────────────────────┐
│  Booking Backend    │
│   (Your Service)    │
│                     │
│ ✅ Validates credentials
│ ✅ Checks Redis locks
│ ✅ Prevents race conditions
│ ✅ Isolates data by appId
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  MongoDB + Redis    │
│  (Your Database)    │
└─────────────────────┘
```

**Client Controls**: Frontend UI, hosting, tech stack
**You Provide**: Backend logic, race condition handling, data storage

---

### Scenario 2: Client Uses frontend1

```
┌─────────────────────┐
│   frontend1         │
│  (Your Template)    │
│  Customized by      │
│  Client             │
└──────────┬──────────┘
           │ API Request with
           │ x-app-id: APP-client-456
           │ x-api-key: sk_live_yyy
           ↓
┌─────────────────────┐
│  Booking Backend    │
│   (Your Service)    │
│                     │
│ ✅ Validates credentials
│ ✅ Checks Redis locks
│ ✅ Prevents race conditions
│ ✅ Isolates data by appId
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  MongoDB + Redis    │
│  (Your Database)    │
└─────────────────────┘
```

**Client Controls**: Customization, branding, deployment
**You Provide**: Base frontend code, backend logic, infrastructure

---

## API Features (What You Provide to All Clients)

### 1. Race Condition Prevention ✅
```javascript
// Multiple users click same seat simultaneously
// Backend uses Redis locks to ensure only ONE succeeds

POST /reserve-seat
{
  "seatId": "seat-123"
}

// Backend logic:
// 1. Check if seat is available (atomic operation)
// 2. Create Redis lock with 120s TTL
// 3. Update seat status to RESERVED
// 4. Return reservation token
// 5. Others get "Seat already reserved" error
```

### 2. Payment Click Prevention ✅
```javascript
// User clicks "Pay" button multiple times
// Backend uses one-time reservation tokens

POST /confirm-booking
{
  "reservationToken": "uuid-v4-token",
  "paymentId": "PAY-123"
}

// Backend logic:
// 1. Verify reservation token exists (one-time use)
// 2. Check token not already used
// 3. Create booking
// 4. Delete reservation token (can't be used again)
// 5. Mark seat as BOOKED
```

### 3. Auto-Expiry ✅
```javascript
// Reservation expires after 120 seconds
// Redis TTL automatically releases the lock
// Background job marks seat as AVAILABLE again
```

### 4. Data Isolation ✅
```javascript
// Client A can only see their own data
// Middleware filters by appId automatically

GET /seats?entityId=concert-123
// Returns only seats for Client A's appId

GET /my-bookings
// Returns only bookings for Client A's users
```

---

## Client Integration Guide

### Step 1: Get Credentials
1. Go to admin dashboard: `https://your-admin.com`
2. Login with admin credentials
3. Click "Create New App"
4. Fill form:
   - Name: "My Event Booking"
   - Domain: EVENT (or BUS, MOVIE)
   - Allowed Domains: their-website.com
5. Copy credentials:
   - `appId`: APP-xxxx-xxxx
   - `apiKey`: sk_live_xxxxx (shown once!)

### Step 2: Choose Integration Method

#### Method 1: Build Your Own Frontend
See: `/docs/CUSTOM_FRONTEND_GUIDE.md`

#### Method 2: Use frontend1
See: `/docs/USING_FRONTEND1.md`

### Step 3: Create Test Data
```bash
# Seed seats in MongoDB
POST /admin/seed-data
{
  "appId": "APP-client-123",
  "entityId": "concert-2026",
  "seats": [
    { "seatNumber": "A1", "price": 100 },
    { "seatNumber": "A2", "price": 100 }
  ]
}
```

### Step 4: Test Integration
1. User signup/login
2. View available seats
3. Reserve a seat (check Redis lock created)
4. Confirm payment (check booking created)
5. View bookings

---

## What Makes This Work

### Backend Responsibilities:
- ✅ Multi-tenant authentication (appId + apiKey)
- ✅ User authentication (JWT tokens)
- ✅ Race condition prevention (Redis locks)
- ✅ Payment idempotency (one-time tokens)
- ✅ Data isolation (appId filtering)
- ✅ Seat reservation workflow
- ✅ Booking confirmation
- ✅ Auto-cleanup of expired reservations

### Client Responsibilities:
- Frontend UI/UX
- User registration flow
- Seat selection interface
- Payment integration (frontend)
- Deployment and hosting
- Custom business logic

---

## Real-World Examples

### Example 1: Movie Theater Chain
**Their Choice**: Custom Frontend (their brand)

```javascript
// Their React app
const MovieBooking = () => {
  const bookSeat = async (seatId) => {
    const response = await fetch('https://your-backend.com/reserve-seat', {
      method: 'POST',
      headers: {
        'x-app-id': 'APP-movie-chain-123',
        'x-api-key': 'sk_live_movie_key',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ seatId })
    });
    
    // Your backend handles:
    // ✅ Race condition prevention
    // ✅ Redis locking
    // ✅ Reservation creation
    
    return response.json();
  };
};
```

**Benefits**:
- Full brand control
- Custom movie-specific features
- Uses your backend for critical logic
- No double-booking issues

---

### Example 2: Small Event Company
**Their Choice**: Use frontend1

```bash
# Clone and customize
git clone <frontend1>
cd frontend1

# Add their credentials
echo "VITE_APP_ID=APP-events-456" > .env
echo "VITE_API_KEY=sk_live_events_key" >> .env

# Customize branding
# - Change colors in tailwind.config.js
# - Replace logo
# - Modify homepage

# Deploy
npm run build
# Upload to Netlify/Vercel
```

**Benefits**:
- Fast launch (days not months)
- Proven UI/UX
- All backend features included
- Can still customize

---

## API Endpoints Available to Clients

### Authentication
```
POST /auth/signup    - Create user account
POST /auth/login     - Login and get JWT
```

### Booking Flow
```
GET  /seats?entityId=xxx     - View available seats
POST /reserve-seat           - Lock a seat (120s)
POST /release-seat           - Release reservation
POST /confirm-booking        - Confirm payment
GET  /my-bookings           - View user's bookings
```

### All requests require:
```javascript
headers: {
  'x-app-id': 'APP-xxx',      // From admin dashboard
  'x-api-key': 'sk_live_xxx', // From admin dashboard
  'Authorization': 'Bearer jwt' // After login
}
```

---

## Key Advantages for Clients

### 1. No Need to Solve Complex Problems
- ❌ Don't implement Redis locks
- ❌ Don't handle race conditions
- ❌ Don't manage seat availability
- ❌ Don't build reservation expiry
- ✅ Just call our API - it's handled!

### 2. Focus on Business Logic
- Build great UI
- Custom features
- Marketing
- Customer experience

### 3. Scale Without Worry
- Backend handles thousands of concurrent users
- Redis prevents conflicts
- MongoDB handles data growth
- Multi-tenant architecture proven

---

## Summary

### You Provide (Backend Services):
1. ✅ Race condition prevention
2. ✅ Seat locking mechanism
3. ✅ Payment safety (one-time tokens)
4. ✅ Multi-tenant data isolation
5. ✅ API authentication
6. ✅ Reservation workflow
7. ✅ Auto-cleanup of expired locks

### Clients Choose:
- **Option A**: Build custom frontend + Use your API
- **Option B**: Use frontend1 template + Use your API

### Both Options Get:
- All backend features
- Race condition prevention
- Seat locking
- Payment safety
- Data isolation
- Scalability

**The key**: Clients can build ANY frontend they want, but when they use your API credentials, they automatically get all the robust backend features! 🚀
