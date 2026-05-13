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
  boat_number: string | null;
  sail_number: string;
  organization_name: string | null;
  helmsman_name?: string | null;
  crew_name?: string | null;
  notes?: string | null;
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

type RaceResultRow = {
  boat_id: number;
  finish_position: string;
  result_code: string;
  manual_points: string;
  note: string;
  points?: number | null;
};

const NEEDS_FINISH_POS = new Set(["OK", "DSQ", "NSC", "STP", "SCP", "ARB", "PRP", "ZFP"]);
const MANUAL_CODES = new Set(["RDG", "DPI"]);
const ROW1_CODES = ["DNS", "DNC", "OCS", "DNF", "RET", "BFD", "UFD"] as const;
const ROW2_CODES = ["DSQ", "NSC", "DNE", "STP", "SCP", "ZFP", "RDG", "DPI"] as const;

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

export default function RaceResultPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const raceId = params.raceId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [race, setRace] = useState<Race | null>(null);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [rows, setRows] = useState<RaceResultRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isTeamEvent =
    tournament?.event_template === "TEAM_3_BOATS" ||
    tournament?.event_template === "TEAM_4_BOATS" ||
    tournament?.event_template === "MULTI_GROUP_HYBRID";

  // Compute validation state
  const positionMap = new Map<number, number[]>();
  rows.forEach((row, i) => {
    if (NEEDS_FINISH_POS.has(row.result_code) && !MANUAL_CODES.has(row.result_code) && row.finish_position) {
      const pos = Number(row.finish_position);
      if (!isNaN(pos) && pos > 0) {
        if (!positionMap.has(pos)) positionMap.set(pos, []);
        positionMap.get(pos)!.push(i);
      }
    }
  });
  const duplicatePositions = new Set<number>();
  positionMap.forEach((indices, pos) => { if (indices.length > 1) duplicatePositions.add(pos); });

  const missingPosRows = new Set<number>();
  rows.forEach((row, i) => {
    if ((row.result_code === "DSQ" || row.result_code === "NSC") && !row.finish_position) {
      missingPosRows.add(i);
    }
  });

  const hasWarnings = duplicatePositions.size > 0 || missingPosRows.size > 0;

  async function fetchAll() {
    if (!tournamentId || !raceId) return;
    try {
      setLoading(true);
      setError("");
      const [tournamentRes, racesRes, boatsRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/tournaments/${tournamentId}`),
        fetch(`${API_BASE}/tournaments/${tournamentId}/races`),
        fetch(`${API_BASE}/tournaments/${tournamentId}/boats`),
        fetch(`${API_BASE}/races/${raceId}/results`),
      ]);
      if (!tournamentRes.ok) throw new Error("大会情報の取得に失敗しました");
      if (!racesRes.ok)      throw new Error("レース一覧の取得に失敗しました");
      if (!boatsRes.ok)      throw new Error("艇一覧の取得に失敗しました");
      if (!resultsRes.ok)    throw new Error("レース結果の取得に失敗しました");

      const tournamentData: Tournament = await tournamentRes.json();
      const racesData: Race[] = await racesRes.json();
      const boatsData: Boat[] = await boatsRes.json();
      const resultsData = await resultsRes.json();

      setTournament(tournamentData);
      setRace(racesData.find((r) => String(r.id) === String(raceId)) || null);
      setBoats(boatsData);
      setRows(boatsData.map((boat) => {
        const existing = resultsData.find((r: any) => r.boat_id === boat.id);
        return {
          boat_id: boat.id,
          finish_position: existing?.finish_position?.toString() ?? "",
          result_code: existing?.result_code ?? "OK",
          manual_points: existing?.manual_points?.toString() ?? "",
          note: existing?.note ?? "",
          points: existing?.points ?? null,
        };
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [tournamentId, raceId]);

  function updateRow(index: number, field: keyof RaceResultRow, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "result_code") {
        if (!NEEDS_FINISH_POS.has(value)) next[index].finish_position = "";
        if (!MANUAL_CODES.has(value)) next[index].manual_points = "";
      }
      return next;
    });
  }

  async function handleSave() {
    if (hasWarnings) {
      const warnings: string[] = [];
      if (duplicatePositions.size > 0) {
        const dups = Array.from(duplicatePositions).sort((a, b) => a - b).map((p) => `${p}位`).join(", ");
        warnings.push(`着順が重複しています: ${dups}`);
      }
      if (missingPosRows.size > 0) {
        warnings.push("DSQ / NSC の艇に着順が入力されていません");
      }
      const ok = window.confirm(`⚠️ 入力ミスの可能性があります\n\n${warnings.join("\n")}\n\nこのまま保存しますか？`);
      if (!ok) return;
    }

    setError(""); setMessage(""); setSaving(true);
    try {
      const payload = rows.map((row) => ({
        boat_id: row.boat_id,
        finish_position:
          NEEDS_FINISH_POS.has(row.result_code) && !MANUAL_CODES.has(row.result_code) && row.finish_position
            ? Number(row.finish_position)
            : null,
        result_code: row.result_code,
        note: row.note || null,
        manual_points:
          MANUAL_CODES.has(row.result_code) && row.manual_points
            ? Number(row.manual_points)
            : null,
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

  const codeButtonStyle = (active: boolean): React.CSSProperties => ({
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

  return (
    <>
      <TournamentNav id={tournamentId} name={tournament?.name ?? ""} />
      <main style={{ padding: "32px 24px", maxWidth: "1400px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, margin: 0, marginBottom: "4px" }}>
              {race ? (race.name || `第${race.race_number}レース`) : "レース結果入力"}
            </h1>
            {race && (
              <span style={{
                display: "inline-block", padding: "2px 8px", borderRadius: "999px",
                fontSize: "11px", fontWeight: "600",
                backgroundColor: "#f1f5f9", color: MUTED,
              }}>
                {race.status === "DRAFT" ? "下書き" : race.status === "FINISHED" ? "完了" : race.status}
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              padding: "10px 28px", backgroundColor: NAV, color: WHITE,
              border: "none", borderRadius: "8px", cursor: "pointer",
              fontWeight: "700", fontSize: "15px",
              opacity: saving || loading ? 0.7 : 1,
              boxShadow: "0 2px 6px rgba(31,78,120,0.25)",
            }}
          >
            {saving ? "保存中..." : "💾 結果を保存"}
          </button>
        </div>

        {hasWarnings && !loading && rows.length > 0 && (
          <div style={{
            backgroundColor: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: "8px", padding: "12px 16px", marginBottom: "16px",
            fontSize: "13px", color: "#dc2626",
          }}>
            {duplicatePositions.size > 0 && (
              <p style={{ margin: "0 0 4px 0" }}>
                ⚠️ 着順が重複しています: {Array.from(duplicatePositions).sort((a, b) => a - b).map((p) => `${p}位`).join(", ")}
              </p>
            )}
            {missingPosRows.size > 0 && (
              <p style={{ margin: 0 }}>
                ⚠️ DSQ / NSC の艇に着順が入力されていません
              </p>
            )}
          </div>
        )}

        {error   && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px", ...CARD, padding: "12px 16px" }}>{error}</p>}
        {message && <p style={{ color: "#0e6657", fontSize: "13px", marginBottom: "12px", ...CARD, padding: "12px 16px" }}>{message}</p>}

        {loading ? (
          <p style={{ color: MUTED }}>読み込み中...</p>
        ) : rows.length === 0 ? (
          <div style={{ ...CARD, textAlign: "center", padding: "48px", color: MUTED }}>
            <p style={{ margin: 0 }}>艇が登録されていません。先に艇登録を行ってください。</p>
          </div>
        ) : (
          <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: NAV, color: WHITE }}>
                    {["艇番", "セールNo.", "所属", ...(isTeamEvent ? ["団体名"] : []), "クラス", "着順 / 結果コード", "得点", "備考"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 14px", textAlign: "left",
                        whiteSpace: "nowrap", fontWeight: "600", fontSize: "13px",
                        borderRight: "1px solid rgba(255,255,255,0.1)",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const boat = boats.find((b) => b.id === row.boat_id);
                    if (!boat) return null;
                    const needsPos = NEEDS_FINISH_POS.has(row.result_code);
                    const isManual = MANUAL_CODES.has(row.result_code);
                    const isOk = row.result_code === "OK";
                    const rowBg = index % 2 === 0 ? WHITE : "#fafbfc";
                    const fpNum = Number(row.finish_position);
                    const isDuplicatePos = needsPos && !isManual && !!row.finish_position && duplicatePositions.has(fpNum);
                    const isMissingPos = missingPosRows.has(index);

                    return (
                      <tr key={row.boat_id} style={{ backgroundColor: rowBg }}>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                          {boat.boat_number || "-"}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", fontWeight: "600" }}>
                          {boat.sail_number}
                        </td>
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
                          {boat.organization_name || "-"}
                        </td>
                        {isTeamEvent && (
                          <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>
                            {boat.team_name || "-"}
                          </td>
                        )}
                        <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>
                          {boat.boat_class || "-"}
                        </td>
                        <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, minWidth: "380px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <input
                                type="number"
                                value={row.finish_position}
                                disabled={!needsPos || isManual}
                                onChange={(e) => updateRow(index, "finish_position", e.target.value)}
                                style={{
                                  padding: "6px 8px",
                                  border: `1px solid ${isDuplicatePos ? "#dc2626" : isMissingPos ? "#f97316" : (!needsPos || isManual) ? "#e2e8f0" : "#94adc8"}`,
                                  borderRadius: "6px",
                                  width: "68px",
                                  fontSize: "14px",
                                  backgroundColor: (!needsPos || isManual) ? "#f1f5f9" : WHITE,
                                  color: (!needsPos || isManual) ? MUTED : TEXT,
                                  outline: "none",
                                }}
                              />
                              {isOk && (
                                <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: "600", padding: "3px 8px", borderRadius: "4px", backgroundColor: "#f0fdf4" }}>
                                  OK
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {ROW1_CODES.map((code) => (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() => updateRow(index, "result_code", row.result_code === code ? "OK" : code)}
                                  style={codeButtonStyle(row.result_code === code)}
                                >
                                  {code}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {ROW2_CODES.map((code) => (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() => updateRow(index, "result_code", row.result_code === code ? "OK" : code)}
                                  style={codeButtonStyle(row.result_code === code)}
                                >
                                  {code}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, textAlign: "center", whiteSpace: "nowrap" }}>
                          {isManual ? (
                            <input
                              type="number"
                              value={row.manual_points}
                              onChange={(e) => updateRow(index, "manual_points", e.target.value)}
                              placeholder="手動"
                              style={{
                                padding: "6px 8px",
                                border: "1px solid #94adc8",
                                borderRadius: "6px",
                                width: "68px",
                                fontSize: "14px",
                                outline: "none",
                                textAlign: "center",
                              }}
                            />
                          ) : row.points != null ? (
                            <span style={{ fontWeight: "700", color: NAV }}>{row.points}</span>
                          ) : (
                            <span style={{ color: MUTED }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}` }}>
                          <input
                            type="text"
                            value={row.note}
                            onChange={(e) => updateRow(index, "note", e.target.value)}
                            style={{
                              padding: "7px 10px", border: `1px solid ${BORDER}`,
                              borderRadius: "6px", width: "100%", fontSize: "13px",
                              outline: "none", backgroundColor: WHITE,
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "12px 36px", backgroundColor: NAV, color: WHITE,
                border: "none", borderRadius: "8px", cursor: "pointer",
                fontWeight: "700", fontSize: "15px",
                opacity: saving ? 0.7 : 1,
                boxShadow: "0 2px 6px rgba(31,78,120,0.25)",
              }}
            >
              {saving ? "保存中..." : "💾 結果を保存"}
            </button>
          </div>
        )}

      </main>
    </>
  );
}
