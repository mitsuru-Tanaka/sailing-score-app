"use client";

import { apiFetch, API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TournamentNav from "../../../../components/TournamentNav";

type Tournament = {
  id: number;
  name: string;
  event_template: string;
  class_name?: string | null;
};

type Boat = {
  id: number;
  tournament_id: number;
  entry_number?: number | null;
  boat_number?: string | null;
  sail_number: string;
  organization_name?: string | null;
  helmsman_name?: string | null;
  crew_name?: string | null;
  boat_class?: string | null;
  team_name?: string | null;
};

type Race = {
  id: number;
  tournament_id: number;
  race_number: number;
  name?: string | null;
  status: string;
};

// ---- Tab 1: finish-order entry ----
type FinishRow = {
  boatId: number | null;
  sailInput: string;
  entryInput: string;
};

type PenaltyEntry = {
  key: string;
  boatId: number | null;
  resultCode: string;
  finishPosition: string;
  manualPoints: string;
  note: string;
};

// ---- Tab 2: per-boat entry (existing) ----
type BoatResultRow = {
  boat_id: number;
  finish_position: string;
  result_code: string;
  manual_points: string;
  note: string;
  points?: number | null;
};

const NEEDS_FINISH_POS = new Set(["OK", "DSQ", "NSC", "STP", "SCP", "ARB", "PRP", "ZFP"]);
const MANUAL_CODES     = new Set(["RDG", "DPI"]);
const ROW1_CODES = ["DNS", "DNC", "OCS", "DNF", "RET", "BFD", "UFD"] as const;
const ROW2_CODES = ["DSQ", "NSC", "DNE", "STP", "SCP", "ZFP", "RDG", "DPI"] as const;
const PENALTY_CODES = [...ROW1_CODES, ...ROW2_CODES];

const NAV    = "#1F4E78";
const BORDER = "#e2e8f0";
const WHITE  = "#ffffff";
const TEXT   = "#1a2332";
const MUTED  = "#64748b";
const CARD: React.CSSProperties = {
  backgroundColor: WHITE,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "20px 24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

let penaltyKeyCounter = 0;
function newPenaltyEntry(): PenaltyEntry {
  return {
    key: String(++penaltyKeyCounter),
    boatId: null,
    resultCode: "DNS",
    finishPosition: "",
    manualPoints: "",
    note: "",
  };
}

export default function RaceResultPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const raceId       = params.raceId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [race,       setRace]       = useState<Race | null>(null);
  const [boats,      setBoats]      = useState<Boat[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [message,    setMessage]    = useState("");
  const [activeTab,  setActiveTab]  = useState<"finish" | "boat">("finish");

  // Tab 1
  const [finishRows,     setFinishRows]     = useState<FinishRow[]>([]);
  const [penaltyEntries, setPenaltyEntries] = useState<PenaltyEntry[]>([]);

  // Tab 2
  const [boatRows, setBoatRows] = useState<BoatResultRow[]>([]);

  const isTeamEvent =
    tournament?.event_template === "TEAM_3_BOATS" ||
    tournament?.event_template === "TEAM_4_BOATS" ||
    tournament?.event_template === "MULTI_GROUP_HYBRID";

  async function fetchAll() {
    if (!tournamentId || !raceId) return;
    try {
      setLoading(true);
      setError("");
      const [tRes, racesRes, boatsRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/tournaments/${tournamentId}`),
        fetch(`${API_BASE}/tournaments/${tournamentId}/races`),
        fetch(`${API_BASE}/tournaments/${tournamentId}/boats`),
        fetch(`${API_BASE}/races/${raceId}/results`),
      ]);
      if (!tRes.ok)       throw new Error("大会情報の取得に失敗しました");
      if (!racesRes.ok)   throw new Error("レース一覧の取得に失敗しました");
      if (!boatsRes.ok)   throw new Error("艇一覧の取得に失敗しました");
      if (!resultsRes.ok) throw new Error("レース結果の取得に失敗しました");

      const tData: Tournament  = await tRes.json();
      const racesData: Race[]  = await racesRes.json();
      const boatsData: Boat[]  = await boatsRes.json();
      const resultsData: any[] = await resultsRes.json();

      setTournament(tData);
      setRace(racesData.find((r) => String(r.id) === String(raceId)) || null);
      setBoats(boatsData);

      // ---- populate Tab 1 ----
      const newFinishRows: FinishRow[] = boatsData.map(() => ({
        boatId: null, sailInput: "", entryInput: "",
      }));
      const newPenaltyEntries: PenaltyEntry[] = [];

      resultsData.forEach((result: any) => {
        const boat = boatsData.find((b) => b.id === result.boat_id);
        if (!boat) return;
        if (result.result_code === "OK" && result.finish_position != null) {
          const idx = result.finish_position - 1;
          if (idx >= 0 && idx < newFinishRows.length) {
            newFinishRows[idx] = {
              boatId: boat.id,
              sailInput: boat.sail_number,
              entryInput: boat.entry_number?.toString() ?? "",
            };
          }
        } else if (result.result_code !== "OK") {
          newPenaltyEntries.push({
            key: String(++penaltyKeyCounter),
            boatId: boat.id,
            resultCode: result.result_code,
            finishPosition: result.finish_position?.toString() ?? "",
            manualPoints: "",
            note: result.note ?? "",
          });
        }
      });
      setFinishRows(newFinishRows);
      setPenaltyEntries(newPenaltyEntries);

      // ---- populate Tab 2 ----
      setBoatRows(boatsData.map((boat) => {
        const existing = resultsData.find((r: any) => r.boat_id === boat.id);
        return {
          boat_id: boat.id,
          finish_position: existing?.finish_position?.toString() ?? "",
          result_code:     existing?.result_code ?? "OK",
          manual_points:   "",
          note:            existing?.note ?? "",
          points:          existing?.points ?? null,
        };
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [tournamentId, raceId]);

  // ---- Tab 1 helpers ----
  function updateFinishRow(index: number, field: "sailInput" | "entryInput", value: string) {
    setFinishRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "sailInput") {
        const found = boats.find((b) => b.sail_number === value);
        next[index].boatId = found?.id ?? null;
        if (found) next[index].entryInput = found.entry_number?.toString() ?? "";
      } else {
        const found = value ? boats.find((b) => b.entry_number?.toString() === value) : undefined;
        next[index].boatId = found?.id ?? null;
        if (found) next[index].sailInput = found.sail_number;
      }
      return next;
    });
  }

  function addPenaltyEntry() {
    setPenaltyEntries((prev) => [...prev, newPenaltyEntry()]);
  }

  function updatePenaltyEntry(key: string, patch: Partial<PenaltyEntry>) {
    setPenaltyEntries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, ...patch } : e))
    );
  }

  function removePenaltyEntry(key: string) {
    setPenaltyEntries((prev) => prev.filter((e) => e.key !== key));
  }

  // ---- Tab 1 save ----
  async function handleSaveFinish() {
    setError(""); setMessage("");

    // Build payload map: boatId → item
    const payload = new Map<number, any>();

    finishRows.forEach((row, i) => {
      if (row.boatId !== null) {
        payload.set(row.boatId, {
          boat_id: row.boatId,
          finish_position: i + 1,
          result_code: "OK",
          note: null,
          manual_points: null,
        });
      }
    });

    penaltyEntries.forEach((entry) => {
      if (entry.boatId !== null) {
        payload.set(entry.boatId, {
          boat_id: entry.boatId,
          finish_position:
            NEEDS_FINISH_POS.has(entry.resultCode) && !MANUAL_CODES.has(entry.resultCode) && entry.finishPosition
              ? Number(entry.finishPosition)
              : null,
          result_code: entry.resultCode,
          note: entry.note || null,
          manual_points:
            MANUAL_CODES.has(entry.resultCode) && entry.manualPoints
              ? Number(entry.manualPoints)
              : null,
        });
      }
    });

    const unassigned = boats.filter((b) => !payload.has(b.id));
    if (unassigned.length > 0) {
      const names = unassigned.map((b) => b.sail_number).join(", ");
      const ok = window.confirm(
        `以下の${unassigned.length}艇が未入力です:\n${names}\n\nこれらの艇の結果は保存されません。続けますか？`
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/races/${raceId}/results`, {
        method: "PUT",
        body: JSON.stringify(Array.from(payload.values())),
      });
      if (!res.ok) { setError("結果保存に失敗しました"); return; }
      setMessage("結果を保存しました");
      await fetchAll();
    } finally {
      setSaving(false);
    }
  }

  // ---- Tab 2 helpers (same as before) ----
  function updateBoatRow(index: number, field: keyof BoatResultRow, value: string) {
    setBoatRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "result_code") {
        if (!NEEDS_FINISH_POS.has(value)) next[index].finish_position = "";
        if (!MANUAL_CODES.has(value))     next[index].manual_points = "";
      }
      return next;
    });
  }

  // Tab 2 validation
  const boatPosMap = new Map<number, number[]>();
  boatRows.forEach((row, i) => {
    if (NEEDS_FINISH_POS.has(row.result_code) && !MANUAL_CODES.has(row.result_code) && row.finish_position) {
      const pos = Number(row.finish_position);
      if (!isNaN(pos) && pos > 0) {
        if (!boatPosMap.has(pos)) boatPosMap.set(pos, []);
        boatPosMap.get(pos)!.push(i);
      }
    }
  });
  const dupBoatPositions = new Set<number>();
  boatPosMap.forEach((idxs, pos) => { if (idxs.length > 1) dupBoatPositions.add(pos); });
  const missingPosRows = new Set<number>();
  boatRows.forEach((row, i) => {
    if ((row.result_code === "DSQ" || row.result_code === "NSC") && !row.finish_position)
      missingPosRows.add(i);
  });
  const hasBoatWarnings = dupBoatPositions.size > 0 || missingPosRows.size > 0;

  async function handleSaveBoat() {
    if (hasBoatWarnings) {
      const warnings: string[] = [];
      if (dupBoatPositions.size > 0) {
        const dups = Array.from(dupBoatPositions).sort((a, b) => a - b).map((p) => `${p}位`).join(", ");
        warnings.push(`着順が重複しています: ${dups}`);
      }
      if (missingPosRows.size > 0) warnings.push("DSQ / NSC の艇に着順が入力されていません");
      if (!window.confirm(`⚠️ 入力ミスの可能性があります\n\n${warnings.join("\n")}\n\nこのまま保存しますか？`)) return;
    }
    setError(""); setMessage(""); setSaving(true);
    try {
      const payload = boatRows.map((row) => ({
        boat_id: row.boat_id,
        finish_position:
          NEEDS_FINISH_POS.has(row.result_code) && !MANUAL_CODES.has(row.result_code) && row.finish_position
            ? Number(row.finish_position) : null,
        result_code:   row.result_code,
        note:          row.note || null,
        manual_points:
          MANUAL_CODES.has(row.result_code) && row.manual_points
            ? Number(row.manual_points) : null,
      }));
      const res = await apiFetch(`/races/${raceId}/results`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setError("結果保存に失敗しました"); return; }
      setMessage("結果を保存しました");
      await fetchAll();
    } finally {
      setSaving(false);
    }
  }

  // ---- shared style helpers ----
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px",
    backgroundColor: active ? NAV : WHITE,
    color: active ? WHITE : MUTED,
    border: `1px solid ${active ? NAV : BORDER}`,
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: active ? "700" : "500",
    fontSize: "14px",
  });

  const codeBtn = (active: boolean): React.CSSProperties => ({
    padding: "4px 8px",
    backgroundColor: active ? NAV : "#f1f5f9",
    color: active ? WHITE : MUTED,
    border: `1px solid ${active ? NAV : BORDER}`,
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: active ? "700" : "500",
    whiteSpace: "nowrap",
  });

  const inpStyle = (w?: string): React.CSSProperties => ({
    padding: "6px 8px",
    border: `1px solid #94adc8`,
    borderRadius: "6px",
    fontSize: "14px",
    width: w ?? "80px",
    outline: "none",
    backgroundColor: WHITE,
  });

  const disabledInpStyle = (w?: string): React.CSSProperties => ({
    ...inpStyle(w),
    backgroundColor: "#f1f5f9",
    border: `1px solid ${BORDER}`,
    color: MUTED,
  });

  const handleSave = activeTab === "finish" ? handleSaveFinish : handleSaveBoat;

  return (
    <>
      <TournamentNav id={tournamentId} name={tournament?.name ?? ""} />
      <main style={{ padding: "32px 24px", maxWidth: "1400px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, margin: 0, marginBottom: "4px" }}>
              {race ? (race.name || `第${race.race_number}レース`) : "レース結果入力"}
            </h1>
            {race && (
              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "600", backgroundColor: "#f1f5f9", color: MUTED }}>
                {race.status === "DRAFT" ? "下書き" : race.status === "FINISHED" ? "完了" : race.status}
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{ padding: "10px 28px", backgroundColor: NAV, color: WHITE, border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "15px", opacity: saving || loading ? 0.7 : 1, boxShadow: "0 2px 6px rgba(31,78,120,0.25)" }}
          >
            {saving ? "保存中..." : "💾 結果を保存"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
          <button style={tabBtnStyle(activeTab === "finish")} onClick={() => setActiveTab("finish")}>着順入力</button>
          <button style={tabBtnStyle(activeTab === "boat")}   onClick={() => setActiveTab("boat")}>艇別入力</button>
        </div>

        {error   && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px", ...CARD, padding: "12px 16px" }}>{error}</p>}
        {message && <p style={{ color: "#0e6657", fontSize: "13px", marginBottom: "12px", ...CARD, padding: "12px 16px" }}>{message}</p>}

        {loading ? (
          <p style={{ color: MUTED }}>読み込み中...</p>
        ) : boats.length === 0 ? (
          <div style={{ ...CARD, textAlign: "center", padding: "48px", color: MUTED }}>
            <p style={{ margin: 0 }}>艇が登録されていません。先に艇登録を行ってください。</p>
          </div>
        ) : activeTab === "finish" ? (

          /* ======= Tab 1: finish-order entry ======= */
          <div>
            {/* datalists for auto-complete */}
            <datalist id="sail-list">
              {boats.map((b) => <option key={b.id} value={b.sail_number} />)}
            </datalist>
            <datalist id="entry-list">
              {boats.filter((b) => b.entry_number != null).map((b) => (
                <option key={b.id} value={String(b.entry_number)} />
              ))}
            </datalist>

            {/* Finish order table */}
            <div style={{ ...CARD, padding: 0, overflow: "hidden", marginBottom: "24px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ backgroundColor: NAV, color: WHITE }}>
                      {["着順", "Sail No.", "Entry No.", "大学名", "スキッパー"].map((h) => (
                        <th key={h} style={{ padding: "12px 14px", textAlign: "left", whiteSpace: "nowrap", fontWeight: "600", fontSize: "13px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {finishRows.map((row, i) => {
                      const boat = row.boatId !== null ? boats.find((b) => b.id === row.boatId) : undefined;
                      const rowBg = i % 2 === 0 ? WHITE : "#fafbfc";
                      return (
                        <tr key={i} style={{ backgroundColor: rowBg }}>
                          <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, fontWeight: "700", color: NAV, width: "52px" }}>
                            {i + 1}
                          </td>
                          <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}` }}>
                            <input
                              list="sail-list"
                              value={row.sailInput}
                              onChange={(e) => updateFinishRow(i, "sailInput", e.target.value)}
                              placeholder="例: FJ1234"
                              style={inpStyle("110px")}
                            />
                          </td>
                          <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}` }}>
                            <input
                              list="entry-list"
                              value={row.entryInput}
                              onChange={(e) => updateFinishRow(i, "entryInput", e.target.value)}
                              placeholder="例: 12"
                              style={inpStyle("80px")}
                            />
                          </td>
                          <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, color: boat ? TEXT : MUTED, fontSize: "13px" }}>
                            {boat?.organization_name ?? "—"}
                          </td>
                          <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, color: boat ? TEXT : MUTED, fontSize: "13px" }}>
                            {boat?.helmsman_name ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Penalty section */}
            <div style={{ ...CARD, marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT, margin: 0 }}>ペナルティ・特殊コード</h2>
                <button
                  onClick={addPenaltyEntry}
                  style={{ padding: "6px 14px", backgroundColor: "#f1f5f9", color: TEXT, border: `1px solid ${BORDER}`, borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                >
                  + 艇を追加
                </button>
              </div>

              {penaltyEntries.length === 0 ? (
                <p style={{ color: MUTED, fontSize: "13px", margin: 0 }}>DNS/DNF/DSQ等の艇を追加してください。</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {penaltyEntries.map((entry) => {
                    const needsPos  = NEEDS_FINISH_POS.has(entry.resultCode) && !MANUAL_CODES.has(entry.resultCode);
                    const isManual  = MANUAL_CODES.has(entry.resultCode);
                    const entryBoat = entry.boatId ? boats.find((b) => b.id === entry.boatId) : undefined;
                    return (
                      <div key={entry.key} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
                        {/* Boat selector */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "11px", color: MUTED, fontWeight: "600" }}>艇</span>
                          <select
                            value={entry.boatId ?? ""}
                            onChange={(e) => updatePenaltyEntry(entry.key, { boatId: e.target.value ? Number(e.target.value) : null })}
                            style={{ padding: "6px 8px", border: `1px solid ${BORDER}`, borderRadius: "6px", fontSize: "13px", outline: "none", minWidth: "200px", backgroundColor: WHITE }}
                          >
                            <option value="">艇を選択...</option>
                            {boats.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.sail_number}{b.entry_number != null ? ` (${b.entry_number})` : ""}{b.organization_name ? ` — ${b.organization_name}` : ""}
                              </option>
                            ))}
                          </select>
                          {entryBoat?.helmsman_name && (
                            <span style={{ fontSize: "11px", color: MUTED }}>{entryBoat.helmsman_name}</span>
                          )}
                        </div>

                        {/* Code buttons */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          <span style={{ fontSize: "11px", color: MUTED, fontWeight: "600" }}>結果コード</span>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {ROW1_CODES.map((code) => (
                              <button key={code} type="button" onClick={() => updatePenaltyEntry(entry.key, { resultCode: code })} style={codeBtn(entry.resultCode === code)}>{code}</button>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {ROW2_CODES.map((code) => (
                              <button key={code} type="button" onClick={() => updatePenaltyEntry(entry.key, { resultCode: code })} style={codeBtn(entry.resultCode === code)}>{code}</button>
                            ))}
                          </div>
                        </div>

                        {/* Position / manual points */}
                        {needsPos && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "11px", color: MUTED, fontWeight: "600" }}>着順</span>
                            <input
                              type="number"
                              value={entry.finishPosition}
                              onChange={(e) => updatePenaltyEntry(entry.key, { finishPosition: e.target.value })}
                              style={inpStyle("72px")}
                            />
                          </div>
                        )}
                        {isManual && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "11px", color: MUTED, fontWeight: "600" }}>得点（手動）</span>
                            <input
                              type="number"
                              value={entry.manualPoints}
                              onChange={(e) => updatePenaltyEntry(entry.key, { manualPoints: e.target.value })}
                              style={inpStyle("72px")}
                            />
                          </div>
                        )}

                        {/* Note */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1", minWidth: "120px" }}>
                          <span style={{ fontSize: "11px", color: MUTED, fontWeight: "600" }}>備考</span>
                          <input
                            type="text"
                            value={entry.note}
                            onChange={(e) => updatePenaltyEntry(entry.key, { note: e.target.value })}
                            style={{ ...inpStyle("100%"), width: "100%" }}
                          />
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removePenaltyEntry(entry.key)}
                          style={{ marginTop: "20px", padding: "6px 10px", backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                        >
                          削除
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unassigned boats warning */}
            {(() => {
              const assignedIds = new Set<number>();
              finishRows.forEach((r) => { if (r.boatId) assignedIds.add(r.boatId); });
              penaltyEntries.forEach((e) => { if (e.boatId) assignedIds.add(e.boatId); });
              const unassigned = boats.filter((b) => !assignedIds.has(b.id));
              if (unassigned.length === 0) return null;
              return (
                <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#92400e", marginBottom: "20px" }}>
                  ⚠️ 未入力の艇が {unassigned.length} 艇あります: {unassigned.map((b) => b.sail_number).join(", ")}
                </div>
              );
            })()}
          </div>

        ) : (

          /* ======= Tab 2: per-boat entry ======= */
          <div>
            {hasBoatWarnings && (
              <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#dc2626" }}>
                {dupBoatPositions.size > 0 && (
                  <p style={{ margin: "0 0 4px 0" }}>
                    ⚠️ 着順が重複しています: {Array.from(dupBoatPositions).sort((a, b) => a - b).map((p) => `${p}位`).join(", ")}
                  </p>
                )}
                {missingPosRows.size > 0 && <p style={{ margin: 0 }}>⚠️ DSQ / NSC の艇に着順が入力されていません</p>}
              </div>
            )}
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ backgroundColor: NAV, color: WHITE }}>
                      {["艇番", "セールNo.", "所属", ...(isTeamEvent ? ["団体名"] : []), "クラス", "着順 / 結果コード", "得点", "備考"].map((h) => (
                        <th key={h} style={{ padding: "12px 14px", textAlign: "left", whiteSpace: "nowrap", fontWeight: "600", fontSize: "13px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boatRows.map((row, index) => {
                      const boat = boats.find((b) => b.id === row.boat_id);
                      if (!boat) return null;
                      const needsPos   = NEEDS_FINISH_POS.has(row.result_code);
                      const isManual   = MANUAL_CODES.has(row.result_code);
                      const isOk       = row.result_code === "OK";
                      const rowBg      = index % 2 === 0 ? WHITE : "#fafbfc";
                      const fpNum      = Number(row.finish_position);
                      const isDupPos   = needsPos && !isManual && !!row.finish_position && dupBoatPositions.has(fpNum);
                      const isMissPos  = missingPosRows.has(index);

                      return (
                        <tr key={row.boat_id} style={{ backgroundColor: rowBg }}>
                          <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>{boat.boat_number || "-"}</td>
                          <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", fontWeight: "600" }}>{boat.sail_number}</td>
                          <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>{boat.organization_name || "-"}</td>
                          {isTeamEvent && <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.team_name || "-"}</td>}
                          <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.boat_class || "-"}</td>
                          <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, minWidth: "380px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <input
                                  type="number"
                                  value={row.finish_position}
                                  disabled={!needsPos || isManual}
                                  onChange={(e) => updateBoatRow(index, "finish_position", e.target.value)}
                                  style={{
                                    padding: "6px 8px",
                                    border: `1px solid ${isDupPos ? "#dc2626" : isMissPos ? "#f97316" : (!needsPos || isManual) ? "#e2e8f0" : "#94adc8"}`,
                                    borderRadius: "6px", width: "68px", fontSize: "14px",
                                    backgroundColor: (!needsPos || isManual) ? "#f1f5f9" : WHITE,
                                    color: (!needsPos || isManual) ? MUTED : TEXT, outline: "none",
                                  }}
                                />
                                {isOk && <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: "600", padding: "3px 8px", borderRadius: "4px", backgroundColor: "#f0fdf4" }}>OK</span>}
                              </div>
                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                {ROW1_CODES.map((code) => (
                                  <button key={code} type="button" onClick={() => updateBoatRow(index, "result_code", row.result_code === code ? "OK" : code)} style={codeBtn(row.result_code === code)}>{code}</button>
                                ))}
                              </div>
                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                {ROW2_CODES.map((code) => (
                                  <button key={code} type="button" onClick={() => updateBoatRow(index, "result_code", row.result_code === code ? "OK" : code)} style={codeBtn(row.result_code === code)}>{code}</button>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, textAlign: "center", whiteSpace: "nowrap" }}>
                            {isManual ? (
                              <input type="number" value={row.manual_points} onChange={(e) => updateBoatRow(index, "manual_points", e.target.value)} placeholder="手動"
                                style={{ padding: "6px 8px", border: "1px solid #94adc8", borderRadius: "6px", width: "68px", fontSize: "14px", outline: "none", textAlign: "center" }} />
                            ) : row.points != null ? (
                              <span style={{ fontWeight: "700", color: NAV }}>{row.points}</span>
                            ) : (
                              <span style={{ color: MUTED }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}` }}>
                            <input type="text" value={row.note} onChange={(e) => updateBoatRow(index, "note", e.target.value)}
                              style={{ padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: "6px", width: "100%", fontSize: "13px", outline: "none", backgroundColor: WHITE }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Bottom save button */}
        {!loading && boats.length > 0 && (
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "12px 36px", backgroundColor: NAV, color: WHITE, border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "15px", opacity: saving ? 0.7 : 1, boxShadow: "0 2px 6px rgba(31,78,120,0.25)" }}
            >
              {saving ? "保存中..." : "💾 結果を保存"}
            </button>
          </div>
        )}

      </main>
    </>
  );
}
