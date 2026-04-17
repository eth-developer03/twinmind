'use client';

import React, { useMemo } from 'react';
import { SuggestionBatch, TranscriptChunk } from '@/types';

interface MeetingInsightsBarProps {
  transcriptChunks: TranscriptChunk[];
  batches: SuggestionBatch[];
}

// Derive quick live stats from transcript + suggestion history
export function MeetingInsightsBar({ transcriptChunks, batches }: MeetingInsightsBarProps) {
  const stats = useMemo(() => {
    const fullText = transcriptChunks.map((c) => c.text).join(' ');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    // Duration from first to last chunk
    const durationMins =
      transcriptChunks.length >= 2
        ? Math.round(
            (transcriptChunks[transcriptChunks.length - 1].timestamp.getTime() -
              transcriptChunks[0].timestamp.getTime()) /
              60000
          )
        : 0;

    // Count questions asked
    const questionCount = (fullText.match(/\?/g) ?? []).length;

    // Total suggestions generated
    const totalSuggestions = batches.reduce((sum, b) => sum + b.suggestions.length, 0);

    // Dominant suggestion type
    const typeCounts: Record<string, number> = {};
    for (const batch of batches) {
      for (const s of batch.suggestions) {
        typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
      }
    }
    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return { wordCount, durationMins, questionCount, totalSuggestions, dominantType };
  }, [transcriptChunks, batches]);

  if (transcriptChunks.length === 0) return null;

  return (
    <div className="insights-bar">
      <InsightPill label="Words" value={stats.wordCount.toLocaleString()} />
      {stats.durationMins > 0 && <InsightPill label="Duration" value={`${stats.durationMins}m`} />}
      <InsightPill label="Questions" value={String(stats.questionCount)} />
      <InsightPill label="Suggestions" value={String(stats.totalSuggestions)} />
      {stats.dominantType && (
        <InsightPill label="Top type" value={stats.dominantType} small />
      )}
    </div>
  );
}

function InsightPill({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="insight-pill">
      <span className="insight-label">{label}</span>
      <span className={`insight-value ${small ? 'insight-value--small' : ''}`}>{value}</span>
    </div>
  );
}
