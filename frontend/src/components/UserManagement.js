import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Alert,
  Chip,
  Avatar,
} from '@mui/material';
import {
  People,
  AdminPanelSettings,
  Person,
} from '@mui/icons-material';
import api from '../services/api';

function UserManagement() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (err) {
      setError('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Container>
        <Typography>Lade Benutzer...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('users.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Übersicht aller registrierten Benutzer
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('users.username')}</TableCell>
                <TableCell>{t('users.email')}</TableCell>
                <TableCell>{t('users.role')}</TableCell>
                <TableCell>{t('users.createdAt')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                      <Typography variant="body1" fontWeight="medium">
                        {user.username}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role === 'admin' ? t('users.admin') : t('users.user')}
                      color={user.role === 'admin' ? 'secondary' : 'default'}
                      size="small"
                      icon={user.role === 'admin' ? <AdminPanelSettings /> : <People />}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(user.created_at)}
                    </Typography>
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
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Hinweis:</strong> Hier werden alle registrierten Benutzer angezeigt. 
            Erweiterte Benutzerverwaltung (Bearbeitung, Löschen, Rollen ändern) kann in 
            zukünftigen Versionen hinzugefügt werden.
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}

export default UserManagement;