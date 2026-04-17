'use client';

import { useRef, useState, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'stopped';

interface UseAudioRecorderOptions {
  onChunkReady: (blob: Blob) => void;
  chunkIntervalMs?: number;
}

export function useAudioRecorder({
  onChunkReady,
  chunkIntervalMs = 30000,
}: UseAudioRecorderOptions) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const flushChunk = useCallback(() => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];
    onChunkReady(blob);
  }, [onChunkReady]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Collect data every second but flush every chunkIntervalMs
      mediaRecorder.start(1000);
      setRecordingState('recording');

      // Flush a chunk every N seconds for transcription
      intervalRef.current = setInterval(() => {
        flushChunk();
      }, chunkIntervalMs);
    } catch (err) {
      console.error('Mic access error:', err);
      throw err;
    }
  }, [chunkIntervalMs, flushChunk]);

  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Flush remaining audio
    flushChunk();

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setRecordingState('stopped');
  }, [flushChunk]);

  const toggleRecording = useCallback(async () => {
    if (recordingState === 'recording') {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  // Manually trigger a flush (for refresh button)
  const flushNow = useCallback(() => {
    flushChunk();
  }, [flushChunk]);

  return { recordingState, toggleRecording, flushNow };
}
