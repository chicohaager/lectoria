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

function PasswordChangeDialog({ open, onClose, required = false }) {
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
    // Validation
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

    if (formData.currentPassword === formData.newPassword) {
      setError('Das neue Passwort muss sich vom aktuellen unterscheiden');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      // Update token and user data if provided
      if (response.data.token && response.data.user) {
        console.log('Password change successful, updating token and user data:', response.data.user);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }

      // Success - close dialog and notify parent
      console.log('Closing password dialog with success');
      onClose(true, response.data.user);

      // Force page reload to avoid state issues
      if (response.data.redirect) {
        setTimeout(() => {
          window.location.href = response.data.redirect;
        }, 100);
      }
      
      // Reset form
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

  const handleClose = () => {
    if (!required) {
      onClose(false);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setError('');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <Box sx={{ pt: 2 }}>
          {required && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Sie müssen Ihr Passwort ändern, bevor Sie fortfahren können.
              Bitte wählen Sie ein sicheres neues Passwort.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tipps für ein sicheres Passwort:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Verwenden Sie mindestens 6 Zeichen<br />
              • Kombinieren Sie Buchstaben, Zahlen und Sonderzeichen<br />
              • Verwenden Sie keine persönlichen Informationen<br />
              • Verwenden Sie für jeden Dienst ein eigenes Passwort
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        {!required && (
          <Button onClick={handleClose} disabled={loading}>
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