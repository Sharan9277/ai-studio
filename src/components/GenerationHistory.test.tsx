import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenerationHistory from './GenerationHistory';
import { historyService, HistoryItem } from '../services/historyService';

// Mock the historyService
jest.mock('../services/historyService', () => ({
  historyService: {
    getHistory: jest.fn(),
    clearHistory: jest.fn(),
    useHistoryUpdates: jest.fn(),
  },
}));

const mockHistoryService = historyService as jest.Mocked<typeof historyService>;

describe('GenerationHistory', () => {
  const mockOnHistoryItemSelect = jest.fn();

  const sampleHistoryItem: HistoryItem = {
    id: 'test-1',
    imageUrl: 'https://example.com/image1.jpg',
    prompt: 'A beautiful landscape',
    style: 'editorial',
    createdAt: '2023-01-01T12:00:00.000Z',
  };

  const sampleHistoryItems: HistoryItem[] = [
    sampleHistoryItem,
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
      prompt: '',
      style: 'cyberpunk',
      createdAt: '2023-01-01T14:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnHistoryItemSelect.mockClear();
    mockHistoryService.useHistoryUpdates.mockReturnValue(() => {});
  });

  test('renders empty state when no history items', () => {
    mockHistoryService.getHistory.mockReturnValue([]);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    expect(screen.getByText('📚 Generation History')).toBeInTheDocument();
    expect(screen.getByText('🎭 No generations yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Your recent AI generations will appear here.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
  });

  test('renders history items when available', () => {
    mockHistoryService.getHistory.mockReturnValue(sampleHistoryItems);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    expect(screen.getByText('📚 Generation History')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
    expect(screen.getByText('A beautiful landscape')).toBeInTheDocument();
    expect(screen.getByText('Modern architecture')).toBeInTheDocument();
    expect(screen.getByText('No prompt')).toBeInTheDocument(); // Empty prompt case
    expect(
      screen.getByText('Showing last 3 of 3 generations')
    ).toBeInTheDocument();
  });

  test('displays correct style labels', () => {
    mockHistoryService.getHistory.mockReturnValue(sampleHistoryItems);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    expect(screen.getByText('Editorial')).toBeInTheDocument();
    expect(screen.getByText('Minimalist')).toBeInTheDocument();
    expect(screen.getByText('Cyberpunk')).toBeInTheDocument();
  });

  test('formats dates correctly', () => {
    mockHistoryService.getHistory.mockReturnValue([sampleHistoryItem]);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    // The exact format depends on locale, but should contain date elements
    const timeElement = screen.getByText(/Jan|12|PM/);
    expect(timeElement).toBeInTheDocument();
  });

  test('calls onHistoryItemSelect when item is clicked', async () => {
    mockHistoryService.getHistory.mockReturnValue([sampleHistoryItem]);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    const historyItem = screen.getByRole('button', {
      name: /Restore generation: A beautiful landscape with Editorial style/,
    });
    userEvent.click(historyItem);

    expect(mockOnHistoryItemSelect).toHaveBeenCalledWith(sampleHistoryItem);
  });

  test('calls onHistoryItemSelect when item is activated with keyboard', async () => {
    mockHistoryService.getHistory.mockReturnValue([sampleHistoryItem]);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    const historyItem = screen.getByRole('button', {
      name: /Restore generation: A beautiful landscape with Editorial style/,
    });

    historyItem.focus();
    userEvent.keyboard('{Enter}');

    expect(mockOnHistoryItemSelect).toHaveBeenCalledWith(sampleHistoryItem);

    mockOnHistoryItemSelect.mockClear();

    userEvent.keyboard(' ');
    expect(mockOnHistoryItemSelect).toHaveBeenCalledWith(sampleHistoryItem);
  });

  test('shows confirm dialog when clearing history', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockHistoryService.getHistory.mockReturnValue(sampleHistoryItems);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    const clearButton = screen.getByRole('button', {
      name: 'Clear all history',
    });
    userEvent.click(clearButton);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to clear all history?'
    );
    expect(mockHistoryService.clearHistory).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  test('does not clear history when user cancels confirm dialog', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    mockHistoryService.getHistory.mockReturnValue(sampleHistoryItems);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    const clearButton = screen.getByRole('button', {
      name: 'Clear all history',
    });
    userEvent.click(clearButton);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to clear all history?'
    );
    expect(mockHistoryService.clearHistory).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  test('handles image load errors gracefully', () => {
    mockHistoryService.getHistory.mockReturnValue([sampleHistoryItem]);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    const image = screen.getByAltText('Generated with Editorial style');

    // Simulate image load error
    fireEvent.error(image);

    // Image should now have a fallback src
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('data:image/svg+xml')
    );
  });

  test('updates history when historyService notifies of changes', async () => {
    const updatedItems = [
      ...sampleHistoryItems,
      {
        id: 'test-4',
        imageUrl: 'https://example.com/image4.jpg',
        prompt: 'New generation',
        style: 'vintage' as const,
        createdAt: '2023-01-01T15:00:00.000Z',
      },
    ];

    let updateCallback: (history: HistoryItem[]) => void = () => {};
    mockHistoryService.useHistoryUpdates.mockImplementation((callback) => {
      updateCallback = callback;
      return () => {};
    });

    mockHistoryService.getHistory.mockReturnValue(sampleHistoryItems);

    const { rerender } = render(
      <GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />
    );

    expect(
      screen.getByText('Showing last 3 of 3 generations')
    ).toBeInTheDocument();

    // Simulate history update
    updateCallback(updatedItems);
    rerender(
      <GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />
    );

    await waitFor(() => {
      expect(screen.getByText('New generation')).toBeInTheDocument();
      expect(
        screen.getByText('Showing last 4 of 4 generations')
      ).toBeInTheDocument();
    });
  });

  test('cleans up history listener on unmount', () => {
    const cleanupMock = jest.fn();
    mockHistoryService.useHistoryUpdates.mockReturnValue(cleanupMock);
    mockHistoryService.getHistory.mockReturnValue([]);

    const { unmount } = render(
      <GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />
    );

    unmount();

    expect(cleanupMock).toHaveBeenCalled();
  });

  test('handles empty prompt correctly', () => {
    const itemWithEmptyPrompt = {
      ...sampleHistoryItem,
      prompt: '',
    };
    mockHistoryService.getHistory.mockReturnValue([itemWithEmptyPrompt]);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    expect(screen.getByText('No prompt')).toBeInTheDocument();

    const historyItem = screen.getByRole('button', {
      name: /Restore generation: No prompt with Editorial style/,
    });
    expect(historyItem).toBeInTheDocument();
  });

  test('displays correct accessible labels for all style options', () => {
    const allStylesItems: HistoryItem[] = [
      { ...sampleHistoryItem, id: '1', style: 'editorial' },
      {
        ...sampleHistoryItem,
        id: '2',
        style: 'streetwear',
        prompt: 'Streetwear prompt',
      },
      {
        ...sampleHistoryItem,
        id: '3',
        style: 'vintage',
        prompt: 'Vintage prompt',
      },
      {
        ...sampleHistoryItem,
        id: '4',
        style: 'minimalist',
        prompt: 'Minimalist prompt',
      },
      {
        ...sampleHistoryItem,
        id: '5',
        style: 'cyberpunk',
        prompt: 'Cyberpunk prompt',
      },
    ];

    mockHistoryService.getHistory.mockReturnValue(allStylesItems);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    expect(
      screen.getByRole('button', { name: /Editorial style/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Streetwear style/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Vintage style/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Minimalist style/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cyberpunk style/ })
    ).toBeInTheDocument();
  });

  test('history container has correct scrolling behavior', () => {
    mockHistoryService.getHistory.mockReturnValue(sampleHistoryItems);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    // Find the scrollable container by looking for common scroll container selectors
    const scrollableContainers = document.querySelectorAll('[style*="overflow"], [style*="maxHeight"]');
    expect(scrollableContainers.length).toBeGreaterThan(0);
  });

  test('handles keyboard navigation correctly', async () => {
    mockHistoryService.getHistory.mockReturnValue(sampleHistoryItems);

    render(<GenerationHistory onHistoryItemSelect={mockOnHistoryItemSelect} />);

    // Should be able to tab through history items
    userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'Clear all history' })
    ).toHaveFocus();

    userEvent.tab();
    expect(
      screen.getByRole('button', { name: /Editorial style/ })
    ).toHaveFocus();

    userEvent.tab();
    expect(
      screen.getByRole('button', { name: /Minimalist style/ })
    ).toHaveFocus();
  });
});
