import { generateImage, ApiClient } from './mockApi';

// Mock Math.random for predictable tests
jest.spyOn(global.Math, 'random');

describe('mockApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateImage', () => {
    const mockRequest = {
      imageDataUrl: 'data:image/png;base64,test',
      prompt: 'test prompt',
      style: 'editorial' as const,
    };

    test('successfully generates image when not error condition', async () => {
      // Mock random to not trigger error (< 0.2)
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const promise = generateImage(mockRequest);
      
      // Fast-forward time
      jest.advanceTimersByTime(2000);
      
      const result = await promise;

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('imageUrl');
      expect(result.prompt).toBe('test prompt');
      expect(result.style).toBe('editorial');
      expect(result).toHaveProperty('createdAt');
      expect(result.id).toMatch(/^gen_/);
    });

    test('throws error when in error condition', async () => {
      // Mock random to trigger error (>= 0.2)
      (Math.random as jest.Mock).mockReturnValue(0.5);

      const promise = generateImage(mockRequest);
      
      // Fast-forward time
      jest.advanceTimersByTime(2000);
      
      await expect(promise).rejects.toThrow('Model overloaded. Please try again.');
    });

    test('can be aborted with AbortSignal', async () => {
      const controller = new AbortController();
      const promise = generateImage(mockRequest, controller.signal);

      // Abort before delay completes
      controller.abort();

      await expect(promise).rejects.toThrow('Request aborted');
    });

    test('throws abort error if already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(generateImage(mockRequest, controller.signal))
        .rejects.toThrow('Request aborted');
    });
  });

  describe('ApiClient', () => {
    const mockRequest = {
      imageDataUrl: 'data:image/png;base64,test',
      prompt: 'test prompt',
      style: 'editorial' as const,
    };

    test('retries on failure with exponential backoff', async () => {
      const client = new ApiClient();
      
      // Mock to always fail first 2 attempts, succeed on 3rd
      (Math.random as jest.Mock)
        .mockReturnValueOnce(0.5) // First attempt fails
        .mockReturnValueOnce(0.5) // Second attempt fails  
        .mockReturnValueOnce(0.1); // Third attempt succeeds

      const promise = client.generateWithRetry(mockRequest, 3);
      
      // Advance through all attempts and backoff periods
      jest.advanceTimersByTime(2000); // First attempt delay
      jest.advanceTimersByTime(1000); // First backoff (1s)
      jest.advanceTimersByTime(2000); // Second attempt delay
      jest.advanceTimersByTime(2000); // Second backoff (2s)
      jest.advanceTimersByTime(2000); // Third attempt delay

      const result = await promise;
      expect(result).toHaveProperty('id');
    });

    test('gives up after max attempts', async () => {
      const client = new ApiClient();
      
      // Mock to always fail
      (Math.random as jest.Mock).mockReturnValue(0.5);

      const promise = client.generateWithRetry(mockRequest, 2);
      
      // Advance through all attempts
      jest.advanceTimersByTime(2000); // First attempt
      jest.advanceTimersByTime(1000); // First backoff
      jest.advanceTimersByTime(2000); // Second attempt

      await expect(promise).rejects.toThrow('Model overloaded. Please try again.');
    });

    test('can abort ongoing generation', async () => {
      const client = new ApiClient();
      
      const promise = client.generateWithRetry(mockRequest);
      
      // Abort during first attempt
      client.abort();

      await expect(promise).rejects.toThrow('Request aborted');
    });

    test('tracks generation state correctly', () => {
      const client = new ApiClient();
      
      expect(client.isGenerating()).toBe(false);
      
      client.generateWithRetry(mockRequest);
      expect(client.isGenerating()).toBe(true);
      
      client.abort();
      expect(client.isGenerating()).toBe(false);
    });
  });
});