import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  MenuBook,
  Article,
  Visibility,
  CloudDownload,
} from '@mui/icons-material';
import axios from 'axios';

function SharedBook() {
  const { token } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadSharedBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadSharedBook = async () => {
    // Validate token format (basic check)
    if (!token || token.length < 10) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`/api/share/${token}`);
      setBook(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Freigabe-Link nicht gefunden oder inaktiv');
      } else if (err.response?.status === 410) {
        setError('Share link has expired');
      } else if (err.response?.status === 400) {
        setError('Invalid share link');
      } else {
        setError('Error loading shared book');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!book) return;
    
    setDownloading(true);
    try {
      const response = await axios.get(`/api/share/${token}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', book.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Fehler beim Herunterladen der Datei');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Lade geteiltes Buch...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Typography variant="body1" color="text.secondary">
            Der angeforderte Freigabe-Link ist nicht verfügbar oder abgelaufen.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Lectoria Logo"
            sx={{ 
              width: 48, 
              height: 48, 
              mr: 2,
              borderRadius: 2,
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'inline-block';
            }}
          />
          <MenuBook sx={{ fontSize: 48, color: 'primary.main', mr: 2, display: 'none' }} />
          <Typography variant="h4" component="h1">
            Lectoria
          </Typography>
        </Box>
        <Typography variant="h5" gutterBottom>
          Geteiltes Buch
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Öffentlich geteilt von {book.uploader_name || 'Unbekannt'}
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        <Card sx={{ display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar 
                sx={{ 
                  mr: 3, 
                  bgcolor: book.type === 'magazine' ? 'secondary.main' : 'primary.main',
                  width: 64,
                  height: 64
                }}
              >
                {book.type === 'magazine' ? <Article sx={{ fontSize: 32 }} /> : <MenuBook sx={{ fontSize: 32 }} />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" component="h1" gutterBottom>
                  {book.title}
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  von {book.author || 'Unbekannt'}
                </Typography>
                <Chip
                  label={book.type === 'magazine' ? 'Magazin' : 'Buch'}
                  color={book.type === 'magazine' ? 'secondary' : 'primary'}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>

            {book.description && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Beschreibung
                </Typography>
                <Typography variant="body1" paragraph>
                  {book.description}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Details
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Dateigröße
                  </Typography>
                  <Typography variant="body1">
                    {formatFileSize(book.file_size)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Format
                  </Typography>
                  <Typography variant="body1">
                    {book.filename.split('.').pop().toUpperCase()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Hochgeladen am
                  </Typography>
                  <Typography variant="body1">
                    {new Date(book.upload_date).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Zugriffe
                  </Typography>
                  <Typography variant="body1">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Visibility fontSize="small" />
                      {book.accessCount}
                    </Box>
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={downloading ? <CircularProgress size={20} /> : <CloudDownload />}
                onClick={handleDownload}
                disabled={downloading}
                sx={{ minWidth: 200 }}
              >
                {downloading ? 'Wird heruntergeladen...' : 'Herunterladen'}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Dateiname: {book.filename}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Paper>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Powered by Lectoria BookManager
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Created by <a href="https://github.com/chicohaager/lectoria" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>@chicohaager</a>
        </Typography>
      </Box>
    </Container>
  );
}

export default SharedBook;