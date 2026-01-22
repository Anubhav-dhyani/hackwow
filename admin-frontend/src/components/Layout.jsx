import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/apps', label: 'Apps', icon: '🚀' },
    { path: '/bookings', label: 'Bookings', icon: '🎟️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="flex items-center justify-center h-16 bg-gray-800">
          <h1 className="text-xl font-bold">🎫 Booking Admin</h1>
        </div>
        
        <nav className="mt-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 hover:bg-gray-800 transition-colors ${
                location.pathname === item.path ? 'bg-gray-800 border-r-4 border-blue-500' : ''
              }`}
            >
              <span className="text-2xl mr-3">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="text-sm font-medium">{user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 transition-colors"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {children}
      </div>
    </div>
  );
};

export default Layout;
