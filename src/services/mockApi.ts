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
}

class AbortError extends Error {
  constructor() {
    super('Request aborted');
    this.name = 'AbortError';
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

  async generateWithRetry(
    request: GenerateRequest,
    maxAttempts: number = 3
  ): Promise<GenerateResponse> {
    this.abortController = new AbortController();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check if aborted before attempt
        if (this.abortController.signal.aborted) {
          throw new AbortError();
        }

        console.log(`Generate attempt ${attempt}/${maxAttempts}`);

        const result = await generateImage(
          request,
          this.abortController.signal
        );
        console.log('Generation successful:', result);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry if aborted
        if (
          error instanceof AbortError ||
          (error as Error).name === 'AbortError'
        ) {
          throw error;
        }

        console.log(`Attempt ${attempt} failed:`, (error as Error).message);

        // Don't wait after last attempt
        if (attempt < maxAttempts) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);

          // Wait with abort check
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(resolve, waitTime);

            const onAbort = () => {
              clearTimeout(timeoutId);
              reject(new AbortError());
            };

            this.abortController?.signal.addEventListener('abort', onAbort);

            setTimeout(() => {
              this.abortController?.signal.removeEventListener(
                'abort',
                onAbort
              );
            }, waitTime);
          });
        }
      }
    }

    throw lastError || new Error('Unknown error occurred');
  }

  abort() {
    if (this.abortController) {
      console.log('Aborting generation request...');
      this.abortController.abort();
    }
  }

  isGenerating() {
    return this.abortController && !this.abortController.signal.aborted;
  }
}
