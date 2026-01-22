import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import Layout from '../components/Layout';

const Dashboard = () => {
  const [stats, setStats] = useState({ apps: 0, bookings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [appsRes, bookingsRes] = await Promise.all([
        adminAPI.listApps(),
        adminAPI.getBookings({ page: 1, limit: 1 })
      ]);
      
      setStats({
        apps: appsRes.data.data.apps.length,
        bookings: bookingsRes.data.data.total || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {loading ? '...' : value}
          </p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon="🚀"
            label="Total Apps"
            value={stats.apps}
            color="border-blue-500"
          />
          <StatCard
            icon="🎟️"
            label="Total Bookings"
            value={stats.bookings}
            color="border-green-500"
          />
          <StatCard
            icon="📊"
            label="System Status"
            value="Active"
            color="border-purple-500"
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/apps"
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div>
                <h3 className="font-medium text-gray-900">Manage Apps</h3>
                <p className="text-sm text-gray-600">Create and configure apps</p>
              </div>
              <span className="text-2xl">🚀</span>
            </a>
            <a
              href="/bookings"
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div>
                <h3 className="font-medium text-gray-900">View Bookings</h3>
                <p className="text-sm text-gray-600">Monitor all bookings</p>
              </div>
              <span className="text-2xl">🎟️</span>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
