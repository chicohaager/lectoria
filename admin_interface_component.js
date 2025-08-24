// frontend/src/components/AdminInterface.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Avatar,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Fab,
  Snackbar,
} from '@mui/material';
import {
  People,
  AdminPanelSettings,
  Edit,
  Delete,
  Add,
  Category,
  Lock,
  LockOpen,
  CheckCircle,
  Cancel,
  Person,
  ColorLens,
  Save,
  Close,
} from '@mui/icons-material';
import api from '../services/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
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

  const iconOptions = [
    'folder', 'auto_stories', 'school', 'article', 'science', 
    'engineering', 'restaurant', 'sports_esports', 'music_note', 
    'palette', 'business', 'health_and_safety', 'travel_explore',
    'history_edu', 'psychology', 'child_care', 'nature', 'computer'
  ];

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

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon,
    });
    setCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (selectedCategory) {
        await api.put(`/api/categories/${selectedCategory.id}`, categoryFormData);
        setSuccess('Kategorie erfolgreich aktualisiert');
      } else {
        await api.post('/api/categories', categoryFormData);
        setSuccess('Kategorie erfolgreich erstellt');
      }
      setCategoryDialog(false);
      setSelectedCategory(null);
      setCategoryFormData({
        name: '',
        description: '',
        color: '#1976d2',
        icon: 'folder',
      });
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern der Kategorie');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Möchten Sie diese Kategorie wirklich löschen? Bücher in dieser Kategorie werden nicht gelöscht.')) {
      return;
    }
    
    try {
      await api.delete(`/api/categories/${categoryId}`);
      setSuccess('Kategorie erfolgreich gelöscht');
      loadCategories();
    } catch (err) {
      setError('Fehler beim Löschen der Kategorie');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin-Verwaltung
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Verwalten Sie Benutzer und Kategorien
        </Typography>
      </Box>

      <Paper elevation={2}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<People />} label="Benutzer" />
          <Tab icon={<Category />} label="Kategorien" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* User Management */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Benutzerverwaltung</Typography>
            <Typography variant="body2" color="text.secondary">
              {users.length} Benutzer registriert
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Benutzer</TableCell>
                  <TableCell>E-Mail</TableCell>
                  <TableCell>Rolle</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Passwort-Änderung</TableCell>
                  <TableCell>Letzte Passwortänderung</TableCell>
                  <TableCell>Registriert</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ 
                          bgcolor: user.role === 'admin' ? 'secondary.main' : 'primary.main',
                          width: 32,
                          height: 32,
                        }}>
                          {user.role === 'admin' ? (
                            <AdminPanelSettings fontSize="small" />
                          ) : (
                            <Person fontSize="small" />
                          )}
                        </Avatar>
                        <Typography variant="body2" fontWeight="medium">
                          {user.username}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                        color={user.role === 'admin' ? 'secondary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={user.is_active ? <CheckCircle /> : <Cancel />}
                        label={user.is_active ? 'Aktiv' : 'Gesperrt'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.must_change_password ? (
                        <Chip
                          icon={<Lock />}
                          label="Erforderlich"
                          color="warning"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<LockOpen />}
                          label="Nicht erforderlich"
                          color="default"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(user.last_password_change)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(user.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Bearbeiten">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.username === 'admin'}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {users.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <People sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Keine Benutzer gefunden
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Category Management */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Kategorienverwaltung</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setSelectedCategory(null);
                setCategoryFormData({
                  name: '',
                  description: '',
                  color: '#1976d2',
                  icon: 'folder',
                });
                setCategoryDialog(true);
              }}
            >
              Neue Kategorie
            </Button>
          </Box>

          <Grid container spacing={2}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: category.color,
                          mr: 2,
                        }}
                      >
                        <Box
                          component="span"
                          className="material-icons"
                        >
                          {category.icon}
                        </Box>
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{category.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {category.description || 'Keine Beschreibung'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <IconButton
                      size="small"
                      onClick={() => handleEditCategory(category)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {categories.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Category sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Keine Kategorien vorhanden
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Erstellen Sie Ihre erste Kategorie, um Bücher zu organisieren
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* Edit User Dialog */}
      <Dialog
        open={editUserDialog}
        onClose={() => setEditUserDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Benutzer bearbeiten: {selectedUser?.username}
        </DialogTitle>
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

      {/* Category Dialog */}
      <Dialog
        open={categoryDialog}
        onClose={() => setCategoryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Beschreibung"
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Farbe"
                type="color"
                value={categoryFormData.color}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                sx={{ width: 100 }}
                InputLabelProps={{ shrink: true }}
              />

              <FormControl fullWidth>
                <InputLabel>Icon</InputLabel>
                <Select
                  value={categoryFormData.icon}
                  label="Icon"
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                >
                  {iconOptions.map((icon) => (
                    <MenuItem key={icon} value={icon}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span" className="material-icons" sx={{ color: categoryFormData.color }}>
                          {icon}
                        </Box>
                        <span>{icon}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: categoryFormData.color }}>
                <Box component="span" className="material-icons">
                  {categoryFormData.icon}
                </Box>
              </Avatar>
              <Box>
                <Typography variant="subtitle1">{categoryFormData.name || 'Kategoriename'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {categoryFormData.description || 'Kategoriebeschreibung'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={handleSaveCategory} 
            variant="contained"
            disabled={!categoryFormData.name}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

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

export default AdminInterface;