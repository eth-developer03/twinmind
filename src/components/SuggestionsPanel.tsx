'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SuggestionBatch, Suggestion, TranscriptChunk } from '@/types';
import { SuggestionCard } from './SuggestionCard';
import { MeetingInsightsBar } from './MeetingInsightsBar';
import { FeedbackValue } from './SuggestionFeedback';

interface SuggestionsPanelProps {
  batches: SuggestionBatch[];
  transcriptChunks: TranscriptChunk[];
  onSuggestionClick: (suggestion: Suggestion) => void;
  onRefresh: () => void;
  isLoading: boolean;
  autoRefreshInterval: number;
  lastRefreshTime: Date | null;
  hasTranscript: boolean;
  onFeedback: (suggestionId: string, value: FeedbackValue) => void;
}

export function SuggestionsPanel({
  batches,
  transcriptChunks,
  onSuggestionClick,
  onRefresh,
  isLoading,
  autoRefreshInterval,
  lastRefreshTime,
  hasTranscript,
  onFeedback,
}: SuggestionsPanelProps) {
  const [countdown, setCountdown] = useState(autoRefreshInterval);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // Reset countdown each time a refresh completes
  useEffect(() => {
    setCountdown(autoRefreshInterval);
  }, [lastRefreshTime, autoRefreshInterval]);

  // Tick down every second while there is transcript
  useEffect(() => {
    if (!hasTranscript) return;
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefreshTime, autoRefreshInterval, hasTranscript]);

  // Auto-fire when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && hasTranscript) {
      onRefreshRef.current();
    }
  }, [countdown, hasTranscript]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">2. LIVE SUGGESTIONS</span>
        <span className="panel-meta">
          {batches.length} {batches.length === 1 ? 'BATCH' : 'BATCHES'}
        </span>
      </div>

      <div className="suggestions-toolbar">
        <button className="refresh-button" onClick={onRefresh} disabled={isLoading}>
          <svg
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            className={isLoading ? 'spin' : ''}
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {isLoading ? 'Refreshing…' : 'Reload suggestions'}
        </button>
        {hasTranscript && (
          <span className="countdown-text">auto-refresh in {countdown}s</span>
        )}
      </div>

      <MeetingInsightsBar transcriptChunks={transcriptChunks} batches={batches} />

      <div className="suggestions-scroll">
        <div className="info-card">
          On reload (or auto every ~30s), generate <strong>3 fresh suggestions</strong> from
          recent transcript context. New batch appears at the top; older batches push down (faded).
          Each is a tappable card:{' '}
          <span style={{ color: '#60a5fa' }}>a question to ask</span>,{' '}
          <span style={{ color: '#a78bfa' }}>a talking point</span>,{' '}
          <span style={{ color: '#34d399' }}>an answer</span>, or{' '}
          <span style={{ color: '#fbbf24' }}>a fact-check</span>.{' '}
          The preview alone should already be useful.
        </div>

        {batches.length === 0 && !isLoading && (
          <p className="empty-state">Suggestions appear here once recording starts.</p>
        )}

        {isLoading && batches.length === 0 && (
          <div className="loading-skeleton">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        )}

        {[...batches].reverse().map((batch, batchIdx) => {
          const isFaded = batchIdx > 0;
          return (
            <div key={batch.id} className="batch-group">
              {batch.suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onClick={onSuggestionClick}
                  onFeedback={onFeedback}
                  faded={isFaded}
                />
              ))}
              <div className="batch-separator">
                — BATCH {batch.batchNumber} · {batch.timestamp.toLocaleTimeString()} —
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
