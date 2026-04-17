'use client';

import React from 'react';

// Keywords that get highlighted in the transcript for quick scanning
const HIGHLIGHT_PATTERNS: Array<{ pattern: RegExp; className: string }> = [
  // Numbers / metrics
  { pattern: /\b\d+[\d,]*(%|ms|k|M|B|x|s|min|hrs?)?\b/g, className: 'hl-number' },
  // Questions in transcript
  { pattern: /\b(why|what|how|when|where|who|should|could|would|can|is|are|does)\b.{0,60}\?/gi, className: 'hl-question' },
  // Action words
  { pattern: /\b(need to|should|must|have to|going to|will|plan to|decided to)\b/gi, className: 'hl-action' },
];

interface HighlightedTextProps {
  text: string;
}

export function HighlightedText({ text }: HighlightedTextProps) {
  // Build a list of highlight ranges
  type Range = { start: number; end: number; className: string };
  const ranges: Range[] = [];

  for (const { pattern, className } of HIGHLIGHT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length, className });
    }
  }

  if (ranges.length === 0) return <>{text}</>;

  // Sort and de-overlap ranges
  ranges.sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) continue; // skip overlap
    merged.push(r);
  }

  // Build segments
  const segments: React.ReactNode[] = [];
  let cursor = 0;
  for (const { start, end, className } of merged) {
    if (cursor < start) segments.push(text.slice(cursor, start));
    segments.push(
      <mark key={start} className={`transcript-highlight ${className}`}>
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  if (cursor < text.length) segments.push(text.slice(cursor));

  return <>{segments}</>;
}
