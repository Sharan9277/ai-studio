import { useState, useEffect, useCallback } from 'react';
import { NetworkValidator } from '../utils/validation';

interface OfflineState {
  isOnline: boolean;
  isConnected: boolean;
  lastChecked: Date | null;
  checkConnectivity: () => Promise<boolean>;
}

export const useOfflineDetection = (): OfflineState => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const connected = await NetworkValidator.checkConnectivity();
      setIsConnected(connected);
      setLastChecked(new Date());
      return connected;
    } catch (error) {
      console.error('Connectivity check failed:', error);
      setIsConnected(false);
      setLastChecked(new Date());
      return false;
    }
  }, []);

  useEffect(() => {
    // Initial connectivity check
    checkConnectivity();

    // Set up network status listeners
    const cleanup = NetworkValidator.onNetworkChange((online) => {
      setIsOnline(online);
      if (online) {
        // When coming back online, check actual connectivity
        checkConnectivity();
      } else {
        setIsConnected(false);
      }
    });

    // Periodic connectivity checks when online
    const interval = setInterval(() => {
      if (isOnline) {
        checkConnectivity();
      }
    }, 30000); // Check every 30 seconds

    // Check connectivity when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline) {
        checkConnectivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanup();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOnline, checkConnectivity]);

  return {
    isOnline,
    isConnected,
    lastChecked,
    checkConnectivity,
  };
};
