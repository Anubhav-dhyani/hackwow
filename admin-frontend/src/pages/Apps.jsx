import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import Layout from '../components/Layout';

const Apps = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: 'EVENT',
    allowedDomains: '',
  });

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const response = await adminAPI.listApps();
      setApps(response.data.data.apps);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    try {
      const appData = {
        ...formData,
        allowedDomains: formData.allowedDomains.split(',').map(d => d.trim()).filter(Boolean),
      };
      const response = await adminAPI.createApp(appData);
      alert(`App created successfully!\n\nApp ID: ${response.data.data.app.appId}\nAPI Key: ${response.data.data.apiKey}\n\nSave this API key - it won't be shown again!`);
      setShowModal(false);
      setFormData({ name: '', domain: 'EVENT', allowedDomains: '' });
      loadApps();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create app');
    }
  };

  const handleRotateKey = async (appId) => {
    if (!confirm('Are you sure? The old API key will stop working immediately.')) return;
    
    try {
      const response = await adminAPI.rotateApiKey(appId);
      alert(`New API Key: ${response.data.data.newApiKey}\n\nSave this key - it won't be shown again!`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to rotate key');
    }
  };

  const handleToggleStatus = async (appId, currentStatus) => {
    try {
      await adminAPI.updateApp(appId, { isActive: !currentStatus });
      loadApps();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update app');
    }
  };

  const DomainBadge = ({ domain }) => {
    const colors = {
      EVENT: 'bg-purple-100 text-purple-800',
      BUS: 'bg-blue-100 text-blue-800',
      MOVIE: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[domain]}`}>
        {domain}
      </span>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Apps Management</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Create App
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">No apps yet. Create your first app!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apps.map((app) => (
              <div key={app._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{app.name}</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">{app.appId}</p>
                  </div>
                  <DomainBadge domain={app.domain} />
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-sm text-gray-600">Status: </span>
                    <span className={`text-sm font-medium ${app.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {app.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Allowed Domains: </span>
                    <span className="text-sm text-gray-900">
                      {app.allowedDomains.length > 0 ? app.allowedDomains.join(', ') : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Created: </span>
                    <span className="text-sm text-gray-900">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleToggleStatus(app.appId, app.isActive)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      app.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {app.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleRotateKey(app.appId)}
                    className="flex-1 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium hover:bg-yellow-200 transition-colors"
                  >
                    🔄 Rotate Key
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create App Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New App</h2>
              <form onSubmit={handleCreateApp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain Type
                  </label>
                  <select
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="EVENT">Event Booking</option>
                    <option value="BUS">Bus Booking</option>
                    <option value="MOVIE">Movie Booking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed Domains (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.allowedDomains}
                    onChange={(e) => setFormData({ ...formData, allowedDomains: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="http://localhost:3000, https://myapp.com"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Create App
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Apps;
