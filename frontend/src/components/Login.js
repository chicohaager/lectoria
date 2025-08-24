import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Tab,
  Tabs,
  Divider,
} from '@mui/material';
import { LibraryBooks } from '@mui/icons-material';
import api from '../services/api';
import PasswordChangeDialog from './PasswordChangeDialog';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Login({ onLogin }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState(0);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', loginForm);
      console.log('Login response:', response.data); // Debug log
      
      // Check if password change is required
      if (response.data.user.must_change_password) {
        setCurrentUser(response.data.user);
        setShowPasswordChange(true);
        // Store token temporarily for password change
        localStorage.setItem('tempToken', response.data.token);
      } else {
        onLogin(response.data.user, response.data.token);
      }
    } catch (err) {
      console.error('Login error:', err); // Debug log
      setError(err.response?.data?.error || 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/register', registerForm);
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeComplete = (success) => {
    if (success) {
      // Remove temporary token and complete login
      const tempToken = localStorage.getItem('tempToken');
      localStorage.removeItem('tempToken');
      
      // Update user object to reflect password change
      const updatedUser = { ...currentUser, must_change_password: false };
      onLogin(updatedUser, tempToken);
      setShowPasswordChange(false);
      setCurrentUser(null);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Lectoria Logo"
              sx={{ 
                width: 64, 
                height: 64, 
                mb: 2,
                borderRadius: 2,
              }}
              onError={(e) => {
                // Fallback to icon if logo fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <LibraryBooks sx={{ fontSize: 60, color: 'primary.main', mb: 2, display: 'none' }} />
            <Typography component="h1" variant="h4" gutterBottom>
              Lectoria
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Ihre digitale Bibliothek für Bücher und Magazine
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.75rem' }}>
              by <a href="https://github.com/chicohaager" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>@chicohaager</a>
            </Typography>
          </Box>

          <Divider />

          <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} centered>
            <Tab label={t('login.title')} />
            <Tab label={t('login.registerTitle')} />
          </Tabs>

          {error && (
            <Box sx={{ p: 3, pb: 0 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}

          <TabPanel value={tab} index={0}>
            <Box component="form" onSubmit={handleLogin}>
              <TextField
                margin="normal"
                required
                fullWidth
                label={t('login.username')}
                autoComplete="username"
                autoFocus
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label={t('login.password')}
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
                size="large"
              >
                {loading ? `${t('login.loginButton')}...` : t('login.loginButton')}
              </Button>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Standard Admin: admin / admin123
              </Typography>
            </Box>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Box component="form" onSubmit={handleRegister}>
              <TextField
                margin="normal"
                required
                fullWidth
                label={t('login.username')}
                autoComplete="username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label={t('login.email')}
                type="email"
                autoComplete="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label={t('login.password')}
                type="password"
                autoComplete="new-password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
                size="large"
              >
                {loading ? `${t('login.registerButton')}...` : t('login.registerButton')}
              </Button>
            </Box>
          </TabPanel>
        </Paper>
        
        {/* Password Change Dialog */}
        {showPasswordChange && currentUser && (
          <PasswordChangeDialog
            open={showPasswordChange}
            onClose={handlePasswordChangeComplete}
            required={true}
            tempToken={localStorage.getItem('tempToken')}
          />
        )}
      </Box>
    </Container>
  );
}

export default Login;