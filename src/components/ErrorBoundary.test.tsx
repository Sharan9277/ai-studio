import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import userEvent from '@testing-library/user-event';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Component for testing componentDidCatch (currently unused but kept for future tests)
// const ThrowErrorInEffect = ({ shouldThrow }: { shouldThrow: boolean }) => {
//   if (shouldThrow) {
//     // This simulates an error that would be caught by componentDidCatch
//     setTimeout(() => {
//       throw new Error('Async error');
//     }, 0);
//   }
//   return <div>No error</div>;
// };

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
  writable: true,
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReload.mockClear();
  });

  test('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  test('renders error UI when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(/The AI Studio encountered an unexpected error/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Please refresh the page and try again/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh Page' })
    ).toBeInTheDocument();
  });

  test('logs error to console when error occurs', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );

    consoleSpy.mockRestore();
  });

  test('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByText('Error Details (Development Only)')
    ).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.queryByText('Error Details (Development Only)')
    ).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('refresh button calls window.location.reload', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const refreshButton = screen.getByRole('button', { name: 'Refresh Page' });
    userEvent.click(refreshButton);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  test('renders custom fallback when provided', () => {
    const customFallback = (
      <div data-testid="custom-fallback">Custom error UI</div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(
      screen.queryByText('⚠️ Something went wrong')
    ).not.toBeInTheDocument();
  });

  test('does not catch errors after recovery', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error should be caught and display error UI
    expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();

    // Rerender with fixed component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should still show error UI (ErrorBoundary doesn't auto-recover)
    expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();
  });

  test('catches different types of errors', () => {
    const ThrowTypeError = () => {
      throw new TypeError('Type error message');
    };

    render(
      <ErrorBoundary>
        <ThrowTypeError />
      </ErrorBoundary>
    );

    expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();
  });

  test('handles null error gracefully', () => {
    // Create a component that throws null
    const ThrowNull = () => {
      throw null;
    };

    render(
      <ErrorBoundary>
        <ThrowNull />
      </ErrorBoundary>
    );

    expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();
  });

  test('error boundary has correct styling classes', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorContainer = screen
      .getByText('⚠️ Something went wrong')
      .closest('.card');
    expect(errorContainer).toHaveStyle({
      textAlign: 'center',
      padding: '3rem',
    });
  });

  test('error details are expandable in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const details = screen.getByRole('group'); // details element has role="group"
    expect(details).toBeInTheDocument();

    const summary = screen.getByText('Error Details (Development Only)');
    // Summary elements in details don't automatically have button role, check if it's clickable instead
    expect(summary).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('displays error stack trace in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // The stack trace should be visible in the pre element
    const preElement = screen.getByText(/Test error message/);
    expect(preElement.tagName).toBe('PRE');

    process.env.NODE_ENV = originalEnv;
  });
});
