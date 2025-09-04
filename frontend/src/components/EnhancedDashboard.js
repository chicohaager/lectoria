// frontend/src/components/EnhancedDashboard.js
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
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
  InputAdornment,
} from '@mui/material';
import {
  Search,
  Download,
  Delete,
  Share,
  GridView,
  ViewList,
  Book,
  Article,
  Description,
  Edit,
  TableChart,
  QrCode,
} from '@mui/icons-material';
import api from '../services/api';

function EnhancedDashboard() {
  const { t, language } = useLanguage();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [shareDialog, setShareDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [shareExpiration, setShareExpiration] = useState('never');
  const [metadataDialog, setMetadataDialog] = useState(false);
  const [selectedMetadataBook, setSelectedMetadataBook] = useState(null);
  const [isbnQuery, setIsbnQuery] = useState('');
  const [titleQuery, setTitleQuery] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadataFormData, setMetadataFormData] = useState({
    title: '',
    author: '',
    description: '',
    publisher: '',
    publishedDate: '',
    language: '',
    coverUrl: null,
  });

  // CSV Export States
  const [csvExporting, setCsvExporting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    loadBooks();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, filterType, filterCategory]);

  // Reload categories when language changes
  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const loadCategories = async () => {
    try {
      const response = await api.get(`/api/categories/translated?lang=${language}`);
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
    setShareLink(''); // Reset link
    setShareDialog(true);
  };

  const createShareLink = async () => {
    try {
      const expires_at = shareExpiration !== 'never' ? 
        new Date(Date.now() + parseInt(shareExpiration) * 24 * 60 * 60 * 1000).toISOString() : 
        null;
      
      const response = await api.post(`/api/books/${selectedBook.id}/share`, { expires_at });
      // Use the shareUrl from response or construct it from shareToken
      const link = response.data.shareUrl || `${window.location.origin}/share/${response.data.shareToken}`;
      setShareLink(link);
    } catch (err) {
      setError('Fehler beim Erstellen des Share-Links');
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  const handleGenerateQrCode = () => {
    if (!shareLink) return;
    
    // Extract token from share link
    const token = shareLink.split('/').pop();
    
    // Set QR code URL to backend endpoint
    const qrUrl = `/api/share/${token}/qr`;
    setQrCodeUrl(qrUrl);
    setShowQrCode(true);
  };

  const handleEditMetadata = (book) => {
    setSelectedMetadataBook(book);
    setMetadataFormData({
      title: book.title || '',
      author: book.author || '',
      description: book.description || '',
      publisher: book.publisher || '',
      publishedDate: book.published_date || '',
      language: book.language || '',
    });
    setTitleQuery(book.title || '');
    setAuthorQuery(book.author || '');
    setSearchResults([]);
    setIsbnQuery('');
    setMetadataDialog(true);
  };

  const handleIsbnSearch = async () => {
    if (!isbnQuery.trim()) {
      setError('Bitte geben Sie eine ISBN ein');
      return;
    }

    try {
      setLoadingMetadata(true);
      const response = await api.post(`/api/metadata/isbn/${isbnQuery.trim()}`);
      
      if (response.data.success) {
        // Format date for HTML date input (needs YYYY-MM-DD format)
        let formattedDate = response.data.publishedDate || '';
        if (formattedDate && formattedDate.length === 4) {
          // Just a year, convert to full date
          formattedDate = `${formattedDate}-01-01`;
        } else if (formattedDate && formattedDate.length === 7) {
          // Year-month, add day
          formattedDate = `${formattedDate}-01`;
        }
        
        setMetadataFormData({
          title: response.data.title,
          author: response.data.authors,
          description: response.data.description,
          publisher: response.data.publisher || '',
          publishedDate: formattedDate,
          language: response.data.language || 'de',
          coverUrl: response.data.coverUrl,
        });
        setSuccess('Metadaten via ISBN gefunden!');
      } else {
        setError(response.data.error || 'Keine Metadaten für diese ISBN gefunden');
      }
    } catch (err) {
      setError('Fehler beim ISBN-Lookup');
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleTitleSearch = async () => {
    if (!titleQuery.trim()) {
      setError('Bitte geben Sie einen Titel ein');
      return;
    }

    try {
      setLoadingMetadata(true);
      const response = await api.post('/api/metadata/search', {
        title: titleQuery.trim(),
        author: authorQuery.trim()
      });
      
      setSearchResults(response.data.results || []);
      if (response.data.results.length === 0) {
        setError('Keine Suchergebnisse gefunden');
      }
    } catch (err) {
      setError('Fehler bei der Buchsuche');
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    setMetadataFormData({
      title: result.title,
      author: result.authors,
      description: result.description,
      publisher: result.publisher,
      publishedDate: result.publishedDate,
      language: result.language,
      coverUrl: result.coverUrl,
    });
    setSearchResults([]);
  };

  const handleSaveMetadata = async () => {
    try {
      setLoadingMetadata(true);
      await api.put(`/api/books/${selectedMetadataBook.id}/metadata`, metadataFormData);
      
      setSuccess('Metadaten erfolgreich aktualisiert');
      setMetadataDialog(false);
      loadBooks(); // Refresh book list
      
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern der Metadaten');
    } finally {
      setLoadingMetadata(false);
    }
  };

  const resetMetadataDialog = () => {
    setMetadataDialog(false);
    setSelectedMetadataBook(null);
    setSearchResults([]);
    setIsbnQuery('');
    setTitleQuery('');
    setAuthorQuery('');
    setMetadataFormData({
      title: '',
      author: '',
      description: '',
      publisher: '',
      publishedDate: '',
      language: '',
    });
  };

  // CSV Export Function
  const handleCsvExport = async () => {
    try {
      setCsvExporting(true);
      setError('');

      // Prepare filters for export (currently not used but may be needed for future filtering)
      // const filters = {
      //   search: searchTerm,
      //   type: filterType !== 'all' ? filterType : undefined,
      //   category_id: filterCategory !== 'all' ? filterCategory : undefined
      // };

      // Download the CSV file directly with proper authentication
      const response = await api.get('/api/export/csv', {
        responseType: 'blob',
        headers: {
          'Accept': 'text/csv'
        }
      });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `books-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess(`CSV-Export erstellt: ${response.data.export.bookCount} Bücher exportiert`);

    } catch (error) {
      console.error('CSV export failed:', error);
      setError(error.response?.data?.error || 'Fehler beim CSV-Export');
    } finally {
      setCsvExporting(false);
    }
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
        <Typography variant="h4" gutterBottom component="h1">
          {t('dashboard.title')}
        </Typography>
        
        {/* Search and Filter Bar */}
        <Box 
          sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}
          role="search"
          aria-label="Suche und Filter für Bibliothek"
          id="search"
        >
          <TextField
            placeholder={t('dashboard.searchPlaceholder')}
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 250 }}
            inputProps={{
              'aria-label': 'Suche nach Büchern und Magazinen',
              'aria-describedby': 'search-help'
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search aria-hidden="true" />
                </InputAdornment>
              ),
            }}
          />
          <div id="search-help" style={{ position: 'absolute', left: '-10000px' }}>
            Geben Sie Titel oder Autor ein um Ihre Bibliothek zu durchsuchen
          </div>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="type-filter-label">Typ</InputLabel>
            <Select
              value={filterType}
              label="Typ"
              onChange={(e) => setFilterType(e.target.value)}
              labelId="type-filter-label"
              inputProps={{
                'aria-label': 'Filter nach Medientyp'
              }}
            >
              <MenuItem value="all">{t('dashboard.filterAll')}</MenuItem>
              <MenuItem value="book">{t('dashboard.filterBooks')}</MenuItem>
              <MenuItem value="magazine">{t('dashboard.filterMagazines')}</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="category-filter-label">{t('dashboard.category')}</InputLabel>
            <Select
              value={filterCategory}
              label={t('dashboard.category')}
              onChange={(e) => setFilterCategory(e.target.value)}
              labelId="category-filter-label"
              inputProps={{
                'aria-label': 'Filter nach Kategorie'
              }}
            >
              <MenuItem value="all">{t('dashboard.allCategories')}</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {t(`categories.${category.name}`) || category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
            aria-label="Ansichtsmodus auswählen"
          >
            <ToggleButton 
              value="grid" 
              aria-label="Kartenansicht anzeigen"
              aria-pressed={viewMode === 'grid'}
            >
              <Tooltip title="Kartenansicht">
                <GridView aria-hidden="true" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton 
              value="list" 
              aria-label="Listenansicht anzeigen"
              aria-pressed={viewMode === 'list'}
            >
              <Tooltip title="Listenansicht">
                <ViewList aria-hidden="true" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="outlined"
            startIcon={<TableChart aria-hidden="true" />}
            onClick={handleCsvExport}
            disabled={csvExporting || books.length === 0}
            size="small"
            aria-label="Bibliothek als CSV-Datei exportieren"
            aria-describedby="csv-export-help"
          >
            {csvExporting ? 'Exportiere...' : 'CSV Export'}
          </Button>
          <div id="csv-export-help" style={{ position: 'absolute', left: '-10000px' }}>
            Exportiert alle Bücher und Magazine als CSV-Datei zum Herunterladen
          </div>
        </Box>

        {/* Results Info */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {pagination && `${pagination.total} Ergebnisse gefunden`}
          </Typography>
          {pagination && pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', gap: 1 }} role="navigation" aria-label="Seitennavigation">
              <Button
                size="small"
                disabled={!pagination.hasPrev}
                onClick={() => setPage(page - 1)}
                aria-label="Zur vorherigen Seite"
              >
                Zurück
              </Button>
              <Typography 
                variant="body2" 
                sx={{ display: 'flex', alignItems: 'center', px: 2 }}
                aria-label={`Aktuelle Seite ${page} von ${pagination.totalPages}`}
                role="status"
              >
                Seite {page} von {pagination.totalPages}
              </Typography>
              <Button
                size="small"
                disabled={!pagination.hasNext}
                onClick={() => setPage(page + 1)}
                aria-label="Zur nächsten Seite"
              >
                Weiter
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <Grid 
          container 
          spacing={3}
          role="grid"
          aria-label="Bibliothekssammlung in Kartenansicht"
        >
          {filteredBooks.map((book, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={book.id} role="gridcell">
              <Card 
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                role="article"
                tabIndex={0}
                aria-label={`${book.type === 'magazine' ? t('dashboard.magazine') : t('dashboard.book')}: ${book.title} von ${book.author || t('dashboard.unknownAuthor')}`}
              >
                {book.cover_image ? (
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={book.cover_image}
                      alt={`Cover von ${book.title}`}
                      sx={{ objectFit: 'cover' }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#1a1a1a',
                      position: 'relative',
                    }}
                    role="img"
                    aria-label={`Kein Cover verfügbar für ${book.title}`}
                  >
                    {book.type === 'magazine' ? (
                      <Article sx={{ fontSize: 60, color: 'grey.500' }} aria-hidden="true" />
                    ) : (
                      <Book sx={{ fontSize: 60, color: 'grey.500' }} aria-hidden="true" />
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
                <CardActions role="toolbar" aria-label={`Aktionen für ${book.title}`}>
                  <Tooltip title={t('dashboard.download')}>
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(book.id, book.filename)}
                      aria-label={`${book.title} herunterladen`}
                    >
                      <Download aria-hidden="true" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('dashboard.editMetadata')}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditMetadata(book)}
                      aria-label={`Metadaten für ${book.title} bearbeiten`}
                    >
                      <Edit aria-hidden="true" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('dashboard.share')}>
                    <IconButton
                      size="small"
                      onClick={() => handleShare(book)}
                      aria-label={`${book.title} teilen`}
                    >
                      <Share aria-hidden="true" />
                    </IconButton>
                  </Tooltip>
                  {(user.role === 'admin' || book.uploaded_by === user.id) && (
                    <Tooltip title={t('dashboard.delete')}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(book.id)}
                        aria-label={`${book.title} löschen`}
                      >
                        <Delete aria-hidden="true" />
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
          <Table aria-label="Bibliothekstabelle">
            <TableHead>
              <TableRow>
                <TableCell>{t('dashboard.tableTitle')}</TableCell>
                <TableCell>{t('dashboard.tableAuthor')}</TableCell>
                <TableCell>{t('dashboard.tableCategory')}</TableCell>
                <TableCell>{t('dashboard.tableType')}</TableCell>
                <TableCell>Größe</TableCell>
                <TableCell>Hochgeladen</TableCell>
                <TableCell>Von</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBooks.map((book, index) => (
                <TableRow 
                  key={book.id} 
                  hover 
                  tabIndex={0}
                  role="row"
                  aria-rowindex={index + 2}
                  aria-label={`${book.type === 'magazine' ? t('dashboard.magazine') : t('dashboard.book')}: ${book.title} von ${book.author || t('dashboard.unknownAuthor')}`}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {book.type === 'magazine' ? (
                        <Article color="action" aria-hidden="true" />
                      ) : (
                        <Book color="action" aria-hidden="true" />
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
                    <Box 
                      sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}
                      role="toolbar"
                      aria-label={`Aktionen für ${book.title}`}
                    >
                      <Tooltip title={t('dashboard.download')}>
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(book.id, book.filename)}
                          aria-label={`${book.title} herunterladen`}
                        >
                          <Download aria-hidden="true" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('dashboard.editMetadata')}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditMetadata(book)}
                          aria-label={`Metadaten für ${book.title} bearbeiten`}
                        >
                          <Edit aria-hidden="true" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('dashboard.share')}>
                        <IconButton
                          size="small"
                          onClick={() => handleShare(book)}
                          aria-label={`${book.title} teilen`}
                        >
                          <Share aria-hidden="true" />
                        </IconButton>
                      </Tooltip>
                      {(user.role === 'admin' || book.uploaded_by === user.id) && (
                        <Tooltip title={t('dashboard.delete')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(book.id)}
                            aria-label={`${book.title} löschen`}
                          >
                            <Delete aria-hidden="true" />
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
            {t('dashboard.noBooks')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Versuchen Sie eine andere Suche oder fügen Sie neue Bücher hinzu
          </Typography>
        </Box>
      )}

      {/* Metadata Edit Dialog */}
      <Dialog open={metadataDialog} onClose={resetMetadataDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {t('dashboard.metadataEdit')}: {selectedMetadataBook?.title}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* ISBN Search Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.searchByIsbn')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label={t('dashboard.isbnLabel')}
                  value={isbnQuery}
                  onChange={(e) => setIsbnQuery(e.target.value)}
                  placeholder="9783123456789"
                  disabled={loadingMetadata}
                />
                <Button
                  variant="outlined"
                  onClick={handleIsbnSearch}
                  disabled={loadingMetadata || !isbnQuery.trim()}
                >
                  {t('dashboard.search')}
                </Button>
              </Box>
            </Box>

            {/* Title/Author Search Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.searchByTitle')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  label={t('dashboard.titleLabel')}
                  value={titleQuery}
                  onChange={(e) => setTitleQuery(e.target.value)}
                  disabled={loadingMetadata}
                />
                <TextField
                  fullWidth
                  label={t('dashboard.authorOptional')}
                  value={authorQuery}
                  onChange={(e) => setAuthorQuery(e.target.value)}
                  disabled={loadingMetadata}
                />
                <Button
                  variant="outlined"
                  onClick={handleTitleSearch}
                  disabled={loadingMetadata || !titleQuery.trim()}
                >
                  {t('dashboard.search')}
                </Button>
              </Box>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Suchergebnisse:
                  </Typography>
                  {searchResults.map((result, index) => (
                    <Paper 
                      key={index} 
                      sx={{ 
                        p: 2, 
                        mb: 1, 
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center'
                      }} 
                      onClick={() => handleSelectSearchResult(result)}
                    >
                      {result.coverUrl && (
                        <img 
                          src={`/api/cover-proxy?url=${encodeURIComponent(result.coverUrl)}`} 
                          alt={result.title}
                          style={{ 
                            width: 50, 
                            height: 70, 
                            objectFit: 'cover',
                            borderRadius: 4 
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <Box flex={1}>
                        <Typography variant="subtitle2">{result.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          von {result.authors} • {result.publisher} ({result.publishedDate})
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>

            {/* Manual Edit Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.manualEdit')}
              </Typography>
              
              {/* Cover Preview if available */}
              {metadataFormData.coverUrl && (
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <img 
                    src={`/api/cover-proxy?url=${encodeURIComponent(metadataFormData.coverUrl)}`} 
                    alt="Book cover"
                    style={{ 
                      width: 120, 
                      height: 180, 
                      objectFit: 'cover',
                      borderRadius: 8,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Cover-Bild gefunden
                    </Typography>
                    <Button 
                      size="small" 
                      color="error" 
                      onClick={() => setMetadataFormData({ ...metadataFormData, coverUrl: null })}
                    >
                      Cover entfernen
                    </Button>
                  </Box>
                </Box>
              )}
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Titel"
                    value={metadataFormData.title}
                    onChange={(e) => setMetadataFormData({ ...metadataFormData, title: e.target.value })}
                    disabled={loadingMetadata}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Autor"
                    value={metadataFormData.author}
                    onChange={(e) => setMetadataFormData({ ...metadataFormData, author: e.target.value })}
                    disabled={loadingMetadata}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Beschreibung"
                    value={metadataFormData.description}
                    onChange={(e) => setMetadataFormData({ ...metadataFormData, description: e.target.value })}
                    disabled={loadingMetadata}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Verlag"
                    value={metadataFormData.publisher}
                    onChange={(e) => setMetadataFormData({ ...metadataFormData, publisher: e.target.value })}
                    disabled={loadingMetadata}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Erscheinungsdatum"
                    type="date"
                    value={metadataFormData.publishedDate}
                    onChange={(e) => setMetadataFormData({ ...metadataFormData, publishedDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    disabled={loadingMetadata}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Sprache"
                    value={metadataFormData.language}
                    onChange={(e) => setMetadataFormData({ ...metadataFormData, language: e.target.value })}
                    placeholder="de, en, etc."
                    disabled={loadingMetadata}
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetMetadataDialog} disabled={loadingMetadata}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveMetadata}
            disabled={loadingMetadata}
            startIcon={loadingMetadata ? <CircularProgress size={20} /> : <Edit />}
          >
            {loadingMetadata ? 'Speichere...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialog} onClose={() => { 
        setShareDialog(false); 
        setShowQrCode(false); 
        setQrCodeUrl(''); 
        setShareLink(''); 
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Buch teilen: {selectedBook?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Ablaufdauer</InputLabel>
              <Select
                value={shareExpiration}
                label="Ablaufdauer"
                onChange={(e) => setShareExpiration(e.target.value)}
              >
                <MenuItem value="never">Niemals ablaufend</MenuItem>
                <MenuItem value="1">1 Tag</MenuItem>
                <MenuItem value="7">1 Woche</MenuItem>
                <MenuItem value="30">1 Monat</MenuItem>
                <MenuItem value="90">3 Monate</MenuItem>
              </Select>
            </FormControl>

            {!shareLink ? (
              <Button
                fullWidth
                variant="contained"
                onClick={createShareLink}
                sx={{ mb: 2 }}
              >
                Share-Link erstellen
              </Button>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Share-Link"
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
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<QrCode />}
                    onClick={handleGenerateQrCode}
                    size="small"
                  >
                    QR-Code anzeigen
                  </Button>
                </Box>
                
                {showQrCode && (
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      QR-Code zum Teilen:
                    </Typography>
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code für Share-Link"
                      style={{ 
                        maxWidth: '200px', 
                        border: '1px solid #ccc', 
                        borderRadius: '4px' 
                      }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                      QR-Code scannen um das Buch zu öffnen
                    </Typography>
                  </Box>
                )}
                
                <Alert severity="info">
                  Dieser Link ermöglicht jedem mit dem Link, das Buch herunterzuladen.
                  {shareExpiration !== 'never' 
                    ? ` Der Link läuft nach ${shareExpiration} Tag${shareExpiration === '1' ? '' : 'en'} ab.`
                    : ' Der Link bleibt dauerhaft aktiv.'
                  }
                </Alert>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { 
            setShareDialog(false); 
            setShowQrCode(false); 
            setQrCodeUrl(''); 
            setShareLink(''); 
          }}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default EnhancedDashboard;