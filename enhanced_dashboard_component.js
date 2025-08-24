// frontend/src/components/EnhancedDashboard.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Avatar,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  Download,
  Delete,
  Share,
  GridView,
  ViewList,
  FilterList,
  Category as CategoryIcon,
  Book,
  Article,
  Description,
  GetApp,
  Visibility,
  Person,
  CalendarToday,
  Storage,
} from '@mui/icons-material';
import api from '../services/api';

function EnhancedDashboard() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [shareDialog, setShareDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [shareLink, setShareLink] = useState('');

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    loadBooks();
    loadCategories();
  }, [page, searchTerm, filterType, filterCategory]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    }
  };

  const loadBooks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20,
        search: searchTerm,
        type: filterType,
      });

      const response = await api.get(`/api/books?${params}`);
      setBooks(response.data.books);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Fehler beim Laden der Bücher');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (bookId, filename) => {
    try {
      const response = await api.get(`/api/books/${bookId}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Fehler beim Herunterladen');
    }
  };

  const handleDelete = async (bookId) => {
    if (!window.confirm('Möchten Sie dieses Buch wirklich löschen?')) {
      return;
    }

    try {
      await api.delete(`/api/books/${bookId}`);
      loadBooks();
    } catch (err) {
      setError('Fehler beim Löschen');
    }
  };

  const handleShare = async (book) => {
    setSelectedBook(book);
    try {
      const response = await api.post(`/api/books/${book.id}/share`);
      const link = `${window.location.origin}/share/${response.data.token}`;
      setShareLink(link);
      setShareDialog(true);
    } catch (err) {
      setError('Fehler beim Erstellen des Share-Links');
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredBooks = books.filter(book => {
    if (filterCategory !== 'all' && book.category_id !== filterCategory) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Bibliothek
        </Typography>
        
        {/* Search and Filter Bar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Suche nach Titel oder Autor..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Typ</InputLabel>
            <Select
              value={filterType}
              label="Typ"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="book">Bücher</MenuItem>
              <MenuItem value="magazine">Zeitschriften</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Kategorie</InputLabel>
            <Select
              value={filterCategory}
              label="Kategorie"
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <MenuItem value="all">Alle Kategorien</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      component="span"
                      className="material-icons"
                      sx={{ fontSize: 18, color: category.color }}
                    >
                      {category.icon}
                    </Box>
                    {category.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="grid" aria-label="Grid view">
              <Tooltip title="Kartenansicht">
                <GridView />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="List view">
              <Tooltip title="Listenansicht">
                <ViewList />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Results Info */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {pagination && `${pagination.total} Ergebnisse gefunden`}
          </Typography>
          {pagination && pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                disabled={!pagination.hasPrev}
                onClick={() => setPage(page - 1)}
              >
                Zurück
              </Button>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                Seite {page} von {pagination.totalPages}
              </Typography>
              <Button
                size="small"
                disabled={!pagination.hasNext}
                onClick={() => setPage(page + 1)}
              >
                Weiter
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <Grid container spacing={3}>
          {filteredBooks.map((book) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {book.cover_image ? (
                  <CardMedia
                    component="img"
                    height="200"
                    image={book.cover_image}
                    alt={book.title}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.200',
                    }}
                  >
                    {book.type === 'magazine' ? (
                      <Article sx={{ fontSize: 60, color: 'grey.500' }} />
                    ) : (
                      <Book sx={{ fontSize: 60, color: 'grey.500' }} />
                    )}
                  </Box>
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" noWrap gutterBottom>
                    {book.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {book.author}
                  </Typography>
                  
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={book.type === 'magazine' ? 'Magazin' : 'Buch'}
                      color={book.type === 'magazine' ? 'secondary' : 'primary'}
                    />
                    {book.category_name && (
                      <Chip
                        size="small"
                        label={book.category_name}
                        icon={
                          <Box
                            component="span"
                            className="material-icons"
                            sx={{ fontSize: 16 }}
                          >
                            {book.category_icon}
                          </Box>
                        }
                        sx={{
                          bgcolor: book.category_color + '20',
                          color: book.category_color,
                        }}
                      />
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {formatFileSize(book.file_size)} • {formatDate(book.upload_date)}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Tooltip title="Herunterladen">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(book.id, book.filename)}
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Teilen">
                    <IconButton
                      size="small"
                      onClick={() => handleShare(book)}
                    >
                      <Share />
                    </IconButton>
                  </Tooltip>
                  {(user.role === 'admin' || book.uploaded_by === user.id) && (
                    <Tooltip title="Löschen">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(book.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Titel</TableCell>
                <TableCell>Autor</TableCell>
                <TableCell>Kategorie</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Größe</TableCell>
                <TableCell>Hochgeladen</TableCell>
                <TableCell>Von</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBooks.map((book) => (
                <TableRow key={book.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {book.type === 'magazine' ? (
                        <Article color="action" />
                      ) : (
                        <Book color="action" />
                      )}
                      <Typography variant="body2" fontWeight="medium">
                        {book.title}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>
                    {book.category_name && (
                      <Chip
                        size="small"
                        label={book.category_name}
                        icon={
                          <Box
                            component="span"
                            className="material-icons"
                            sx={{ fontSize: 16 }}
                          >
                            {book.category_icon}
                          </Box>
                        }
                        sx={{
                          bgcolor: book.category_color + '20',
                          color: book.category_color,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={book.type === 'magazine' ? 'Magazin' : 'Buch'}
                      color={book.type === 'magazine' ? 'secondary' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>{formatFileSize(book.file_size)}</TableCell>
                  <TableCell>{formatDate(book.upload_date)}</TableCell>
                  <TableCell>{book.uploader_name}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="Herunterladen">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(book.id, book.filename)}
                        >
                          <Download />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Teilen">
                        <IconButton
                          size="small"
                          onClick={() => handleShare(book)}
                        >
                          <Share />
                        </IconButton>
                      </Tooltip>
                      {(user.role === 'admin' || book.uploaded_by === user.id) && (
                        <Tooltip title="Löschen">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(book.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filteredBooks.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Description sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Keine Bücher gefunden
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Versuchen Sie eine andere Suche oder fügen Sie neue Bücher hinzu
          </Typography>
        </Box>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialog} onClose={() => setShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Buch teilen: {selectedBook?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              value={shareLink}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={handleCopyShareLink}>
                      Kopieren
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              Dieser Link ermöglicht jedem mit dem Link, das Buch herunterzuladen.
              Der Link bleibt aktiv, bis Sie ihn deaktivieren.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default EnhancedDashboard;