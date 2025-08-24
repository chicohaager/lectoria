import React, { useState, useMemo, createContext } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LanguageProvider } from './contexts/LanguageContext';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

function Root() {
  const [themeMode, setThemeMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode && ['light', 'dark', 'auto'].includes(savedMode) ? savedMode : 'auto';
  });

  const [actualTheme, setActualTheme] = useState('light');

  // Get system preference
  const getSystemPreference = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  // Update actual theme based on mode setting
  React.useEffect(() => {
    let newTheme = themeMode;
    
    if (themeMode === 'auto') {
      newTheme = getSystemPreference();
    }
    
    setActualTheme(newTheme);
  }, [themeMode]);

  // Listen for system preference changes when in auto mode
  React.useEffect(() => {
    if (themeMode !== 'auto') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'auto') {
        setActualTheme(getSystemPreference());
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setThemeMode((prevMode) => {
          let newMode;
          if (prevMode === 'light') {
            newMode = 'dark';
          } else if (prevMode === 'dark') {
            newMode = 'auto';
          } else {
            newMode = 'light';
          }
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
      themeMode,
      setThemeMode: (mode) => {
        setThemeMode(mode);
        localStorage.setItem('themeMode', mode);
      },
      actualTheme,
    }),
    [themeMode, actualTheme],
  );

  const theme = useMemo(
    () =>
      createTheme({
  palette: {
    mode: actualTheme,
    ...(actualTheme === 'light'
      ? {
          // Light mode colors
          primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
          },
          secondary: {
            main: '#dc004e',
          },
          background: {
            default: '#f5f5f5',
            paper: '#ffffff',
          },
          text: {
            primary: '#1a1a1a',
            secondary: '#666666',
          },
        }
      : {
          // Dark mode colors
          primary: {
            main: '#90caf9',
            light: '#e3f2fd',
            dark: '#42a5f5',
          },
          secondary: {
            main: '#f48fb1',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#ffffff',
            secondary: '#aaaaaa',
          },
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
  },
}),
    [actualTheme],
  );

  return (
    <LanguageProvider>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </ColorModeContext.Provider>
    </LanguageProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);