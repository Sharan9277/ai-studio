import { StyleOption } from '../components/StyleSelector';

export interface GenerateRequest {
  imageDataUrl: string;
  prompt: string;
  style: StyleOption;
}

export interface GenerateResponse {
  id: string;
  imageUrl: string;
  prompt: string;
  style: StyleOption;
  createdAt: string;
}

export interface ApiError {
  message: string;
  code: string;
  userMessage: string;
  retryable: boolean;
}

class AbortError extends Error {
  constructor(message: string = 'Request was cancelled') {
    super(message);
    this.name = 'AbortError';
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerError';
  }
}

export class ErrorHandler {
  static categorizeError(error: Error): ApiError {
    if (error instanceof AbortError) {
      return {
        message: error.message,
        code: 'REQUEST_CANCELLED',
        userMessage: 'Request was cancelled',
        retryable: false,
      };
    }

    if (error instanceof TimeoutError) {
      return {
        message: error.message,
        code: 'REQUEST_TIMEOUT',
        userMessage:
          'Request timed out. Please check your connection and try again.',
        retryable: true,
      };
    }

    if (error instanceof ValidationError) {
      return {
        message: error.message,
        code: 'VALIDATION_ERROR',
        userMessage: 'Please check your inputs and try again.',
        retryable: false,
      };
    }

    if (error instanceof NetworkError) {
      return {
        message: error.message,
        code: 'NETWORK_ERROR',
        userMessage: 'Network error. Please check your internet connection.',
        retryable: true,
      };
    }

    if (error instanceof ServerError) {
      return {
        message: error.message,
        code: 'SERVER_ERROR',
        userMessage:
          'Server is experiencing issues. Please try again in a few moments.',
        retryable: true,
      };
    }

    // Handle known API error messages
    if (error.message.includes('Model overloaded')) {
      return {
        message: error.message,
        code: 'MODEL_OVERLOADED',
        userMessage:
          'AI model is currently busy. Please wait a moment and try again.',
        retryable: true,
      };
    }

    if (
      error.message.includes('quota') ||
      error.message.includes('rate limit')
    ) {
      return {
        message: error.message,
        code: 'RATE_LIMITED',
        userMessage:
          'Too many requests. Please wait a moment before trying again.',
        retryable: true,
      };
    }

    // Default case
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: true,
    };
  }

  static isRetryableError(error: Error): boolean {
    const categorized = this.categorizeError(error);
    return categorized.retryable;
  }

  static getUserMessage(error: Error): string {
    const categorized = this.categorizeError(error);
    return categorized.userMessage;
  }
}

const mockImages = [
  'https://picsum.photos/800/600?random=1',
  'https://picsum.photos/800/600?random=2',
  'https://picsum.photos/800/600?random=3',
  'https://picsum.photos/800/600?random=4',
  'https://picsum.photos/800/600?random=5',
  'https://picsum.photos/800/600?random=6',
  'https://picsum.photos/800/600?random=7',
  'https://picsum.photos/800/600?random=8',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop',
];

export const generateImage = async (
  request: GenerateRequest,
  abortSignal?: AbortSignal
): Promise<GenerateResponse> => {
  // Check if request was aborted before starting
  if (abortSignal?.aborted) {
    throw new AbortError();
  }

  // Simulate 20% error rate
  const shouldError = Math.random() < 0.2;

  // Simulate 1-2 second delay
  const delay = 1000 + Math.random() * 1000;

  // Check for abort during delay
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(resolve, delay);

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new AbortError());
    };

    abortSignal?.addEventListener('abort', onAbort);

    setTimeout(() => {
      abortSignal?.removeEventListener('abort', onAbort);
    }, delay);
  });

  // Check if aborted after delay
  if (abortSignal?.aborted) {
    throw new AbortError();
  }

  if (shouldError) {
    throw new Error('Model overloaded. Please try again.');
  }

  // Generate mock response
  const response: GenerateResponse = {
    id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    imageUrl: mockImages[Math.floor(Math.random() * mockImages.length)],
    prompt: request.prompt,
    style: request.style,
    createdAt: new Date().toISOString(),
  };

  return response;
};

export class ApiClient {
  private abortController: AbortController | null = null;
  private requestId: number = 0;

  async generateWithRetry(
    request: GenerateRequest,
    maxAttempts: number = 3
  ): Promise<GenerateResponse> {
    // Generate unique request ID for concurrency control
    const currentRequestId = ++this.requestId;
    this.abortController = new AbortController();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check if aborted or superseded by newer request
        if (this.abortController.signal.aborted) {
          throw new AbortError();
        }

        // Check if this request has been superseded
        if (currentRequestId !== this.requestId) {
          throw new AbortError();
        }

        console.log(
          `Generate attempt ${attempt}/${maxAttempts} (Request ${currentRequestId})`
        );

        const result = await this.withTimeout(
          generateImage(request, this.abortController.signal),
          30000 // 30 second timeout
        );

        // Final check before returning - ensure we haven't been superseded
        if (currentRequestId !== this.requestId) {
          throw new AbortError();
        }

        console.log('Generation successful:', result);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry if aborted, superseded, or non-retryable error
        if (
          error instanceof AbortError ||
          (error as Error).name === 'AbortError' ||
          currentRequestId !== this.requestId ||
          !ErrorHandler.isRetryableError(error as Error)
        ) {
          throw error;
        }

        console.log(`Attempt ${attempt} failed:`, (error as Error).message);

        // Don't wait after last attempt
        if (attempt < maxAttempts) {
          const waitTime = this.calculateBackoffWithJitter(attempt);
          console.log(`Waiting ${waitTime}ms before retry...`);

          await this.waitWithAbortCheck(waitTime, currentRequestId);
        }
      }
    }

    throw lastError || new Error('Unknown error occurred');
  }

  private calculateBackoffWithJitter(attempt: number): number {
    // Base exponential backoff: 1s, 2s, 4s, 8s...
    const baseDelay = Math.pow(2, attempt - 1) * 1000;

    // Add jitter: ±25% of base delay to prevent thundering herd
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);

    // Cap at 10 seconds maximum
    return Math.min(Math.max(baseDelay + jitter, 100), 10000);
  }

  private async waitWithAbortCheck(
    waitTime: number,
    requestId: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve();
      }, waitTime);

      const onAbort = () => {
        cleanup();
        reject(new AbortError());
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.abortController?.signal.removeEventListener('abort', onAbort);
      };

      // Check if request has been superseded
      if (requestId !== this.requestId) {
        cleanup();
        reject(new AbortError());
        return;
      }

      this.abortController?.signal.addEventListener('abort', onAbort);
    });
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          const error = new Error(`Request timed out after ${timeoutMs}ms`);
          error.name = 'TimeoutError';
          reject(error);
        }, timeoutMs);

        // Clean up timeout if original promise resolves
        promise.finally(() => clearTimeout(timeoutId));
      }),
    ]);
  }

  abort() {
    if (this.abortController) {
      console.log('Aborting generation request...');
      this.abortController.abort();
    }
  }

  isGenerating(): boolean {
    return (
      this.abortController !== null && !this.abortController.signal.aborted
    );
  }
}
