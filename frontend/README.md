# Frontend README — Farmer AI Chatbot Admin

## Overview

This is the Vite + React + TypeScript administrative frontend for the Farmer AI Chatbot project. It provides: file upload (CSV/XLSX), a dynamic, filterable/paginated table of conversations (derived from the uploaded data / backend), per-row selection, a Conversation Info panel to view full user/assistant messages, and an expert-answer editor that persists answers back to the FastAPI backend.

## Tech stack

- Vite (dev server + build)
- React (functional components, hooks)
- TypeScript for static typing
- axios for HTTP requests
- FastAPI backend (separate repository root) provides the API endpoints used here
- Inline styles (small app-level CSS in `App.tsx`) — no CSS framework currently

## High-level architecture

Single-page app: `frontend/src/App.tsx` contains the full UI (small project intentionally placed in one component). The UI is split conceptually into:

### Upload area

- File input and drag & drop support
- Upload button (enabled only when a file is selected)
- Upload progress indicator and inline upload info message
- Sends multipart/form-data to the backend `POST /upload`

### Table area (left pane)

- Dynamic columns derived from the conversation objects returned by `GET /conversations`
- Preferred column ordering is preserved for important fields (`sent_date`, `hashedid`, `user_message_en`, `assistant_message_en`, etc.) while any additional Excel columns are appended
- Column-level filter inputs (per-column substring match)
- Global filters (search bar, bot, status) and sortable headers
- Pagination controls (Prev/Next + page counter)
- Long text in message columns is truncated to 50 characters with ellipsis inside the table for a lean look; full text is visible in the cell tooltip and in the details panel

### Conversation Info (right pane)

- Shows only the two conversation fields requested: `User Message (EN)` and `Assistant Message (EN)` in full
- Expert Answer textarea where admins write answers; Submit button POSTs to `POST /answer`
- Small status display (Open/Closed)

## Client-side behavior and state

- Core state uses React `useState` for lists, selection, filters, pagination and UI flags. `useEffect` preloads the expert answer when a row is selected.
- Derived columns are computed (`useMemo`) from the conversation dataset so the table automatically includes any columns present in the CSV/XLSX.
- A small `truncate` helper is used to show lean previews in the table cells.
- A transient bottom-right green notification appears when an expert answer is submitted and disappears after 1s.

## API Endpoints (backend)

The frontend expects the backend base URL in Vite env var `VITE_API_URL` and calls:

- `POST /upload` — multipart upload (file) that creates conversation rows server-side
- `GET /conversations` — returns JSON `{ rows: Conversation[] }`
- `POST /answer` — body: `{ index, expert_answer }` to upsert an expert answer for a conversation
- (Dev-only) `POST /admin/reset` — wipes DB (not exposed in current UI)

## Environment

Set the backend URL in `.env` (Vite):

- `VITE_API_URL` (default fallback: `http://localhost:8000`)

## Local development

1. cd frontend
2. npm install
3. npm run dev

## Build for production

1. cd frontend
2. npm run build
3. Serve the files in `dist/` from any static host (or include in your deployment pipeline)

## Notes and suggestions

- For larger projects split `App.tsx` into smaller components (UploadArea, ConversationTable, ConversationDetails) and add tests.
- Consider using a CSS solution (Tailwind or CSS modules) for consistent styling.
- For production DB schema changes, move from ad-hoc migration to Alembic migrations.
- Add optimistic UI for submit flow (apply `expert_answer` locally before server roundtrip) and better error handling UX for uploads.

## Files of interest

- `frontend/src/App.tsx` — main application
- `frontend/package.json` — scripts and dependencies

## Contact

If you want this README expanded into a contributor guide or split into smaller docs, tell me which sections to add.