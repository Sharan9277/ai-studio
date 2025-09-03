import { GenerateResponse } from './mockApi';

const STORAGE_KEY = 'ai-studio-history';
const MAX_HISTORY_ITEMS = 5;

export interface HistoryItem extends GenerateResponse {}

class HistoryService {
  private validateHistoryItem(item: any): item is HistoryItem {
    return (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.imageUrl === 'string' &&
      typeof item.prompt === 'string' &&
      typeof item.style === 'string' &&
      typeof item.createdAt === 'string' &&
      item.id.length > 0 &&
      item.imageUrl.length > 0 &&
      item.style.length > 0
    );
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private safeLocalStorageOperation<T>(
    operation: () => T,
    fallback: T,
    errorMessage: string
  ): T {
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage is not available');
      return fallback;
    }

    try {
      return operation();
    } catch (error) {
      console.error(errorMessage, error);

      // Handle quota exceeded errors
      if (error instanceof DOMException && error.code === 22) {
        console.warn('localStorage quota exceeded, attempting to free space');
        this.clearOldHistory();
        try {
          return operation();
        } catch (retryError) {
          console.error(
            'Failed to retry after clearing old history:',
            retryError
          );
        }
      }

      return fallback;
    }
  }

  private clearOldHistory(): void {
    try {
      // Try to keep only the most recent item
      const history = this.getHistory();
      if (history.length > 1) {
        const mostRecent = history.slice(0, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mostRecent));
      }
    } catch (error) {
      console.error('Failed to clear old history:', error);
      // Last resort - clear everything
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (removeError) {
        console.error('Failed to clear history completely:', removeError);
      }
    }
  }

  getHistory(): HistoryItem[] {
    return this.safeLocalStorageOperation(
      () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];

        const parsed = JSON.parse(stored);

        // Validate that parsed data is an array
        if (!Array.isArray(parsed)) {
          console.warn('History data is not an array, resetting');
          return [];
        }

        // Validate each item and filter out invalid ones
        const validItems = parsed.filter((item, index) => {
          const isValid = this.validateHistoryItem(item);
          if (!isValid) {
            console.warn(`Invalid history item at index ${index}:`, item);
          }
          return isValid;
        });

        // If we had to filter out items, save the cleaned version
        if (validItems.length !== parsed.length) {
          console.info(
            `Cleaned history: removed ${parsed.length - validItems.length} invalid items`
          );
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validItems));
          } catch (error) {
            console.error('Failed to save cleaned history:', error);
          }
        }

        return validItems;
      },
      [],
      'Error reading history from localStorage:'
    );
  }

  addToHistory(item: GenerateResponse): void {
    // Validate the item before adding
    if (!this.validateHistoryItem(item)) {
      console.error('Invalid history item, not adding:', item);
      return;
    }

    this.safeLocalStorageOperation(
      () => {
        const history = this.getHistory();

        // Remove item if it already exists (by id)
        const filteredHistory = history.filter((h) => h.id !== item.id);

        // Add new item to beginning
        const updatedHistory = [item, ...filteredHistory];

        // Keep only the last MAX_HISTORY_ITEMS items
        const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

        const serialized = JSON.stringify(trimmedHistory);

        // Check if the serialized data is reasonable size (< 5MB)
        if (serialized.length > 5 * 1024 * 1024) {
          console.warn('History data is very large, trimming further');
          const furtherTrimmed = trimmedHistory.slice(
            0,
            Math.max(1, MAX_HISTORY_ITEMS - 2)
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(furtherTrimmed));
        } else {
          localStorage.setItem(STORAGE_KEY, serialized);
        }

        // Dispatch custom event for real-time updates
        this.dispatchHistoryUpdate(trimmedHistory);

        return true;
      },
      false,
      'Error saving to history:'
    );
  }

  private dispatchHistoryUpdate(history: HistoryItem[]): void {
    try {
      window.dispatchEvent(
        new CustomEvent('historyUpdated', {
          detail: history,
        })
      );
    } catch (error) {
      console.error('Failed to dispatch history update event:', error);
    }
  }

  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(
        new CustomEvent('historyUpdated', {
          detail: [],
        })
      );
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }

  removeFromHistory(id: string): void {
    try {
      const history = this.getHistory();
      const updatedHistory = history.filter((item) => item.id !== id);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));

      window.dispatchEvent(
        new CustomEvent('historyUpdated', {
          detail: updatedHistory,
        })
      );
    } catch (error) {
      console.error('Error removing from history:', error);
    }
  }

  // Hook for React components to listen to history changes
  useHistoryUpdates(callback: (history: HistoryItem[]) => void): () => void {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<HistoryItem[]>;
      callback(customEvent.detail);
    };

    window.addEventListener('historyUpdated', handleUpdate);

    // Return cleanup function
    return () => {
      window.removeEventListener('historyUpdated', handleUpdate);
    };
  }
}

export const historyService = new HistoryService();
