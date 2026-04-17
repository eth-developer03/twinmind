'use client';

import React, { useState } from 'react';

export type FeedbackValue = 'up' | 'down' | null;

interface SuggestionFeedbackProps {
  suggestionId: string;
  onFeedback: (suggestionId: string, value: FeedbackValue) => void;
}

export function SuggestionFeedback({ suggestionId, onFeedback }: SuggestionFeedbackProps) {
  const [selected, setSelected] = useState<FeedbackValue>(null);

  const handleClick = (value: 'up' | 'down') => {
    const next = selected === value ? null : value;
    setSelected(next);
    onFeedback(suggestionId, next);
  };

  return (
    <div className="suggestion-feedback" onClick={(e) => e.stopPropagation()}>
      <button
        className={`feedback-btn ${selected === 'up' ? 'feedback-btn--active-up' : ''}`}
        onClick={() => handleClick('up')}
        title="Useful"
        aria-label="Mark as useful"
      >
        👍
      </button>
      <button
        className={`feedback-btn ${selected === 'down' ? 'feedback-btn--active-down' : ''}`}
        onClick={() => handleClick('down')}
        title="Not useful"
        aria-label="Mark as not useful"
      >
        👎
      </button>
    </div>
  );
}
