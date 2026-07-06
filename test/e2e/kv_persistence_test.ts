/**
 * End to end test — full application booted as a real subprocess with
 * STORAGE_DRIVER=kv, exercising creation and retrieval over HTTP.
 */

import { assertEquals } from "@std/assert";

const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;

/** Polls the health endpoint until the server is up (or times out). */
async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const res = await fetch(`${BASE}/api/ping`);
      await res.body?.cancel();
      if (res.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Server did not start in time");
}

Deno.test("e2e: users persist through the KV driver over a real server", async () => {
  const command = new Deno.Command("deno", {
    args: ["run", "--allow-net", "--allow-read", "--allow-env", "src/main.ts"],
    env: {
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      STORAGE_DRIVER: "kv",
      KV_PATH: ":memory:",
      LOG_LEVEL: "error",
    },
    stdout: "null",
    stderr: "null",
  });
  const child = command.spawn();
  try {
    await waitForServer();

    const created = await fetch(`${BASE}/api/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "KV User", email: "kv@example.com" }),
    });
    assertEquals(created.status, 201);
    const { data } = await created.json();

    const fetched = await fetch(`${BASE}/api/users/${data.id}`);
    assertEquals(fetched.status, 200);
    const body = await fetched.json();
    assertEquals(body.data.email, "kv@example.com");

    const duplicate = await fetch(`${BASE}/api/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Clone", email: "kv@example.com" }),
    });
    assertEquals(duplicate.status, 409);
    await duplicate.body?.cancel();
  } finally {
    child.kill("SIGTERM");
    await child.status;
  }
});
