import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  Box, 
} from '@mui/material';

import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/EnhancedDashboard';
import BookUpload from './components/EnhancedBookUpload';
import UserManagement from './components/UserManagement';
import SharedBook from './components/SharedBook';
import ErrorBoundary from './components/ErrorBoundary';
import AdminInterface from './components/AdminInterface';
import PasswordChangeDialog from './components/PasswordChangeDialog';
import AccessibilityHelper from './components/AccessibilityHelper';
import api from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Validate token by making a test request
      api.get('/api/books')
        .then(() => {
          const userData = JSON.parse(localStorage.getItem('user'));
          setUser(userData);
          // Check if password change is required
          if (userData?.must_change_password) {
            setPasswordChangeRequired(true);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    
    // Check if password change is required
    if (userData.must_change_password) {
      setPasswordChangeRequired(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setPasswordChangeRequired(false);
  };

  const handlePasswordChanged = (success, updatedUser) => {
    console.log('handlePasswordChanged called:', { success, updatedUser });
    if (success) {
      setPasswordChangeRequired(false);
      // Update user data if provided, otherwise just set must_change_password to false
      if (updatedUser) {
        console.log('Setting updated user:', updatedUser);
        setUser(updatedUser);
        // Token and localStorage are already updated in PasswordChangeDialog
      } else {
        const newUser = { ...user, must_change_password: false };
        console.log('Setting new user:', newUser);
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
      }
    }
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
      >
        Lade...
      </Box>
    );
  }

  // Show login if no user
  if (!user) {
    return (
      <ErrorBoundary>
        <AccessibilityHelper />
        <Router>
          <Routes>
            <Route path="/share/:token" element={<SharedBook />} />
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    );
  }

  // Show main app if user is logged in
  return (
    <ErrorBoundary>
      <AccessibilityHelper />
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/share/:token" element={<SharedBook />} />
          
          {/* Protected routes */}
          <Route path="*" element={
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              {/* Password Change Dialog - Required */}
              <PasswordChangeDialog
                open={passwordChangeRequired}
                onClose={handlePasswordChanged}
                required={passwordChangeRequired}
              />
              
              <Navbar user={user} onLogout={handleLogout} />
              <Box component="main" sx={{ flexGrow: 1, p: 3 }} id="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/app" element={<Dashboard />} />
                  <Route path="/upload" element={<BookUpload />} />
                  {user.role === 'admin' && (
                    <>
                      <Route path="/users" element={<UserManagement />} />
                      <Route path="/admin" element={<AdminInterface />} />
                    </>
                  )}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Box>
            </Box>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;