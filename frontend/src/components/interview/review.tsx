"use client";

import { ArrowLeft, Download, FileCheck2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mascot } from "./mascot";
import { downloadFile, type Session } from "@/lib/interview";

export function Review({
  session,
  busy,
  onEnd,
  onBack,
}: {
  session: Session;
  busy: boolean;
  onEnd: () => void;
  onBack: () => void;
}) {
  const submission = session.events.find(
    (event) => event.kind === "submission",
  );
  const snapshot = session.events.find(
    (event) => event.id === submission?.data.snapshot_id,
  );
  const messages = session.events.filter((event) => event.kind === "message");
  const runs = session.events.filter((event) => event.kind === "test_run");
  const hints = session.events.filter((event) => event.kind === "hint");
  const observations = [
    {
      title: "Your implementation",
      text: snapshot
        ? "A final code snapshot was recorded. Program correctness has not been assessed."
        : "No submitted code snapshot is available.",
      suggestion:
        "Review your code against the ordering and letter-frequency requirements.",
      evidence: snapshot,
    },
    {
      title: "Your explanation",
      text: `${messages.length} written explanation${messages.length === 1 ? "" : "s"} recorded. Explanation quality has not been assessed.`,
      suggestion:
        "Explain why your approach works and how its time and space costs grow.",
      evidence: messages.at(-1),
    },
    {
      title: "Testing & assistance",
      text: `${runs.length} test request${runs.length === 1 ? "" : "s"}; execution unavailable. ${hints.length} hint request${hints.length === 1 ? "" : "s"}; no hints delivered.`,
      suggestion:
        "When execution is available, check repeated letters, missing anagrams, and group ordering.",
      evidence: runs.at(-1) || hints.at(-1),
    },
  ];
  return (
    <main className="review-page" id="main-content">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft data-icon="inline-start" />
        Back to workspace
      </Button>
      <div className="review-intro">
        <div>
          <p className="muted">Session review</p>
          <h1>
            You showed up.
            <br />
            That’s a good start.
          </h1>
          <p>
            Your work is recorded below. Take a moment to reflect on your
            approach.
          </p>
        </div>
        <Mascot className="review-mascot" decorative />
      </div>
      <Alert>
        <Info />
        <AlertTitle>Not enough evidence for a doneness level</AlertTitle>
        <AlertDescription>
          The AI evaluator and execution sandbox are not configured. This is a
          factual session summary, not a performance assessment.
        </AlertDescription>
      </Alert>
      <section
        className="review-observations"
        aria-label="Evidence-linked observations"
      >
        {observations.map((item) => (
          <article key={item.title}>
            <FileCheck2 aria-hidden="true" />
            <h2>{item.title}</h2>
            <p>{item.text}</p>
            <p className="muted">Next step: {item.suggestion}</p>
            {item.evidence ? (
              <a href={`#event-${item.evidence.id}`}>View supporting event ↗</a>
            ) : (
              <span className="muted">Insufficient evidence</span>
            )}
          </article>
        ))}
      </section>
      <section className="assessment">
        <h2>Assessment coverage</h2>
        <p className="muted">
          Understanding, approach, implementation, edge-case testing, complexity
          reasoning, and technical explanation: insufficient evidence for
          assessment until the evaluator is available.
        </p>
      </section>
      <section className="event-record">
        <div className="section-heading">
          <h2>Session evidence</h2>
          <Button
            variant="outline"
            onClick={() =>
              downloadFile(
                `interview-${session.id}.json`,
                JSON.stringify(session, null, 2),
                "application/json",
              )
            }
          >
            <Download data-icon="inline-start" />
            Download record
          </Button>
        </div>
        {session.events
          .filter((event) => !["created", "transition"].includes(event.kind))
          .map((event) => (
            <details key={event.id} id={`event-${event.id}`}>
              <summary>
                <span>{event.kind.replaceAll("_", " ")}</span>
                <time dateTime={event.timestamp}>
                  {new Date(event.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <code>{event.id.slice(0, 8)}</code>
              </summary>
              <pre>{JSON.stringify(event.data, null, 2)}</pre>
            </details>
          ))}
      </section>
      <div className="review-footer">
        <p className="muted">
          Records are lost when the backend restarts. Download yours to keep it.
        </p>
        {session.state !== "ended" ? (
          <Button onClick={onEnd} disabled={busy}>
            {busy ? "Saving…" : "Finish session"}
          </Button>
        ) : (
          <span>Session ended</span>
        )}
      </div>
    </main>
  );
}
