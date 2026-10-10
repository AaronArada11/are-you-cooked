"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Code2,
  Download,
  Flame,
  Info,
  Lightbulb,
  MessageSquare,
  Mic,
  Play,
  ShieldCheck,
  Terminal,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { exercise } from "@/lib/exercise";
import {
  requestSession,
  downloadFile,
  type Action,
  type Session,
} from "@/lib/interview";
import { Mascot, MascotGuide } from "./mascot";
import { Problem } from "./problem";
import { Review } from "./review";

const narrowQuery = "(max-width: 1100px)";
function subscribeViewport(callback: () => void) {
  const media = window.matchMedia(narrowQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function InterviewApp() {
  const narrow = useSyncExternalStore(
    subscribeViewport,
    () => window.matchMedia(narrowQuery).matches,
    () => false,
  );
  const [screen, setScreen] = useState<"start" | "workspace" | "review">(
    "start",
  );
  const [session, setSession] = useState<Session | null>(null);
  const [code, setCode] = useState(exercise.starter_code);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [mobileTab, setMobileTab] = useState("problem");
  const actionLock = useRef(false);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const solving = session?.state === "solving";
  const editable = !session || solving;
  const latestRun = session?.events
    .filter((event) => event.kind === "test_run")
    .at(-1);
  const snapshot = session?.events
    .filter((event) => event.kind === "code_snapshot")
    .at(-1);
  const saved = snapshot?.data.code === code;
  const isReviewable =
    session && ["submitted", "feedback", "ended"].includes(session.state);

  useEffect(() => {
    if (screen === "start" || session?.state === "ended") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [screen, session?.state]);
  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: "instant",
    });
  }, [session?.events.length]);

  async function work(task: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Your work is still here.",
      );
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function act(action: Action, current = session) {
    if (!current)
      throw new Error(
        "Start an interview to record your work. Workspace preview does not save messages or code.",
      );
    const result = await requestSession(`/${current.id}/events`, action);
    setSession(result);
    return result;
  }
  function start() {
    void work(async () => {
      const current =
        session ||
        (await requestSession("", { exercise_id: exercise.exercise_id }));
      setSession(current);
      await act({ kind: "start" }, current);
      setScreen("workspace");
    });
  }
  function send() {
    if (!message.trim()) return;
    void work(async () => {
      await act({ kind: "message", text: message.trim() });
      setMessage("");
      setNotice(
        "Explanation recorded. The AI interviewer is not connected yet.",
      );
    });
  }
  function submit() {
    void work(async () => {
      let current = session;
      if (message.trim()) {
        current = await act({ kind: "message", text: message.trim() }, current);
        setMessage("");
      }
      current = await act({ kind: "submit", code }, current);
      setConfirmSubmit(false);
      await act({ kind: "feedback" }, current);
      setScreen("review");
    });
  }
  function review() {
    void work(async () => {
      if (session?.state === "submitted") await act({ kind: "feedback" });
      setScreen("review");
    });
  }

  const editor = (
    <section className="editor-column" aria-label="Code and test results">
      <div className="panel editor-panel">
        <div className="panel-heading">
          <Code2 aria-hidden="true" />
          <span>solution.py</span>
          <span className="heading-meta">Python</span>
        </div>
        <div className="editor-help">
          Keep it simple. Explain your thinking as you go.
        </div>
        <div className="code-area">
          <div className="line-numbers" aria-hidden="true" ref={lineRef}>
            {Array.from(
              { length: Math.max(14, code.split("\n").length) },
              (_, index) => (
                <div key={index}>{index + 1}</div>
              ),
            )}
          </div>
          <textarea
            ref={codeRef}
            aria-label="Python solution"
            className="code-input"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onScroll={(event) => {
              if (lineRef.current)
                lineRef.current.scrollTop = event.currentTarget.scrollTop;
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            maxLength={100000}
            readOnly={!editable || busy}
          />
        </div>
        <div className="editor-status">
          <span>
            {saved ? (
              <>
                <Check />
                Snapshot recorded
              </>
            ) : (
              "Changes stay in this window until saved"
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || !solving || saved}
            onClick={() =>
              void work(async () => {
                await act({ kind: "snapshot", code });
                setNotice("Code snapshot recorded.");
              })
            }
          >
            Save snapshot
          </Button>
        </div>
        <div className="editor-actions">
          <Button
            variant="outline"
            disabled={busy || !solving}
            onClick={() =>
              void work(async () => {
                await act({ kind: "test_run", code });
                setNotice(
                  "Test request recorded. Execution sandbox is not configured; no code ran.",
                );
              })
            }
          >
            <Play data-icon="inline-start" />
            Run Tests
          </Button>
          <Button
            disabled={busy || !solving}
            onClick={() => setConfirmSubmit(true)}
          >
            <Upload data-icon="inline-start" />
            Submit Solution
          </Button>
        </div>
      </div>
      <section className="panel results-panel" aria-label="Test results">
        <div className="panel-heading">
          <Terminal aria-hidden="true" />
          <span>Test results</span>
          {latestRun && <Badge variant="outline">Unavailable</Badge>}
        </div>
        <div className="results-empty">
          <div className="terminal-mark">
            <Terminal aria-hidden="true" />
          </div>
          <h2>
            {latestRun
              ? "Execution unavailable"
              : "Your next step: put it to the test"}
          </h2>
          <p>
            {latestRun
              ? String(latestRun.data.detail)
              : "Run your solution when you’re ready."}
          </p>
          <span className="muted">
            {latestRun
              ? "No tests ran. This is neither a pass nor a failure."
              : "The execution sandbox is not configured yet."}
          </span>
        </div>
      </section>
    </section>
  );

  const conversation = (
    <section
      className="panel interviewer-panel"
      aria-label="Interviewer conversation"
    >
      <div className="panel-heading">
        <MessageSquare aria-hidden="true" />
        <span>Your interviewer</span>
        <span className="status-dot" title="Practice companion" />
      </div>
      <div className="interviewer-identity">
        <Mascot className="interviewer-mascot" decorative />
        <h2>A little heat. A lot of growth.</h2>
        <p>Your space to think out loud.</p>
        <Badge variant="outline">Neutral · not assessed</Badge>
      </div>
      <div
        className="conversation"
        ref={conversationRef}
        aria-label="Recorded messages"
      >
        <div className="chat-message interviewer-message">
          <span className="message-author">Practice prompt</span>
          <p>
            Let’s start with your approach. How would you identify strings that
            belong in the same anagram group?
          </p>
        </div>
        {session?.events
          .filter((event) => ["message", "hint"].includes(event.kind))
          .map((event) => (
            <div key={event.id} className="chat-message candidate-message">
              <span className="message-author">
                {event.kind === "hint"
                  ? "Hint requested · not delivered"
                  : "You"}
                <time dateTime={event.timestamp}>
                  {new Date(event.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </span>
              <p>{String(event.data.text)}</p>
            </div>
          ))}
      </div>
      <div className="conversation-bottom">
        <div className="interviewer-availability">
          <Info aria-hidden="true" />
          <p>
            AI interviewer unavailable. Your explanations can still be recorded.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <Field>
            <FieldLabel htmlFor="explanation">Your explanation</FieldLabel>
            <Textarea
              id="explanation"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Here’s how I’d approach it…"
              maxLength={20000}
              disabled={busy || !editable}
              aria-describedby="message-help"
            />
          </Field>
          <div className="composer-actions">
            <span id="message-help">
              {!session ? "Start a session to send" : "Written conversation"}
            </span>
            <Button
              type="submit"
              size="icon"
              aria-label="Send explanation"
              disabled={busy || !solving || !message.trim()}
            >
              <ArrowUp />
            </Button>
          </div>
        </form>
        <div className="chat-tools">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || !solving}
            onClick={() =>
              void work(async () => {
                await act({
                  kind: "hint",
                  text: "Please give me a hint for my current approach.",
                });
                setNotice(
                  "Hint request recorded. Hint delivery is not available; no assistance was given.",
                );
              })
            }
          >
            <Lightbulb data-icon="inline-start" />
            Request Hint
          </Button>
          <span>
            <Mic aria-hidden="true" />
            Voice coming later
          </span>
        </div>
      </div>
    </section>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <div className="brand">
          <Flame aria-hidden="true" />
          <span>
            are you cooked<span className="brand-punctuation">?</span>
          </span>
        </div>
        <div className="header-context">
          <span>Interview practice</span>
          {screen !== "start" && (
            <>
              <ChevronRight aria-hidden="true" />
              <span>
                {screen === "review" ? "Session review" : "Find Anagram Groups"}
              </span>
            </>
          )}
        </div>
        <div className="header-actions">
          <MascotGuide />
          {session?.state === "ended" && (
            <Button
              variant="outline"
              onClick={() => {
                setSession(null);
                setCode(exercise.starter_code);
                setMessage("");
                setNotice("");
                setError("");
                setScreen("start");
              }}
            >
              New interview
            </Button>
          )}
          {screen === "workspace" &&
            (solving ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmSubmit(true)}
              >
                End interview
              </Button>
            ) : isReviewable ? (
              <Button onClick={review} disabled={busy}>
                View review
              </Button>
            ) : (
              <Button onClick={start} disabled={busy}>
                {busy ? "Starting…" : "Start Interview"}
              </Button>
            ))}
        </div>
      </header>
      {error && (
        <div className="global-alert">
          <Alert variant="destructive">
            <Info />
            <AlertTitle>Couldn’t complete that action</AlertTitle>
            <AlertDescription>
              {error}
              {session && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void work(async () => {
                      const refreshed = await requestSession(`/${session.id}`);
                      setSession(refreshed);
                      if (refreshed.state !== "solving")
                        setConfirmSubmit(false);
                      if (refreshed.state !== "introduction")
                        setScreen("workspace");
                      setNotice("Session status refreshed.");
                    })
                  }
                >
                  Refresh session status
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div className="sr-only" role="status">
        {busy ? "Saving session…" : notice}
      </div>
      {screen === "start" ? (
        <main className="start-page" id="main-content">
          <div className="start-intro">
            <div className="start-copy">
              <p className="intro-caption">
                <span className="status-dot" />
                Your next interview starts here.
              </p>
              <h1>
                Good interviews
                <br />
                start with practice<span>.</span>
              </h1>
              <p className="start-description">
                Work through a real coding problem. Explain your approach. Find
                out where you can grow—with a little company along the way.
              </p>
              <div className="start-actions">
                <Button size="lg" onClick={start} disabled={busy}>
                  {busy ? "Starting your session…" : "Start Interview"}
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setScreen("workspace")}
                >
                  Explore workspace
                </Button>
              </div>
              <p className="start-note">
                One problem. Room to think. No pressure.
              </p>
            </div>
            <div className="start-character">
              <Mascot className="hero-mascot" decorative />
              <div className="mascot-greeting">Ready when you are.</div>
              <span className="mascot-caption">Your steak interviewer</span>
            </div>
          </div>
          <section className="exercise-overview">
            <div className="exercise-number">01</div>
            <div>
              <div className="flex gap-2">
                <Badge variant="secondary">Python</Badge>
                <Badge variant="outline">Algorithm practice</Badge>
              </div>
              <h2>{exercise.title}</h2>
              <p>
                Find matching letters. Keep the order. Explain the tradeoffs.
              </p>
            </div>
            <Code2 aria-hidden="true" />
          </section>
          <div className="start-details">
            <div>
              <ShieldCheck aria-hidden="true" />
              <p>
                <strong>Your practice, made visible.</strong> Messages, code
                snapshots, and actions are recorded in memory. Backend restarts
                erase the record; closing this page loses your local draft.
              </p>
            </div>
            <div>
              <Info aria-hidden="true" />
              <p>
                <strong>Early build.</strong> Session recording works with the
                backend running. AI interviewing, test execution, and
                performance feedback are not connected yet.
              </p>
            </div>
          </div>
        </main>
      ) : screen === "review" && session ? (
        <Review
          session={session}
          busy={busy}
          onBack={() => setScreen("workspace")}
          onEnd={() =>
            void work(async () => {
              await act({ kind: "end" });
            })
          }
        />
      ) : (
        <main className="workspace-page" id="main-content">
          <div className="workspace-toolbar">
            <div className="session-label">
              <span className="status-dot" />
              <strong>
                {session
                  ? solving
                    ? "Practice session"
                    : session.state === "ended"
                      ? "Session ended"
                      : "Session submitted"
                  : "Workspace preview"}
              </strong>
              <span>
                {session
                  ? `Session ${session.id.slice(0, 8)}`
                  : "Nothing is recorded until you start"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadFile("solution.py", code)}
            >
              <Download data-icon="inline-start" />
              Download code
            </Button>
          </div>
          <ToggleGroup
            type="single"
            value={mobileTab}
            onValueChange={(value) => value && setMobileTab(value)}
            className="mobile-tabs"
            aria-label="Workspace panels"
          >
            {["problem", "code", "interviewer"].map((tab) => (
              <ToggleGroupItem key={tab} value={tab}>
                {tab === "code"
                  ? "Code & tests"
                  : tab === "problem"
                    ? "Problem"
                    : "Interviewer"}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {!narrow ? (
            <div className="workspace-desktop">
              <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel defaultSize="28%" minSize="22%">
                  <Problem />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="44%" minSize="30%">
                  {editor}
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="28%" minSize="23%">
                  {conversation}
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          ) : (
            <div className="workspace-mobile">
              {mobileTab === "problem" ? (
                <Problem />
              ) : mobileTab === "code" ? (
                editor
              ) : (
                conversation
              )}
            </div>
          )}
          {notice && <p className="inline-notice">{notice}</p>}
        </main>
      )}
      <footer className="app-footer">
        <span>
          <ShieldCheck aria-hidden="true" />
          {session
            ? "Session record in memory · lost on backend restart"
            : "Local practice · no account needed"}
        </span>
        <span>Think it through. Talk it out.</span>
      </footer>
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ready to wrap up?</DialogTitle>
            <DialogDescription>
              We’ll record your current code and any unsent explanation, then
              open your session summary. You can submit an incomplete attempt.
              Code editing closes after submission.
            </DialogDescription>
          </DialogHeader>
          <p className="muted">
            Tests and AI assessment are unavailable, so the review will only
            summarize recorded evidence.
          </p>
          <div role="alert">{error}</div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmSubmit(false)}
            >
              Keep working
            </Button>
            <Button disabled={busy} onClick={submit}>
              {busy ? "Recording…" : "Submit & review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
