import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUpload from './ImageUpload';

// Mock for URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock canvas and context
const mockCanvas = {
  width: 0,
  height: 0,
  toBlob: jest.fn(),
};

const mockContext = {
  drawImage: jest.fn(),
  clearRect: jest.fn(),
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext) as any;

const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    return mockCanvas as any;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock FileReader
class MockFileReader {
  readAsDataURL = jest.fn();
  onload?: () => void;
  result?: string;

  constructor() {
    setTimeout(() => {
      this.result = 'data:image/png;base64,mockdata';
      this.onload?.();
    }, 0);
  }
}

(global as any).FileReader = MockFileReader;

describe('ImageUpload', () => {
  const mockOnImageSelect = jest.fn();

  beforeEach(() => {
    mockOnImageSelect.mockClear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    document.createElement = originalCreateElement;
  });

  test('renders upload area with correct text', () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    expect(screen.getByText('Upload Image')).toBeInTheDocument();
    expect(
      screen.getByText('Drop an image here, or click to browse')
    ).toBeInTheDocument();
    expect(screen.getByText('PNG or JPG up to 10MB')).toBeInTheDocument();
  });

  test('renders current image when provided', () => {
    const currentImage = 'data:image/png;base64,test';
    render(
      <ImageUpload
        onImageSelect={mockOnImageSelect}
        currentImage={currentImage}
      />
    );

    const image = screen.getByAltText('Current upload');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', currentImage);
    expect(screen.getByText('Click to change image')).toBeInTheDocument();
  });

  test('handles file selection via input', async () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    // Mock Image constructor
    const mockImg = {
      onload: jest.fn(),
      width: 800,
      height: 600,
      src: '',
    };

    jest.spyOn(global, 'Image').mockImplementation(() => mockImg as any);

    userEvent.upload(input, file);

    // Trigger image load
    mockImg.onload?.();
    mockCanvas.toBlob.mockImplementation((callback) => {
      callback(new Blob(['processed'], { type: 'image/png' }));
    });

    await waitFor(() => {
      expect(mockOnImageSelect).toHaveBeenCalled();
    });
  });

  test('shows processing state during image processing', async () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    const mockImg = {
      onload: jest.fn(),
      width: 800,
      height: 600,
      src: '',
    };

    jest.spyOn(global, 'Image').mockImplementation(() => mockImg as any);

    userEvent.upload(input, file);

    expect(screen.getByText('Processing image...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('spinner');
  });

  test('rejects non-image files', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    userEvent.upload(input, file);

    expect(alertSpy).toHaveBeenCalledWith(
      'Please select a valid image file (PNG or JPG)'
    );
    expect(mockOnImageSelect).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  test('rejects files larger than 10MB', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    });
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    userEvent.upload(input, largeFile);

    expect(alertSpy).toHaveBeenCalledWith('File size must be less than 10MB');
    expect(mockOnImageSelect).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  test('handles drag and drop', async () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    const uploadArea = screen.getByRole('button');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    // Mock Image constructor
    const mockImg = {
      onload: jest.fn(),
      width: 800,
      height: 600,
      src: '',
    };

    jest.spyOn(global, 'Image').mockImplementation(() => mockImg as any);

    // Simulate drag over
    fireEvent.dragOver(uploadArea, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(uploadArea).toHaveClass('dragging');

    // Simulate drop
    fireEvent.drop(uploadArea, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(uploadArea).not.toHaveClass('dragging');

    // Trigger image load
    mockImg.onload?.();
    mockCanvas.toBlob.mockImplementation((callback) => {
      callback(new Blob(['processed'], { type: 'image/png' }));
    });

    await waitFor(() => {
      expect(mockOnImageSelect).toHaveBeenCalled();
    });
  });

  test('removes dragging class on drag leave', () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    const uploadArea = screen.getByRole('button');

    fireEvent.dragOver(uploadArea);
    expect(uploadArea).toHaveClass('dragging');

    fireEvent.dragLeave(uploadArea);
    expect(uploadArea).not.toHaveClass('dragging');
  });

  test('handles keyboard navigation', async () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    const uploadArea = screen.getByRole('button');

    userEvent.tab();
    expect(uploadArea).toHaveFocus();

    // Test Enter key
    const clickSpy = jest.spyOn(uploadArea, 'click');
    userEvent.keyboard('{Enter}');
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  test('handles image processing errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    // Mock Image constructor to throw error
    jest.spyOn(global, 'Image').mockImplementation(() => {
      throw new Error('Processing error');
    });

    userEvent.upload(input, file);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error processing image:',
      expect.any(Error)
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Error processing image. Please try again.'
    );

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  test('scales down large images', async () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    // Mock large image
    const mockImg = {
      onload: jest.fn(),
      width: 3840, // Larger than max 1920
      height: 2160, // Larger than max 1920
      src: '',
    };

    jest.spyOn(global, 'Image').mockImplementation(() => mockImg as any);

    userEvent.upload(input, file);

    // Trigger image load
    mockImg.onload?.();
    mockCanvas.toBlob.mockImplementation((callback) => {
      callback(new Blob(['processed'], { type: 'image/png' }));
    });

    // Check that canvas dimensions were scaled down
    expect(mockCanvas.width).toBe(1920);
    expect(mockCanvas.height).toBe(1080); // Scaled proportionally
  });

  test('maintains aspect ratio when scaling', async () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />);

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByDisplayValue('') as HTMLInputElement;

    // Mock tall image
    const mockImg = {
      onload: jest.fn(),
      width: 1080,
      height: 3840, // Height is larger than max
      src: '',
    };

    jest.spyOn(global, 'Image').mockImplementation(() => mockImg as any);

    userEvent.upload(input, file);

    mockImg.onload?.();
    mockCanvas.toBlob.mockImplementation((callback) => {
      callback(new Blob(['processed'], { type: 'image/png' }));
    });

    // Should scale based on height constraint
    expect(mockCanvas.width).toBe(540); // Proportionally scaled
    expect(mockCanvas.height).toBe(1920);
  });
});
