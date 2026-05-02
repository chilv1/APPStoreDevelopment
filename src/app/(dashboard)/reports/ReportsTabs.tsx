"use client";

// ReportsTabs — top-level navigation across the 5 report tabs.
// Permission-aware: hides tabs the user doesn't have access to.
//   ADMIN         → all 5 tabs
//   AREA_MANAGER  → Branch + BC + Trends + Risks (no Executive)
//   PM            → BC + Risks
//   SURVEY_STAFF  → Risks only
//
// Tab content is loaded LAZILY (next/dynamic with ssr:false) so chart libs
// don't bloat the initial bundle for users who never click reports tabs.
import { useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n/context";

const ExecutiveTab = dynamic(() => import("./tabs/ExecutiveTab"), { ssr: false });
const BranchTab = dynamic(() => import("./tabs/BranchTab"), { ssr: false });
const BCTab = dynamic(() => import("./tabs/BCTab"), { ssr: false });
const TrendsTab = dynamic(() => import("./tabs/TrendsTab"), { ssr: false });
const RisksTab = dynamic(() => import("./tabs/RisksTab"), { ssr: false });

type TabId = "executive" | "branch" | "bc" | "trends" | "risks";

const TAB_PERMS: Record<TabId, string[]> = {
  executive: ["ADMIN"],
  branch:    ["ADMIN", "AREA_MANAGER"],
  bc:        ["ADMIN", "AREA_MANAGER", "PM"],
  trends:    ["ADMIN", "AREA_MANAGER"],
  risks:     ["ADMIN", "AREA_MANAGER", "PM", "SURVEY_STAFF"],
};

export default function ReportsTabs({ userRole }: { userRole: string }) {
  const t = useT();

  // List of tabs visible to this user
  const TABS: { id: TabId; labelKey: keyof typeof t.reportsPage }[] = [
    { id: "executive", labelKey: "tabExecutive" },
    { id: "branch",    labelKey: "tabBranch" },
    { id: "bc",        labelKey: "tabBC" },
    { id: "trends",    labelKey: "tabTrends" },
    { id: "risks",     labelKey: "tabRisks" },
  ];
  const visible = TABS.filter((tab) => TAB_PERMS[tab.id].includes(userRole));

  const [activeTab, setActiveTab] = useState<TabId>(visible[0]?.id ?? "risks");

  return (
    <>
      {/* Tab strip */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20,
        borderBottom: "1px solid var(--border)", overflowX: "auto",
      }}>
        {visible.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 18px",
                background: isActive ? "rgba(59,130,246,0.10)" : "transparent",
                border: "1px solid transparent",
                borderColor: isActive ? "rgba(59,130,246,0.30)" : "transparent",
                borderBottom: isActive ? "1px solid var(--bg-primary)" : "none",
                color: isActive ? "#93c5fd" : "var(--text-secondary)",
                borderRadius: "8px 8px 0 0",
                fontSize: 13, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
                position: "relative",
                top: isActive ? 1 : 0,
              }}
            >
              {t.reportsPage[tab.labelKey] as string}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <div>
        {activeTab === "executive" && <ExecutiveTab />}
        {activeTab === "branch"    && <BranchTab />}
        {activeTab === "bc"        && <BCTab />}
        {activeTab === "trends"    && <TrendsTab />}
        {activeTab === "risks"     && <RisksTab />}
      </div>
    </>
  );
}
