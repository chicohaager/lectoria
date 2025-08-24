// frontend/src/App.js - Integrierte Version mit allen neuen Features
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Menu, 
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Home,
  CloudUpload,
  People,
  Logout,
  Book,
  AdminPanelSettings,
  Person,
  Settings,
  Dashboard as DashboardIcon,
  Category,
  Lock,
  ViewList,
  GridView,
} from '@mui/icons-material';

// Import all components (these would be the actual component files)
import Login from './components/Login';
import SharedBook from './components/SharedBook';
import ErrorBoundary from './components/ErrorBoundary';
import api from './services/api';

// Import new components
import AdminInterface from './components/AdminInterface';
import PasswordChangeDialog from './components/PasswordChangeDialog';
import EnhancedDashboard from './components/EnhancedDashboard';
import EnhancedBookUpload from './components/EnhancedBookUpload';

// Enhanced Navbar Component with Admin Menu
function EnhancedNavbar({ user, onLogout }) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleClose();
  };

  return (
    <AppBar position="sticky" elevation={1}>
      <Toolbar>
        <Book sx={{ mr: 2 }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Lectoria - Digital Library
        </Typography>

        <Button
          color="inherit"
          startIcon={<Home />}
          onClick={() => navigate('/dashboard')}
        >
          Bibliothek
        </Button>

        <Button
          color="inherit"
          startIcon={<CloudUpload />}
          onClick={() => navigate('/upload')}
        >
          Upload
        </Button>

        {user?.role === 'admin' && (
          <Button
            color="inherit"
            startIcon={<AdminPanelSettings />}
            onClick={() => navigate('/admin')}
          >
            Admin
          </Button>
        )}

        <IconButton
          size="large"
          onClick={handleMenu}
          color="inherit"
          sx={{ ml: 2 }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
            {user?.username?.[0]?.toUpperCase()}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary={user?.username}
              secondary={user?.role === 'admin' ? 'Administrator' : 'Benutzer'}
            />
          </MenuItem>
          <Divider />
          
          <MenuItem onClick={() => handleNavigate('/settings')}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Einstellungen" />
          </MenuItem>

          <MenuItem onClick={() => handleNavigate('/change-password')}>
            <ListItemIcon>
              <Lock fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Passwort ändern" />
          </MenuItem>

          <Divider />

          <MenuItem onClick={onLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Abmelden" />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

// Welcome Dashboard for Overview
function WelcomeDashboard({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalCategories: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const booksResponse = await api.get('/api/books?limit=1');
      const categoriesResponse = await api.get('/api/categories');
      
      setStats({
        totalBooks: booksResponse.data.pagination.total,
        totalCategories: categoriesResponse.data.length,
        totalUsers: user?.role === 'admin' ? await loadUserCount() : 0,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadUserCount = async () => {
    try {
      const response = await api.get('/api/users');
      return response.data.length;
    } catch (err) {
      return 0;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Willkommen zurück, {user?.username}!
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            onClick={() => navigate('/dashboard')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Book />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.totalBooks}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bücher & Magazine
                  </Typography>
                </Box>
              </Box>
              <Button size="small" startIcon={<GridView />}>
                Zur Bibliothek
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            onClick={() => navigate('/upload')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <CloudUpload />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.totalCategories}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Kategorien
                  </Typography>
                </Box>
              </Box>
              <Button size="small" startIcon={<CloudUpload />}>
                Neues Buch hochladen
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {user?.role === 'admin' && (
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
              onClick={() => navigate('/admin')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <People />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{stats.totalUsers}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Benutzer
                    </Typography>
                  </Box>
                </Box>
                <Button size="small" startIcon={<AdminPanelSettings />}>
                  Admin-Bereich
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {user?.role === 'admin' && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Admin-Funktionen verfügbar:</strong> Sie können Benutzer verwalten, 
            Kategorien bearbeiten und haben erweiterte Rechte in der Bibliothek.
          </Typography>
        </Alert>
      )}
    </Container>
  );
}

// Settings Component
function Settings({ user }) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [success, setSuccess] = useState('');

  const handlePasswordChange = (success) => {
    setPasswordDialogOpen(false);
    if (success) {
      setSuccess('Passwort erfolgreich geändert!');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Einstellungen
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Kontoinformationen
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Benutzername
              </Typography>
              <Typography variant="body1">{user?.username}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                E-Mail
              </Typography>
              <Typography variant="body1">{user?.email}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Rolle
              </Typography>
              <Typography variant="body1">
                {user?.role === 'admin' ? 'Administrator' : 'Benutzer'}
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<Lock />}
              onClick={() => setPasswordDialogOpen(true)}
            >
              Passwort ändern
            </Button>
          </Box>
        </Box>
      </Paper>

      <PasswordChangeDialog
        open={passwordDialogOpen}
        onClose={handlePasswordChange}
        required={false}
      />

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
}

// Main App Component
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
          delete api.defaults.headers.common['Authorization'];
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
  };

  const handlePasswordChanged = (success) => {
    if (success) {
      setPasswordChangeRequired(false);
      // Update user data to reflect password change
      const updatedUser = { ...user, must_change_password: false };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Laden...</Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
          {user && !passwordChangeRequired && (
            <EnhancedNavbar user={user} onLogout={handleLogout} />
          )}
          
          {/* Password Change Dialog - Required */}
          {user && passwordChangeRequired && (
            <PasswordChangeDialog
              open={passwordChangeRequired}
              onClose={handlePasswordChanged}
              required={true}
            />
          )}

          <Routes>
            {/* Public Routes */}
            <Route path="/share/:token" element={<SharedBook />} />
            
            {/* Auth Routes */}
            {!user ? (
              <>
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            ) : (
              <>
                {/* Protected Routes */}
                <Route path="/" element={<WelcomeDashboard user={user} />} />
                <Route path="/dashboard" element={<EnhancedDashboard />} />
                <Route path="/upload" element={<EnhancedBookUpload />} />
                <Route path="/settings" element={<Settings user={user} />} />
                <Route path="/change-password" element={
                  <Settings user={user} />
                } />
                
                {/* Admin Routes */}
                {user.role === 'admin' && (
                  <Route path="/admin" element={<AdminInterface />} />
                )}
                
                {/* Redirect unknown routes */}
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </Box>
      </Router>
    </ErrorBoundary>
  );
}

export default App;