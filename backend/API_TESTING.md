# API Testing Guide

This document provides cURL commands to test all API endpoints.

## Prerequisites

1. Server running on `http://localhost:5000`
2. MongoDB and Redis running
3. `jq` installed (optional, for pretty JSON output)

---

## 1. ADMIN AUTHENTICATION

### Admin Login
```bash
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@booking-backend.com",
    "password": "admin123"
  }' | jq

# Save the token
export ADMIN_TOKEN="<paste_token_here>"
```

---

## 2. APP MANAGEMENT (Admin)

### Create Event App
```bash
curl -X POST http://localhost:5000/admin/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "appId": "event-app-prod",
    "name": "Event Booking App",
    "domain": "EVENT",
    "apiKey": "event-api-key-secure-32-characters-minimum",
    "allowedDomains": ["http://localhost:3000", "http://localhost:3001"]
  }' | jq

# Save the API key
export EVENT_APP_ID="event-app-prod"
export EVENT_API_KEY="event-api-key-secure-32-characters-minimum"
```

### Create Bus App
```bash
curl -X POST http://localhost:5000/admin/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "appId": "bus-app-prod",
    "name": "Bus Booking App",
    "domain": "BUS",
    "apiKey": "bus-api-key-secure-32-characters-minimum",
    "allowedDomains": ["http://localhost:4000"]
  }' | jq
```

### Create Movie App
```bash
curl -X POST http://localhost:5000/admin/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "appId": "movie-app-prod",
    "name": "Movie Booking App",
    "domain": "MOVIE",
    "apiKey": "movie-api-key-secure-32-characters-minimum",
    "allowedDomains": ["http://localhost:5000"]
  }' | jq
```

### List All Apps
```bash
curl -X GET "http://localhost:5000/admin/apps?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### Get Specific App
```bash
curl -X GET http://localhost:5000/admin/apps/$EVENT_APP_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### Update App
```bash
curl -X PATCH http://localhost:5000/admin/apps/$EVENT_APP_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Event Booking App (Updated)",
    "isActive": true
  }' | jq
```

---

## 3. USER AUTHENTICATION

### User Signup
```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123",
    "name": "John Doe",
    "phone": "+1234567890"
  }' | jq

# Save the user token
export USER_TOKEN="<paste_token_here>"
```

### User Login
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }' | jq
```

### Verify Token
```bash
curl -X POST http://localhost:5000/auth/verify \
  -H "Content-Type: application/json" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -d '{
    "token": "'"$USER_TOKEN"'"
  }' | jq
```

---

## 4. SETUP TEST DATA (Manual MongoDB)

You'll need to create some seats in MongoDB for testing:

```javascript
// Connect to MongoDB
mongosh booking_backend

// Create test seats for Event App
db.seats.insertMany([
  {
    appId: "event-app-prod",
    domain: "EVENT",
    entityId: "EVENT_2026_CONCERT",
    seatNumber: "A1",
    status: "AVAILABLE",
    price: 100,
    metadata: { tier: "VIP", section: "Front" }
  },
  {
    appId: "event-app-prod",
    domain: "EVENT",
    entityId: "EVENT_2026_CONCERT",
    seatNumber: "A2",
    status: "AVAILABLE",
    price: 100,
    metadata: { tier: "VIP", section: "Front" }
  },
  {
    appId: "event-app-prod",
    domain: "EVENT",
    entityId: "EVENT_2026_CONCERT",
    seatNumber: "B1",
    status: "AVAILABLE",
    price: 50,
    metadata: { tier: "Regular", section: "Middle" }
  },
  {
    appId: "event-app-prod",
    domain: "EVENT",
    entityId: "EVENT_2026_CONCERT",
    seatNumber: "B2",
    status: "AVAILABLE",
    price: 50,
    metadata: { tier: "Regular", section: "Middle" }
  }
])
```

---

## 5. BOOKING FLOW

### 5.1 List Available Seats
```bash
curl -X GET "http://localhost:5000/seats?entityId=EVENT_2026_CONCERT" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" | jq

# Save a seat ID for reservation
export SEAT_ID="<paste_seat_id_here>"
```

### 5.2 Reserve Seat
```bash
curl -X POST http://localhost:5000/reserve-seat \
  -H "Content-Type: application/json" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "seatId": "'"$SEAT_ID"'"
  }' | jq

# Save the reservation token
export RESERVATION_TOKEN="<paste_reservation_token_here>"
```

### 5.3 Simulate Payment (Use Simulated Payment ID)
The payment service auto-generates payment IDs. Use this format:
```bash
export PAYMENT_ID="PAY-$(date +%s | base64 | head -c 10 | tr '[:lower:]' '[:upper:]')-SIMULATED"
```

### 5.4 Confirm Booking
```bash
curl -X POST http://localhost:5000/confirm-booking \
  -H "Content-Type: application/json" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "reservationToken": "'"$RESERVATION_TOKEN"'",
    "paymentId": "'"$PAYMENT_ID"'"
  }' | jq

# Save the booking ID
export BOOKING_ID="<paste_booking_id_here>"
```

### 5.5 View My Bookings
```bash
curl -X GET "http://localhost:5000/my-bookings?page=1&limit=10" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

### 5.6 Get Specific Booking
```bash
curl -X GET "http://localhost:5000/booking/$BOOKING_ID" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" | jq
```

---

## 6. RELEASE SEAT (CANCEL RESERVATION)

### Release Before Confirmation
```bash
# Reserve another seat first
curl -X POST http://localhost:5000/reserve-seat \
  -H "Content-Type: application/json" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "seatId": "'"$SEAT_ID"'"
  }' | jq

export NEW_RESERVATION_TOKEN="<paste_new_token_here>"

# Release it
curl -X POST http://localhost:5000/release-seat \
  -H "Content-Type: application/json" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "reservationToken": "'"$NEW_RESERVATION_TOKEN"'"
  }' | jq
```

---

## 7. ADMIN ANALYTICS

### View All Bookings
```bash
curl -X GET "http://localhost:5000/admin/bookings?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### Filter by App
```bash
curl -X GET "http://localhost:5000/admin/bookings?appId=event-app-prod&page=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### Filter by Date Range
```bash
curl -X GET "http://localhost:5000/admin/bookings?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

---

## 8. TESTING RACE CONDITIONS

### Test Concurrent Reservations (Bash Script)

Save as `test_race_condition.sh`:

```bash
#!/bin/bash

SEAT_ID="<your_seat_id>"
APP_ID="event-app-prod"
API_KEY="event-api-key-secure-32-characters-minimum"
USER_TOKEN="<your_user_token>"

# Launch 5 simultaneous reservation attempts
for i in {1..5}; do
  (
    curl -s -X POST http://localhost:5000/reserve-seat \
      -H "Content-Type: application/json" \
      -H "x-app-id: $APP_ID" \
      -H "x-api-key: $API_KEY" \
      -H "Authorization: Bearer $USER_TOKEN" \
      -d '{"seatId": "'"$SEAT_ID"'"}' \
      | jq -r '.success, .error.code'
  ) &
done

wait
echo "All requests completed. Only ONE should succeed."
```

Run:
```bash
chmod +x test_race_condition.sh
./test_race_condition.sh
```

Expected result: Only 1 success, 4 failures with `SEAT_LOCK_ERROR`.

---

## 9. HEALTH CHECK

```bash
curl -X GET http://localhost:5000/health | jq
```

---

## 10. ERROR TESTING

### Invalid App Credentials
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -H "x-app-id: invalid-app" \
  -H "x-api-key: wrong-key" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq
```

### Expired/Invalid Token
```bash
curl -X GET "http://localhost:5000/seats?entityId=EVENT_2026_CONCERT" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -H "Authorization: Bearer invalid_token_here" | jq
```

### Already Booked Seat
```bash
# Try to book the same seat twice
curl -X POST http://localhost:5000/reserve-seat \
  -H "Content-Type: application/json" \
  -H "x-app-id: $EVENT_APP_ID" \
  -H "x-api-key: $EVENT_API_KEY" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "seatId": "'"$SEAT_ID"'"
  }' | jq
```

---

## 11. CLEANUP (Reset Database)

```javascript
// MongoDB cleanup
mongosh booking_backend

db.apps.deleteMany({})
db.users.deleteMany({})
db.seats.deleteMany({})
db.reservations.deleteMany({})
db.bookings.deleteMany({})
```

```bash
# Redis cleanup
redis-cli FLUSHALL
```

---

## Tips

1. **Pretty Print JSON**: Pipe all responses through `| jq` for formatted output
2. **Save Tokens**: Export tokens as environment variables for easier testing
3. **Watch Logs**: Keep server logs visible to see authentication flow
4. **Test Timeouts**: Wait 2+ minutes after reservation to test expiry
5. **Parallel Requests**: Use `&` in bash to test race conditions

---

## Success Indicators

- ✅ Admin can create apps
- ✅ Users can register/login
- ✅ Seats can be listed and filtered
- ✅ Reservations acquire Redis locks
- ✅ Only ONE user can reserve a seat at a time
- ✅ Booking creates MongoDB transaction
- ✅ Released seats become available again
- ✅ Admin can view all bookings

---

**Happy Testing! 🚀**
