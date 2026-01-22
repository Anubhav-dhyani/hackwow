# 📘 Using frontend1 Template

## Overview

**frontend1** is a complete, ready-to-use booking frontend that demonstrates best practices for integrating with the booking backend API.

Clients can:
1. ✅ Use it as-is with their credentials
2. ✅ Customize branding and UI
3. ✅ Add custom features
4. ✅ Deploy to their own hosting

---

## Quick Start (3 Steps)

### Step 1: Get the Code

```bash
# Clone the repository
git clone https://github.com/vssemwal2004/frontend1.git
cd frontend1

# Install dependencies
npm install
```

---

### Step 2: Configure Your Credentials

Create/edit `.env` file in the root:

```env
# Backend API URL
VITE_API_BASE_URL=https://your-backend-api.com

# Your app credentials (from admin dashboard)
VITE_APP_ID=APP-your-app-id-here
VITE_API_KEY=sk_live_your_api_key_here
```

⚠️ **Important**: 
- Get credentials from admin dashboard
- Never commit `.env` to git (already in .gitignore)
- Use environment-specific files for production

---

### Step 3: Run the Application

```bash
# Development mode
npm run dev

# Open browser to http://localhost:3000
```

**That's it!** The frontend is now connected to the backend with your credentials. 🎉

---

## What's Included

### Features
- ✅ **User Authentication**: Signup and login
- ✅ **Event Listing**: Display available events
- ✅ **Seat Selection**: Interactive seat map
- ✅ **Reservation System**: 120-second countdown timer
- ✅ **Payment Flow**: Booking confirmation
- ✅ **My Bookings**: View booking history
- ✅ **Responsive Design**: Mobile-friendly
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Loading States**: Smooth UX

### Technologies Used
- **React 18**: UI framework
- **Vite**: Build tool (fast!)
- **React Router**: Navigation
- **Axios**: HTTP client
- **Tailwind CSS**: Styling
- **Lucide Icons**: Icon library

---

## File Structure

```
frontend1/
├── src/
│   ├── App.jsx                 # Main app component
│   ├── main.jsx               # Entry point
│   │
│   ├── components/
│   │   ├── common/            # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── booking/           # Booking components
│   │   │   ├── SeatSelection.jsx
│   │   │   ├── CountdownTimer.jsx
│   │   │   └── PaymentModal.jsx
│   │   └── auth/              # Auth components
│   │
│   ├── pages/
│   │   ├── HomePage.jsx       # Landing page
│   │   ├── EventsListPage.jsx # Event list
│   │   ├── EventDetailPage.jsx # Seat selection
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   └── BookingConfirmationPage.jsx
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx    # Auth state management
│   │   └── BookingContext.jsx # Booking state management
│   │
│   ├── services/
│   │   ├── apiClient.js       # ⭐ Axios instance with headers
│   │   ├── authService.js     # Auth API calls
│   │   └── bookingService.js  # Booking API calls
│   │
│   ├── config/
│   │   └── apiConfig.js       # API configuration
│   │
│   └── utils/
│       └── helpers.js         # Utility functions
│
├── .env                        # ⭐ Your credentials here
├── package.json
├── vite.config.js             # Vite configuration
└── tailwind.config.js         # Tailwind configuration
```

---

## Key Files to Understand

### 1. apiClient.js - Automatic Header Injection
```javascript
// src/services/apiClient.js

// This file automatically adds your credentials to every request
// YOU DON'T NEED TO CHANGE THIS!

const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL, // From .env
});

apiClient.interceptors.request.use((config) => {
  // Automatically adds these headers:
  config.headers['x-app-id'] = API_CONFIG.appId;      // From .env
  config.headers['x-api-key'] = API_CONFIG.apiKey;    // From .env
  config.headers['Authorization'] = `Bearer ${token}`; // From localStorage
  
  return config;
});
```

### 2. apiConfig.js - Configuration
```javascript
// src/config/apiConfig.js

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL,  // From .env
  appId: import.meta.env.VITE_APP_ID,          // From .env
  apiKey: import.meta.env.VITE_API_KEY,        // From .env
  timeout: 30000,
};

export const API_ENDPOINTS = {
  login: '/auth/login',
  signup: '/auth/signup',
  seats: '/seats',
  reserveSeat: '/reserve-seat',
  confirmBooking: '/confirm-booking',
  myBookings: '/my-bookings',
};
```

---

## Customization Guide

### 1. Change Branding

#### Colors (Tailwind CSS)
```javascript
// tailwind.config.js

module.exports = {
  theme: {
    extend: {
      colors: {
        // Change these to your brand colors!
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',  // ← Your primary color
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
};
```

#### Logo
```javascript
// src/components/common/Navbar.jsx

// Replace logo
<img src="/your-logo.png" alt="Your Brand" />
```

#### Favicon
```html
<!-- index.html -->
<link rel="icon" href="/your-favicon.ico" />
```

---

### 2. Add Custom Pages

```javascript
// src/App.jsx

import YourCustomPage from '@/pages/YourCustomPage';

<Routes>
  {/* Add your custom route */}
  <Route path="/custom" element={<YourCustomPage />} />
  
  {/* Existing routes */}
  <Route path="/events" element={<EventsListPage />} />
</Routes>
```

---

### 3. Customize Event Data

```javascript
// src/pages/EventsListPage.jsx

// Edit mock events to match your business
const MOCK_EVENTS = [
  {
    id: 'your-event-id',           // ← Must match entityId in backend
    name: 'Your Event Name',
    description: 'Event description',
    venue: 'Your Venue',
    date: '2026-06-15T19:00:00Z',
    category: 'Music',
    image: '/your-image.webp',
    price: { min: 50, max: 200 },
  },
  // Add more events...
];
```

⚠️ **Important**: Event `id` must match `entityId` of seats in backend database!

---

### 4. Modify Seat Layout

The seat layout is fetched from the backend, but you can customize the display:

```javascript
// src/components/booking/SeatSelection.jsx

// Customize how seats are displayed
<button className={`
  seat
  ${seat.status === 'AVAILABLE' ? 'bg-green-500' : ''}
  ${seat.status === 'RESERVED' ? 'bg-yellow-500' : ''}
  ${seat.status === 'BOOKED' ? 'bg-gray-400' : ''}
`}>
  {seat.seatNumber}
  <br />
  ${seat.price}
</button>
```

---

### 5. Add Payment Integration

```javascript
// src/components/booking/PaymentModal.jsx

const handlePayment = async () => {
  // Option 1: Mock payment (current)
  const paymentId = 'TEST-PAY-' + Date.now();
  
  // Option 2: Integrate Stripe
  const stripe = await loadStripe('your_stripe_key');
  const { paymentIntent } = await stripe.confirmCardPayment(/*...*/);
  const paymentId = paymentIntent.id;
  
  // Option 3: Integrate PayPal
  const order = await paypal.orders.create(/*...*/);
  const paymentId = order.id;
  
  // Then confirm with backend
  await completeBooking({ paymentId });
};
```

---

## Production Deployment

### Step 1: Create Production Environment

```bash
# .env.production
VITE_API_BASE_URL=https://api.yourproduction.com
VITE_APP_ID=APP-your-production-app-id
VITE_API_KEY=sk_live_your_production_key
```

### Step 2: Build for Production

```bash
npm run build

# Creates /dist folder with optimized files
```

### Step 3: Deploy

#### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Set environment variables
# - Connect to git repository
# - Auto-deploy on push
```

#### Option B: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Or connect via Netlify dashboard
# - Drag and drop /dist folder
# - Or connect git repository
```

#### Option C: Traditional Hosting
```bash
# Build the app
npm run build

# Upload /dist folder to your hosting:
# - Apache server → put in /var/www/html
# - Nginx → put in /usr/share/nginx/html
# - AWS S3 → sync to S3 bucket
```

---

## Environment Variables by Stage

### Development (.env)
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_ID=APP-dev-app-id
VITE_API_KEY=sk_test_dev_key
```

### Staging (.env.staging)
```env
VITE_API_BASE_URL=https://staging-api.yourdomain.com
VITE_APP_ID=APP-staging-app-id
VITE_API_KEY=sk_test_staging_key
```

### Production (.env.production)
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_ID=APP-prod-app-id
VITE_API_KEY=sk_live_prod_key
```

---

## Testing Your Deployment

### 1. Test Authentication
- Sign up with new account
- Verify email validation
- Login with created account
- Check JWT token in localStorage

### 2. Test Booking Flow
- View events list
- Click on event
- See available seats
- Reserve a seat
- Check countdown timer works
- Confirm booking
- View in "My Bookings"

### 3. Test Edge Cases
- Try booking same seat twice (should fail)
- Let reservation expire (120s)
- Try without login (should redirect)
- Test on mobile device
- Test with slow network

---

## Common Customizations

### Add Multiple Events

```javascript
// src/pages/EventsListPage.jsx

const MOCK_EVENTS = [
  {
    id: 'concert-2026',
    name: 'Rock Concert 2026',
    // ...
  },
  {
    id: 'jazz-night',
    name: 'Jazz Night',
    // ...
  },
  {
    id: 'comedy-show',
    name: 'Comedy Show',
    // ...
  },
];
```

Then create seats in backend:
```bash
# For each event, create seats with matching entityId
POST /admin/seed-data
{
  "appId": "APP-your-id",
  "entityId": "concert-2026",  # ← Must match event id
  "seats": [...]
}
```

---

### Add Filters/Search

```javascript
// src/pages/EventsListPage.jsx

const [searchTerm, setSearchTerm] = useState('');
const [category, setCategory] = useState('all');

const filteredEvents = events.filter(event => {
  const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesCategory = category === 'all' || event.category === category;
  return matchesSearch && matchesCategory;
});
```

---

### Add User Profile

```javascript
// Create new page: src/pages/ProfilePage.jsx

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  
  return (
    <div>
      <h1>My Profile</h1>
      <form onSubmit={handleUpdateProfile}>
        <input value={user.name} onChange={...} />
        <input value={user.email} onChange={...} />
        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
}
```

---

## Maintenance

### Updating Dependencies
```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install react@latest
```

### Monitoring
```bash
# Check bundle size
npm run build
# Look at dist/ folder size

# Analyze bundle
npm install -D vite-plugin-visualizer
# Add to vite.config.js
```

---

## Troubleshooting

### Issue: 401 Unauthorized
**Cause**: Wrong credentials or not sent
**Fix**: Check .env file has correct VITE_APP_ID and VITE_API_KEY

### Issue: CORS Error
**Cause**: Backend doesn't allow your domain
**Fix**: Add your domain to "Allowed Domains" in admin dashboard

### Issue: Seats Not Loading
**Cause**: No seats with matching entityId
**Fix**: Create seats in backend with same entityId as event id

### Issue: Reservation Expires Immediately
**Cause**: Server time mismatch
**Fix**: Check server timezone, ensure expiresAt is correctly calculated

---

## Support

### Documentation
- Backend API: `/docs/API_REFERENCE.md`
- Integration Guide: `/docs/CLIENT_INTEGRATION_GUIDE.md`

### Get Help
- Email: support@yourdomain.com
- Check admin dashboard logs
- Review browser console errors

---

## Summary

**frontend1** is a production-ready template that:
- ✅ Works out of the box with your credentials
- ✅ Can be customized for your brand
- ✅ Follows React best practices
- ✅ Handles all backend features correctly
- ✅ Ready to deploy to production

**Just configure .env and start customizing!** 🚀
