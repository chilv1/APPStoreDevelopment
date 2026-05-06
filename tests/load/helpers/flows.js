// Common user flows used across scenarios.
// Each function does 1 logical action and tags requests for grouped metrics.
import http from "k6/http";
import { check, sleep } from "k6";

export function visitDashboard(baseUrl) {
  const res = http.get(`${baseUrl}/api/dashboard`, { tags: { name: "api/dashboard" } });
  check(res, { "dashboard 200": (r) => r.status === 200 });
  return res;
}

export function visitStoresList(baseUrl) {
  const res = http.get(`${baseUrl}/api/stores`, { tags: { name: "api/stores" } });
  check(res, { "stores 200": (r) => r.status === 200 });
  // Return parsed array so caller can pick a random store id
  try { return JSON.parse(res.body); } catch { return []; }
}

export function visitStoreDetail(baseUrl, storeId) {
  const res = http.get(`${baseUrl}/api/stores/${storeId}`, {
    tags: { name: "api/stores/[id]" },
  });
  check(res, { "store detail 200": (r) => r.status === 200 });
  return res;
}

export function visitBranches(baseUrl) {
  const res = http.get(`${baseUrl}/api/branches`, { tags: { name: "api/branches" } });
  check(res, { "branches 200": (r) => r.status === 200 });
  return res;
}

export function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Polling tick: simulates the 60s background poll. Pages do this as long as the
// tab is visible. We don't actually wait 60s during a load test — the polling
// generates request volume, the sleep just spaces it out.
export function pollOnce(baseUrl, type) {
  if (type === "dashboard") visitDashboard(baseUrl);
  else if (type === "store" && type !== null) visitStoreDetail(baseUrl, type);
}

// Write actions — used by Scenario D and the "10% writes" mix in Scenario B.
export function patchTaskStatus(baseUrl, taskId, status = "DONE") {
  const res = http.patch(
    `${baseUrl}/api/tasks/${taskId}`,
    JSON.stringify({ status }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "PATCH api/tasks" } }
  );
  check(res, { "task patch ok": (r) => r.status === 200 || r.status === 401 });
  return res;
}

export function postPhaseNote(baseUrl, phaseId, content = "Load test note") {
  const res = http.post(
    `${baseUrl}/api/phases/${phaseId}/notes`,
    JSON.stringify({ content }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "POST api/phases/notes" } }
  );
  check(res, { "note post ok": (r) => r.status === 201 || r.status === 200 || r.status === 401 });
  return res;
}
