"use client";

import { apiFetch, API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TournamentNav from "../../../components/TournamentNav";

type Tournament = {
  id: number;
  name: string;
  event_template: string;
  class_name?: string | null;
  class_config?: string | null;
};

type Boat = {
  id: number;
  tournament_id: number;
  entry_number?: number | null;
  boat_number?: string | null;
  sail_number: string;
  organization_name?: string | null;
  helmsman_name?: string | null;
  helmsman_name2?: string | null;
  helmsman_name3?: string | null;
  crew_name?: string | null;
  crew_name2?: string | null;
  crew_name3?: string | null;
  boat_class?: string | null;
  team_name?: string | null;
};

type RowDraft = {
  entry_number: string;
  organization_name: string;
  boat_number: string;
  sail_number: string;
  helmsman_name: string;
  helmsman_name2: string;
  helmsman_name3: string;
  crew_name: string;
  crew_name2: string;
  crew_name3: string;
};

const emptyRow = (): RowDraft => ({
  entry_number: "", organization_name: "", boat_number: "",
  sail_number: "", helmsman_name: "", helmsman_name2: "",
  helmsman_name3: "", crew_name: "", crew_name2: "", crew_name3: "",
});

function parseClassConfig(cfg: string | null | undefined): string[] {
  if (!cfg) return [];
  return cfg.split(",").map(s => s.trim()).filter(Boolean).map(entry =>
    entry.startsWith("OTHER:") ? entry.slice(6) : entry
  );
}

const NAV    = "#1F4E78";
const BORDER = "#e2e8f0";
const WHITE  = "#ffffff";
const TEXT   = "#1a2332";
const MUTED  = "#64748b";
const CELL: React.CSSProperties = {
  padding: "4px 6px",
  border: `1px solid ${BORDER}`,
  fontSize: "13px",
};
const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "5px 6px",
  border: `1px solid ${BORDER}`,
  borderRadius: "4px",
  fontSize: "12px",
  outline: "none",
  backgroundColor: WHITE,
  boxSizing: "border-box",
};
const CARD: React.CSSProperties = {
  backgroundColor: WHITE,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export default function BoatsPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [rows, setRows] = useState<RowDraft[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitResult, setSubmitResult] = useState<{ ok: number; skipped: number } | null>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [csvError, setCsvError] = useState("");

  async function fetchTournament() {
    if (!tournamentId) return;
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`);
    if (res.ok) setTournament(await res.json());
  }

  async function fetchBoats() {
    if (!tournamentId) return;
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/boats`);
    if (res.ok) setBoats(await res.json());
  }

  useEffect(() => {
    fetchTournament();
    fetchBoats();
  }, [tournamentId]);

  const classes = parseClassConfig(tournament?.class_config);
  const tabs = classes.length > 0 ? ["ALL", ...classes] : ["ALL"];

  const isTeamEvent =
    tournament?.event_template === "TEAM_3_BOATS" ||
    tournament?.event_template === "TEAM_4_BOATS" ||
    tournament?.event_template === "MULTI_GROUP_HYBRID";

  const displayBoats = activeTab === "ALL"
    ? boats
    : boats.filter(b => b.boat_class === activeTab);

  function updateRow(i: number, field: keyof RowDraft, value: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows(prev => [...prev, emptyRow()]);
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleBatchSubmit() {
    setSubmitError(""); setSubmitResult(null);
    const filledRows = rows.filter(r => r.sail_number.trim());
    if (filledRows.length === 0) { setSubmitError("セールNo.を1件以上入力してください"); return; }

    setSubmitting(true);
    let ok = 0; let skipped = 0;
    try {
      for (const r of filledRows) {
        const boatClass = activeTab !== "ALL" ? activeTab : (tournament?.class_name || null);
        const res = await apiFetch(`/tournaments/${tournamentId}/boats`, {
          method: "POST",
          body: JSON.stringify({
            entry_number: r.entry_number ? parseInt(r.entry_number) || null : null,
            boat_number: r.boat_number.trim() || null,
            sail_number: r.sail_number.trim(),
            organization_name: r.organization_name.trim() || null,
            helmsman_name: r.helmsman_name.trim() || null,
            helmsman_name2: r.helmsman_name2.trim() || null,
            helmsman_name3: r.helmsman_name3.trim() || null,
            crew_name: r.crew_name.trim() || null,
            crew_name2: r.crew_name2.trim() || null,
            crew_name3: r.crew_name3.trim() || null,
            boat_class: boatClass,
            team_name: isTeamEvent ? (r.organization_name.trim() || null) : null,
          }),
        });
        if (res.ok) ok++; else skipped++;
      }
      setSubmitResult({ ok, skipped });
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      await fetchBoats();
    } finally {
      setSubmitting(false);
    }
  }

  function downloadTemplate(cls: string) {
    const header = "entry_number,organization_name,boat_number,sail_number,helmsman_name,helmsman_name2,helmsman_name3,crew_name,crew_name2,crew_name3";
    const example = `,東京大学,,JPN1234,山田太郎,,,鈴木花子,,`;
    const blob = new Blob([header + "\n" + example + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = cls !== "ALL" ? `boats_template_${cls}.csv` : "boats_template.csv";
    a.click(); URL.revokeObjectURL(url);
  }

  async function handleCsvImport() {
    if (!csvFile) return;
    setCsvError(""); setCsvResult(null); setCsvLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const classParam = activeTab !== "ALL" ? `?boat_class=${encodeURIComponent(activeTab)}` : "";
      const res = await fetch(
        `${API_BASE}/tournaments/${tournamentId}/boats/import${classParam}`,
        {
          method: "POST",
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
          body: formData,
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCsvError(data.detail ?? "インポートに失敗しました");
        return;
      }
      setCsvResult(await res.json());
      setCsvFile(null);
      await fetchBoats();
    } finally {
      setCsvLoading(false);
    }
  }

  const COL_WIDTHS = ["72px", "110px", "72px", "90px", "80px", "72px", "72px", "80px", "72px", "72px", "36px"];
  const HEADERS    = ["Entry No.", "Univ.", "Boat No.", "Sail No.*", "Helm 1", "Helm 2", "Helm 3", "Crew 1", "Crew 2", "Crew 3", ""];
  const FIELDS: (keyof RowDraft)[] = [
    "entry_number","organization_name","boat_number","sail_number",
    "helmsman_name","helmsman_name2","helmsman_name3",
    "crew_name","crew_name2","crew_name3",
  ];

  return (
    <>
      <TournamentNav id={tournamentId} name={tournament?.name ?? ""} />
      <main style={{ padding: "28px 20px", maxWidth: "1200px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, marginBottom: "20px" }}>艇登録</h1>

        {/* Class tabs */}
        {tabs.length > 1 && (
          <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: `2px solid ${BORDER}` }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "8px 20px", fontSize: "14px", fontWeight: "600",
                  border: "none", borderRadius: "8px 8px 0 0",
                  cursor: "pointer",
                  backgroundColor: activeTab === tab ? NAV : "transparent",
                  color: activeTab === tab ? WHITE : MUTED,
                  marginBottom: activeTab === tab ? "-2px" : "0",
                  borderBottom: activeTab === tab ? `2px solid ${NAV}` : "none",
                }}
              >
                {tab === "ALL" ? "全て" : tab}
                <span style={{ marginLeft: "6px", fontSize: "12px", opacity: 0.75 }}>
                  ({tab === "ALL" ? boats.length : boats.filter(b => b.boat_class === tab).length})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Batch input section */}
        <div style={{ ...CARD, marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT, margin: 0 }}>
              一括入力{activeTab !== "ALL" ? ` — ${activeTab}` : ""}
            </h2>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => downloadTemplate(activeTab)}
                style={{
                  padding: "6px 12px", fontSize: "12px", fontWeight: "600",
                  border: `1px solid ${BORDER}`, borderRadius: "6px",
                  backgroundColor: WHITE, color: NAV, cursor: "pointer",
                }}
              >
                テンプレートCSV
              </button>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  type="file" accept=".csv"
                  onChange={e => { setCsvFile(e.target.files?.[0] ?? null); setCsvResult(null); setCsvError(""); }}
                  style={{ fontSize: "12px", maxWidth: "200px" }}
                />
                <button
                  onClick={handleCsvImport}
                  disabled={!csvFile || csvLoading}
                  style={{
                    padding: "6px 12px", fontSize: "12px", fontWeight: "600",
                    backgroundColor: csvFile ? NAV : MUTED, color: WHITE,
                    border: "none", borderRadius: "6px",
                    cursor: csvFile ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap", opacity: csvLoading ? 0.7 : 1,
                  }}
                >
                  {csvLoading ? "..." : "CSVアップロード"}
                </button>
              </div>
            </div>
          </div>

          {csvResult && (
            <p style={{ fontSize: "13px", color: "#0e6657", fontWeight: "600", marginBottom: "8px" }}>
              {csvResult.imported} 件登録、{csvResult.skipped} 件スキップ
            </p>
          )}
          {csvError && <p style={{ fontSize: "13px", color: "#dc2626", marginBottom: "8px" }}>{csvError}</p>}

          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%" }}>
              <colgroup>
                {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9" }}>
                  {HEADERS.map((h, i) => (
                    <th key={i} style={{ ...CELL, fontWeight: "600", fontSize: "11px", color: MUTED, whiteSpace: "nowrap", textAlign: "left" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {FIELDS.map(field => (
                      <td key={field} style={CELL}>
                        <input
                          value={row[field]}
                          onChange={e => updateRow(i, field, e.target.value)}
                          style={{ ...INPUT, borderColor: field === "sail_number" && row[field] ? "#3b82f6" : BORDER }}
                          placeholder={field === "sail_number" ? "必須" : ""}
                        />
                      </td>
                    ))}
                    <td style={CELL}>
                      <button
                        onClick={() => removeRow(i)}
                        style={{ border: "none", background: "none", cursor: "pointer", color: MUTED, fontSize: "14px", padding: "2px 4px" }}
                        title="削除"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={addRow}
              style={{
                padding: "7px 14px", fontSize: "13px", fontWeight: "600",
                border: `1px solid ${BORDER}`, borderRadius: "6px",
                backgroundColor: WHITE, color: TEXT, cursor: "pointer",
              }}
            >
              + 行を追加
            </button>
            <button
              onClick={handleBatchSubmit}
              disabled={submitting}
              style={{
                padding: "7px 22px", fontSize: "13px", fontWeight: "700",
                backgroundColor: NAV, color: WHITE,
                border: "none", borderRadius: "6px",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "登録中..." : "登録"}
            </button>
            {submitResult && (
              <span style={{ fontSize: "13px", color: "#0e6657", fontWeight: "600" }}>
                {submitResult.ok} 件登録完了
                {submitResult.skipped > 0 ? `、${submitResult.skipped} 件失敗` : ""}
              </span>
            )}
            {submitError && <span style={{ fontSize: "13px", color: "#dc2626" }}>{submitError}</span>}
          </div>

        </div>

        {/* Existing boats */}
        {displayBoats.length === 0 ? (
          <div style={{ ...CARD, textAlign: "center", padding: "40px", color: MUTED }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>⛵</div>
            <p style={{ margin: 0 }}>
              {activeTab === "ALL" ? "艇が登録されていません" : `${activeTab} クラスの艇はまだ登録されていません`}
            </p>
          </div>
        ) : (
          <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT, margin: 0 }}>
                登録済み艇
                <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: "400", color: MUTED }}>
                  {displayBoats.length} 艇
                </span>
              </h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: NAV, color: WHITE }}>
                    {[
                      "エントリー番号", "艇番", "セールNo.", "大学名",
                      ...(isTeamEvent ? ["団体集計名"] : []),
                      ...(activeTab === "ALL" ? ["クラス"] : []),
                      "ス1", "ス2", "ス3", "ク1", "ク2", "ク3",
                    ].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap", fontWeight: "600", fontSize: "12px" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayBoats.map((boat, i) => (
                    <tr key={boat.id} style={{ backgroundColor: i % 2 === 0 ? WHITE : "#fafbfc" }}>
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.entry_number ?? "-"}</td>
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>{boat.boat_number || "-"}</td>
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, fontWeight: "600" }}>{boat.sail_number}</td>
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>{boat.organization_name || "-"}</td>
                      {isTeamEvent && (
                        <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.team_name || "-"}</td>
                      )}
                      {activeTab === "ALL" && (
                        <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.boat_class || "-"}</td>
                      )}
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>{boat.helmsman_name || "-"}</td>
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.helmsman_name2 || "-"}</td>
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.helmsman_name3 || "-"}</td>
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}` }}>{boat.crew_name || "-"}</td>
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.crew_name2 || "-"}</td>
                      <td style={{ padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.crew_name3 || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
