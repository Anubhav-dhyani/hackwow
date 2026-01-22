# Unified Booking System

A complete booking management system with backend API and admin dashboard.

## Project Structure

```
hackwow/
├── backend/              # Node.js + Express backend
│   ├── src/
│   │   ├── config/      # Database & Redis configuration
│   │   ├── models/      # MongoDB models
│   │   ├── middleware/  # Authentication & validation
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utilities
│   ├── package.json
│   └── Documentation files
│
└── admin-frontend/       # React admin dashboard
    ├── src/
    │   ├── components/  # React components
    │   ├── context/     # Context providers
    │   ├── pages/       # Page components
    │   └── services/    # API client
    └── package.json
```

## Quick Start

### 1. Start Backend

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Redis
redis-server

# Terminal 3: Start Backend API
cd backend
npm install
npm start
```

Backend runs at: http://localhost:5000

### 2. Start Admin Frontend

```bash
# Terminal 4: Start Admin Dashboard
cd admin-frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

### 3. Login to Admin Dashboard

Open http://localhost:5173 and login with:
- Username: `admin`
- Password: `admin123`

## Features

### Backend API
- ✅ Three-layer authentication (Admin → App → User)
- ✅ Multi-tenant architecture (Event, Bus, Movie)
- ✅ Race-condition-free seat locking with Redis
- ✅ Complete booking flow (Reserve → Pay → Confirm)
- ✅ MongoDB transactions for data consistency
- ✅ 17 REST API endpoints

### Admin Dashboard
- ✅ Beautiful UI with React & Tailwind CSS
- ✅ Create and manage apps
- ✅ View all bookings with filters
- ✅ Rotate API keys
- ✅ Dashboard with statistics
- ✅ Responsive design

## Documentation

All detailed documentation is in the `backend/` folder:

- **ARCHITECTURE.md** - Complete system design (10,000+ words)
- **README.md** - API documentation and usage
- **SETUP.md** - Installation and troubleshooting
- **API_TESTING.md** - cURL examples for testing
- **QUICK_REFERENCE.md** - Quick commands and tips

## Technology Stack

**Backend:**
- Node.js + Express
- MongoDB (Mongoose)
- Redis
- JWT Authentication
- bcrypt, helmet, cors

**Frontend:**
- React 19
- Vite
- React Router
- Tailwind CSS
- Axios

## Default Credentials

**Admin Login:**
- Username: `admin`
- Password: `admin123`

## Next Steps

1. Create your first app in the admin dashboard
2. Use the app's API key to integrate with your frontend
3. Start creating seats and accepting bookings
4. Monitor bookings through the admin dashboard

## Support

For detailed setup instructions, troubleshooting, and API documentation, see the documentation files in the `backend/` folder.
