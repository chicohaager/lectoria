// frontend/src/components/Login.js
import React, { useState } from 'react';
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
            <Tab label="Anmelden" />
            <Tab label="Registrieren" />
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
                label="Benutzername"
                autoComplete="username"
                autoFocus
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Passwort"
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
                {loading ? 'Anmelden...' : 'Anmelden'}
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
                label="Benutzername"
                autoComplete="username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="E-Mail"
                type="email"
                autoComplete="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Passwort"
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
                {loading ? 'Registrieren...' : 'Registrieren'}
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

---

// frontend/src/components/Navbar.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  LibraryBooks,
  Dashboard,
  CloudUpload,
  People,
  AccountCircle,
} from '@mui/icons-material';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout();
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <Dashboard /> },
    { path: '/upload', label: 'Upload', icon: <CloudUpload /> },
  ];

  if (user.role === 'admin') {
    menuItems.push({ path: '/users', label: 'Benutzer', icon: <People /> });
    menuItems.push({ path: '/admin', label: 'Admin', icon: <AccountCircle /> });
  }

  return (
    <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0' }}>
      <Toolbar>
        <Box
          component="img"
          src="/logo.png"
          alt="Lectoria Logo"
          sx={{ 
            width: 32, 
            height: 32, 
            mr: 2,
            borderRadius: 1,
          }}
          onError={(e) => {
            // Fallback to icon if logo fails to load
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'inline-block';
          }}
        />
        <LibraryBooks sx={{ mr: 2, display: 'none' }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Lectoria
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
          {menuItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              variant={location.pathname === item.path ? 'outlined' : 'text'}
              sx={{
                backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={user.role === 'admin' ? 'Admin' : 'Benutzer'}
            size="small"
            color={user.role === 'admin' ? 'secondary' : 'default'}
            variant="outlined"
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          />
          
          <Button
            color="inherit"
            onClick={handleMenu}
            startIcon={<Avatar sx={{ width: 24, height: 24 }}><AccountCircle /></Avatar>}
          >
            {user.username}
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleLogout}>Abmelden</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;

---

// frontend/src/components/PasswordChangeDialog.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
} from '@mui/icons-material';
import api from '../services/api';

function PasswordChangeDialog({ open, onClose, required = false, tempToken = null }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    setError('');
  };

  const handleSubmit = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Alle Felder sind erforderlich');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Das neue Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Die neuen Passwörter stimmen nicht überein');
      return;
    }

    try {
      setLoading(true);
      
      // Use temporary token if provided
      const headers = {};
      if (tempToken) {
        headers['Authorization'] = `Bearer ${tempToken}`;
      }
      
      await api.post('/api/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      }, { headers });

      onClose(true);
      
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Ändern des Passworts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !required && onClose(false)}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={required}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock color="primary" />
          <Typography variant="h6">
            {required ? 'Passwort muss geändert werden' : 'Passwort ändern'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {required && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Sie müssen Ihr Passwort ändern, bevor Sie fortfahren können.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Aktuelles Passwort"
            type={showPassword.current ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={handleChange('currentPassword')}
            fullWidth
            required
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                    edge="end"
                  >
                    {showPassword.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Neues Passwort"
            type={showPassword.new ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={handleChange('newPassword')}
            fullWidth
            required
            helperText="Mindestens 6 Zeichen"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    edge="end"
                  >
                    {showPassword.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Neues Passwort bestätigen"
            type={showPassword.confirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            fullWidth
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    edge="end"
                  >
                    {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        {!required && (
          <Button onClick={() => onClose(false)} disabled={loading}>
            Abbrechen
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Wird geändert...' : 'Passwort ändern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PasswordChangeDialog;

---

// frontend/src/components/AdminInterface.js - Simple version
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  People,
  Edit,
  Delete,
  Add,
  Category,
} from '@mui/icons-material';
import api from '../services/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function AdminInterface() {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // User Management States
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    role: 'user',
    is_active: true,
    must_change_password: false,
  });
  
  // Category Management States
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    color: '#1976d2',
    icon: 'folder',
  });

  useEffect(() => {
    loadUsers();
    loadCategories();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (err) {
      setError('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (err) {
      setError('Fehler beim Laden der Kategorien');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserFormData({
      role: user.role,
      is_active: user.is_active === 1,
      must_change_password: user.must_change_password === 1,
    });
    setEditUserDialog(true);
  };

  const handleSaveUser = async () => {
    try {
      await api.put(`/api/users/${selectedUser.id}`, userFormData);
      setSuccess('Benutzer erfolgreich aktualisiert');
      setEditUserDialog(false);
      loadUsers();
    } catch (err) {
      setError('Fehler beim Aktualisieren des Benutzers');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }
    
    try {
      await api.delete(`/api/users/${userId}`);
      setSuccess('Benutzer erfolgreich gelöscht');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Löschen des Benutzers');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin-Verwaltung
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper elevation={2}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
        >
          <Tab icon={<People />} label="Benutzer" />
          <Tab icon={<Category />} label="Kategorien" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Benutzername</TableCell>
                  <TableCell>E-Mail</TableCell>
                  <TableCell>Rolle</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Registriert</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                        color={user.role === 'admin' ? 'secondary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Aktiv' : 'Gesperrt'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEditUser(user)}>
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.username === 'admin'}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6">Kategorien ({categories.length})</Typography>
          <Box sx={{ mt: 2 }}>
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                sx={{ m: 0.5, bgcolor: category.color + '20', color: category.color }}
              />
            ))}
          </Box>
        </TabPanel>
      </Paper>

      {/* Edit User Dialog */}
      <Dialog
        open={editUserDialog}
        onClose={() => setEditUserDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Benutzer bearbeiten: {selectedUser?.username}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Rolle</InputLabel>
              <Select
                value={userFormData.role}
                label="Rolle"
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
              >
                <MenuItem value="user">Benutzer</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={userFormData.is_active}
                  onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                />
              }
              label="Konto aktiv"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={userFormData.must_change_password}
                  onChange={(e) => setUserFormData({ ...userFormData, must_change_password: e.target.checked })}
                />
              }
              label="Passwortänderung bei nächster Anmeldung erforderlich"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserDialog(false)}>Abbrechen</Button>
          <Button onClick={handleSaveUser} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminInterface;