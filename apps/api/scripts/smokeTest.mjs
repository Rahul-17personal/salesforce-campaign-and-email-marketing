import assert from "node:assert/strict";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:4000";
const cookieName = process.env.SESSION_COOKIE_NAME ?? "campaignhub_session";
const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? "admin@campaignhub.local";
const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "CampaignHub!2026";

function getCookie(response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") ?? ""];
  const header = setCookies.find((value) => value.startsWith(`${cookieName}=`));
  assert.ok(header, `Expected ${cookieName} cookie from API`);
  return header.split(";")[0];
}

async function request(path, options = {}) {
  return fetch(new URL(path, baseUrl), { ...options, signal: AbortSignal.timeout(5000) });
}

async function waitForApi() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await request("/health");
      if (response.ok) return;
    } catch {
      // The API may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("CampaignHub API did not become healthy within 30 seconds.");
}

async function run() {
  await waitForApi();

  const anonymousDashboard = await request("/dashboard/summary");
  assert.equal(anonymousDashboard.status, 401, "Dashboard must reject anonymous requests");

  const statusResponse = await request("/auth/status");
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.equal(status.authenticated, false);
  assert.ok(status.csrfToken);
  const anonymousCookie = getCookie(statusResponse);

  const loginResponse = await request("/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "origin": "http://localhost:5173",
      "x-csrf-token": status.csrfToken,
      cookie: anonymousCookie
    },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  assert.equal(loginResponse.status, 200, "Demo admin login should succeed");
  const login = await loginResponse.json();
  assert.equal(login.user.role, "admin");
  assert.equal(login.user.email, adminEmail);
  assert.ok(login.csrfToken);
  const authenticatedCookie = getCookie(loginResponse);

  const dashboardResponse = await request("/dashboard/summary", {
    headers: { cookie: authenticatedCookie }
  });
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.json();
  assert.ok(dashboard.stats.totalContacts >= 12, "Expected seeded contacts");
  assert.ok(dashboard.campaigns.length >= 3, "Expected seeded campaigns");
  assert.ok(dashboard.templates.length >= 3, "Expected seeded email templates");

  const logoutResponse = await request("/auth/logout", {
    method: "POST",
    headers: {
      origin: "http://localhost:5173",
      "x-csrf-token": login.csrfToken,
      cookie: authenticatedCookie
    }
  });
  assert.equal(logoutResponse.status, 200, "CSRF-protected logout should succeed");

  const afterLogout = await request("/dashboard/summary");
  assert.equal(afterLogout.status, 401, "Dashboard should reject requests after logout");
  process.stdout.write("Smoke test passed: local login, session, dashboard data and logout.\n");
}

run().catch((error) => {
  console.error("CampaignHub smoke test failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
