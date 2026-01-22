# Admin Frontend - Booking System

React admin dashboard for the Unified Booking Backend as a Service.

## Features

- 🔐 Admin authentication
- 🚀 Create and manage apps (Event, Bus, Movie)
- 🎟️ View and filter bookings
- 🔄 Rotate API keys
- 📊 Dashboard with statistics
- 🎨 Beautiful UI with Tailwind CSS

## Tech Stack

- React 19
- Vite
- React Router v6
- Tailwind CSS
- Axios

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Backend API running on http://localhost:5000

### Installation

```bash
cd admin-frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5173

### Default Credentials

```
Username: admin
Password: admin123
```

## Project Structure

```
admin-frontend/
├── src/
│   ├── components/
│   │   ├── Layout.jsx         # Main layout with sidebar
│   │   └── PrivateRoute.jsx   # Protected route wrapper
│   ├── context/
│   │   └── AuthContext.jsx    # Authentication context
│   ├── pages/
│   │   ├── Login.jsx          # Login page
│   │   ├── Dashboard.jsx      # Dashboard with stats
│   │   ├── Apps.jsx           # Apps management
│   │   └── Bookings.jsx       # Bookings list
│   ├── services/
│   │   └── api.js             # API client with axios
│   ├── App.jsx                # Main app with routes
│   ├── main.jsx               # Entry point
│   └── index.css              # Tailwind styles
├── package.json
└── vite.config.js
```

## Available Pages

- **/login** - Admin login
- **/dashboard** - Dashboard with statistics
- **/apps** - Create and manage apps
- **/bookings** - View all bookings with filters

## API Configuration

The API base URL is configured in `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000';
```

Change this if your backend runs on a different URL.

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Preview Production Build

```bash
npm run preview
```
