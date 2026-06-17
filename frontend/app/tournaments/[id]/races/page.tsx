"use client";

import { T } from "@/lib/theme";
import { apiFetch, API_BASE } from "@/lib/api";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TournamentNav from "../../../components/TournamentNav";

type Race = {
  id: number;
  tournament_id: number;
  race_number: number;
  name?: string | null;
  status: string;
  race_date?: string | null;
  weather?: string | null;
  wind_direction?: string | null;
  wind_speed?: string | null;
  start_time?: string | null;
  finish_time_top?: string | null;
  finish_time_last?: string | null;
};

const NAV    = T.accent;
const BORDER = T.border;
const WHITE  = T.white;
const TEXT   = T.text;
const MUTED  = T.muted;
const INPUT: React.CSSProperties = {
  padding: "7px 10px",
  border: `1px solid ${BORDER}`,
  borderRadius: "6px",
  fontSize: "13px",
  width: "100%",
  outline: "none",
  backgroundColor: T.surface,
  boxSizing: "border-box",
};
const CARD: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
};
const LBL: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: "600", color: MUTED, marginBottom: "3px",
};

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    DRAFT:     { bg: T.surface2, color: T.muted, label: "下書き" },
    FINISHED:  { bg: "rgba(34,197,94,0.15)", color: "#5eead4", label: "完了" },
    CANCELLED: { bg: "#fef2f2", color: "#991b1b", label: "中止" },
  };
  const s = map[status] ?? { bg: T.surface2, color: T.muted, label: status };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: "999px",
      fontSize: "11px", fontWeight: "600", backgroundColor: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

export default function RacesPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournamentName, setTournamentName] = useState("");
  const [races, setRaces] = useState<Race[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [raceNumber, setRaceNumber] = useState("");
  const [raceName, setRaceName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Race>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function fetchTournament() {
    const res = await apiFetch(`/tournaments/${tournamentId}`);
    if (res.ok) { const d = await res.json(); setTournamentName(d.name); }
  }
  async function fetchRaces() {
    const res = await apiFetch(`/tournaments/${tournamentId}/races`);
    if (!res.ok) { setError("レース一覧の取得に失敗しました"); return; }
    setRaces(await res.json());
  }
  useEffect(() => { if (tournamentId) { fetchTournament(); fetchRaces(); } }, [tournamentId]);

  async function handleAddRace(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!raceNumber) { setError("レース番号は必須です"); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/tournaments/${tournamentId}/races`, {
        method: "POST",
        body: JSON.stringify({ race_number: Number(raceNumber), name: raceName || null, status: "DRAFT" }),
      });
      if (!res.ok) { setError("レース追加に失敗しました"); return; }
      setRaceNumber(""); setRaceName(""); setShowAddForm(false);
      await fetchRaces();
    } finally { setSubmitting(false); }
  }

  function openEdit(race: Race) {
    setExpandedId(race.id);
    setEditDraft({
      name: race.name ?? "",
      status: race.status,
      race_date: race.race_date ?? "",
      weather: race.weather ?? "",
      wind_direction: race.wind_direction ?? "",
      wind_speed: race.wind_speed ?? "",
      start_time: race.start_time ?? "",
      finish_time_top: race.finish_time_top ?? "",
      finish_time_last: race.finish_time_last ?? "",
    });
    setSaveMsg("");
  }

  async function handleSaveRace(raceId: number) {
    setSaving(true); setSaveMsg("");
    try {
      const res = await apiFetch(`/races/${raceId}`, {
        method: "PUT",
        body: JSON.stringify(editDraft),
      });
      if (!res.ok) { setSaveMsg("保存に失敗しました"); return; }
      setSaveMsg("保存しました");
      await fetchRaces();
    } finally { setSaving(false); }
  }

  return (
    <>
      <TournamentNav id={tournamentId} name={tournamentName} />
      <main style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, margin: 0 }}>レース管理</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: "9px 18px", backgroundColor: showAddForm ? MUTED : NAV,
              color: WHITE, border: "none", borderRadius: "8px",
              cursor: "pointer", fontSize: "14px", fontWeight: "600",
            }}
          >
            {showAddForm ? "✕ 閉じる" : "+ レースを追加"}
          </button>
        </div>

        {showAddForm && (
          <div style={{ ...CARD, marginBottom: "28px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", marginTop: 0, marginBottom: "20px", color: TEXT }}>新規レース追加</h2>
            <form onSubmit={handleAddRace}>
              <div className="grid-2" style={{ gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={LBL}>レース番号 *</label>
                  <input type="number" value={raceNumber} onChange={e => setRaceNumber(e.target.value)} placeholder="例: 1" style={INPUT} />
                </div>
                <div>
                  <label style={LBL}>レース名（任意）</label>
                  <input type="text" value={raceName} onChange={e => setRaceName(e.target.value)} placeholder="例: 第1レース" style={INPUT} />
                </div>
              </div>
              {error && <p style={{ color: "#fca5a5", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" disabled={submitting} style={{
                  padding: "10px 24px", backgroundColor: NAV, color: WHITE,
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontWeight: "600", fontSize: "14px", opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? "追加中..." : "レースを追加"}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} style={{
                  padding: "10px 16px", backgroundColor: T.surface, color: MUTED,
                  border: `1px solid ${BORDER}`, borderRadius: "8px", cursor: "pointer", fontSize: "14px",
                }}>
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {races.length === 0 ? (
          <div style={{ ...CARD, textAlign: "center", padding: "48px", color: MUTED }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏁</div>
            <p style={{ margin: 0 }}>レースが登録されていません。「レースを追加」から追加してください。</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {races.map((race) => (
              <div key={race.id} style={{ ...CARD, padding: "16px 20px" }}>
                {/* Race header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "8px",
                      backgroundColor: T.surface2, color: NAV,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: "700", fontSize: "16px", flexShrink: 0,
                    }}>
                      {race.race_number}
                    </div>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "15px", color: TEXT }}>
                        {race.name || `第${race.race_number}レース`}
                      </div>
                      <div style={{ marginTop: "4px" }}>{statusBadge(race.status)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => expandedId === race.id ? setExpandedId(null) : openEdit(race)}
                      style={{
                        padding: "7px 14px", fontSize: "13px", fontWeight: "600",
                        border: `1px solid ${BORDER}`, borderRadius: "6px",
                        backgroundColor: expandedId === race.id ? T.surface2 : WHITE,
                        color: NAV, cursor: "pointer",
                      }}
                    >
                      {expandedId === race.id ? "▲ 閉じる" : "▼ レース情報"}
                    </button>
                    <Link
                      href={`/tournaments/${tournamentId}/races/${race.id}`}
                      style={{
                        display: "inline-block", padding: "7px 16px",
                        backgroundColor: NAV, color: WHITE,
                        borderRadius: "6px", textDecoration: "none",
                        fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap",
                      }}
                    >
                      結果入力 →
                    </Link>
                  </div>
                </div>

                {/* Expandable race info form */}
                {expandedId === race.id && (
                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px", marginBottom: "12px" }}>
                      <div>
                        <label style={LBL}>ステータス</label>
                        <select
                          value={editDraft.status ?? "DRAFT"}
                          onChange={e => setEditDraft(d => ({ ...d, status: e.target.value }))}
                          style={INPUT}
                        >
                          <option value="DRAFT">下書き</option>
                          <option value="FINISHED">完了</option>
                          <option value="CANCELLED">中止</option>
                        </select>
                      </div>
                      <div>
                        <label style={LBL}>レース名</label>
                        <input value={editDraft.name ?? ""} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} style={INPUT} />
                      </div>
                      <div>
                        <label style={LBL}>レース日</label>
                        <input type="date" value={editDraft.race_date ?? ""} onChange={e => setEditDraft(d => ({ ...d, race_date: e.target.value }))} style={INPUT} />
                      </div>
                      <div>
                        <label style={LBL}>天気</label>
                        <input value={editDraft.weather ?? ""} onChange={e => setEditDraft(d => ({ ...d, weather: e.target.value }))} placeholder="晴れ" style={INPUT} />
                      </div>
                      <div>
                        <label style={LBL}>風向</label>
                        <input value={editDraft.wind_direction ?? ""} onChange={e => setEditDraft(d => ({ ...d, wind_direction: e.target.value }))} placeholder="NW" style={INPUT} />
                      </div>
                      <div>
                        <label style={LBL}>風速</label>
                        <input value={editDraft.wind_speed ?? ""} onChange={e => setEditDraft(d => ({ ...d, wind_speed: e.target.value }))} placeholder="10〜15kt" style={INPUT} />
                      </div>
                      <div>
                        <label style={LBL}>スタート時刻</label>
                        <input value={editDraft.start_time ?? ""} onChange={e => setEditDraft(d => ({ ...d, start_time: e.target.value }))} placeholder="10:00" style={INPUT} />
                      </div>
                      <div>
                        <label style={LBL}>Finish Top</label>
                        <input value={editDraft.finish_time_top ?? ""} onChange={e => setEditDraft(d => ({ ...d, finish_time_top: e.target.value }))} placeholder="10:45" style={INPUT} />
                      </div>
                      <div>
                        <label style={LBL}>Finish Last</label>
                        <input value={editDraft.finish_time_last ?? ""} onChange={e => setEditDraft(d => ({ ...d, finish_time_last: e.target.value }))} placeholder="11:20" style={INPUT} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        onClick={() => handleSaveRace(race.id)}
                        disabled={saving}
                        style={{
                          padding: "8px 22px", backgroundColor: NAV, color: WHITE,
                          border: "none", borderRadius: "6px", cursor: "pointer",
                          fontWeight: "600", fontSize: "13px", opacity: saving ? 0.7 : 1,
                        }}
                      >
                        {saving ? "保存中..." : "保存"}
                      </button>
                      {saveMsg && (
                        <span style={{ fontSize: "13px", color: saveMsg.includes("失敗") ? "#dc2626" : "#0e6657", fontWeight: "600" }}>
                          {saveMsg}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
