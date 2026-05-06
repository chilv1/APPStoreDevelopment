// Scenario C — Login storm / Spike.
// 0 → 100 users in 30 SECONDS (sốc). Hold 1min. Ramp down 1min.
// Each user: login + load dashboard, then exit. Tests bcrypt + auth path under burst.
//
// Run: BASE_URL=https://newstores.bitelbot.com k6 run --out json=results/spike.json tests/load/scenarios/spike.js
import { sleep } from "k6";
import { SharedArray } from "k6/data";
import { login } from "../helpers/auth.js";
import { visitDashboard } from "../helpers/flows.js";

const BASE_URL = __ENV.BASE_URL || "https://newstores.bitelbot.com";
const users = new SharedArray("users", () => JSON.parse(open("../users.json")));

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 },  // sốc 0 → 100
        { duration: "1m",  target: 100 },  // hold
        { duration: "1m",  target: 0 },    // ramp down
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],          // login storm có thể có 5% lỗi do bcrypt queue
    "http_req_duration{name:auth/login}": ["p(95)<5000"],  // login allowed up to 5s under spike
  },
};

export default function () {
  const user = users[(__VU - 1) % users.length];
  if (!user) return;

  try {
    login(BASE_URL, user.email, user.password);
    visitDashboard(BASE_URL);
  } catch (e) {
    console.error(`VU${__VU} spike fail: ${e.message}`);
  }
  sleep(0.5);
}
