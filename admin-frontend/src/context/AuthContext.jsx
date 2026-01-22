import { createContext, useState, useContext, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('adminToken');
    const username = localStorage.getItem('adminUsername');
    if (token && username) {
      setUser({ username, token });
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await adminAPI.login(credentials);
      const { token, admin } = response.data.data;
      
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUsername', admin.username);
      
      setUser({ username: admin.username, token });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
