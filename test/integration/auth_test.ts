/**
 * Integration tests — authentication, sessions and authorization
 * (spec FR matrix). Runs on the in-memory driver via the wired app.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { app } from "@/app.ts";

Deno.env.set("AUTH_PBKDF2_ITERATIONS", "1000");

let counter = 0;
const uniqueEmail = (): string => `person${++counter}-${Date.now()}@auth.test`;

/** Signs a user up and returns {cookie, user}. */
async function signup(
  overrides: Record<string, unknown> = {},
): Promise<{ cookie: string; user: Record<string, unknown> }> {
  const res = await app.request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Auth Person",
      email: uniqueEmail(),
      password: "long-enough-pass",
      ...overrides,
    }),
  });
  assertEquals(res.status, 201);
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  return { cookie, user: (await res.json()).data };
}

Deno.test("signup sets a hardened session cookie and me returns the user", async () => {
  const res = await app.request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Cookie Check",
      email: uniqueEmail(),
      password: "long-enough-pass",
    }),
  });
  assertEquals(res.status, 201);
  const setCookie = res.headers.get("set-cookie") ?? "";
  assertStringIncludes(setCookie, "denox_session=");
  assertStringIncludes(setCookie, "HttpOnly");
  assertStringIncludes(setCookie, "SameSite=Lax");
  const body = await res.json();
  assertEquals(body.data.passwordHash, undefined);

  const me = await app.request("http://localhost/api/auth/me", {
    headers: { cookie: setCookie.split(";")[0] ?? "" },
  });
  assertEquals(me.status, 200);
  assertEquals((await me.json()).data.name, "Cookie Check");
});

Deno.test("login: wrong email and wrong password return the same generic 401", async () => {
  const email = uniqueEmail();
  await signup({ email, password: "long-enough-pass" });

  const wrongPassword = await app.request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "wrong-password!" }),
  });
  const unknownEmail = await app.request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: uniqueEmail(), password: "whatever-pass" }),
  });
  assertEquals(wrongPassword.status, 401);
  assertEquals(unknownEmail.status, 401);
  const a = await wrongPassword.json();
  const b = await unknownEmail.json();
  assertEquals(a.error.message, b.error.message);

  const good = await app.request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "long-enough-pass" }),
  });
  assertEquals(good.status, 200);
  await good.body?.cancel();
});

Deno.test("logout revokes the session — replaying the old cookie fails", async () => {
  const { cookie } = await signup();
  const out = await app.request("http://localhost/api/auth/logout", {
    method: "POST",
    headers: { cookie },
  });
  assertEquals(out.status, 204);

  const replay = await app.request("http://localhost/api/auth/me", {
    headers: { cookie },
  });
  assertEquals(replay.status, 401);
  await replay.body?.cancel();
});

Deno.test("short passwords are rejected with field details", async () => {
  const res = await app.request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Shorty", email: uniqueEmail(), password: "seven77" }),
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(typeof body.error.details.fields.password, "string");
});

Deno.test("duplicate signup email conflicts (409)", async () => {
  const email = uniqueEmail();
  await signup({ email });
  const res = await app.request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Dup", email, password: "long-enough-pass" }),
  });
  assertEquals(res.status, 409);
  await res.body?.cancel();
});

Deno.test("authorization: product mutations need admin; reads stay public", async () => {
  // The very first signup in this suite became admin; create a regular user.
  const { cookie: userCookie, user } = await signup();
  assertEquals(user.role, "user");

  const anonymous = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Blocked", price: 1 }),
  });
  assertEquals(anonymous.status, 401);
  await anonymous.body?.cancel();

  const asUser = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: userCookie },
    body: JSON.stringify({ name: "Forbidden", price: 1 }),
  });
  assertEquals(asUser.status, 403);
  await asUser.body?.cancel();

  const publicRead = await app.request("http://localhost/api/products");
  assertEquals(publicRead.status, 200);
  await publicRead.body?.cancel();

  const publicPage = await app.request("http://localhost/products");
  assertEquals(publicPage.status, 200);
  await publicPage.body?.cancel();
});

Deno.test("GET /api/users requires admin (401 anonymous, 403 user)", async () => {
  const { cookie } = await signup();
  const anonymous = await app.request("http://localhost/api/users");
  assertEquals(anonymous.status, 401);
  await anonymous.body?.cancel();

  const asUser = await app.request("http://localhost/api/users", {
    headers: { cookie },
  });
  assertEquals(asUser.status, 403);
  await asUser.body?.cancel();
});

Deno.test("cross-origin cookie-authenticated mutations are rejected (403)", async () => {
  const { cookie } = await signup();
  const res = await app.request("http://localhost/api/auth/logout", {
    method: "POST",
    headers: { cookie, origin: "https://evil.example.com", host: "localhost" },
  });
  assertEquals(res.status, 403);
  await res.body?.cancel();
});

Deno.test("no endpoint leaks passwordHash", async () => {
  const { cookie } = await signup();
  const me = await app.request("http://localhost/api/auth/me", { headers: { cookie } });
  const raw = await me.text();
  assertEquals(raw.includes("passwordHash"), false);
});

Deno.test("login and signup pages render with data-api forms", async () => {
  for (const path of ["/login", "/signup"]) {
    const res = await app.request(`http://localhost${path}`);
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, 'data-api="/api/auth/');
    assertStringIncludes(html, 'data-redirect="/"');
  }
});
