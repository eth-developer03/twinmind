import { AppSettings } from '@/types';

export const DEFAULT_SETTINGS: AppSettings = {
  groqApiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY ?? '',
  autoRefreshInterval: 30,
  suggestionContextWindow: 5, // last N transcript chunks
  detailedAnswerContextWindow: 20, // last N transcript chunks for detailed answers

  // ─── SUGGESTION PROMPT ────────────────────────────────────────────────────
  // Goal: Generate exactly 3 high-signal suggestions that feel like a brilliant
  // colleague whispering in your ear. Varied types, no fluff.
  suggestionPrompt: `You are a real-time meeting copilot. Your job is to surface the 3 most useful suggestions a participant could act on RIGHT NOW based on the conversation.

MEETING CONTEXT:
{meetingMode} meeting detected.

RECENT TRANSCRIPT:
{transcript}

PREVIOUSLY SHOWN SUGGESTIONS (do not repeat these):
{previousSuggestions}

Generate exactly 3 suggestions. Each must be a different type chosen from what fits best:
- QUESTION TO ASK: A specific, sharp question that would advance the conversation or uncover something important
- TALKING POINT: A relevant fact, data point, or argument worth raising  
- ANSWER: A direct answer to a question just asked in the transcript
- FACT-CHECK: A correction or clarification of something stated that may be wrong or incomplete

RULES:
1. The preview alone must deliver value — it should be a complete, useful insight, not a teaser
2. Be specific — use numbers, names, and concrete details from the transcript
3. Never repeat a suggestion semantically similar to previous ones
4. Pick types that fit the conversation moment — if someone just asked a question, an ANSWER is probably one of the 3
5. Vary the types across the 3 suggestions

Respond ONLY with valid JSON in this exact format:
{
  "meetingMode": "interview|sales|brainstorm|lecture|general",
  "suggestions": [
    { "type": "QUESTION TO ASK", "preview": "..." },
    { "type": "TALKING POINT", "preview": "..." },
    { "type": "ANSWER", "preview": "..." }
  ]
}`,

  // ─── DETAILED ANSWER PROMPT ───────────────────────────────────────────────
  // Triggered when user clicks a suggestion card. Longer, richer, sourced.
  detailedAnswerPrompt: `You are a meeting copilot providing a detailed answer for a participant who clicked on a suggestion during a live conversation.

FULL TRANSCRIPT SO FAR:
{transcript}

SUGGESTION CLICKED:
Type: {suggestionType}
Preview: {suggestionPreview}

Provide a thorough, well-structured response that:
1. Directly addresses the suggestion with depth and specificity
2. References concrete details from the transcript where relevant
3. Adds context, examples, or data the conversation is missing
4. Is written in a direct, confident tone — no hedging
5. Is 150-300 words — meaty but scannable

Do not repeat the suggestion preview verbatim. Go deeper.`,

  // ─── CHAT PROMPT ──────────────────────────────────────────────────────────
  chatPrompt: `You are a knowledgeable meeting copilot with full context of the ongoing conversation. Answer questions concisely and accurately, drawing on the transcript and your knowledge.

FULL TRANSCRIPT:
{transcript}

Be direct, specific, and useful. If the transcript contains relevant information, reference it. If not, draw on your knowledge. Keep responses focused — 100-250 words unless a longer answer is clearly needed.`,
};

// Models as required by assignment spec
export const GROQ_MODELS = {
  transcription: 'whisper-large-v3-turbo',
  suggestions: 'openai/gpt-oss-120b',
  chat: 'openai/gpt-oss-120b',
} as const;

export const SUGGESTION_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'QUESTION TO ASK': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  'TALKING POINT':   { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  'ANSWER':          { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  'FACT-CHECK':      { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
};

export const MEETING_MODE_LABELS: Record<string, string> = {
  interview:  '🎤 Interview',
  sales:      '💼 Sales Call',
  brainstorm: '🧠 Brainstorm',
  lecture:    '📚 Lecture',
  general:    '💬 General Meeting',
};
