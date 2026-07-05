/**
 * End to end test — contact submission over a real socket.
 */

import { assertEquals } from "@std/assert";
import { app } from "@/app.ts";

Deno.test("e2e: contact form API accepts a submission over HTTP", async () => {
  const server = Deno.serve({ port: 0, onListen: () => {} }, app.fetch);
  const { port } = server.addr as Deno.NetAddr;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "E2E", email: "e2e@example.com", message: "Hi" }),
    });
    assertEquals(res.status, 201);
    const body = await res.json();
    assertEquals(body.data.message, "Hi");
  } finally {
    await server.shutdown();
  }
});
