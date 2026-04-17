'use client';

import React, { useState } from 'react';
import { Suggestion } from '@/types';
import { SUGGESTION_TYPE_COLORS } from '@/lib/constants';
import { SuggestionFeedback, FeedbackValue } from './SuggestionFeedback';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onClick: (suggestion: Suggestion) => void;
  onFeedback: (suggestionId: string, value: FeedbackValue) => void;
  faded?: boolean;
}

export function SuggestionCard({ suggestion, onClick, onFeedback, faded = false }: SuggestionCardProps) {
  const colors = SUGGESTION_TYPE_COLORS[suggestion.type] ?? SUGGESTION_TYPE_COLORS['TALKING POINT'];
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(suggestion.preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      className={`suggestion-card ${faded ? 'suggestion-card--faded' : ''}`}
      onClick={() => onClick(suggestion)}
      style={{ borderColor: faded ? 'rgba(255,255,255,0.06)' : colors.border }}
    >
      <div className="suggestion-card-top">
        <span
          className="suggestion-type-badge"
          style={{
            background: faded ? 'rgba(255,255,255,0.06)' : colors.bg,
            color: faded ? 'rgba(255,255,255,0.3)' : colors.text,
          }}
        >
          {suggestion.type}
        </span>
        <div className="suggestion-card-actions">
          <button className="copy-btn" onClick={handleCopy} title="Copy to clipboard">
            {copied ? '✓' : '⎘'}
          </button>
          <SuggestionFeedback suggestionId={suggestion.id} onFeedback={onFeedback} />
        </div>
      </div>
      <p className={`suggestion-preview ${faded ? 'suggestion-preview--faded' : ''}`}>
        {suggestion.preview}
      </p>
    </button>
  );
}
