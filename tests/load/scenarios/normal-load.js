// Scenario B — Normal load.
// Ramp 0 → 100 users in 2min, hold 6min, ramp down 2min.
// Mixed read/poll/write traffic mimicking a real working day.
//
// Run: BASE_URL=https://newstores.bitelbot.com k6 run --out json=results/normal-load.json tests/load/scenarios/normal-load.js
import { sleep } from "k6";
import { SharedArray } from "k6/data";
import { login } from "../helpers/auth.js";
import {
  visitDashboard,
  visitStoresList,
  visitStoreDetail,
  visitBranches,
  pickRandom,
  patchTaskStatus,
  postPhaseNote,
} from "../helpers/flows.js";

const BASE_URL = __ENV.BASE_URL || "https://newstores.bitelbot.com";
const users = new SharedArray("users", () => JSON.parse(open("../users.json")));

export const options = {
  scenarios: {
    normalLoad: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 100 },   // ramp up
        { duration: "6m", target: 100 },   // hold
        { duration: "2m", target: 0 },     // ramp down
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],            // < 1% errors
    http_req_duration: ["p(95)<2000"],         // p95 under 2s
    "http_req_duration{name:api/dashboard}": ["p(95)<1500"],
    "http_req_duration{name:api/stores}": ["p(95)<1500"],
    "http_req_duration{name:api/stores/[id]}": ["p(95)<1500"],
    "http_req_duration{name:auth/login}": ["p(95)<3000"],
  },
};

// Random helpers
function rand() { return Math.random(); }

export default function () {
  const user = users[(__VU - 1) % users.length];
  if (!user) return;

  // Login once per iteration. Each VU does multiple iterations during the test.
  try { login(BASE_URL, user.email, user.password); }
  catch (e) { console.error(`VU${__VU}: ${e.message}`); return; }

  // Realistic user flow:
  // - View dashboard (always)
  // - 80% chance navigate to stores list
  // - 60% chance click into a store detail
  // - 30% chance simulate a write (PATCH task status / POST note)
  // - End with another dashboard view (simulating polling)
  visitDashboard(BASE_URL);
  sleep(2 + rand() * 3);

  let stores = [];
  if (rand() < 0.8) {
    stores = visitStoresList(BASE_URL);
    sleep(2 + rand() * 3);
  }

  let activeStore = null;
  if (rand() < 0.6 && stores.length > 0) {
    activeStore = pickRandom(stores);
    visitStoreDetail(BASE_URL, activeStore.id);
    sleep(3 + rand() * 4);
  }

  // 30% writes (note + task) IF we have an active store
  if (rand() < 0.3 && activeStore?.phases?.length > 0) {
    const phase = pickRandom(activeStore.phases);
    if (phase) postPhaseNote(BASE_URL, phase.id, `Load test note from VU${__VU}`);
    sleep(1);
    if (phase?.tasks?.length > 0) {
      const task = pickRandom(phase.tasks);
      if (task) patchTaskStatus(BASE_URL, task.id, "DONE");
    }
    sleep(1);
  }

  // Final poll
  visitDashboard(BASE_URL);
  sleep(1 + rand() * 2);
}
