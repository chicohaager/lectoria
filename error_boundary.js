// frontend/src/components/ErrorBoundary.js
import React from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button,
  Alert 
} from '@mui/material';
import { 
  ErrorOutline,
  Refresh 
} from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <ErrorOutline sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            
            <Typography variant="h4" gutterBottom color="error">
              Etwas ist schiefgelaufen
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
            </Typography>

            <Box sx={{ mt: 3, mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleReload}
                size="large"
              >
                Seite neu laden
              </Button>
            </Box>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert severity="error" sx={{ mt: 3, textAlign: 'left' }}>
                <Typography variant="h6" gutterBottom>
                  Entwickler-Info:
                </Typography>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem', mb: 1 }}>
                  {this.state.error.toString()}
                </Typography>
                {this.state.errorInfo.componentStack && (
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.7rem' }}>
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Lectoria BookManager - Created by{' '}
              <a 
                href="https://github.com/chicohaager/lectoria" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'inherit' }}
              >
                @chicohaager
              </a>
            </Typography>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;