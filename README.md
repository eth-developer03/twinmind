# TwinMind — Live Suggestions Web App

A real-time AI meeting copilot that listens to your mic and continuously surfaces 3 useful suggestions based on what's being said. Built for the TwinMind engineering assignment.

## Stack

- **Next.js 14** (App Router) — deployed on Vercel
- **Groq API** — Whisper Large V3 for transcription, Llama 4 Maverick for suggestions + chat
- **Web Audio API** — mic capture and 30s chunking via `MediaRecorder`
- **TypeScript** — strict mode throughout
- **CSS custom properties** — no UI framework, pixel-matched to the reference prototype

## Features

### Core
- **Mic + Transcript** — start/stop; transcript appends every ~30s with timestamps; auto-scrolls
- **Live Suggestions** — 3 fresh suggestions per batch, auto-refreshed every 30s; newest batch on top, older faded below
- **Chat Panel** — click any suggestion for a detailed streamed answer, or type directly
- **Settings** — editable prompts, context windows, API key, refresh interval — persisted to localStorage
- **Export** — full session JSON: transcript + suggestion batches + chat with timestamps

### 3 Extra Features

1. **Meeting Mode Auto-Detection** — model identifies `interview`, `sales`, `brainstorm`, `lecture`, or `general` from transcript. Displayed in UI and influences suggestion framing
2. **Suggestion Feedback (👍/👎)** — hover any card to rate it. 👎 tells the prompt to avoid similar suggestions in future batches
3. **Live Highlights + Insights Bar** — numbers highlighted blue, questions green, action words yellow. Insights bar shows live word count, questions asked, and suggestion totals

## Prompt Strategy

**Suggestion prompt** passes: recent transcript (last N chunks), all previous suggestions (deduplication), and detected meeting mode. Instructs model to pick types contextually — e.g., if a question was just asked, one suggestion should be ANSWER; if a claim was made, consider FACT-CHECK. Returns JSON with meetingMode + 3 typed suggestions.

**Detailed answer prompt** uses a larger context window (full transcript), passes clicked suggestion type+preview, targets 150–300 word deep-dive.

**Chat prompt** uses entire transcript as context. Kept separate from suggestions so model can reason about the full arc.

**Why Llama 4 Maverick:** Groq's fastest large-context model, supports JSON mode for reliable structured output, ~1-2s suggestion latency.

## Tradeoffs

| Decision | Rationale |
|---|---|
| Client-only, no API routes | Fewer hops, lower latency. Groq allows browser CORS |
| 30s chunk interval | Balances cost vs. freshness. Configurable |
| JSON mode for suggestions | Reliable parsing, minor latency cost worthwhile |
| Full transcript for chat, recent only for suggestions | Suggestions need recency; detailed answers need full context |

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), open Settings, paste your Groq API key from [console.groq.com](https://console.groq.com).

## Deploy to Vercel

```bash
npx vercel --prod
```

No environment variables — API key entered by user in the UI.

## Project Structure

```
src/
  app/
    page.tsx           # Main orchestrator — all state, API calls, wiring
    layout.tsx         # Root layout + SettingsProvider
    globals.css        # All styles, dark theme, CSS variables
  components/
    Header.tsx               # Export + settings buttons
    TranscriptPanel.tsx      # Mic + transcript chunks
    SuggestionsPanel.tsx     # Batches, refresh, countdown, insights bar
    SuggestionCard.tsx       # Card with type badge + feedback
    SuggestionFeedback.tsx   # 👍/👎 buttons
    MeetingInsightsBar.tsx   # Live session stats
    ChatPanel.tsx            # Streaming chat
    SettingsModal.tsx        # Full settings with prompt editors
    HighlightedText.tsx      # Transcript keyword highlighter
  hooks/
    useAudioRecorder.ts      # MediaRecorder + 30s chunking
    useSettings.tsx          # Settings context + localStorage
  lib/
    groq.ts            # All Groq API calls + prompt builders
    constants.ts       # Default prompts, model names, colors
    export.ts          # Session export + download
  types/
    index.ts           # All TypeScript types
```
