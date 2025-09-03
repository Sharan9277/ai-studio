import { GenerateResponse } from './mockApi';

const STORAGE_KEY = 'ai-studio-history';
const MAX_HISTORY_ITEMS = 5;

export interface HistoryItem extends GenerateResponse {}

class HistoryService {
  getHistory(): HistoryItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading history from localStorage:', error);
      return [];
    }
  }

  addToHistory(item: GenerateResponse): void {
    try {
      const history = this.getHistory();
      
      // Remove item if it already exists (by id)
      const filteredHistory = history.filter((h) => h.id !== item.id);
      
      // Add new item to beginning
      const updatedHistory = [item, ...filteredHistory];
      
      // Keep only the last MAX_HISTORY_ITEMS items
      const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
      
      // Dispatch custom event for real-time updates
      window.dispatchEvent(
        new CustomEvent('historyUpdated', {
          detail: trimmedHistory,
        })
      );
    } catch (error) {
      console.error('Error saving to history:', error);
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