# TwinMind — Live Suggestions

A real-time AI meeting copilot that listens to your mic and continuously surfaces 3 useful suggestions based on what's being said. Built for the TwinMind engineering assignment.

**[Live Demo →](https://twinmind-alpha.vercel.app)** · **[GitHub →](https://github.com/eth-developer03/twinmind)**

---

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → Settings → paste your Groq API key from [console.groq.com](https://console.groq.com).

No environment variables needed. API key is stored in `localStorage` only.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | File-based routing, RSC-ready, trivial Vercel deploy |
| Language | TypeScript (strict) | Catches prop/type mismatches at compile time |
| AI | Groq API | Sub-second inference; Whisper + LLM in one platform |
| Audio | Web Audio API + `MediaRecorder` | Native browser API, no dependency |
| State | React Context + `useState` | No Redux needed — settings are the only global state |
| Styling | CSS custom properties | No UI framework — fast, no bundle bloat, full control |
| Deployment | Vercel | Zero-config Next.js deploy |

**No backend.** All Groq calls go directly from the browser — Groq supports CORS. This removes one network hop and is the single biggest latency win.

---

## Prompt Strategy

This is the core of the assignment. Here are every decision, why I made it, and what I'd change if I had more time.

### Live Suggestions Prompt

**What context I pass:**
- Recent transcript only (last N chunks, default 5) — not the full transcript. Suggestions need recency, not history.
- All previously shown suggestion previews — explicitly told "do not repeat these". Prevents the model from surfacing the same insight twice.
- Detected meeting mode — so the model frames suggestions differently for an interview vs a sales call.

**How I structured it:**
The prompt defines 4 suggestion types and tells the model to pick what fits the moment, not rotate mechanically:
- `QUESTION TO ASK` — when the conversation has a gap or an unexplored angle
- `TALKING POINT` — when a claim or topic deserves supporting data
- `ANSWER` — when a question was literally just asked in the transcript
- `FACT-CHECK` — when something stated may be wrong or incomplete

The key instruction: *"if someone just asked a question, ANSWER should be one of the 3."* This makes suggestions feel situationally aware rather than generic.

**JSON mode** is forced (`response_format: { type: "json_object" }`) so parsing never fails. The model also returns `meetingMode` in the same response — two outputs, one API call.

**Meeting mode auto-detection:** Rather than a separate classification call, meeting mode is detected inside the suggestion call itself. The model returns `interview | sales | brainstorm | lecture | general` as part of the JSON. Zero extra latency.

### Detailed Answer Prompt (on click)

Uses a larger context window (default 20 chunks — full transcript for most sessions). When a user clicks a suggestion card, they want depth, not just the preview expanded. The prompt:
- Receives the suggestion type + preview as explicit inputs
- Explicitly says "do not repeat the preview verbatim — go deeper"
- Targets 150–300 words: enough substance, still scannable
- Uses `stream: true` so first token appears in ~400ms

### Chat Prompt

Full transcript as context — unlike suggestions, the user's chat question could reference anything said in the session. The prompt keeps the model in "meeting copilot" mode so it doesn't drift into generic assistant behavior.

### Action Items Extraction Prompt

Separate async call triggered on every new transcript chunk. Extracts 4 categories:
1. Explicit commitments between people ("I'll send the report by Friday")
2. Personal scheduled events ("I have a meeting at 2pm")
3. Personal tasks in progress ("I'm working on the PPT")
4. Personal intentions ("I need to / I have to / I should")

Temperature set to 0.1 — this is a classification/extraction task, not generation. Low temperature = more consistent, fewer hallucinated action items.

### Meeting Summary Prompt

Triggered on demand (button click). Instructs the model to structure output as:
**Key Points / Decisions Made / Action Items / Open Questions** — this mirrors how a human would write meeting notes, making it immediately useful for sharing.

---

## Features

### Required

- **Mic + Transcript** — start/stop; chunks every ~30s with timestamps; auto-scrolls to latest
- **Live Suggestions** — 3 fresh suggestions per refresh; auto-refreshes every 30s; newest batch on top, older batches faded below; manual refresh button
- **Chat Panel** — click suggestion → detailed streamed answer; type questions directly; one continuous session
- **Settings** — full prompt editor, context windows, API key, refresh interval — all persisted to `localStorage`
- **Export** — full session JSON: transcript + every batch + chat with timestamps

### Added Beyond Requirements

**1. Auto-trigger on first transcript chunk**
Suggestions fire the moment the first transcript chunk arrives (~30s) with zero additional wait. Without this, the user waits 60s (30s audio + 30s countdown). First impression matters.

**2. Meeting Mode Auto-Detection**
Detects `interview / sales / brainstorm / lecture / general` from the transcript inside the suggestion call itself. No extra API call. Meeting mode label shown in UI and passed back into next suggestion cycle.

**3. Action Items Panel**
Separate tab in the chat column. Extracts tasks, personal commitments, and scheduled events from the transcript automatically. Shows assignee and deadline tags when mentioned. Prompt covers both meeting commitments and personal intentions.

**4. One-Click Meeting Summary**
"∑ Summarize" button streams a structured summary (Key Points / Decisions / Action Items / Open Questions) directly into the chat. Useful for sharing notes after the session.

**5. Copy Button on Suggestions**
Hover any suggestion card → copy icon appears → one click copies to clipboard → brief "✓" confirmation. Small feature, high real-world utility.

**6. Suggestion Feedback (👍/👎)**
Hover any card to rate it. 👎 signals are passed into the next suggestion prompt as "do not repeat suggestions similar to these" — closes the feedback loop.

**7. Markdown Rendering in Chat**
Assistant responses render with proper bold, headers, and bullet points via `react-markdown`. Especially noticeable in meeting summaries.

**8. Live Transcript Highlights + Insights Bar**
Numbers highlighted blue, questions green, action words yellow. Insights bar shows live word count, question count, and suggestion totals.

---

## Latency Decisions

| Optimization | Impact |
|---|---|
| No backend — direct browser→Groq | Removes one network hop |
| `whisper-large-v3-turbo` for transcription | ~3× faster than `whisper-large-v3`, same accuracy |
| Meeting mode detected inside suggestion call | Saves one API call per refresh cycle |
| `stream: true` for chat | First token in ~400ms, feels instant |
| Refs for transcript access in callbacks | No stale closures, no extra re-renders |
| Auto-trigger on first chunk | Halves perceived wait from 60s to 30s |

---

## Tradeoffs

| Decision | Rationale |
|---|---|
| Client-only, no API routes | Lower latency; Groq allows CORS. Risk: API key exposed in browser — acceptable for this use case where users provide their own key |
| `localStorage` for settings | Simple persistence, no backend needed. Lost on clear — acceptable per spec |
| Recent transcript for suggestions, full for chat | Suggestions need the last thing said; detailed answers need full context |
| JSON mode for suggestions | Slightly slower than plain text but parsing never fails — worth it |
| 30s chunk interval | Balances freshness vs. cost. Configurable in settings |
| Single context for both suggestion + mode detection | One call instead of two — net latency win despite slightly complex response schema |

---

## Project Structure

```
src/
  app/
    page.tsx           # Main orchestrator — all state, API wiring, handlers
    layout.tsx         # Root layout + SettingsProvider
    globals.css        # All styles — dark theme, CSS variables, no framework
  components/
    Header.tsx               # Export + settings buttons
    TranscriptPanel.tsx      # Mic + transcript chunks with highlights
    SuggestionsPanel.tsx     # Batches, countdown, auto-refresh, insights bar
    SuggestionCard.tsx       # Card: type badge, copy button, feedback
    SuggestionFeedback.tsx   # 👍/👎 per suggestion
    MeetingInsightsBar.tsx   # Live session stats
    ChatPanel.tsx            # Chat + Action Items tabs, Summarize button
    SettingsModal.tsx        # Full settings with prompt editors
    HighlightedText.tsx      # Transcript keyword highlighter
  hooks/
    useAudioRecorder.ts      # MediaRecorder + 30s chunking
    useSettings.tsx          # Settings context + localStorage
  lib/
    groq.ts            # All Groq API calls + prompt builders
    constants.ts       # Default prompts, model IDs, colors
    export.ts          # Session export + download
  types/
    index.ts           # All TypeScript interfaces
```

---

## Models

| Task | Model |
|---|---|
| Transcription | `whisper-large-v3-turbo` |
| Suggestions + Chat | `openai/gpt-oss-120b` |

Both served via Groq. Model IDs configurable in `src/lib/constants.ts`.
