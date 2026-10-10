import type { NextRequest } from "next/server";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const resource = path.join("/");
  const uuid =
    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
  const allowed =
    request.method === "GET"
      ? new RegExp(`^sessions/${uuid}$`).test(resource)
      : resource === "sessions" ||
        new RegExp(`^sessions/${uuid}/events$`).test(resource);
  if (!allowed) return Response.json({ detail: "Not found" }, { status: 404 });
  if (
    request.method === "POST" &&
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    return Response.json(
      { detail: "Cross-site request rejected" },
      { status: 403 },
    );
  }
  const body = request.method === "POST" ? await request.text() : undefined;
  if (body && new TextEncoder().encode(body).length > 650000)
    return Response.json({ detail: "Request too large" }, { status: 413 });
  try {
    const response = await fetch(
      `${process.env.INTERVIEW_API_URL || "http://127.0.0.1:8000"}/${resource}`,
      {
        method: request.method,
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      },
    );
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { detail: "Session service unavailable" },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST };
