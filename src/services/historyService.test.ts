import { historyService } from './historyService';
import { GenerateResponse } from './mockApi';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
});

describe('HistoryService', () => {
  const sampleItem: GenerateResponse = {
    id: 'test-1',
    imageUrl: 'https://example.com/image1.jpg',
    prompt: 'A beautiful landscape',
    style: 'editorial',
    createdAt: '2023-01-01T12:00:00.000Z',
  };

  const sampleItems: GenerateResponse[] = [
    sampleItem,
    {
      id: 'test-2',
      imageUrl: 'https://example.com/image2.jpg',
      prompt: 'Modern architecture',
      style: 'minimalist',
      createdAt: '2023-01-01T13:00:00.000Z',
    },
    {
      id: 'test-3',
      imageUrl: 'https://example.com/image3.jpg',
      prompt: 'Cyberpunk scene',
      style: 'cyberpunk',
      createdAt: '2023-01-01T14:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('getHistory', () => {
    test('returns empty array when no history exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const history = historyService.getHistory();

      expect(history).toEqual([]);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        'ai-studio-history'
      );
    });

    test('returns parsed history when data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(sampleItems));

      const history = historyService.getHistory();

      expect(history).toEqual(sampleItems);
    });

    test('returns empty array when localStorage contains invalid JSON', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const history = historyService.getHistory();

      expect(history).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error reading history from localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const history = historyService.getHistory();

      expect(history).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error reading history from localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('addToHistory', () => {
    test('adds new item to empty history', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      historyService.addToHistory(sampleItem);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ai-studio-history',
        JSON.stringify([sampleItem])
      );
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'historyUpdated',
          detail: [sampleItem],
        })
      );
    });

    test('adds new item to beginning of existing history', () => {
      const existingHistory = [sampleItems[1]];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingHistory));

      historyService.addToHistory(sampleItem);

      const expectedHistory = [sampleItem, sampleItems[1]];
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ai-studio-history',
        JSON.stringify(expectedHistory)
      );
    });

    test('removes duplicate items when adding existing id', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(sampleItems));

      const updatedItem = { ...sampleItem, prompt: 'Updated prompt' };
      historyService.addToHistory(updatedItem);

      // Should remove old item and add updated one to beginning
      const expectedHistory = [updatedItem, sampleItems[1], sampleItems[2]];
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ai-studio-history',
        JSON.stringify(expectedHistory)
      );
    });

    test('limits history to MAX_HISTORY_ITEMS', () => {
      // Create 6 items (more than the limit of 5)
      const manyItems = Array.from({ length: 6 }, (_, i) => ({
        ...sampleItem,
        id: `item-${i}`,
        prompt: `Item ${i}`,
      }));

      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify(manyItems.slice(0, 5))
      );

      const newItem = { ...sampleItem, id: 'new-item', prompt: 'New item' };
      historyService.addToHistory(newItem);

      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      const savedHistory = JSON.parse(setItemCall[1]);

      expect(savedHistory).toHaveLength(5);
      expect(savedHistory[0]).toEqual(newItem);
      expect(savedHistory[savedHistory.length - 1]).not.toEqual(manyItems[4]);
    });

    test('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]));
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      historyService.addToHistory(sampleItem);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error saving to history:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clearHistory', () => {
    test('removes history from localStorage', () => {
      historyService.clearHistory();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'ai-studio-history'
      );
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'historyUpdated',
          detail: [],
        })
      );
    });

    test('handles localStorage errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      historyService.clearHistory();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error clearing history:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('removeFromHistory', () => {
    test('removes specific item from history', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(sampleItems));

      historyService.removeFromHistory('test-2');

      const expectedHistory = [sampleItems[0], sampleItems[2]];
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ai-studio-history',
        JSON.stringify(expectedHistory)
      );
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'historyUpdated',
          detail: expectedHistory,
        })
      );
    });

    test('handles removal of non-existent item', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(sampleItems));

      historyService.removeFromHistory('non-existent');

      // Should save unchanged history
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ai-studio-history',
        JSON.stringify(sampleItems)
      );
    });

    test('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(sampleItems));
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      historyService.removeFromHistory('test-1');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error removing from history:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('useHistoryUpdates', () => {
    test('registers event listener and returns cleanup function', () => {
      const mockCallback = jest.fn();
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const cleanup = historyService.useHistoryUpdates(mockCallback);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'historyUpdated',
        expect.any(Function)
      );

      // Test cleanup function
      cleanup();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'historyUpdated',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    test('calls callback when history event is dispatched', () => {
      const mockCallback = jest.fn();
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      historyService.useHistoryUpdates(mockCallback);

      // Get the event handler that was registered
      const eventHandler = addEventListenerSpy.mock
        .calls[0][1] as EventListener;

      // Create a custom event and call the handler
      const customEvent = new CustomEvent('historyUpdated', {
        detail: sampleItems,
      });

      eventHandler(customEvent);

      expect(mockCallback).toHaveBeenCalledWith(sampleItems);

      addEventListenerSpy.mockRestore();
    });
  });

  describe('integration tests', () => {
    test('complete workflow: add, remove, clear', () => {
      // Start with empty history
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(historyService.getHistory()).toEqual([]);

      // Add items
      historyService.addToHistory(sampleItems[0]);
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify([sampleItems[0]])
      );
      expect(historyService.getHistory()).toEqual([sampleItems[0]]);

      historyService.addToHistory(sampleItems[1]);
      const twoItems = [sampleItems[1], sampleItems[0]];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(twoItems));
      expect(historyService.getHistory()).toEqual(twoItems);

      // Remove item
      historyService.removeFromHistory(sampleItems[0].id);
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify([sampleItems[1]])
      );
      expect(historyService.getHistory()).toEqual([sampleItems[1]]);

      // Clear all
      historyService.clearHistory();
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(historyService.getHistory()).toEqual([]);
    });

    test('dispatches events for all operations', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      // Add item
      historyService.addToHistory(sampleItem);
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'historyUpdated',
          detail: [sampleItem],
        })
      );

      mockDispatchEvent.mockClear();

      // Remove item
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([sampleItem]));
      historyService.removeFromHistory(sampleItem.id);
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'historyUpdated',
          detail: [],
        })
      );

      mockDispatchEvent.mockClear();

      // Clear history
      historyService.clearHistory();
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'historyUpdated',
          detail: [],
        })
      );
    });

    test('maintains chronological order', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      // Add items in reverse chronological order
      historyService.addToHistory(sampleItems[2]); // Latest
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify([sampleItems[2]])
      );

      historyService.addToHistory(sampleItems[1]); // Middle
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify([sampleItems[1], sampleItems[2]])
      );

      historyService.addToHistory(sampleItems[0]); // Oldest
      const expectedOrder = [sampleItems[0], sampleItems[1], sampleItems[2]];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expectedOrder));

      expect(historyService.getHistory()).toEqual(expectedOrder);
    });
  });
});
