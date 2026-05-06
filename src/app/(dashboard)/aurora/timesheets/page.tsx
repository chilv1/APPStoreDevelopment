import TimesheetWeek from "@/components/aurora/timesheet/TimesheetWeek";
import { MOCK_TIMESHEET } from "@/lib/aurora/mock";
import { COLOR } from "@/lib/design/tokens";

export default function TimesheetsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.neutral[900] }}>Timesheet</h1>
        <p style={{ fontSize: 13, color: COLOR.neutral[600], marginTop: 4 }}>
          Bang cham cong tuan hien tai
        </p>
      </header>
      <TimesheetWeek entries={MOCK_TIMESHEET} />
    </div>
  );
}
