import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      
      // Don't reload for shared book pages (public access)
      if (!window.location.pathname.startsWith('/share/')) {
        window.location.reload();
      }
    } else if (error.response?.status === 429) {
      // Rate limited - show user-friendly message
      console.warn('Rate limited - too many requests');
    } else if (error.response?.status === 503 && error.response?.data?.offline) {
      // Offline response from service worker
      console.log('Offline mode detected');
      
      // Add offline flag to error for UI handling
      error.offline = true;
      
      // Dispatch custom event for offline notification
      const offlineEvent = new CustomEvent('offline-api-call', {
        detail: { url: error.config?.url, method: error.config?.method }
      });
      window.dispatchEvent(offlineEvent);
    } else if (!navigator.onLine || error.code === 'NETWORK_ERROR') {
      // Network is offline or network error
      console.log('Network offline or unreachable');
      
      error.offline = true;
      error.message = 'Keine Internetverbindung verfügbar';
      
      // Dispatch offline event
      const offlineEvent = new CustomEvent('network-offline', {
        detail: { error: error.message }
      });
      window.dispatchEvent(offlineEvent);
    }
    
    return Promise.reject(error);
  }
);

// Enhanced API methods with offline handling
const enhancedApi = {
  ...api,
  
  // Get with offline fallback
  async getWithOfflineSupport(url, config = {}) {
    try {
      const response = await api.get(url, config);
      
      // Store successful responses in localStorage for offline access
      if (response.data && config.cacheKey) {
        localStorage.setItem(`cache_${config.cacheKey}`, JSON.stringify({
          data: response.data,
          timestamp: Date.now(),
          url: url
        }));
      }
      
      return response;
    } catch (error) {
      // If offline and we have cached data, return it
      if ((error.offline || !navigator.onLine) && config.cacheKey) {
        const cached = localStorage.getItem(`cache_${config.cacheKey}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          console.log(`Using cached data for ${url}`);
          
          return {
            data: cachedData.data,
            status: 200,
            statusText: 'OK (Cached)',
            headers: {},
            config: config,
            request: {},
            fromCache: true
          };
        }
      }
      throw error;
    }
  },

  // Check if data is available offline
  hasOfflineData(cacheKey) {
    const cached = localStorage.getItem(`cache_${cacheKey}`);
    if (cached) {
      const cachedData = JSON.parse(cached);
      const age = Date.now() - cachedData.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      return age < maxAge;
    }
    return false;
  },

  // Clear offline cache
  clearOfflineCache(cacheKey = null) {
    if (cacheKey) {
      localStorage.removeItem(`cache_${cacheKey}`);
    } else {
      // Clear all cache keys
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
      keys.forEach(key => localStorage.removeItem(key));
    }
  },

  // Get offline cache info
  getOfflineCacheInfo() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
    const cacheInfo = keys.map(key => {
      const cached = JSON.parse(localStorage.getItem(key));
      return {
        key: key.replace('cache_', ''),
        url: cached.url,
        timestamp: new Date(cached.timestamp),
        age: Date.now() - cached.timestamp,
        size: JSON.stringify(cached.data).length
      };
    });

    return {
      entries: cacheInfo,
      totalSize: cacheInfo.reduce((total, entry) => total + entry.size, 0),
      count: cacheInfo.length
    };
  }
};

export default enhancedApi;
export { api as basicApi };