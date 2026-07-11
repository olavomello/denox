/**
 * End to end tests — real HTTP server on a random port, real fetch.
 * Validates the full stack exactly as production runs it (Deno.serve).
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";

/** Boots the app on an ephemeral port and runs the callback against it. */
async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = Deno.serve({ port: 0, onListen: () => {} }, app.fetch);
  const { port } = server.addr as Deno.NetAddr;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await server.shutdown();
  }
}

Deno.test("e2e: API and pages respond over a real socket", async () => {
  await withServer(async (baseUrl) => {
    const ping = await fetch(`${baseUrl}/api/ping`);
    assertEquals(ping.status, 200);
    const pingBody = await ping.json();
    assertEquals(pingBody.data.message, "pong");

    const home = await fetch(`${baseUrl}/`);
    assertEquals(home.status, 200);
    assertStringIncludes(await home.text(), "DenoX");

    const created = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "E2E User",
        email: "e2e@example.com",
        password: "long-enough-pass",
      }),
    });
    assertEquals(created.status, 201);
    await created.body?.cancel();
  });
});

Deno.test("e2e: rate limit responds 429 after the configured maximum", async () => {
  await withServer(async (baseUrl) => {
    const headers = { "x-forwarded-for": "203.0.113.7" };
    let lastStatus = 0;
    for (let i = 0; i < 105; i++) {
      const res = await fetch(`${baseUrl}/api/ping`, { headers });
      lastStatus = res.status;
      await res.body?.cancel();
      if (lastStatus === 429) break;
    }
    assertEquals(lastStatus, 429);
  });
});
