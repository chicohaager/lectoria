// PWAManager.js - PWA installation and offline status management
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Button,
  Snackbar,
  Alert,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  InstallMobile,
  CloudOff,
  CloudDone,
  Storage,
  Download,
  Smartphone,
  Computer,
  Refresh,
  Clear,
} from '@mui/icons-material';
import {
  registerServiceWorker,
  setupPWAInstall,
  showPWAInstallPrompt,
  isStandalone,
  setupNetworkListener,
  clearCache,
  getCacheSize,
  formatCacheSize,
} from '../utils/pwaUtils';

function PWAManager({ showInstallButton = true }) {
  const { t } = useLanguage();
  const [installAvailable, setInstallAvailable] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({ online: true });
  const [showOfflineSnack, setShowOfflineSnack] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Setup PWA install handling
    setupPWAInstall((available) => {
      console.log('[PWA] Install prompt availability changed:', available);
      setInstallAvailable(available);
    });

    // Always show PWA functionality (since many browsers don't trigger the prompt immediately)
    setInstallAvailable(true);
    setDebugMode(true);
    console.log('[PWA] PWA Manager enabled - install button always visible');

    // Setup network status monitoring
    const cleanupNetworkListener = setupNetworkListener((status) => {
      console.log('[PWA] Network status changed:', status);
      setNetworkStatus(status);
      
      if (!status.online) {
        setShowOfflineSnack(true);
      }
    });

    // Load initial cache size
    loadCacheSize();

    return cleanupNetworkListener;
  }, []);

  const loadCacheSize = async () => {
    setCacheLoading(true);
    try {
      const size = await getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('Failed to get cache size:', error);
    } finally {
      setCacheLoading(false);
    }
  };

  const handleInstall = async () => {
    try {
      const installed = await showPWAInstallPrompt();
      
      if (installed) {
        console.log('PWA installed successfully');
        setShowInstallDialog(false);
        
        // Show success message
        const event = new CustomEvent('showSuccess', {
          detail: t('pwa.installSuccess')
        });
        window.dispatchEvent(event);
      } else {
        console.log('PWA installation cancelled or failed');
        // Don't close dialog, show manual instructions instead
      }
    } catch (error) {
      console.log('PWA installation prompt not available:', error);
      // Keep dialog open to show manual instructions
    }
  };

  const handleClearCache = async () => {
    setCacheLoading(true);
    try {
      await clearCache();
      setCacheSize(0);
      
      // Show success message
      const event = new CustomEvent('showSuccess', {
        detail: t('pwa.cacheCleared')
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
      
      const event = new CustomEvent('showError', {
        detail: t('pwa.cacheClearError')
      });
      window.dispatchEvent(event);
    } finally {
      setCacheLoading(false);
      setShowInstallDialog(false);
    }
  };

  // Don't show install button if already installed or not available
  const shouldShowInstallButton = showInstallButton && 
                                 (installAvailable || debugMode) && 
                                 !isStandalone();
  
  // Debug logging
  if (debugMode) {
    console.log('[PWA] Render state:', {
      showInstallButton,
      installAvailable,
      isStandalone: isStandalone(),
      shouldShowInstallButton
    });
  }

  return (
    <>
      {/* Install Button */}
      {shouldShowInstallButton && (
        <Button
          variant="outlined"
          startIcon={<InstallMobile />}
          onClick={() => setShowInstallDialog(true)}
          size="small"
          sx={{ ml: 1 }}
        >
          {t('pwa.installButton')}
        </Button>
      )}

      {/* Network Status Indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
        {networkStatus.online ? (
          <Chip
            icon={<CloudDone />}
            label="Online"
            color="success"
            size="small"
            variant="filled"
            sx={{
              backgroundColor: '#2e7d32',
              color: 'white',
              '& .MuiChip-icon': {
                color: 'white'
              }
            }}
          />
        ) : (
          <Chip
            icon={<CloudOff />}
            label={t('pwa.offline')}
            color="warning"
            size="small"
            variant="filled"
          />
        )}
      </Box>

      {/* Offline Notification */}
      <Snackbar
        open={showOfflineSnack}
        autoHideDuration={6000}
        onClose={() => setShowOfflineSnack(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowOfflineSnack(false)}
          severity="warning"
          sx={{ width: '100%' }}
        >
          {t('pwa.offlineMessage')}
        </Alert>
      </Snackbar>

      {/* Install Dialog */}
      <Dialog
        open={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InstallMobile color="primary" />
            {t('pwa.installButton')}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph>
            {t('pwa.installDescription')}
          </Typography>

          <Typography variant="body2" sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <strong>{t('pwa.manualInstallTitle')}</strong><br/>
            • <strong>Chrome/Edge (Desktop):</strong> {t('pwa.chromeDesktop')}<br/>
            • <strong>Chrome (Android):</strong> {t('pwa.chromeAndroid')}<br/>
            • <strong>Safari (iOS):</strong> {t('pwa.safariIOS')}<br/>
            • <strong>Firefox:</strong> {t('pwa.firefox')}<br/>
            • <strong>Safari (macOS):</strong> {t('pwa.safariMacOS')}
          </Typography>

          <Typography variant="body2" sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <strong>{t('pwa.afterInstallTitle')}</strong><br/>
            • {t('pwa.afterInstall1')}<br/>
            • {t('pwa.afterInstall2')}<br/>
            • {t('pwa.afterInstall3')}<br/>
            • {t('pwa.afterInstall4')}
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <Smartphone />
              </ListItemIcon>
              <ListItemText
                primary={t('pwa.quickAccess')}
                secondary={t('pwa.quickAccessDesc')}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CloudOff />
              </ListItemIcon>
              <ListItemText
                primary={t('pwa.offlineFunctionality')}
                secondary={t('pwa.offlineLibrary')}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <Computer />
              </ListItemIcon>
              <ListItemText
                primary={t('pwa.nativeExperience')}
                secondary={t('pwa.nativeExperienceDesc')}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Storage />
              </ListItemIcon>
              <ListItemText
                primary={t('pwa.cacheManagement')}
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography variant="body2">
                      {t('pwa.currentCache')}: {formatCacheSize(cacheSize)}
                    </Typography>
                    {cacheLoading && <LinearProgress size={20} />}
                  </Box>
                }
              />
            </ListItem>
          </List>

          {cacheSize > 0 && (
            <Box sx={{ mt: 2 }}>
              <Button
                startIcon={<Clear />}
                onClick={handleClearCache}
                disabled={cacheLoading}
                size="small"
              >
                {t('pwa.clearCache')}
              </Button>
            </Box>
          )}

          {isStandalone() && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t('pwa.alreadyInstalled')}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ flexDirection: 'column', gap: 1, alignItems: 'stretch' }}>
          {isStandalone() ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => window.location.reload()}
                fullWidth
              >
                {t('pwa.reloadApp')}
              </Button>
              <Button onClick={() => setShowInstallDialog(false)} fullWidth>
                {t('pwa.close')}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
              {installAvailable && !debugMode && (
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={handleInstall}
                  fullWidth
                >
                  {t('pwa.autoInstall')}
                </Button>
              )}
              
              <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ my: 1 }}>
                {t('pwa.orUseManual')}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    // Copy current URL to clipboard for easy sharing/bookmarking
                    navigator.clipboard?.writeText(window.location.href);
                    const event = new CustomEvent('showSuccess', {
                      detail: t('pwa.urlCopied')
                    });
                    window.dispatchEvent(event);
                  }}
                  size="small"
                >
                  {t('pwa.copyUrl')}
                </Button>
                
                <Button onClick={() => setShowInstallDialog(false)} size="small">
                  {t('pwa.later')}
                </Button>
              </Box>
            </Box>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

export default PWAManager;