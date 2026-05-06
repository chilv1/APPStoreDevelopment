// Scenario D — Write-heavy stress.
// 50 concurrent users, 5 minutes, ALL writes (no reads except 1 initial /api/stores
// to discover phase/task IDs). Goal: stress SQLite WRITE LOCK behavior, find
// deadlocks or queue blowup.
//
// Run: BASE_URL=https://newstores.bitelbot.com k6 run --out json=results/write-stress.json tests/load/scenarios/write-stress.js
import { sleep } from "k6";
import { SharedArray } from "k6/data";
import { login } from "../helpers/auth.js";
import {
  visitStoresList,
  pickRandom,
  patchTaskStatus,
  postPhaseNote,
} from "../helpers/flows.js";

const BASE_URL = __ENV.BASE_URL || "https://newstores.bitelbot.com";
const users = new SharedArray("users", () => JSON.parse(open("../users.json")));

export const options = {
  scenarios: {
    writeStress: {
      executor: "constant-vus",
      vus: 50,
      duration: "5m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    "http_req_duration{name:PATCH api/tasks}": ["p(95)<2000"],
    "http_req_duration{name:POST api/phases/notes}": ["p(95)<2000"],
  },
};

export default function () {
  const user = users[(__VU - 1) % users.length];
  if (!user) return;

  try { login(BASE_URL, user.email, user.password); }
  catch (e) { console.error(`VU${__VU}: ${e.message}`); return; }

  // Discover stores once per iteration to find a phase + task to write to.
  const stores = visitStoresList(BASE_URL);
  const store = pickRandom(stores);
  if (!store?.phases?.length) { sleep(1); return; }

  // Now hammer writes for the duration of this iteration.
  // 5 writes per iteration spread over ~5 seconds → 50 VUs × 1 write/sec = 50 writes/sec target
  for (let i = 0; i < 5; i++) {
    const phase = pickRandom(store.phases);
    if (Math.random() < 0.5) {
      // PATCH a task
      const task = pickRandom(phase?.tasks || []);
      if (task) patchTaskStatus(BASE_URL, task.id, Math.random() < 0.5 ? "DONE" : "TODO");
    } else {
      // POST a note
      if (phase) postPhaseNote(BASE_URL, phase.id, `Stress note ${__VU}-${i}`);
    }
    sleep(1);
  }
}
