// frontend/src/components/AdminInterface.js
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
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
  CloudDownload,
  FolderOpen,
  Backup,
  CloudUpload,
  GetApp,
  RestorePage,
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
  const { t } = useLanguage();
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
    newPassword: '',
  });
  
  // Password Change States
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
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

  // Calibre Import States
  const [calibreDialog, setCalibreDialog] = useState(false);
  const [calibrePath, setCalibrePath] = useState('');
  const [calibreImporting, setCalibreImporting] = useState(false);
  const [calibreResult, setCalibreResult] = useState(null);

  // Backup/Restore States
  const [backups, setBackups] = useState([]);
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreOptions, setRestoreOptions] = useState({
    replaceAll: false,
    preserveUsers: true,
    preserveCategories: false
  });
  const [restoreUploading, setRestoreUploading] = useState(false);

  const iconOptions = [
    'folder', 'auto_stories', 'school', 'article', 'science', 
    'engineering', 'restaurant', 'sports_esports', 'music_note', 
    'palette', 'business', 'health_and_safety', 'travel_explore',
    'history_edu', 'psychology', 'child_care', 'nature', 'computer'
  ];

  useEffect(() => {
    loadUsers();
    loadCategories();
    loadBackups();
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
      newPassword: '',
    });
    setEditUserDialog(true);
  };

  const handleSaveUser = async () => {
    try {
      // Update user info
      await api.put(`/api/users/${selectedUser.id}`, {
        role: userFormData.role,
        is_active: userFormData.is_active,
        must_change_password: userFormData.must_change_password,
      });

      // Update password if provided
      if (userFormData.newPassword && userFormData.newPassword.length >= 6) {
        await api.put(`/api/users/${selectedUser.id}/password`, {
          newPassword: userFormData.newPassword,
        });
      }

      setSuccess('Benutzer erfolgreich aktualisiert');
      setEditUserDialog(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Aktualisieren des Benutzers');
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

  const handlePasswordChange = async () => {
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setError('Neue Passwörter stimmen nicht überein');
      return;
    }

    if (passwordFormData.newPassword.length < 6) {
      setError('Das neue Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    try {
      const response = await api.post('/api/auth/change-password', {
        currentPassword: passwordFormData.currentPassword,
        newPassword: passwordFormData.newPassword,
      });

      // Update token if provided
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }

      setSuccess('Passwort erfolgreich geändert');
      setPasswordDialog(false);
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Ändern des Passworts');
    }
  };

  const handleCalibreImport = async () => {
    if (!calibrePath.trim()) {
      setError('Bitte geben Sie den Pfad zu Ihrer Calibre-Bibliothek ein');
      return;
    }

    try {
      setCalibreImporting(true);
      setError('');
      setCalibreResult(null);

      const response = await api.post('/api/calibre/import', {
        calibrePath: calibrePath.trim()
      });

      setCalibreResult(response.data);
      setSuccess(`Import erfolgreich: ${response.data.imported} Bücher importiert`);
      
      // Clear the path after successful import
      setCalibrePath('');
      
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Calibre-Import');
    } finally {
      setCalibreImporting(false);
    }
  };

  const resetCalibreDialog = () => {
    setCalibreDialog(false);
    setCalibrePath('');
    setCalibreResult(null);
    setError('');
  };

  // Backup/Restore Functions
  const loadBackups = async () => {
    try {
      const response = await api.get('/api/backup/list');
      setBackups(response.data.backups);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupCreating(true);
      setError('');
      
      const response = await api.post('/api/backup/create');
      
      setSuccess(`Backup erfolgreich erstellt: ${response.data.backup.filename}`);
      await loadBackups(); // Reload backup list
      
    } catch (error) {
      console.error('Backup creation failed:', error);
      setError(error.response?.data?.error || 'Fehler beim Erstellen des Backups');
    } finally {
      setBackupCreating(false);
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      // Use axios with proper authentication headers instead of window.open
      const response = await api.get(`/api/backup/download/${filename}`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/zip'
        }
      });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Backup erfolgreich heruntergeladen');
    } catch (error) {
      console.error('Backup download failed:', error);
      setError(error.response?.data?.error || 'Fehler beim Herunterladen des Backups');
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Backup "${filename}" wirklich löschen?`)) {
      return;
    }

    try {
      await api.delete(`/api/backup/${filename}`);
      setSuccess('Backup erfolgreich gelöscht');
      await loadBackups(); // Reload backup list
    } catch (error) {
      console.error('Backup deletion failed:', error);
      setError(error.response?.data?.error || 'Fehler beim Löschen des Backups');
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) {
      setError('Bitte wählen Sie eine Backup-Datei aus');
      return;
    }

    try {
      setRestoreUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('backup', restoreFile);
      formData.append('replaceAll', restoreOptions.replaceAll.toString());
      formData.append('preserveUsers', restoreOptions.preserveUsers.toString());
      formData.append('preserveCategories', restoreOptions.preserveCategories.toString());

      const response = await api.post('/api/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(`Backup erfolgreich wiederhergestellt: ${response.data.result.restored_books} Bücher`);
      setRestoreDialog(false);
      setRestoreFile(null);
      
    } catch (error) {
      console.error('Backup restore failed:', error);
      setError(error.response?.data?.error || 'Fehler beim Wiederherstellen des Backups');
    } finally {
      setRestoreUploading(false);
    }
  };

  const resetRestoreDialog = () => {
    setRestoreDialog(false);
    setRestoreFile(null);
    setRestoreOptions({
      replaceAll: false,
      preserveUsers: true,
      preserveCategories: false
    });
    setError('');
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {t('admin.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('admin.description')}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Lock />}
            onClick={() => setPasswordDialog(true)}
          >
            {t('admin.changePassword')}
          </Button>
        </Box>
      </Box>

      <Paper elevation={2}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<People />} label={t('admin.tabUsers')} />
          <Tab icon={<Category />} label={t('admin.tabCategories')} />
          <Tab icon={<CloudDownload />} label={t('admin.tabCalibreImport')} />
          <Tab icon={<Backup />} label={t('admin.tabBackupRestore')} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* User Management */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{t('admin.userManagement')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {users.length} {t('admin.usersRegistered')}
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.tableUser')}</TableCell>
                  <TableCell>{t('admin.tableEmail')}</TableCell>
                  <TableCell>{t('admin.tableRole')}</TableCell>
                  <TableCell>{t('admin.tableStatus')}</TableCell>
                  <TableCell>{t('admin.tablePasswordChange')}</TableCell>
                  <TableCell>{t('admin.tableLastPasswordChange')}</TableCell>
                  <TableCell>{t('admin.tableRegistered')}</TableCell>
                  <TableCell align="right">{t('admin.tableActions')}</TableCell>
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
                        label={user.role === 'admin' ? t('admin.administrator') : t('admin.user')}
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

        <TabPanel value={tabValue} index={2}>
          {/* Calibre Import */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Calibre Import</Typography>
            <Button
              variant="contained"
              startIcon={<CloudDownload />}
              onClick={() => setCalibreDialog(true)}
            >
              Calibre-Bibliothek importieren
            </Button>
          </Box>

          <Typography variant="body1" paragraph>
            Importieren Sie Ihre bestehende Calibre-Bibliothek in Lectoria. 
            Unterstützte Formate: PDF und EPUB.
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Hinweis:</strong> Geben Sie den Pfad zu Ihrem Calibre-Bibliotheksordner an. 
            Dieser sollte die Datei "metadata.db" enthalten.
          </Alert>

          {calibreResult && (
            <Alert 
              severity={calibreResult.errors.length > 0 ? "warning" : "success"} 
              sx={{ mb: 2 }}
            >
              <strong>Import-Ergebnis:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>{calibreResult.imported} Bücher erfolgreich importiert</li>
                <li>{calibreResult.skipped} Bücher übersprungen (bereits vorhanden oder nicht unterstützt)</li>
                {calibreResult.errors.length > 0 && (
                  <li>{calibreResult.errors.length} Fehler aufgetreten</li>
                )}
              </ul>
              {calibreResult.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight="bold">Fehlerdetails:</Typography>
                  {calibreResult.errors.slice(0, 5).map((error, index) => (
                    <Typography key={index} variant="body2">• {error}</Typography>
                  ))}
                  {calibreResult.errors.length > 5 && (
                    <Typography variant="body2">... und {calibreResult.errors.length - 5} weitere</Typography>
                  )}
                </Box>
              )}
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Backup/Restore */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Backup & Restore
            </Typography>
            <Typography variant="body1" paragraph>
              Erstellen Sie vollständige Backups Ihrer Bibliothek oder stellen Sie aus einem Backup wieder her.
            </Typography>
          </Box>

          {/* Backup Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Backup erstellen</Typography>
                <Button
                  variant="contained"
                  startIcon={<Backup />}
                  onClick={handleCreateBackup}
                  disabled={backupCreating}
                >
                  {backupCreating ? 'Wird erstellt...' : 'Backup erstellen'}
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Erstellt eine vollständige ZIP-Datei mit allen Büchern, Metadaten, Benutzern und Kategorien.
              </Typography>
            </CardContent>
          </Card>

          {/* Restore Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Backup wiederherstellen</Typography>
                <Button
                  variant="outlined"
                  startIcon={<RestorePage />}
                  onClick={() => setRestoreDialog(true)}
                >
                  Wiederherstellen
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Stellt Daten aus einem Lectoria-Backup wieder her.
              </Typography>
            </CardContent>
          </Card>

          {/* Backup List */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Verfügbare Backups
              </Typography>
              
              {backups.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  Keine Backups vorhanden
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Dateiname</TableCell>
                        <TableCell>Erstellt am</TableCell>
                        <TableCell>Größe</TableCell>
                        <TableCell>Aktionen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.filename}>
                          <TableCell>{backup.filename}</TableCell>
                          <TableCell>{formatDate(backup.created_at)}</TableCell>
                          <TableCell>
                            {(backup.size / 1024 / 1024).toFixed(1)} MB
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Herunterladen">
                              <IconButton 
                                onClick={() => handleDownloadBackup(backup.filename)}
                                size="small"
                              >
                                <GetApp />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Löschen">
                              <IconButton 
                                onClick={() => handleDeleteBackup(backup.filename)}
                                size="small"
                                color="error"
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
              )}
            </CardContent>
          </Card>
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

            <TextField
              fullWidth
              type="password"
              label="Neues Passwort (optional)"
              value={userFormData.newPassword}
              onChange={(e) => setUserFormData({ ...userFormData, newPassword: e.target.value })}
              helperText="Leer lassen, um das Passwort nicht zu ändern. Mindestens 6 Zeichen für neues Passwort."
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

      {/* Password Change Dialog */}
      <Dialog
        open={passwordDialog}
        onClose={() => setPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock />
            Passwort ändern
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              type="password"
              label="Aktuelles Passwort"
              value={passwordFormData.currentPassword}
              onChange={(e) => setPasswordFormData({
                ...passwordFormData,
                currentPassword: e.target.value
              })}
              required
            />
            <TextField
              fullWidth
              type="password"
              label="Neues Passwort"
              value={passwordFormData.newPassword}
              onChange={(e) => setPasswordFormData({
                ...passwordFormData,
                newPassword: e.target.value
              })}
              required
              helperText="Mindestens 6 Zeichen"
            />
            <TextField
              fullWidth
              type="password"
              label="Neues Passwort bestätigen"
              value={passwordFormData.confirmPassword}
              onChange={(e) => setPasswordFormData({
                ...passwordFormData,
                confirmPassword: e.target.value
              })}
              required
              error={passwordFormData.confirmPassword && 
                     passwordFormData.newPassword !== passwordFormData.confirmPassword}
              helperText={passwordFormData.confirmPassword && 
                         passwordFormData.newPassword !== passwordFormData.confirmPassword ? 
                         "Passwörter stimmen nicht überein" : ""}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialog(false);
            setPasswordFormData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
          }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handlePasswordChange} 
            variant="contained"
            disabled={!passwordFormData.currentPassword || 
                     !passwordFormData.newPassword || 
                     !passwordFormData.confirmPassword ||
                     passwordFormData.newPassword !== passwordFormData.confirmPassword}
          >
            Passwort ändern
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

      {/* Calibre Import Dialog */}
      <Dialog
        open={calibreDialog}
        onClose={resetCalibreDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudDownload />
          Calibre-Bibliothek importieren
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Anweisungen:</strong>
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Geben Sie den vollständigen Pfad zu Ihrem Calibre-Bibliotheksordner ein</li>
                <li>Der Ordner sollte die Datei "metadata.db" enthalten</li>
                <li>Nur PDF- und EPUB-Dateien werden importiert</li>
                <li>Bereits vorhandene Bücher (gleicher Titel + Autor) werden übersprungen</li>
              </ul>
            </Alert>

            <TextField
              fullWidth
              label="Calibre-Bibliothek Pfad"
              value={calibrePath}
              onChange={(e) => setCalibrePath(e.target.value)}
              placeholder="/home/user/Calibre Library"
              helperText="Beispiel: /home/user/Calibre Library oder C:\Users\User\Calibre Library"
              InputProps={{
                startAdornment: <FolderOpen sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              disabled={calibreImporting}
            />

            {calibreResult && (
              <Alert 
                severity={calibreResult.errors.length > 0 ? "warning" : "success"}
              >
                <Typography variant="body2">
                  <strong>Import abgeschlossen:</strong>
                </Typography>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>{calibreResult.imported} Bücher erfolgreich importiert</li>
                  <li>{calibreResult.skipped} Bücher übersprungen</li>
                  {calibreResult.errors.length > 0 && (
                    <li>{calibreResult.errors.length} Fehler</li>
                  )}
                </ul>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetCalibreDialog} disabled={calibreImporting}>
            {calibreResult ? 'Schließen' : 'Abbrechen'}
          </Button>
          <Button
            variant="contained"
            onClick={handleCalibreImport}
            disabled={calibreImporting || !calibrePath.trim()}
            startIcon={calibreImporting ? <CloudDownload /> : <CloudDownload />}
          >
            {calibreImporting ? 'Importiere...' : 'Import starten'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog 
        open={restoreDialog} 
        onClose={resetRestoreDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Backup wiederherstellen
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" paragraph>
              Wählen Sie eine Backup-ZIP-Datei aus, um Ihre Bibliothek wiederherzustellen.
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Achtung:</strong> Das Wiederherstellen kann bestehende Daten überschreiben. 
              Erstellen Sie zuerst ein Backup Ihrer aktuellen Daten.
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Backup-Datei auswählen
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                sx={{ mb: 2 }}
              >
                ZIP-Datei auswählen
                <input
                  type="file"
                  hidden
                  accept=".zip"
                  onChange={(e) => setRestoreFile(e.target.files[0])}
                />
              </Button>
              {restoreFile && (
                <Typography variant="body2" color="success.main">
                  ✓ {restoreFile.name} ({(restoreFile.size / 1024 / 1024).toFixed(1)} MB)
                </Typography>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Wiederherstellungsoptionen
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={restoreOptions.replaceAll}
                    onChange={(e) => setRestoreOptions(prev => ({ ...prev, replaceAll: e.target.checked }))}
                  />
                }
                label="Alle vorhandenen Bücher ersetzen"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 1 }}>
                Aktiviert: Löscht alle vorhandenen Bücher vor der Wiederherstellung
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={restoreOptions.preserveUsers}
                    onChange={(e) => setRestoreOptions(prev => ({ ...prev, preserveUsers: e.target.checked }))}
                  />
                }
                label="Benutzer beibehalten"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 1 }}>
                Aktiviert: Benutzer aus Backup werden nicht wiederhergestellt
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={restoreOptions.preserveCategories}
                    onChange={(e) => setRestoreOptions(prev => ({ ...prev, preserveCategories: e.target.checked }))}
                  />
                }
                label="Kategorien beibehalten"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                Aktiviert: Vorhandene Kategorien werden beibehalten
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetRestoreDialog}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleRestoreBackup}
            disabled={!restoreFile || restoreUploading}
            startIcon={restoreUploading ? <CloudUpload /> : <RestorePage />}
          >
            {restoreUploading ? 'Wird wiederhergestellt...' : 'Wiederherstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminInterface;