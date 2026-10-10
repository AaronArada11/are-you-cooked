// Synthetic API lifecycle check; run with the frontend and backend already serving.
import assert from "node:assert/strict";
const base = process.env.TEST_APP_URL || "http://127.0.0.1:3000";
async function request(path, action) {
  const response = await fetch(`${base}/api/interview/sessions${path}`, {
    method: action ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: action ? JSON.stringify(action) : undefined,
  });
  assert.ok(
    response.ok,
    `HTTP ${response.status}: ${await response.clone().text()}`,
  );
  return response.json();
}
let record = await request("", { exercise_id: "anagram-groups" });
const eventPath = `/${record.id}/events`;
assert.equal(record.state, "introduction");
for (const action of [
  { kind: "start" },
  {
    kind: "message",
    text: "Synthetic QA: I will compare letter counts; this attempt is incomplete.",
  },
  { kind: "snapshot", code: "def find_anagrams(words):\n    pass\n" },
  { kind: "test_run", code: "def find_anagrams(words):\n    pass\n" },
  { kind: "hint", text: "Synthetic hint request" },
  { kind: "submit", code: "def find_anagrams(words):\n    pass\n" },
  { kind: "feedback" },
  { kind: "end" },
])
  record = await request(eventPath, action);
assert.equal(record.state, "ended");
assert.deepEqual(
  record.events.filter((e) => e.kind === "transition").map((e) => e.data.state),
  ["solving", "submitted", "feedback", "ended"],
);
for (const event of record.events.filter((e) =>
  ["test_run", "submission"].includes(e.kind),
)) {
  assert.ok(
    record.events.some(
      (snapshot) =>
        snapshot.id === event.data.snapshot_id &&
        snapshot.kind === "code_snapshot",
    ),
  );
}
assert.equal(
  record.events.find((e) => e.kind === "test_run").data.status,
  "unavailable",
);
assert.equal(
  record.events.find((e) => e.kind === "hint").data.delivery_status,
  "unavailable",
);
assert.equal(
  record.events.find((e) => e.kind === "feedback").data.status,
  "unavailable",
);
assert.deepEqual(await request(`/${record.id}`), record);
const conflict = await fetch(`${base}/api/interview/sessions${eventPath}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ kind: "message", text: "Must be rejected after end" }),
});
assert.equal(conflict.status, 409);
console.log(
  `PASS: synthetic session ${record.id}, ${record.events.length} events, valid evidence references, ended state enforced. No code executed or AI assessment generated.`,
);
