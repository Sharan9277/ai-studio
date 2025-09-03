import { StyleOption } from '../components/StyleSelector';
import { GenerateRequest } from '../services/mockApi';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export class InputValidator {
  static validatePrompt(prompt: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!prompt || typeof prompt !== 'string') {
      errors.push({
        field: 'prompt',
        code: 'REQUIRED',
        message: 'Prompt is required',
      });
      return { isValid: false, errors };
    }

    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length === 0) {
      errors.push({
        field: 'prompt',
        code: 'EMPTY',
        message: 'Prompt cannot be empty',
      });
    }

    if (trimmedPrompt.length < 3) {
      errors.push({
        field: 'prompt',
        code: 'TOO_SHORT',
        message: 'Prompt must be at least 3 characters long',
      });
    }

    if (trimmedPrompt.length > 500) {
      errors.push({
        field: 'prompt',
        code: 'TOO_LONG',
        message: 'Prompt must be less than 500 characters',
      });
    }

    // Check for potentially harmful content
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(trimmedPrompt))) {
      errors.push({
        field: 'prompt',
        code: 'SUSPICIOUS_CONTENT',
        message: 'Prompt contains potentially harmful content',
      });
    }

    // Check for excessive special characters
    const specialCharCount = (trimmedPrompt.match(/[^\w\s\-.,!?'"]/g) || [])
      .length;
    if (specialCharCount > trimmedPrompt.length * 0.3) {
      errors.push({
        field: 'prompt',
        code: 'TOO_MANY_SPECIAL_CHARS',
        message: 'Prompt contains too many special characters',
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateStyle(style: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!style || typeof style !== 'string') {
      errors.push({
        field: 'style',
        code: 'REQUIRED',
        message: 'Style is required',
      });
      return { isValid: false, errors };
    }

    const validStyles: StyleOption[] = [
      'editorial',
      'streetwear',
      'vintage',
      'minimalist',
      'cyberpunk',
    ];

    if (!validStyles.includes(style as StyleOption)) {
      errors.push({
        field: 'style',
        code: 'INVALID_VALUE',
        message: `Style must be one of: ${validStyles.join(', ')}`,
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateImageDataUrl(imageDataUrl: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      errors.push({
        field: 'imageDataUrl',
        code: 'REQUIRED',
        message: 'Image data URL is required',
      });
      return { isValid: false, errors };
    }

    // Check if it's a valid data URL
    if (!imageDataUrl.startsWith('data:image/')) {
      errors.push({
        field: 'imageDataUrl',
        code: 'INVALID_FORMAT',
        message: 'Image data URL must be a valid data URL',
      });
    }

    // Check supported image types
    const supportedTypes = [
      'data:image/jpeg',
      'data:image/jpg',
      'data:image/png',
      'data:image/webp',
    ];
    if (!supportedTypes.some((type) => imageDataUrl.startsWith(type))) {
      errors.push({
        field: 'imageDataUrl',
        code: 'UNSUPPORTED_TYPE',
        message: 'Image must be JPEG, PNG, or WebP format',
      });
    }

    // Check data URL size (approximate - base64 encoding adds ~33% overhead)
    const maxSize = 15 * 1024 * 1024; // 15MB for base64 encoded data
    if (imageDataUrl.length > maxSize) {
      errors.push({
        field: 'imageDataUrl',
        code: 'TOO_LARGE',
        message: 'Image data is too large',
      });
    }

    // Basic base64 validation
    const base64Part = imageDataUrl.split(',')[1];
    if (!base64Part) {
      errors.push({
        field: 'imageDataUrl',
        code: 'INVALID_BASE64',
        message: 'Invalid base64 data in image URL',
      });
    } else {
      try {
        // Test if it's valid base64
        atob(base64Part.substring(0, 100)); // Check first 100 chars
      } catch {
        errors.push({
          field: 'imageDataUrl',
          code: 'INVALID_BASE64',
          message: 'Invalid base64 encoding in image URL',
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateGenerateRequest(request: GenerateRequest): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate each field
    const promptResult = this.validatePrompt(request.prompt);
    const styleResult = this.validateStyle(request.style);
    const imageResult = this.validateImageDataUrl(request.imageDataUrl);

    errors.push(...promptResult.errors);
    errors.push(...styleResult.errors);
    errors.push(...imageResult.errors);

    // Cross-field validation
    if (request.prompt && request.style) {
      // Check for style-specific constraints
      if (request.style === 'minimalist' && request.prompt.length > 200) {
        errors.push({
          field: 'prompt',
          code: 'TOO_DETAILED_FOR_MINIMALIST',
          message: 'Minimalist style works best with shorter, simpler prompts',
        });
      }

      if (
        request.style === 'cyberpunk' &&
        !/cyber|neon|futur|tech|digital|matrix|glow/i.test(request.prompt)
      ) {
        // This is just a suggestion, not a hard error
        console.info(
          'Consider using cyberpunk-related keywords for better results with cyberpunk style'
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

export class NetworkValidator {
  static isOnline(): boolean {
    return navigator.onLine;
  }

  static async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small, cacheable resource
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  static onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

export class SecurityValidator {
  static sanitizePrompt(prompt: string): string {
    return prompt
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
  }

  static isValidFilename(filename: string): boolean {
    if (filename.length > 255) return false;

    const dangerousPatterns = ['/\\', '..', '<', '>', '|', ':', '"', '?', '*'];
    return !dangerousPatterns.some((pattern) => filename.includes(pattern));
  }

  static checkContentSecurityPolicy(): boolean {
    try {
      // Check if we can create object URLs (required for image processing)
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const url = URL.createObjectURL(testBlob);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }
}
