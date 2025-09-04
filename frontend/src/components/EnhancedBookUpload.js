// frontend/src/components/EnhancedBookUpload.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  CloudUpload,
  Book,
  Article,
  Image,
  CheckCircle,
  Search,
} from '@mui/icons-material';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

function EnhancedBookUpload() {
  const { t, language } = useLanguage();
  const [file, setFile] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverUrlFromISBN, setCoverUrlFromISBN] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    type: 'book',
    category_id: '',
  });
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isbnQuery, setIsbnQuery] = useState('');
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      console.error('Error loading categories:', err);
    }
  };

  const handleIsbnSearch = async () => {
    if (!isbnQuery.trim()) {
      setError('Bitte geben Sie eine ISBN ein');
      return;
    }

    try {
      setLoadingMetadata(true);
      setError('');
      const response = await api.post(`/api/metadata/isbn/${isbnQuery.trim()}`);
      
      if (response.data.success) {
        // Format date for display (reserved for future formatting)
        // let formattedDate = response.data.publishedDate || '';
        
        setFormData({
          title: response.data.title || '',
          author: response.data.authors || '',
          description: response.data.description || '',
          type: formData.type, // Keep the selected type
          category_id: formData.category_id, // Keep the selected category
        });
        
        // If cover URL is found, save it for later download and create proxy URL for preview
        if (response.data.coverUrl) {
          setCoverUrlFromISBN(response.data.coverUrl);
          setCoverPreview(`/api/cover-proxy?url=${encodeURIComponent(response.data.coverUrl)}`);
        }
        
        setSuccess('Metadaten via ISBN gefunden!');
      } else {
        setError(response.data.message || 'No metadata found for this ISBN');
      }
    } catch (err) {
      console.error('Error searching ISBN:', err);
      setError('Error searching ISBN');
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    const validTypes = ['application/pdf', 'application/epub+zip'];
    const validExtensions = ['.pdf', '.epub'];
    const fileExtension = selectedFile.name.toLowerCase().substr(selectedFile.name.lastIndexOf('.'));
    
    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
      setError(t('upload.supportedFormats'));
      return;
    }

    if (selectedFile.size > 70 * 1024 * 1024) {
      setError(t('upload.supportedFormats'));
      return;
    }

    setFile(selectedFile);
    setError('');
    
    // Auto-fill title from filename if empty
    if (!formData.title) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setFormData({ ...formData, title: nameWithoutExt });
    }
  };

  const handleCoverImageSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      
      if (!validTypes.includes(selectedFile.type)) {
        setError('JPG, PNG, WebP (max. 5MB)');
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('JPG, PNG, WebP (max. 5MB)');
        return;
      }

      setCoverImage(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError(t('upload.selectFiles'));
      return;
    }

    if (!formData.title.trim()) {
      setError(t('upload.titleLabel') + ' ' + t('admin.required').toLowerCase());
      return;
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    if (coverImage) {
      uploadData.append('cover', coverImage);
    } else if (coverUrlFromISBN) {
      // Send the cover URL to be downloaded by backend
      uploadData.append('coverUrl', coverUrlFromISBN);
    }
    uploadData.append('title', formData.title);
    uploadData.append('author', formData.author || t('dashboard.unknownAuthor'));
    uploadData.append('description', formData.description);
    uploadData.append('type', formData.type);
    if (formData.category_id) {
      uploadData.append('category_id', formData.category_id);
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      await api.post('/api/books/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      setSuccess(t('upload.success'));
      // Reset form
      setFile(null);
      setCoverImage(null);
      setCoverPreview(null);
      setCoverUrlFromISBN(null);
      setIsbnQuery('');
      setFormData({
        title: '',
        author: '',
        description: '',
        type: 'book',
        category_id: '',
      });
      setUploadProgress(0);
    } catch (err) {
      setError(err.response?.data?.error || t('upload.error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('upload.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('upload.supportedFormats')}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper elevation={2} sx={{ p: 4 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 4 }}>
            {/* File Upload Area */}
            <Box
              sx={{
                border: '2px dashed',
                borderColor: dragActive ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: dragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,.epub"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                style={{ display: 'none' }}
              />
              
              {file ? (
                <Box>
                  <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                  <Button sx={{ mt: 2 }}>
                    {t('upload.selectFiles')}
                  </Button>
                </Box>
              ) : (
                <Box>
                  <CloudUpload sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {t('upload.dragDrop')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('upload.selectFiles')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('upload.supportedFormats')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* ISBN Search Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              ISBN-Suche ({t('admin.optional')})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="ISBN-10 oder ISBN-13"
                value={isbnQuery}
                onChange={(e) => setIsbnQuery(e.target.value)}
                disabled={loadingMetadata}
                sx={{ flex: 1, maxWidth: 300 }}
              />
              <Button
                variant="outlined"
                startIcon={<Search />}
                onClick={handleIsbnSearch}
                disabled={loadingMetadata || !isbnQuery.trim()}
              >
                {loadingMetadata ? t('upload.searching') : t('upload.searchMetadata')}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('upload.isbnHelpText')}
            </Typography>
          </Box>

          {/* Cover Image Upload */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Cover ({t('admin.optional')})
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<Image />}
              >
                {t('upload.selectFiles')}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverImageSelect}
                  hidden
                />
              </Button>
              
              {coverPreview && (
                <Box
                  component="img"
                  src={coverPreview}
                  sx={{
                    height: 100,
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Metadata Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('upload.titleLabel')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              fullWidth
            />

            <TextField
              label={t('upload.authorLabel')}
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              fullWidth
            />

            <TextField
              label={t('upload.descriptionLabel')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>{t('upload.typeLabel')}</InputLabel>
                <Select
                  value={formData.type}
                  label={t('upload.typeLabel')}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="book">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Book />
                      {t('upload.typeBook')}
                    </Box>
                  </MenuItem>
                  <MenuItem value="magazine">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Article />
                      {t('upload.typeMagazine')}
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>{t('dashboard.category')}</InputLabel>
                <Select
                  value={formData.category_id}
                  label={t('dashboard.category')}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <MenuItem value="">
                    <em>{t('dashboard.allCategories')}</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: category.color,
                          }}
                        >
                          <Box
                            component="span"
                            className="material-icons"
                            sx={{ fontSize: 16 }}
                          >
                            {category.icon}
                          </Box>
                        </Avatar>
                        {category.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {uploading && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('upload.uploading')} {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              type="button"
              onClick={() => {
                setFile(null);
                setCoverImage(null);
                setCoverPreview(null);
                setFormData({
                  title: '',
                  author: '',
                  description: '',
                  type: 'book',
                  category_id: '',
                });
                setError('');
                setSuccess('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!file || !formData.title || uploading}
              startIcon={<CloudUpload />}
            >
              {t('upload.uploadButton')}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Info Box */}
      <Paper elevation={1} sx={{ p: 3, mt: 3, bgcolor: 'info.lighter' }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('upload.uploadHints')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • {t('upload.hintFormats')}<br />
          • {t('upload.hintSize')}<br />
          • {t('upload.hintCover')}<br />
          • {t('upload.hintCategories')}
        </Typography>
      </Paper>
    </Container>
  );
}

export default EnhancedBookUpload;