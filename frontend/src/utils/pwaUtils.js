// PWA utility functions for Lectoria

// Register service worker
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available, show update prompt
                showUpdatePrompt();
              }
            });
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Unregister service worker
export const unregisterServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
};

// Show update prompt when new SW version is available
const showUpdatePrompt = () => {
  const updateBanner = document.createElement('div');
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1976d2;
      color: white;
      padding: 16px;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <span>Neue Version verfügbar!</span>
      <button onclick="window.location.reload()" style="
        margin-left: 16px;
        background: white;
        color: #1976d2;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">
        Aktualisieren
      </button>
      <button onclick="this.parentElement.remove()" style="
        margin-left: 8px;
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">
        Später
      </button>
    </div>
  `;
  document.body.appendChild(updateBanner);
};

// PWA installation prompt
let deferredPrompt;

export const setupPWAInstall = (onInstallPromptAvailable) => {
  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt available');
    
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Notify the component that install is available
    if (onInstallPromptAvailable) {
      onInstallPromptAvailable(true);
    }
  });

  // Listen for installation completion
  window.addEventListener('appinstalled', (e) => {
    console.log('PWA was installed');
    deferredPrompt = null;
    
    if (onInstallPromptAvailable) {
      onInstallPromptAvailable(false);
    }
  });
};

// Show PWA install prompt
export const showPWAInstallPrompt = async () => {
  if (!deferredPrompt) {
    console.log('No PWA install prompt available');
    return false;
  }

  // Show the prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);

  // Clear the deferredPrompt variable
  deferredPrompt = null;

  return outcome === 'accepted';
};

// Check if app is running in standalone mode (installed as PWA)
export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
};

// Check if app is installable
export const canInstall = () => {
  return deferredPrompt !== null;
};

// Get network status
export const getNetworkStatus = () => {
  return {
    online: navigator.onLine,
    connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection
  };
};

// Listen for network status changes
export const setupNetworkListener = (onNetworkChange) => {
  const updateNetworkStatus = () => {
    onNetworkChange(getNetworkStatus());
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', updateNetworkStatus);
    window.removeEventListener('offline', updateNetworkStatus);
  };
};

// Cache management utilities
export const clearCache = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  }
};

export const getCacheSize = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  }
  return 0;
};

// Format cache size for display
export const formatCacheSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};