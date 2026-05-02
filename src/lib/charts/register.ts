// Chart.js auto-registration — run ONCE at the module level so charts can render.
// Importing from `chart.js/auto` would also work but pulls in scales/elements/plugins
// for ALL chart types. We hand-pick to keep the bundle slimmer.
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";

// Register once. Re-imports are idempotent (Chart.js de-dupes by name).
ChartJS.register(
  // Bar
  BarElement,
  // Line
  LineElement, PointElement, Filler,
  // Doughnut/Pie
  ArcElement,
  // Scales
  CategoryScale, LinearScale,
  // Plugins
  Title, Tooltip, Legend
);
