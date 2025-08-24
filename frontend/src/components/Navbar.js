import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  LibraryBooks,
  Dashboard,
  CloudUpload,
  People,
  AccountCircle,
  Brightness4,
  Brightness7,
  SettingsBrightness,
  Settings,
  Translate,
} from '@mui/icons-material';
import { ColorModeContext } from '../index';
import { useLanguage } from '../contexts/LanguageContext';
import PWAManager from './PWAManager';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const { language, toggleLanguage, t } = useLanguage();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout();
  };

  const menuItems = [
    { path: '/', label: t('nav.dashboard'), icon: <Dashboard /> },
    { path: '/upload', label: t('nav.upload'), icon: <CloudUpload /> },
  ];

  if (user.role === 'admin') {
    menuItems.push({ path: '/users', label: t('nav.users'), icon: <People /> });
    menuItems.push({ path: '/admin', label: t('nav.settings'), icon: <Settings /> });
  }

  return (
    <AppBar 
      position="static" 
      elevation={0} 
      sx={{ 
        borderBottom: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.primary.main,
      }}
      component="nav"
      role="navigation"
      aria-label="Hauptnavigation"
      id="navigation"
    >
      <Toolbar>
        <Box
          component="img"
          src="/logo.png"
          alt="Lectoria Logo"
          sx={{ 
            width: 32, 
            height: 32, 
            mr: 2,
            borderRadius: 1,
          }}
          onError={(e) => {
            // Fallback to icon if logo fails to load
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'inline-block';
          }}
        />
        <LibraryBooks sx={{ mr: 2, display: 'none' }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Lectoria
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mr: 2 }} role="navigation" aria-label="Hauptmenü">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              variant={location.pathname === item.path ? 'contained' : 'text'}
              aria-current={location.pathname === item.path ? 'page' : undefined}
              aria-label={`Navigiere zu ${item.label}`}
              sx={{
                backgroundColor: location.pathname === item.path 
                  ? theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.1)' 
                    : 'rgba(255,255,255,0.2)'
                  : 'transparent',
                color: theme.palette.mode === 'dark' ? 'inherit' : 'white',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.2)' 
                    : 'rgba(255,255,255,0.3)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Language Toggle */}
          <Button
            color="inherit"
            onClick={toggleLanguage}
            title={language === 'en' ? 'Zu Deutsch wechseln' : 'Switch to English'}
            variant="outlined"
            size="small"
            sx={{
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)',
              color: theme.palette.mode === 'dark' ? 'white' : 'white',
              minWidth: '70px',
              fontSize: '16px',
              '&:hover': {
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.7)',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.1)' 
                  : 'rgba(255,255,255,0.2)',
              },
            }}
          >
            {language === 'en' ? '🇺🇸 EN' : '🇩🇪 DE'}
          </Button>

          {/* Theme Mode Toggle */}
          <IconButton
            color="inherit"
            onClick={colorMode.toggleColorMode}
            title={
              colorMode.themeMode === 'auto' 
                ? `Automatisch (${theme.palette.mode === 'dark' ? 'Dunkel' : 'Hell'})`
                : colorMode.themeMode === 'dark' 
                  ? 'Dunkles Theme' 
                  : 'Helles Theme'
            }
          >
            {colorMode.themeMode === 'auto' ? (
              <SettingsBrightness />
            ) : theme.palette.mode === 'dark' ? (
              <Brightness4 />
            ) : (
              <Brightness7 />
            )}
          </IconButton>

          {/* PWA Manager */}
          <PWAManager />

          <Chip
            label={user.role === 'admin' ? t('nav.admin') : t('nav.user')}
            size="small"
            color={user.role === 'admin' ? 'secondary' : 'default'}
            variant={theme.palette.mode === 'dark' ? 'outlined' : 'filled'}
            sx={{ 
              color: theme.palette.mode === 'dark' ? 'white' : 'white',
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'transparent',
              backgroundColor: theme.palette.mode === 'light' && user.role === 'admin' 
                ? 'rgba(255,255,255,0.2)' 
                : theme.palette.mode === 'light' 
                  ? 'rgba(255,255,255,0.15)' 
                  : 'transparent',
            }}
          />
          
          <Button
            color="inherit"
            onClick={handleMenu}
            startIcon={<Avatar sx={{ width: 24, height: 24 }}><AccountCircle /></Avatar>}
          >
            {user.username}
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleLogout}>{t('nav.logout')}</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;