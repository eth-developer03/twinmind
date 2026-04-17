'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { SuggestionsPanel } from '@/components/SuggestionsPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { Header } from '@/components/Header';
import { SettingsModal } from '@/components/SettingsModal';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSettings } from '@/hooks/useSettings';
import {
  transcribeAudio,
  generateSuggestions,
  streamChatResponse,
  extractActionItems,
  buildSuggestionPrompt,
  buildDetailedAnswerPrompt,
  buildChatPrompt,
  buildSummaryPrompt,
} from '@/lib/groq';
import { buildSessionExport, downloadExport } from '@/lib/export';
import {
  TranscriptChunk,
  SuggestionBatch,
  Suggestion,
  ChatMessage,
  MeetingMode,
  ActionItem,
} from '@/types';

export default function Home() {
  const { settings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ─── State ────────────────────────────────────────────────────────────────
  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
  const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [meetingMode, setMeetingMode] = useState<MeetingMode>('general');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const batchCounterRef = useRef(0);
  const lastExtractedChunkCountRef = useRef(0);

  // ─── Refs for stable access in callbacks ─────────────────────────────────
  const transcriptChunksRef = useRef<TranscriptChunk[]>([]);
  const suggestionBatchesRef = useRef<SuggestionBatch[]>([]);
  transcriptChunksRef.current = transcriptChunks;
  suggestionBatchesRef.current = suggestionBatches;

  // ─── Audio chunk handler → transcription ─────────────────────────────────
  const handleChunkReady = useCallback(async (blob: Blob) => {
    if (!settings.groqApiKey) return;
    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(blob, settings.groqApiKey);
      if (!text.trim()) return;
      const chunk: TranscriptChunk = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        text: text.trim(),
      };
      setTranscriptChunks((prev) => [...prev, chunk]);
    } catch (err) {
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  }, [settings.groqApiKey]);

  const { recordingState, toggleRecording, flushNow } = useAudioRecorder({
    onChunkReady: handleChunkReady,
    chunkIntervalMs: settings.autoRefreshInterval * 1000,
  });

  // ─── Generate suggestions ─────────────────────────────────────────────────
  const generateNewSuggestions = useCallback(async () => {
    if (!settings.groqApiKey || transcriptChunksRef.current.length === 0) return;
    setIsSuggestionsLoading(true);

    try {
      // Build list of all previous suggestion previews for deduplication
      const previousSuggestions = suggestionBatchesRef.current
        .flatMap((b) => b.suggestions.map((s) => `${s.type}: ${s.preview}`));

      const transcriptTexts = transcriptChunksRef.current.map(
        (c) => `[${c.timestamp.toLocaleTimeString()}] ${c.text}`
      );

      const prompt = buildSuggestionPrompt(
        settings.suggestionPrompt,
        transcriptTexts,
        previousSuggestions,
        meetingMode,
        settings.suggestionContextWindow
      );

      const { suggestions, meetingMode: detectedMode } = await generateSuggestions(
        prompt,
        settings.groqApiKey
      );

      setMeetingMode(detectedMode);
      batchCounterRef.current += 1;

      const batch: SuggestionBatch = {
        id: crypto.randomUUID(),
        batchNumber: batchCounterRef.current,
        timestamp: new Date(),
        suggestions,
      };

      setSuggestionBatches((prev) => [...prev, batch]);
      setLastRefreshTime(new Date());
    } catch (err) {
      console.error('Suggestions error:', err);
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, [settings, meetingMode]);

  // Auto-refresh is handled by the countdown in SuggestionsPanel

  // ─── Fire suggestions immediately on first transcript chunk ───────────────
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (hasAutoStartedRef.current || transcriptChunks.length === 0) return;
    hasAutoStartedRef.current = true;
    generateNewSuggestions();
  }, [transcriptChunks.length, generateNewSuggestions]);

  // ─── Manual refresh ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    flushNow();
    // Small delay to let transcription settle
    await new Promise((r) => setTimeout(r, 500));
    await generateNewSuggestions();
  }, [flushNow, generateNewSuggestions]);

  // ─── Suggestion click → detailed chat answer ──────────────────────────────
  const handleSuggestionClick = useCallback(async (suggestion: Suggestion) => {
    if (!settings.groqApiKey) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `[${suggestion.type}] ${suggestion.preview}`,
      timestamp: new Date(),
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setChatMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsChatStreaming(true);

    try {
      const transcriptTexts = transcriptChunksRef.current.map(
        (c) => `[${c.timestamp.toLocaleTimeString()}] ${c.text}`
      );

      const prompt = buildDetailedAnswerPrompt(
        settings.detailedAnswerPrompt,
        transcriptTexts,
        suggestion.type,
        suggestion.preview,
        settings.detailedAnswerContextWindow
      );

      await streamChatResponse(
        prompt,
        settings.groqApiKey,
        (chunk) => {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m
            )
          );
        },
        () => {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
            )
          );
          setIsChatStreaming(false);
        }
      );
    } catch (err) {
      console.error('Chat error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${msg}`, isStreaming: false }
            : m
        )
      );
      setIsChatStreaming(false);
    }
  }, [settings]);

  // ─── Manual chat message ──────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (text: string) => {
    if (!settings.groqApiKey) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setChatMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsChatStreaming(true);

    try {
      const transcriptTexts = transcriptChunksRef.current.map(
        (c) => `[${c.timestamp.toLocaleTimeString()}] ${c.text}`
      );

      const prompt = buildChatPrompt(settings.chatPrompt, transcriptTexts, text);

      await streamChatResponse(
        prompt,
        settings.groqApiKey,
        (chunk) => {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m
            )
          );
        },
        () => {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
            )
          );
          setIsChatStreaming(false);
        }
      );
    } catch (err) {
      console.error('Chat error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${msg}`, isStreaming: false }
            : m
        )
      );
      setIsChatStreaming(false);
    }
  }, [settings]);

  // ─── Auto-extract action items when transcript grows ─────────────────────
  useEffect(() => {
    if (!settings.groqApiKey || transcriptChunks.length === 0) return;
    if (transcriptChunks.length <= lastExtractedChunkCountRef.current) return;
    lastExtractedChunkCountRef.current = transcriptChunks.length;

    const transcriptText = transcriptChunks
      .map((c) => `[${c.timestamp.toLocaleTimeString()}] ${c.text}`)
      .join('\n');

    extractActionItems(transcriptText, settings.groqApiKey)
      .then((items) => setActionItems(items))
      .catch((err) => console.error('Action items error:', err));
  }, [transcriptChunks, settings.groqApiKey]);

  // ─── Summarize ────────────────────────────────────────────────────────────
  const handleSummarize = useCallback(async () => {
    if (!settings.groqApiKey || transcriptChunks.length === 0) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: '📋 Generate meeting summary',
      timestamp: new Date(),
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setChatMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsChatStreaming(true);

    const transcriptTexts = transcriptChunks.map(
      (c) => `[${c.timestamp.toLocaleTimeString()}] ${c.text}`
    );

    try {
      await streamChatResponse(
        buildSummaryPrompt(transcriptTexts),
        settings.groqApiKey,
        (chunk) => {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m
            )
          );
        },
        () => {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
            )
          );
          setIsChatStreaming(false);
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${msg}`, isStreaming: false }
            : m
        )
      );
      setIsChatStreaming(false);
    }
  }, [settings, transcriptChunks]);

  // ─── Suggestion feedback ─────────────────────────────────────────────────
  const handleFeedback = useCallback((suggestionId: string, value: 'up' | 'down' | null) => {
    setSuggestionBatches((prev) =>
      prev.map((batch) => ({
        ...batch,
        suggestions: batch.suggestions.map((s) =>
          s.id === suggestionId ? { ...s, feedback: value } : s
        ),
      }))
    );
  }, []);

  // ─── Export ───────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const data = buildSessionExport(transcriptChunks, suggestionBatches, chatMessages);
    downloadExport(data);
  }, [transcriptChunks, suggestionBatches, chatMessages]);

  // ─── Open settings automatically if no API key ────────────────────────────
  useEffect(() => {
    if (!settings.groqApiKey) {
      setSettingsOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Header
        onExport={handleExport}
        onOpenSettings={() => setSettingsOpen(true)}
        hasApiKey={!!settings.groqApiKey}
      />

      <main className="main-grid">
        <TranscriptPanel
          recordingState={recordingState}
          transcriptChunks={transcriptChunks}
          onToggleRecording={toggleRecording}
          meetingMode={meetingMode}
          isTranscribing={isTranscribing}
        />
        <SuggestionsPanel
          batches={suggestionBatches}
          transcriptChunks={transcriptChunks}
          onSuggestionClick={handleSuggestionClick}
          onRefresh={handleRefresh}
          isLoading={isSuggestionsLoading}
          autoRefreshInterval={settings.autoRefreshInterval}
          lastRefreshTime={lastRefreshTime}
          hasTranscript={transcriptChunks.length > 0}
          onFeedback={handleFeedback}
        />
        <ChatPanel
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isStreaming={isChatStreaming}
          actionItems={actionItems}
          onSummarize={handleSummarize}
          hasTranscript={transcriptChunks.length > 0}
        />
      </main>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
