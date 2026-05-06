// NextAuth v5 credentials-flow login helper for k6.
//
// The flow has 3 HTTP calls:
//   1) GET  /api/auth/csrf            — get csrfToken
//   2) POST /api/auth/callback/credentials  — submit email + password + csrfToken
//      → sets next-auth.session-token cookie
//   3) GET  /api/auth/session         — verify token works (returns {user: {...}})
//
// k6 cookieJar is per-VU by default, so each virtual user gets isolated cookies.
// Returns true on success, throws on failure (so the scenario can early-fail).
import http from "k6/http";
import { check } from "k6";

export function login(baseUrl, email, password) {
  // 1) Fetch CSRF
  const csrfRes = http.get(`${baseUrl}/api/auth/csrf`, {
    tags: { name: "auth/csrf" },
  });
  check(csrfRes, { "csrf 200": (r) => r.status === 200 }) ||
    fail(`CSRF fetch failed: ${csrfRes.status}`);

  let csrfToken;
  try { csrfToken = JSON.parse(csrfRes.body).csrfToken; }
  catch { throw new Error("Could not parse CSRF body: " + csrfRes.body.slice(0, 200)); }

  // 2) Submit credentials. NextAuth expects form-encoded body.
  const loginRes = http.post(
    `${baseUrl}/api/auth/callback/credentials`,
    {
      csrfToken,
      email,
      password,
      callbackUrl: `${baseUrl}/dashboard`,
      json: "true",
    },
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      redirects: 0, // don't follow — we want to inspect Set-Cookie
      tags: { name: "auth/login" },
    }
  );

  // Successful login = 302 redirect with Set-Cookie next-auth.session-token
  // (Or in some configs, 200 with JSON {url: '...'}.)
  const ok =
    (loginRes.status === 302 || loginRes.status === 200) &&
    !/\/api\/auth\/error/.test(loginRes.headers["Location"] || "");
  check(loginRes, { "login redirect/ok": () => ok });
  if (!ok) {
    throw new Error(
      `Login failed for ${email}: status=${loginRes.status} loc=${loginRes.headers["Location"]} body=${loginRes.body?.slice(0, 200)}`
    );
  }

  // 3) Verify session — should return JSON with .user.email matching
  const sessRes = http.get(`${baseUrl}/api/auth/session`, {
    tags: { name: "auth/session" },
  });
  check(sessRes, {
    "session 200": (r) => r.status === 200,
    "session has user": (r) => {
      try { return JSON.parse(r.body)?.user?.email === email; }
      catch { return false; }
    },
  });
  return true;
}

function fail(msg) { throw new Error(msg); }
