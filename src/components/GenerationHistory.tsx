import React, { useState, useEffect } from 'react';
import { historyService, HistoryItem } from '../services/historyService';
import { StyleOption } from './StyleSelector';

interface GenerationHistoryProps {
  onHistoryItemSelect: (item: HistoryItem) => void;
}

const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  onHistoryItemSelect,
}) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Load initial history
    setHistory(historyService.getHistory());

    // Set up listener for history updates
    const cleanup = historyService.useHistoryUpdates((updatedHistory) => {
      setHistory(updatedHistory);
    });

    return cleanup;
  }, []);

  const styleLabels: Record<StyleOption, string> = {
    editorial: 'Editorial',
    streetwear: 'Streetwear',
    vintage: 'Vintage',
    minimalist: 'Minimalist',
    cyberpunk: 'Cyberpunk',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      historyService.clearHistory();
    }
  };

  if (history.length === 0) {
    return (
      <div className="card">
        <h3
          style={{
            fontSize: '1.3rem',
            fontWeight: '700',
            marginBottom: '1rem',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          📚 Generation History
        </h3>
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>🎭 No generations yet.</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Your recent AI generations will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h3
          style={{
            fontSize: '1.3rem',
            fontWeight: '700',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          📚 Generation History
        </h3>
        <button
          onClick={handleClearHistory}
          className="btn btn-secondary"
          style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}
          aria-label="Clear all history"
        >
          Clear All
        </button>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {history.map((item) => (
          <div
            key={item.id}
            className="history-item"
            onClick={() => onHistoryItemSelect(item)}
            role="button"
            tabIndex={0}
            aria-label={`Restore generation: ${item.prompt || 'No prompt'} with ${styleLabels[item.style]} style`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onHistoryItemSelect(item);
              }
            }}
          >
            <img
              src={item.imageUrl}
              alt={`Generated with ${styleLabels[item.style]} style`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="%23ccc"><rect width="48" height="48" rx="4"/><text x="24" y="28" text-anchor="middle" font-size="12">IMG</text></svg>';
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '0.25rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    fontWeight: '500',
                  }}
                >
                  {styleLabels[item.style]}
                </span>
                <time
                  style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                  }}
                  dateTime={item.createdAt}
                >
                  {formatDate(item.createdAt)}
                </time>
              </div>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#1f2937',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.prompt || 'No prompt'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p
        style={{
          fontSize: '0.75rem',
          color: '#9ca3af',
          marginTop: '0.75rem',
          textAlign: 'center',
        }}
      >
        Showing last {history.length} of {history.length} generations
      </p>
    </div>
  );
};

export default GenerationHistory;