import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { requestSession } from "../src/lib/interview.ts";
import { POST, GET } from "../src/app/api/interview/[...path]/route.ts";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const session = {
  id: "00000000-0000-4000-8000-000000000001",
  state: "solving",
  events: [],
};

test("records an explanation without executing or altering candidate input", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `/api/interview/sessions/${session.id}/events`);
    assert.deepEqual(JSON.parse(options.body), {
      kind: "message",
      text: "<script>untrusted</script>",
    });
    return Response.json(session);
  };
  assert.deepEqual(
    await requestSession(`/${session.id}/events`, {
      kind: "message",
      text: "<script>untrusted</script>",
    }),
    session,
  );
});
test("rejects malformed successful responses", async () => {
  for (const value of [
    {},
    { ...session, state: "invented" },
    { ...session, events: [{}] },
    { ...session, events: [null] },
  ]) {
    globalThis.fetch = async () => Response.json(value);
    await assert.rejects(() => requestSession(`/${session.id}`));
  }
});
test("unavailable, expired, and conflicting sessions have actionable errors", async () => {
  for (const [status, text] of [
    [503, /work is still here/],
    [404, /no longer available/],
    [409, /Refresh its status/],
  ]) {
    globalThis.fetch = async () => Response.json({}, { status });
    await assert.rejects(() => requestSession(`/${session.id}`), text);
  }
});
test("proxy rejects unsupported paths and cross-site writes before contacting the API", async () => {
  globalThis.fetch = async () => {
    throw new Error("Must not reach upstream");
  };
  const context = (path) => ({ params: Promise.resolve({ path }) });
  assert.equal(
    (await GET(new Request("http://localhost/api"), context(["analyses"])))
      .status,
    404,
  );
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api", {
          method: "POST",
          headers: { "sec-fetch-site": "cross-site" },
        }),
        context(["sessions"]),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api", {
          method: "POST",
          body: "x".repeat(650001),
        }),
        context(["sessions"]),
      )
    ).status,
    413,
  );
});
test("proxy preserves backend conflicts and reports network failure without a fabricated result", async () => {
  const context = {
    params: Promise.resolve({ path: ["sessions", session.id, "events"] }),
  };
  globalThis.fetch = async () =>
    Response.json({ detail: "Invalid transition" }, { status: 409 });
  const response = await POST(
    new Request("http://localhost/api", {
      method: "POST",
      body: '{"kind":"submit","code":"pass"}',
    }),
    context,
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { detail: "Invalid transition" });
  globalThis.fetch = async () => {
    throw new Error("Offline");
  };
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api", { method: "POST" }),
        context,
      )
    ).status,
    503,
  );
});
