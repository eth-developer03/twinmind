import { TranscriptChunk, SuggestionBatch, ChatMessage, SessionExport } from '@/types';

export function buildSessionExport(
  transcriptChunks: TranscriptChunk[],
  suggestionBatches: SuggestionBatch[],
  chatMessages: ChatMessage[]
): SessionExport {
  return {
    exportedAt: new Date().toISOString(),
    transcript: transcriptChunks.map((c) => ({
      timestamp: c.timestamp.toISOString(),
      text: c.text,
    })),
    suggestionBatches: suggestionBatches.map((b) => ({
      batchNumber: b.batchNumber,
      timestamp: b.timestamp.toISOString(),
      suggestions: b.suggestions.map((s) => ({
        type: s.type,
        preview: s.preview,
        feedback: s.feedback ?? null,
      })),
    })),
    chat: chatMessages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    })),
  };
}

export function downloadExport(data: SessionExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `twinmind-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
