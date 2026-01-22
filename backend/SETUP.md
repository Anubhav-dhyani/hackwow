# 🚀 Quick Setup Guide

## Prerequisites Installation

### 1. Install Node.js (v18+)
**Windows:**
- Download from https://nodejs.org/
- Run installer
- Verify: `node --version` and `npm --version`

**Mac/Linux:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. Install MongoDB

**Windows:**
- Download from https://www.mongodb.com/try/download/community
- Run installer (install as a service)
- MongoDB will start automatically

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**Verify:**
```bash
mongosh
# Should connect to MongoDB shell
```

### 3. Install Redis

**Windows:**
- Download from https://github.com/microsoftarchive/redis/releases
- Or use WSL: `wsl --install` then follow Linux instructions

**Mac:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Verify:**
```bash
redis-cli ping
# Should return: PONG
```

---

## Project Setup

### Step 1: Install Dependencies
```bash
cd hackwow
npm install
```

### Step 2: Environment Configuration
The `.env` file is already configured with development settings. If you need to modify:

```bash
# MongoDB (default is fine for local development)
MONGODB_URI=mongodb://localhost:27017/booking_backend

# Redis (default is fine for local development)
REDIS_HOST=localhost
REDIS_PORT=6379

# Admin credentials (you can change these)
ADMIN_EMAIL=admin@booking-backend.com
ADMIN_PASSWORD=admin123
```

### Step 3: Start the Server
```bash
npm start
```

You should see:
```
✅ MongoDB connected successfully
✅ Redis connected successfully
✅ Server running on port 5000
```

---

## Verify Installation

### 1. Health Check
```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "status": "ok",
  "services": {
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

### 2. Admin Login
```bash
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@booking-backend.com","password":"admin123"}'
```

Should return a JWT token.

---

## Next Steps

1. **Read Architecture**: Open `ARCHITECTURE.md` to understand the system design
2. **Test APIs**: Follow `API_TESTING.md` for complete API testing guide
3. **Create Your First App**:
   ```bash
   # Login as admin
   # Create an app (frontend tenant)
   # Register users
   # Create seats in MongoDB
   # Start booking!
   ```

---

## Common Issues

### MongoDB Connection Error
```
❌ Failed to connect to MongoDB
```

**Solution:**
- Check if MongoDB is running: `sudo systemctl status mongodb` (Linux) or `brew services list` (Mac)
- Start MongoDB: `brew services start mongodb-community` (Mac) or `sudo systemctl start mongodb` (Linux)

### Redis Connection Error
```
❌ Failed to connect to Redis
```

**Solution:**
- Check if Redis is running: `redis-cli ping`
- Start Redis: `brew services start redis` (Mac) or `sudo systemctl start redis` (Linux)

### Port 5000 Already in Use
```
Error: Port 5000 is already in use
```

**Solution:**
- Change port in `.env`: `PORT=5001`
- Or kill the process: `lsof -ti:5000 | xargs kill -9` (Mac/Linux)

---

## Development Mode

For auto-reload on code changes:
```bash
npm run dev
```

This uses `nodemon` to watch for file changes.

---

## Production Deployment

### 1. Update Environment Variables
```bash
# Generate secure JWT secrets (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env
JWT_SECRET_ADMIN=<generated_secret>
JWT_SECRET_USER=<generated_secret>
ADMIN_PASSWORD=<strong_password>
```

### 2. Use Production MongoDB
```bash
# MongoDB Atlas or your production instance
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/booking_backend
```

### 3. Use Production Redis
```bash
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### 4. Configure CORS
```bash
# Set specific allowed origins
CORS_ORIGIN=https://your-event-app.com,https://your-bus-app.com,https://your-movie-app.com
```

### 5. Set Environment
```bash
NODE_ENV=production
```

---

## Stopping Services

### Stop Backend
```bash
# Press Ctrl+C in terminal where server is running
```

### Stop MongoDB
```bash
# Mac
brew services stop mongodb-community

# Linux
sudo systemctl stop mongodb
```

### Stop Redis
```bash
# Mac
brew services stop redis

# Linux
sudo systemctl stop redis
```

---

## Database Management

### View MongoDB Data
```bash
mongosh booking_backend

# List collections
show collections

# View apps
db.apps.find().pretty()

# View users
db.users.find().pretty()

# View seats
db.seats.find().pretty()

# View bookings
db.bookings.find().pretty()
```

### View Redis Data
```bash
redis-cli

# List all keys
KEYS *

# View a specific lock
GET seat:lock:<seat_id>

# View all seat locks
KEYS seat:lock:*

# Clear all data (careful!)
FLUSHALL
```

---

## Useful Commands

### Check Service Status
```bash
# MongoDB
mongosh --eval "db.runCommand({ ping: 1 })"

# Redis
redis-cli ping

# Backend
curl http://localhost:5000/health
```

### View Logs
```bash
# Server logs are output to console
# In production, use a logging service (e.g., PM2, Winston)
```

### Reset Everything
```bash
# Stop server (Ctrl+C)

# Clear MongoDB
mongosh booking_backend --eval "db.dropDatabase()"

# Clear Redis
redis-cli FLUSHALL

# Restart server
npm start
```

---

## Success Checklist

- [ ] Node.js v18+ installed
- [ ] MongoDB installed and running
- [ ] Redis installed and running
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Server starts successfully
- [ ] Health check passes
- [ ] Admin login works

---

**You're ready to build! 🎉**

See [README.md](./README.md) for complete API documentation and [API_TESTING.md](./API_TESTING.md) for testing examples.
