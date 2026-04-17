import { Suggestion, MeetingMode, ActionItem } from '@/types';
import { GROQ_MODELS } from './constants';

// ─── TRANSCRIPTION ────────────────────────────────────────────────────────────

export async function transcribeAudio(
  audioBlob: Blob,
  apiKey: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', GROQ_MODELS.transcription);
  formData.append('response_format', 'text');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Transcription failed: ${err}`);
  }

  return response.text();
}

// ─── SUGGESTIONS ──────────────────────────────────────────────────────────────

interface SuggestionAPIResponse {
  meetingMode: MeetingMode;
  suggestions: Array<{ type: string; preview: string }>;
}

export async function generateSuggestions(
  prompt: string,
  apiKey: string
): Promise<{ suggestions: Suggestion[]; meetingMode: MeetingMode }> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODELS.suggestions,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Suggestions failed: ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content ?? '{}';

  let parsed: SuggestionAPIResponse;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse suggestions JSON');
  }

  const suggestions: Suggestion[] = (parsed.suggestions ?? [])
    .slice(0, 3)
    .map((s, i) => ({
      id: `${Date.now()}-${i}`,
      type: s.type as Suggestion['type'],
      preview: s.preview,
    }));

  return {
    suggestions,
    meetingMode: parsed.meetingMode ?? 'general',
  };
}

// ─── CHAT (streaming) ─────────────────────────────────────────────────────────

export async function streamChatResponse(
  prompt: string,
  apiKey: string,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<void> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODELS.chat,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1000,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Chat failed: ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.replace(/^data: /, '').trim();
      if (!trimmed || trimmed === '[DONE]') continue;
      try {
        const json = JSON.parse(trimmed);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onChunk(delta);
      } catch {
        // skip malformed lines
      }
    }
  }

  onDone();
}

// ─── ACTION ITEMS EXTRACTION ──────────────────────────────────────────────────

export async function extractActionItems(
  transcript: string,
  apiKey: string
): Promise<ActionItem[]> {
  const prompt = `Extract action items from this transcript. An action item is any of:
- A task someone committed to doing ("I'll send the report by Friday")
- A personal scheduled event ("I have a meeting at 2pm")
- A personal task in progress or planned ("I'm working on my PPT", "I need to finish the dashboard")
- A personal intention ("I have to go to the gym at 9pm", "I should follow up with John")

NOT action items: questions, suggestions, facts, opinions, general discussion.

TRANSCRIPT:
${transcript}

Return ONLY valid JSON (no markdown, no explanation):
{"actionItems": [{"text": "task description", "assignee": "name or null", "deadline": "time/date or null"}]}
If no action items exist, return: {"actionItems": []}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODELS.chat,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Action items extraction failed: ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content);
    return (parsed.actionItems ?? []).map(
      (item: { text: string; assignee?: string; deadline?: string }, i: number) => ({
        id: `${Date.now()}-${i}`,
        text: item.text,
        assignee: item.assignee ?? undefined,
        deadline: item.deadline ?? undefined,
      })
    );
  } catch {
    return [];
  }
}

// ─── SUMMARY PROMPT BUILDER ───────────────────────────────────────────────────

export function buildSummaryPrompt(transcriptChunks: string[]): string {
  const transcript = transcriptChunks.join('\n');
  return `Summarize this meeting transcript. Structure your response as:

**Key Points** — main topics discussed
**Decisions Made** — any conclusions or decisions reached
**Action Items** — specific tasks people committed to
**Open Questions** — unresolved questions or next steps

TRANSCRIPT:
${transcript || 'No transcript yet.'}

Be specific and concise. Use bullet points.`;
}

// ─── PROMPT BUILDERS ──────────────────────────────────────────────────────────

export function buildSuggestionPrompt(
  template: string,
  transcriptChunks: string[],
  previousSuggestions: string[],
  meetingMode: MeetingMode,
  contextWindow: number
): string {
  const recentTranscript = transcriptChunks.slice(-contextWindow).join('\n');
  const prevSuggestionsText = previousSuggestions.length
    ? previousSuggestions.join('\n')
    : 'None yet';

  return template
    .replace('{transcript}', recentTranscript || 'No transcript yet.')
    .replace('{previousSuggestions}', prevSuggestionsText)
    .replace('{meetingMode}', meetingMode);
}

export function buildDetailedAnswerPrompt(
  template: string,
  transcriptChunks: string[],
  suggestionType: string,
  suggestionPreview: string,
  contextWindow: number
): string {
  const transcript = transcriptChunks.slice(-contextWindow).join('\n');
  return template
    .replace('{transcript}', transcript || 'No transcript yet.')
    .replace('{suggestionType}', suggestionType)
    .replace('{suggestionPreview}', suggestionPreview);
}

export function buildChatPrompt(
  template: string,
  transcriptChunks: string[],
  userMessage: string
): string {
  const transcript = transcriptChunks.join('\n');
  return template
    .replace('{transcript}', transcript || 'No transcript yet.')
    + `\n\nUSER QUESTION: ${userMessage}`;
}
