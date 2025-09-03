import React, { useState, useMemo, useCallback } from 'react';
import ImageUpload from './components/ImageUpload';
import PromptInput from './components/PromptInput';
import StyleSelector, { StyleOption } from './components/StyleSelector';
import LiveSummary from './components/LiveSummary';
import GenerationHistory from './components/GenerationHistory';
import ErrorBoundary from './components/ErrorBoundary';
import {
  ApiClient,
  GenerateRequest,
  GenerateResponse,
  ErrorHandler,
} from './services/mockApi';
import { historyService, HistoryItem } from './services/historyService';
import { InputValidator, SecurityValidator } from './utils/validation';
import { useOfflineDetection } from './hooks/useOfflineDetection';

const App: React.FC = () => {
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>('editorial');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] =
    useState<GenerateResponse | null>(null);
  const [apiClient] = useState(() => new ApiClient());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [, setOptimisticHistoryId] = useState<string | null>(null);

  const { isOnline, isConnected, checkConnectivity } = useOfflineDetection();

  const handleImageSelect = useCallback((_file: File, dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setGeneratedResult(null);
    setGenerationError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    // Clear previous errors
    setGenerationError(null);
    setValidationErrors([]);

    // Check network connectivity
    if (!isOnline || !isConnected) {
      setGenerationError(
        'No internet connection. Please check your network and try again.'
      );
      return;
    }

    // Sanitize inputs
    const sanitizedPrompt = SecurityValidator.sanitizePrompt(prompt);

    const request: GenerateRequest = {
      imageDataUrl,
      prompt: sanitizedPrompt,
      style: selectedStyle,
    };

    // Validate the request
    const validation = InputValidator.validateGenerateRequest(request);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map((error) => error.message);
      setValidationErrors(errorMessages);
      return;
    }

    setIsGenerating(true);
    setGeneratedResult(null);

    // Generate optimistic ID for potential rollback
    const optimisticId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setOptimisticHistoryId(optimisticId);

    try {
      console.log('Starting generation with:', request);

      // Double-check connectivity before making request
      const stillConnected = await checkConnectivity();
      if (!stillConnected) {
        throw new Error('Lost connection before starting generation');
      }

      const result = await apiClient.generateWithRetry(request);
      console.log('Generation completed:', result);

      // Clear optimistic state
      setOptimisticHistoryId(null);
      setGeneratedResult(result);
      historyService.addToHistory(result);
    } catch (error) {
      console.error('Generation failed:', error);

      // Clear optimistic state
      setOptimisticHistoryId(null);

      // Use ErrorHandler for better error messages
      const userMessage = ErrorHandler.getUserMessage(error as Error);
      setGenerationError(userMessage);

      // Log technical details for debugging
      console.error('Technical error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    imageDataUrl,
    prompt,
    selectedStyle,
    apiClient,
    isOnline,
    isConnected,
    checkConnectivity,
  ]);

  const handleAbort = useCallback(() => {
    apiClient.abort();
    setIsGenerating(false);
  }, [apiClient]);

  const handleHistoryItemSelect = useCallback((item: HistoryItem) => {
    // Restore the generated data for comparison and further editing
    setImageDataUrl(item.imageUrl);
    setPrompt(item.prompt);
    setSelectedStyle(item.style);
    setGeneratedResult(item);
    setGenerationError(null);
  }, []);

  const canGenerate = useMemo(
    () => imageDataUrl && prompt.trim() && !isGenerating,
    [imageDataUrl, prompt, isGenerating]
  );

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', padding: '2rem 0' }}>
        <div className="container">
          <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1
              className="gradient-text"
              style={{
                fontSize: '4rem',
                fontWeight: '900',
                marginBottom: '1rem',
                letterSpacing: '-0.05em',
              }}
            >
              AI Studio
            </h1>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '1.2rem',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: '1.6',
                marginBottom: '1rem',
              }}
            >
              Transform your images with cutting-edge AI technology. Create
              stunning visuals with advanced neural networks.
            </p>

            {/* Network Status Indicator */}
            {(!isOnline || !isConnected) && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  color: '#ff6b6b',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  border: '1px solid rgba(255, 107, 107, 0.3)',
                }}
                role="alert"
              >
                <span>🔌</span>
                {!isOnline
                  ? 'No internet connection'
                  : 'Connection issues detected'}
                <button
                  onClick={checkConnectivity}
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: 'rgba(255, 107, 107, 0.2)',
                    border: '1px solid rgba(255, 107, 107, 0.4)',
                    borderRadius: '0.25rem',
                    color: '#ff6b6b',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          </header>

          <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="main-grid">
              {/* Left Column - Input Form */}
              <div>
                <div className="card ai-glow">
                  <h2
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      marginBottom: '1.5rem',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ⚡ Create Generation
                  </h2>

                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    currentImage={imageDataUrl}
                    disabled={isGenerating || !isConnected}
                  />

                  <PromptInput
                    value={prompt}
                    onChange={setPrompt}
                    disabled={isGenerating}
                  />

                  <StyleSelector
                    value={selectedStyle}
                    onChange={setSelectedStyle}
                    disabled={isGenerating}
                  />

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div
                      className="error-message"
                      role="alert"
                      style={{ marginBottom: '1rem' }}
                    >
                      <strong>Please fix the following issues:</strong>
                      <ul
                        style={{
                          margin: '0.5rem 0 0 0',
                          paddingLeft: '1.5rem',
                        }}
                      >
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Generation Error */}
                  {generationError && (
                    <div className="error-message" role="alert">
                      <strong>Error:</strong> {generationError}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      marginTop: '1.5rem',
                    }}
                  >
                    <button
                      onClick={handleGenerate}
                      disabled={!canGenerate}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      aria-label={
                        isGenerating ? 'Generating...' : 'Generate AI image'
                      }
                    >
                      {isGenerating ? (
                        <>
                          <div className="spinner"></div>
                          Generating...
                        </>
                      ) : (
                        'Generate'
                      )}
                    </button>

                    {isGenerating && (
                      <button
                        onClick={handleAbort}
                        className="btn btn-secondary"
                        aria-label="Cancel generation"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Preview and Results */}
              <div>
                <LiveSummary
                  imageDataUrl={imageDataUrl}
                  prompt={prompt}
                  style={selectedStyle}
                />

                {generatedResult && (
                  <div className="card ai-glow">
                    <h3
                      style={{
                        fontSize: '1.3rem',
                        fontWeight: '700',
                        marginBottom: '1.5rem',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      🎨 Generated Result
                    </h3>

                    {/* Before/After Comparison */}
                    <div className="comparison-grid">
                      {/* Original Image */}
                      <div>
                        <h4
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#667eea',
                            marginBottom: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'center',
                          }}
                        >
                          📤 Original
                        </h4>
                        {imageDataUrl ? (
                          <div
                            style={{
                              position: 'relative',
                              overflow: 'hidden',
                              borderRadius: '12px',
                            }}
                          >
                            <img
                              src={imageDataUrl}
                              alt="Original uploaded image"
                              style={{
                                width: '100%',
                                height: '200px',
                                objectFit: 'cover',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              height: '200px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '12px',
                              border: '1px dashed rgba(255, 255, 255, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'rgba(255, 255, 255, 0.5)',
                              fontSize: '0.875rem',
                            }}
                          >
                            No original image
                          </div>
                        )}
                      </div>

                      {/* Generated Image */}
                      <div>
                        <h4
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#667eea',
                            marginBottom: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'center',
                          }}
                        >
                          ✨ Generated
                        </h4>
                        <div
                          style={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '12px',
                          }}
                        >
                          <img
                            src={generatedResult.imageUrl}
                            alt={`Generated with ${generatedResult.style} style`}
                            style={{
                              width: '100%',
                              height: '200px',
                              objectFit: 'cover',
                              borderRadius: '12px',
                              border: '1px solid rgba(118, 75, 162, 0.3)',
                              boxShadow: '0 8px 25px rgba(118, 75, 162, 0.2)',
                            }}
                            onError={() => {
                              console.error('Failed to load generated image');
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Generation Details */}
                    <div
                      style={{
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#667eea' }}>Prompt:</strong>{' '}
                          <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {generatedResult.prompt}
                          </span>
                        </div>
                        <div>
                          <strong style={{ color: '#667eea' }}>Style:</strong>{' '}
                          <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {generatedResult.style}
                          </span>
                        </div>
                      </div>
                      <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                        <strong style={{ color: '#667eea' }}>Generated:</strong>{' '}
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {new Date(generatedResult.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* History Section */}
            <GenerationHistory onHistoryItemSelect={handleHistoryItemSelect} />
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
