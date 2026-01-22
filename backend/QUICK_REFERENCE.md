# 🚀 QUICK REFERENCE GUIDE

## 🎯 Project Overview
**Multi-tenant booking backend** for Event, Bus, and Movie booking systems with atomic seat locking and three-layer authentication.

---

## ⚡ Quick Commands

### Start Everything
```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: Redis
redis-server

# Terminal 3: Backend
cd hackwow
npm start
```

### Stop Everything
```bash
# Ctrl+C in each terminal
# Or kill all:
pkill mongod
pkill redis-server
```

---

## 🔑 Default Credentials

### Admin
```
Email: admin@booking-backend.com
Password: admin123
```

### Test User (create via API)
```
Email: test@example.com
Password: password123
```

---

## 📡 Core API Flows

### 1️⃣ Admin Setup
```bash
# Login
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@booking-backend.com","password":"admin123"}'

# Save token
export ADMIN_TOKEN="your_token_here"

# Create app
curl -X POST http://localhost:5000/admin/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "appId": "event-app",
    "name": "Event App",
    "domain": "EVENT",
    "apiKey": "event-key-must-be-at-least-32-chars-long",
    "allowedDomains": ["http://localhost:3000"]
  }'

# Save app credentials
export APP_ID="event-app"
export API_KEY="event-key-must-be-at-least-32-chars-long"
```

### 2️⃣ User Registration
```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -H "x-app-id: $APP_ID" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'

# Save token
export USER_TOKEN="your_user_token_here"
```

### 3️⃣ Booking Flow
```bash
# Create test seats first (in MongoDB):
mongosh booking_backend
db.seats.insertOne({
  appId: "event-app",
  domain: "EVENT",
  entityId: "EVENT_001",
  seatNumber: "A1",
  status: "AVAILABLE",
  price: 100
})

# List seats
curl -X GET "http://localhost:5000/seats?entityId=EVENT_001" \
  -H "x-app-id: $APP_ID" \
  -H "x-api-key: $API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN"

# Reserve seat (save seat ID from previous response)
curl -X POST http://localhost:5000/reserve-seat \
  -H "Content-Type: application/json" \
  -H "x-app-id: $APP_ID" \
  -H "x-api-key: $API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"seatId": "your_seat_id"}'

# Save reservation token
export RESERVATION_TOKEN="your_reservation_token"

# Confirm booking
curl -X POST http://localhost:5000/confirm-booking \
  -H "Content-Type: application/json" \
  -H "x-app-id: $APP_ID" \
  -H "x-api-key: $API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "reservationToken": "'"$RESERVATION_TOKEN"'",
    "paymentId": "PAY-TEST-12345"
  }'
```

---

## 🗺️ File Map (Where to Find Things)

### Authentication
- Admin: `src/middleware/adminAuth.js`
- App: `src/middleware/appAuth.js`
- User: `src/middleware/userAuth.js`

### Core Logic
- Booking: `src/services/bookingService.js`
- Locking: `src/services/lockService.js`
- Payment: `src/services/paymentService.js`

### Database
- MongoDB: `src/config/database.js`
- Redis: `src/config/redis.js`
- Models: `src/models/*.js`

### APIs
- Admin: `src/routes/admin.routes.js`
- Auth: `src/routes/auth.routes.js`
- Booking: `src/routes/booking.routes.js`

---

## 🔍 Health Check

```bash
curl http://localhost:5000/health
```

Expected:
```json
{
  "status": "ok",
  "services": {
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

---

## 🐛 Debugging

### Check MongoDB
```bash
mongosh
use booking_backend
db.apps.find().pretty()
db.users.find().pretty()
db.seats.find().pretty()
db.bookings.find().pretty()
```

### Check Redis
```bash
redis-cli
KEYS *                    # List all keys
KEYS seat:lock:*          # List all seat locks
GET seat:lock:<seat_id>   # Check specific lock
TTL seat:lock:<seat_id>   # Check remaining time
```

### Check Logs
Server logs print to console. Look for:
- ✅ MongoDB connected
- ✅ Redis connected
- ✅ Server running on port 5000

---

## 📊 Database Quick Setup

### Create Test Data
```javascript
mongosh booking_backend

// Create seats for Event App
db.seats.insertMany([
  {
    appId: "event-app",
    domain: "EVENT",
    entityId: "EVENT_001",
    seatNumber: "A1",
    status: "AVAILABLE",
    price: 100,
    metadata: { tier: "VIP" }
  },
  {
    appId: "event-app",
    domain: "EVENT",
    entityId: "EVENT_001",
    seatNumber: "A2",
    status: "AVAILABLE",
    price: 100,
    metadata: { tier: "VIP" }
  },
  {
    appId: "event-app",
    domain: "EVENT",
    entityId: "EVENT_001",
    seatNumber: "B1",
    status: "AVAILABLE",
    price: 50,
    metadata: { tier: "Regular" }
  }
])
```

---

## ⚠️ Common Errors

### "MongoDB not connected"
```bash
# Start MongoDB
mongod
# Or on Linux/Mac
sudo systemctl start mongodb
```

### "Redis not connected"
```bash
# Start Redis
redis-server
# Or on Linux/Mac
sudo systemctl start redis
```

### "App credentials required"
```bash
# Make sure you include headers:
x-app-id: your-app-id
x-api-key: your-api-key
```

### "User token required"
```bash
# Include header:
Authorization: Bearer your_user_token
```

### "Seat already locked"
```bash
# Wait 2 minutes for lock to expire
# Or manually release in Redis:
redis-cli DEL seat:lock:<seat_id>
```

---

## 🎯 Testing Race Conditions

```bash
# Save as test_race.sh
#!/bin/bash
SEAT_ID="your_seat_id"
for i in {1..10}; do
  curl -X POST http://localhost:5000/reserve-seat \
    -H "Content-Type: application/json" \
    -H "x-app-id: event-app" \
    -H "x-api-key: event-key-must-be-at-least-32-chars-long" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"seatId":"'$SEAT_ID'"}' &
done
wait
```

Expected: Only 1 success, 9 failures with "SEAT_LOCK_ERROR"

---

## 🔄 Reset Everything

```bash
# Drop database
mongosh booking_backend --eval "db.dropDatabase()"

# Clear Redis
redis-cli FLUSHALL

# Restart server
npm start
```

---

## 📚 Documentation Files

1. **README.md** - Complete API documentation
2. **ARCHITECTURE.md** - System design (read this to understand WHY)
3. **API_TESTING.md** - Full testing guide with cURL examples
4. **SETUP.md** - Installation and setup instructions
5. **PROJECT_SUMMARY.md** - Project delivery checklist
6. **QUICK_REFERENCE.md** - This file

---

## 🚀 Production Checklist

Before deploying:

- [ ] Change admin password in .env
- [ ] Generate new JWT secrets (256-bit)
- [ ] Update MongoDB URI (production cluster)
- [ ] Update Redis credentials
- [ ] Set CORS_ORIGIN to specific domains
- [ ] Set NODE_ENV=production
- [ ] Enable MongoDB replica set
- [ ] Enable Redis persistence
- [ ] Set up HTTPS
- [ ] Configure load balancer
- [ ] Set up monitoring

---

## 💡 Pro Tips

1. **Always check health first**: `curl http://localhost:5000/health`
2. **Save tokens as env variables**: Makes testing easier
3. **Use `| jq`**: Pretty print JSON responses
4. **Watch server logs**: Shows auth flow and errors
5. **Test with 2 users**: See how locks prevent double-booking

---

## 🎓 Key Concepts

### Three-Layer Auth
```
Admin ─→ Manages platform
  │
  ├─→ App ─→ Frontend tenant (EVENT/BUS/MOVIE)
        │
        └─→ User ─→ End users who book
```

### Seat States
```
MongoDB: AVAILABLE → BOOKED
Redis:   [LOCKED with TTL=2min]
```

### Atomic Locking
```
Redis SET NX = Set if Not eXists (atomic operation)
Even with 1000 concurrent requests, only 1 succeeds
```

---

**Need more help?** Read ARCHITECTURE.md for detailed explanations of every design decision.

**Ready to code?** See API_TESTING.md for complete API examples.

**Setting up for first time?** Follow SETUP.md step by step.
