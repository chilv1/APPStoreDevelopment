// Scenario A — Smoke baseline.
// 10 concurrent users for 5 minutes, mixed read traffic.
// Goal: establish baseline p50/p95/p99 BEFORE the stress scenarios.
//
// Run: BASE_URL=https://newstores.bitelbot.com k6 run --out json=results/smoke.json tests/load/scenarios/smoke.js
import { sleep } from "k6";
import { SharedArray } from "k6/data";
import { login } from "../helpers/auth.js";
import {
  visitDashboard,
  visitStoresList,
  visitStoreDetail,
  pickRandom,
} from "../helpers/flows.js";

const BASE_URL = __ENV.BASE_URL || "https://newstores.bitelbot.com";

// Load 100 test users from JSON; each VU picks one by __VU index.
const users = new SharedArray("users", () =>
  JSON.parse(open("../users.json"))
);

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: 10,
      duration: "5m",
    },
  },
  thresholds: {
    // Smoke must be clean — these are very loose so we mostly use them as a no-fail backstop
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
  },
};

export function setup() {
  console.log(`Smoke baseline: 10 VUs × 5min against ${BASE_URL}`);
  return {};
}

export default function () {
  // Each VU has a stable user across iterations
  const user = users[(__VU - 1) % users.length];
  if (!user) throw new Error(`No user for VU ${__VU}`);

  // 1) Login (once per iteration; in a real session it would be once total,
  //    but this is fine for a 5min smoke — exercises auth path each time).
  try { login(BASE_URL, user.email, user.password); }
  catch (e) { console.error(`VU${__VU}: ${e.message}`); return; }

  // 2) Navigate dashboard
  visitDashboard(BASE_URL);
  sleep(1 + Math.random() * 2);

  // 3) Stores list
  const stores = visitStoresList(BASE_URL);
  sleep(1 + Math.random() * 2);

  // 4) Pick a random store and view it
  const store = pickRandom(stores);
  if (store?.id) {
    visitStoreDetail(BASE_URL, store.id);
    sleep(2 + Math.random() * 3);
  }

  // 5) Simulate idle polling (1-2 polls of dashboard while "viewing" store)
  visitDashboard(BASE_URL);
  sleep(1);
}
