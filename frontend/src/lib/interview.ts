export type SessionEvent = {
  id: string;
  timestamp: string;
  kind: string;
  data: Record<string, string | number>;
};
export type Session = {
  id: string;
  exercise_id: string;
  exercise_version: number;
  state: "introduction" | "solving" | "submitted" | "feedback" | "ended";
  events: SessionEvent[];
};
export type Action =
  | { kind: "start" | "feedback" | "end" }
  | { kind: "message" | "hint"; text: string }
  | { kind: "snapshot" | "test_run" | "submit"; code: string };

export async function requestSession(
  path: string,
  action?: Action | { exercise_id: string },
): Promise<Session> {
  const response = await fetch(`/api/interview/sessions${path}`, {
    method: action ? "POST" : "GET",
    headers: action ? { "Content-Type": "application/json" } : undefined,
    body: action ? JSON.stringify(action) : undefined,
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 404)
      throw new Error(
        "This session is no longer available. The backend may have restarted. Download your code before starting again.",
      );
    if (response.status === 409)
      throw new Error(
        "The session has changed. Refresh its status before trying again.",
      );
    throw new Error(
      "Could not save to the session service. Your work is still here. Check the backend connection and try again.",
    );
  }
  const value = await response.json();
  if (
    !value ||
    typeof value.id !== "string" ||
    !["introduction", "solving", "submitted", "feedback", "ended"].includes(
      value.state,
    ) ||
    !Array.isArray(value.events) ||
    !value.events.every(
      (event: SessionEvent) =>
        event &&
        typeof event.id === "string" &&
        typeof event.kind === "string" &&
        typeof event.timestamp === "string" &&
        event.data &&
        typeof event.data === "object",
    )
  ) {
    throw new Error(
      "The service returned an invalid session. Your work has been kept in this window.",
    );
  }
  return value;
}

export function downloadFile(
  name: string,
  content: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
