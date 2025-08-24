import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Alert,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import {
  MenuBook,
  Article,
  Download,
  Delete,
  Search,
  FilterList,
  Share,
  ContentCopy,
  Link,
  AccessTime,
  Visibility,
} from '@mui/icons-material';
import api from '../services/api';

function Dashboard() {
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, book: null });
  const [shareDialog, setShareDialog] = useState({ open: false, book: null });
  const [shareLinks, setShareLinks] = useState([]);
  const [newShareLink, setNewShareLink] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, searchTerm, filterType]);

  const loadBooks = async () => {
    try {
      const response = await api.get('/api/books', {
        params: {
          limit: 100, // Load more books by default for better UX
          search: searchTerm,
          type: filterType !== 'all' ? filterType : ''
        }
      });
      // Handle both old and new API response formats
      const booksData = response.data.books || response.data;
      setBooks(booksData);
    } catch (err) {
      setError('Fehler beim Laden der Bücher');
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    let filtered = books;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(book => book.type === filterType);
    }

    setFilteredBooks(filtered);
  };

  const handleDownload = async (book) => {
    try {
      const response = await api.get(`/api/books/${book.id}/download`, {
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
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/api/books/${deleteDialog.book.id}`);
      setBooks(books.filter(book => book.id !== deleteDialog.book.id));
      setDeleteDialog({ open: false, book: null });
    } catch (err) {
      setError('Fehler beim Löschen');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canDelete = (book) => {
    return currentUser.role === 'admin' || book.uploaded_by === currentUser.id;
  };

  const canShare = (book) => {
    return currentUser.role === 'admin' || book.uploaded_by === currentUser.id;
  };

  const handleShareOpen = async (book) => {
    setShareDialog({ open: true, book });
    setNewShareLink(null);
    
    try {
      const response = await api.get(`/api/books/${book.id}/shares`);
      setShareLinks(response.data);
    } catch (err) {
      setError('Fehler beim Laden der Freigaben');
      setShareLinks([]);
    }
  };

  const handleCreateShareLink = async (expiresIn = null) => {
    if (!shareDialog.book) return;

    try {
      const response = await api.post(`/api/books/${shareDialog.book.id}/share`, { expiresIn });
      setNewShareLink(response.data);
      
      // Refresh share links
      const sharesResponse = await api.get(`/api/books/${shareDialog.book.id}/shares`);
      setShareLinks(sharesResponse.data);
    } catch (err) {
      setError('Fehler beim Erstellen des Freigabe-Links');
    }
  };

  const handleDeleteShareLink = async (token) => {
    try {
      await api.delete(`/api/shares/${token}`);
      
      // Refresh share links
      const response = await api.get(`/api/books/${shareDialog.book.id}/shares`);
      setShareLinks(response.data);
    } catch (err) {
      setError('Fehler beim Löschen der Freigabe');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  if (loading) {
    return (
      <Container>
        <Typography>Lade Bücher...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Digitale Bibliothek
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {books.length} Bücher und Magazine verfügbar
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Search and Filter */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Suche nach Titel oder Autor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Typ</InputLabel>
              <Select
                value={filterType}
                label="Typ"
                onChange={(e) => setFilterType(e.target.value)}
                startAdornment={<FilterList sx={{ mr: 1 }} />}
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="book">Bücher</MenuItem>
                <MenuItem value="magazine">Magazine</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {filteredBooks.length === 0 ? (
        <Box textAlign="center" py={8}>
          <MenuBook sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {books.length === 0 ? 'Noch keine Bücher vorhanden' : 'Keine Bücher gefunden'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {books.length === 0 ? 'Laden Sie Ihr erstes Buch hoch!' : 'Versuchen Sie andere Suchbegriffe'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredBooks.map((book) => (
            <Grid item xs={12} sm={6} md={4} key={book.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {book.cover_image && (
                  <Box sx={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={book.cover_image}
                      alt={book.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </Box>
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: book.type === 'magazine' ? 'secondary.main' : 'primary.main' }}>
                      {book.type === 'magazine' ? <Article /> : <MenuBook />}
                    </Avatar>
                    <Chip
                      label={book.type === 'magazine' ? 'Magazin' : 'Buch'}
                      size="small"
                      color={book.type === 'magazine' ? 'secondary' : 'primary'}
                    />
                  </Box>

                  <Typography variant="h6" component="h2" gutterBottom>
                    {book.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    von {book.author}
                  </Typography>

                  {book.description && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {book.description.length > 100 
                        ? `${book.description.substring(0, 100)}...` 
                        : book.description}
                    </Typography>
                  )}

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {formatFileSize(book.file_size)} • {book.filename.split('.').pop().toUpperCase()}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Hochgeladen von {book.uploader_name || 'Unbekannt'}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {new Date(book.upload_date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      📥 {book.download_count || 0} Downloads
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    onClick={() => handleDownload(book)}
                  >
                    Download
                  </Button>
                  {canShare(book) && (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleShareOpen(book)}
                      title="Teilen"
                    >
                      <Share />
                    </IconButton>
                  )}
                  {canDelete(book) && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, book })}
                    >
                      <Delete />
                    </IconButton>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, book: null })}
      >
        <DialogTitle>Buch löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie "{deleteDialog.book?.title}" wirklich löschen? 
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, book: null })}>
            Abbrechen
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={shareDialog.open}
        onClose={() => setShareDialog({ open: false, book: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Share />
            "{shareDialog.book?.title}" teilen
          </Box>
        </DialogTitle>
        <DialogContent>
          {newShareLink && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Neuer Freigabe-Link erstellt!
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={newShareLink.shareUrl}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(newShareLink.shareUrl)}
                        title="Link kopieren"
                      >
                        <ContentCopy />
                      </IconButton>
                    )
                  }}
                />
              </Box>
            </Alert>
          )}

          <Typography variant="body1" gutterBottom>
            Erstellen Sie einen öffentlichen Link, um dieses Buch zu teilen:
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Link />}
              onClick={() => handleCreateShareLink()}
            >
              Dauerhaften Link erstellen
            </Button>
            <Button
              variant="outlined"
              startIcon={<AccessTime />}
              onClick={() => handleCreateShareLink(24)}
            >
              24h Link
            </Button>
            <Button
              variant="outlined"
              startIcon={<AccessTime />}
              onClick={() => handleCreateShareLink(168)}
            >
              7 Tage Link
            </Button>
          </Box>

          {shareLinks.length > 0 && (
            <>
              <Typography variant="h6" gutterBottom>
                Aktive Freigabe-Links:
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {shareLinks.map((link) => (
                  <Paper key={link.share_token} elevation={1} sx={{ p: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          size="small"
                          fullWidth
                          value={link.shareUrl}
                          InputProps={{
                            readOnly: true,
                            endAdornment: (
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(link.shareUrl)}
                              >
                                <ContentCopy />
                              </IconButton>
                            )
                          }}
                        />
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteShareLink(link.share_token)}
                        sx={{ ml: 1 }}
                      >
                        Löschen
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, fontSize: '0.8rem', color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Visibility fontSize="small" />
                        {link.access_count} Zugriffe
                      </Box>
                      <Box>
                        Erstellt: {new Date(link.created_at).toLocaleDateString()}
                      </Box>
                      {link.expires_at && (
                        <Box sx={{ color: new Date(link.expires_at) < new Date() ? 'error.main' : 'inherit' }}>
                          Läuft ab: {new Date(link.expires_at).toLocaleDateString()}
                        </Box>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog({ open: false, book: null })}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Box sx={{ mt: 6, pb: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Lectoria BookManager - Created by <a href="https://github.com/chicohaager/lectoria" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>@chicohaager</a>
        </Typography>
      </Box>
    </Container>
  );
}

export default Dashboard;