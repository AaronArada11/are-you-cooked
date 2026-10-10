# Interview frontend

Next.js App Router, Tailwind CSS v4, and shadcn/ui (Radix). Requires Node 22.18+.

```sh
cd frontend
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open http://127.0.0.1:3000. Start the backend using the root README's Docker Compose instructions to record a session. The frontend proxies only session routes to `http://127.0.0.1:8000`. Override this server-side with `INTERVIEW_API_URL` in `.env.local` when necessary. Never expose this unauthenticated development app publicly.

**Explore workspace** works without the backend. **Start Interview** creates a real backend session and enters solving. Explain your approach, save snapshots, request tests/hints, submit (including incomplete attempts), inspect the evidence-linked summary, and finish. The API enforces transitions. Refresh session status recovers the current state after uncertain network outcomes; unsuccessful sends keep draft text.

The public exercise is imported from the backend's versioned public JSON during the build, so builds need the whole repository. Hidden tests, evaluator notes, and reference solutions are never imported.

## Honest limitations

- No AI interviewer/evaluator, voice, or execution sandbox is implemented. Test requests explicitly report unavailable; no candidate code executes. The opening question is labeled as a static practice prompt.
- Doneness variants are a **design preview**, not an invented grade. Real sessions remain neutral and unassessed until a validated rubric/evaluator exists.
- The editor is a labeled monospace textarea with line numbers. No syntax highlighting, autocomplete, or automatic indentation yet. Tab moves keyboard focus normally.
- Drafts and the current session ID live in page memory, lost on reload/close. Backend records survive page closing but are process-local and lost on backend restart. Download code or the session JSON to keep them. No localStorage, analytics, microphone, or external model requests.
- Closing a live workspace shows a browser leave warning. A backend restart is reported as an expired session; download code before reloading to start again.
- Qualitative assessment dimensions report insufficient evidence. The summary counts actual events and links to them; it does not claim AI quality or correctness.

## Verification

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
# With the frontend and backend running:
npm run test:session
```

Tests cover request preservation, malformed responses, useful failure messages, the proxy path allowlist, cross-site rejection, body size limits, upstream conflicts, and unavailable service handling.

Manual end-to-end check: start → explanation → code snapshot → Run Tests (unavailable) → Request Hint (not delivered) → Submit & review → inspect linked events → download record → Finish session. Check desktop and a 390px viewport; the latter uses panel navigation. Use authored synthetic inputs for QA.

Mascot artwork is based on the user-provided reference, generated with the built-in image tool. See `public/mascot/README.md`. UI tokens and rationale live in the root `DESIGN.md`.
