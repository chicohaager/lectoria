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
  Chip,
  Avatar,
} from '@mui/material';
import {
  CloudUpload,
  Book,
  Article,
  Category as CategoryIcon,
  Image,
  CheckCircle,
} from '@mui/icons-material';
import api from '../services/api';

function EnhancedBookUpload() {
  const [file, setFile] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
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

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
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
      setError('Nur PDF und EPUB Dateien sind erlaubt');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('Datei ist zu groß (max. 50MB)');
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
        setError('Nur JPG, PNG und WebP Bilder sind erlaubt');
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Bild ist zu groß (max. 5MB)');
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
      setError('Bitte wählen Sie eine Datei aus');
      return;
    }

    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    if (coverImage) {
      uploadData.append('cover', coverImage);
    }
    uploadData.append('title', formData.title);
    uploadData.append('author', formData.author || 'Unbekannt');
    uploadData.append('description', formData.description);
    uploadData.append('type', formData.type);
    if (formData.category_id) {
      uploadData.append('category_id', formData.category_id);
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      const response = await api.post('/api/books/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      setSuccess('Buch erfolgreich hochgeladen!');
      // Reset form
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
      setUploadProgress(0);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Buch hochladen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Laden Sie PDF oder EPUB Dateien hoch und fügen Sie Metadaten hinzu
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
                    Andere Datei wählen
                  </Button>
                </Box>
              ) : (
                <Box>
                  <CloudUpload sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Datei hierher ziehen
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    oder klicken zum Auswählen
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PDF oder EPUB • Max. 50MB
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Cover Image Upload */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Cover-Bild (optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<Image />}
              >
                Cover hochladen
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
              label="Titel"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              fullWidth
            />

            <TextField
              label="Autor"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              fullWidth
            />

            <TextField
              label="Beschreibung"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Typ</InputLabel>
                <Select
                  value={formData.type}
                  label="Typ"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="book">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Book />
                      Buch
                    </Box>
                  </MenuItem>
                  <MenuItem value="magazine">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Article />
                      Magazin
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  value={formData.category_id}
                  label="Kategorie"
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <MenuItem value="">
                    <em>Keine Kategorie</em>
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
                Wird hochgeladen... {uploadProgress}%
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
              Zurücksetzen
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!file || !formData.title || uploading}
              startIcon={<CloudUpload />}
            >
              Hochladen
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Info Box */}
      <Paper elevation={1} sx={{ p: 3, mt: 3, bgcolor: 'info.lighter' }}>
        <Typography variant="subtitle2" gutterBottom>
          Hinweise zum Upload:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Unterstützte Formate: PDF und EPUB<br />
          • Maximale Dateigröße: 50MB<br />
          • Cover-Bilder verbessern die Darstellung in der Bibliothek<br />
          • Kategorien helfen bei der Organisation Ihrer Sammlung
        </Typography>
      </Paper>
    </Container>
  );
}

export default EnhancedBookUpload;