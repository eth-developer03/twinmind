'use client';

import React, { useEffect, useRef } from 'react';
import { TranscriptChunk, MeetingMode } from '@/types';
import { RecordingState } from '@/hooks/useAudioRecorder';
import { MEETING_MODE_LABELS } from '@/lib/constants';
import { HighlightedText } from './HighlightedText';

interface TranscriptPanelProps {
  recordingState: RecordingState;
  transcriptChunks: TranscriptChunk[];
  onToggleRecording: () => void;
  meetingMode: MeetingMode;
  isTranscribing: boolean;
}

export function TranscriptPanel({
  recordingState,
  transcriptChunks,
  onToggleRecording,
  meetingMode,
  isTranscribing,
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptChunks]);

  const statusText = {
    idle: 'Click mic to start. Transcript appends every ~30s.',
    recording: 'Listening… transcript updates every 30s.',
    stopped: 'Stopped. Click to resume.',
  }[recordingState];

  const isRecording = recordingState === 'recording';

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">1. MIC &amp; TRANSCRIPT</span>
        <span className={`status-badge ${isRecording ? 'status-recording' : 'status-idle'}`}>
          {isRecording && <span className="recording-dot" />}
          {recordingState.toUpperCase()}
        </span>
      </div>

      <div className="mic-row">
        <button
          className={`mic-button ${isRecording ? 'mic-recording' : 'mic-idle'}`}
          onClick={onToggleRecording}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 8a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V22h-2v-2.06A9 9 0 0 1 3 11h2z" />
            </svg>
          )}
        </button>
        <span className="mic-status-text">{statusText}</span>
        {isTranscribing && <span className="transcribing-badge">transcribing…</span>}
      </div>

      {meetingMode !== 'general' && (
        <div className="meeting-mode-badge">
          {MEETING_MODE_LABELS[meetingMode]}
        </div>
      )}

      <div className="transcript-scroll">
        {transcriptChunks.length === 0 ? (
          <p className="empty-state">No transcript yet — start the mic.</p>
        ) : (
          transcriptChunks.map((chunk) => (
            <div key={chunk.id} className="transcript-chunk">
              <span className="transcript-time">
                {chunk.timestamp.toLocaleTimeString()}
              </span>
              <span className="transcript-text">
                {/* Extra Feature 1: Smart keyword highlighting */}
                <HighlightedText text={chunk.text} />
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
