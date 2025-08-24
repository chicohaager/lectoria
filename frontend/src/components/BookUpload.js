import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  Description,
  CheckCircle,
} from '@mui/icons-material';
import api from '../services/api';

function BookUpload() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    type: 'book',
  });
  const [file, setFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      const allowedTypes = ['.pdf', '.epub'];
      const allowedMimeTypes = ['application/pdf', 'application/epub+zip'];
      const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
      
      // Validate file size (70MB limit)
      const maxSize = 70 * 1024 * 1024; // 70MB
      if (selectedFile.size > maxSize) {
        setError('Datei ist zu groß! Maximum: 70MB');
        setFile(null);
        return;
      }
      
      // Validate extension and MIME type
      if (allowedTypes.includes(fileExtension) && allowedMimeTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError('');
        
        // Auto-fill title if empty
        if (!formData.title) {
          const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, "");
          // Sanitize filename for title
          const sanitizedTitle = nameWithoutExtension.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').trim();
          setFormData(prev => ({ ...prev, title: sanitizedTitle }));
        }
      } else {
        setError('Nur PDF und EPUB Dateien sind erlaubt!');
        setFile(null);
      }
    }
  };

  const handleFileChange = (e) => {
    handleFileSelect(e.target.files[0]);
  };

  const handleCoverFileSelect = (selectedFile) => {
    if (selectedFile) {
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
      
      // Validate file size (5MB limit for images)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (selectedFile.size > maxSize) {
        setError('Cover-Bild ist zu groß! Maximum: 5MB');
        setCoverFile(null);
        return;
      }
      
      // Validate extension and MIME type
      if (allowedTypes.includes(fileExtension) && allowedMimeTypes.includes(selectedFile.type)) {
        setCoverFile(selectedFile);
        setError('');
      } else {
        setError('Nur JPG, PNG und WEBP Bilder sind für Cover erlaubt!');
        setCoverFile(null);
      }
    }
  };

  const handleCoverFileChange = (e) => {
    handleCoverFileSelect(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Bitte wählen Sie eine Datei aus');
      return;
    }

    // Frontend validation
    if (!formData.title || formData.title.trim().length === 0) {
      setError('Titel ist erforderlich');
      return;
    }

    if (formData.title.length > 255) {
      setError('Titel ist zu lang (max. 255 Zeichen)');
      return;
    }

    if (formData.author && formData.author.length > 255) {
      setError('Autor ist zu lang (max. 255 Zeichen)');
      return;
    }

    if (formData.description && formData.description.length > 1000) {
      setError('Beschreibung ist zu lang (max. 1000 Zeichen)');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      if (coverFile) {
        uploadData.append('cover', coverFile);
      }
      uploadData.append('title', formData.title.trim());
      uploadData.append('author', formData.author ? formData.author.trim() : '');
      uploadData.append('description', formData.description ? formData.description.trim() : '');
      uploadData.append('type', formData.type);

      await api.post('/api/books/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(true);
      
      // Reset form
      setFormData({
        title: '',
        author: '',
        description: '',
        type: 'book',
      });
      setFile(null);
      setCoverFile(null);
      
      // Reset file inputs
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      const coverInput = document.getElementById('cover-input');
      if (coverInput) coverInput.value = '';

    } catch (err) {
      setError(err.response?.data?.error || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Neues Buch hochladen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Laden Sie PDF oder EPUB Dateien hoch und verwalten Sie Ihre digitale Bibliothek
        </Typography>
      </Box>

      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          icon={<CheckCircle />}
        >
          Buch wurde erfolgreich hochgeladen!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2}>
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 4 }}>
          {/* File Upload Area */}
          <Card 
            sx={{ 
              mb: 4, 
              border: dragOver ? '2px dashed #1976d2' : '2px dashed #e0e0e0',
              backgroundColor: dragOver ? 'rgba(25, 118, 210, 0.05)' : 'transparent',
              cursor: 'pointer',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input').click()}
          >
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {file ? file.name : 'Datei auswählen oder hier ablegen'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {file 
                  ? `${formatFileSize(file.size)} • ${file.name.split('.').pop().toUpperCase()}`
                  : 'PDF oder EPUB Dateien (max. 70MB)'
                }
              </Typography>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.epub"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </CardContent>
          </Card>

          {/* Cover Image Upload Area */}
          <Card 
            sx={{ 
              mb: 4, 
              border: '1px dashed #e0e0e0',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('cover-input').click()}
          >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              {coverFile ? (
                <Box>
                  <img 
                    src={URL.createObjectURL(coverFile)} 
                    alt="Cover Preview" 
                    style={{ maxWidth: '150px', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }}
                  />
                  <Typography variant="body2" gutterBottom>
                    {coverFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(coverFile.size)}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Description sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Cover-Bild (optional)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    JPG, PNG oder WEBP (max. 5MB)
                  </Typography>
                </Box>
              )}
              <input
                id="cover-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleCoverFileChange}
                style={{ display: 'none' }}
              />
            </CardContent>
          </Card>

          <Divider sx={{ mb: 4 }} />

          {/* Form Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              name="title"
              label="Titel"
              value={formData.title}
              onChange={handleInputChange}
              required
              fullWidth
              variant="outlined"
            />

            <TextField
              name="author"
              label="Autor"
              value={formData.author}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
            />

            <FormControl fullWidth>
              <InputLabel>Typ</InputLabel>
              <Select
                name="type"
                value={formData.type}
                label="Typ"
                onChange={handleInputChange}
              >
                <MenuItem value="book">Buch</MenuItem>
                <MenuItem value="magazine">Magazin</MenuItem>
              </Select>
            </FormControl>

            <TextField
              name="description"
              label="Beschreibung"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              placeholder="Optional: Kurze Beschreibung des Inhalts..."
            />
          </Box>

          {uploading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Datei wird hochgeladen...
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={uploading || !file}
              startIcon={<CloudUpload />}
              size="large"
            >
              {uploading ? 'Hochladen...' : 'Hochladen'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => {
                setFormData({
                  title: '',
                  author: '',
                  description: '',
                  type: 'book',
                });
                setFile(null);
                setCoverFile(null);
                setError('');
                setSuccess(false);
                const fileInput = document.getElementById('file-input');
                if (fileInput) fileInput.value = '';
                const coverInput = document.getElementById('cover-input');
                if (coverInput) coverInput.value = '';
              }}
            >
              Zurücksetzen
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default BookUpload;