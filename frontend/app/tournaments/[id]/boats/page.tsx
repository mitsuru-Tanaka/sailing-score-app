"use client";

import { API_BASE } from "@/lib/api";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TournamentNav from "../../../components/TournamentNav";

type Tournament = {
  id: number;
  name: string;
  event_template: string;
  class_name?: string | null;
};

type Boat = {
  id: number;
  tournament_id: number;
  boat_number: string;
  sail_number: string;
  organization_name: string;
  helmsman_name?: string | null;
  crew_name?: string | null;
  notes?: string | null;
  boat_class?: string | null;
  team_name?: string | null;
};

const NAV    = "#1F4E78";
const BORDER = "#e2e8f0";
const WHITE  = "#ffffff";
const TEXT   = "#1a2332";
const MUTED  = "#64748b";
const INPUT_STYLE: React.CSSProperties = {
  padding: "10px 12px",
  border: `1px solid ${BORDER}`,
  borderRadius: "8px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
  backgroundColor: WHITE,
};
const CARD: React.CSSProperties = {
  backgroundColor: WHITE,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export default function BoatsPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [boatNumber, setBoatNumber] = useState("");
  const [sailNumber, setSailNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [boatClass, setBoatClass] = useState("");
  const [helmsmanName, setHelmsmanName] = useState("");
  const [crewName, setCrewName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchTournament() {
    if (!tournamentId) return;
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`);
    if (!res.ok) { setError("大会情報の取得に失敗しました"); return; }
    const data = await res.json();
    setTournament(data);
    if (data.class_name && !boatClass) setBoatClass(data.class_name);
  }

  async function fetchBoats() {
    if (!tournamentId) return;
    const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/boats`);
    if (!res.ok) { setError("艇一覧の取得に失敗しました"); return; }
    setBoats(await res.json());
  }

  useEffect(() => {
    fetchTournament();
    fetchBoats();
  }, [tournamentId]);

  const isTeamEvent =
    tournament?.event_template === "TEAM_3_BOATS" ||
    tournament?.event_template === "TEAM_4_BOATS" ||
    tournament?.event_template === "MULTI_GROUP_HYBRID";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!boatNumber || !sailNumber || !organizationName) {
      setError("艇番、セールNo.、所属名は必須です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/boats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boat_number: boatNumber,
          sail_number: sailNumber,
          organization_name: organizationName,
          helmsman_name: helmsmanName || null,
          crew_name: crewName || null,
          notes: notes || null,
          boat_class: boatClass || null,
          team_name: isTeamEvent ? teamName || organizationName : null,
        }),
      });
      if (!res.ok) { setError("艇登録に失敗しました"); return; }
      setBoatNumber(""); setSailNumber(""); setOrganizationName(""); setTeamName("");
      setBoatClass(tournament?.class_name || ""); setHelmsmanName(""); setCrewName(""); setNotes("");
      setShowForm(false);
      await fetchBoats();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TournamentNav id={tournamentId} name={tournament?.name ?? ""} />
      <main style={{ padding: "32px 24px", maxWidth: "1100px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, margin: 0 }}>艇登録</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "9px 18px",
              backgroundColor: showForm ? MUTED : NAV,
              color: WHITE, border: "none", borderRadius: "8px",
              cursor: "pointer", fontSize: "14px", fontWeight: "600",
            }}
          >
            {showForm ? "✕ 閉じる" : "+ 艇を追加"}
          </button>
        </div>

        {showForm && (
          <div style={{ ...CARD, marginBottom: "28px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", marginTop: 0, marginBottom: "20px", color: TEXT }}>新規艇登録</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>艇番 *</label>
                  <input value={boatNumber} onChange={e => setBoatNumber(e.target.value)} placeholder="例: 1" style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>セールNo. *</label>
                  <input value={sailNumber} onChange={e => setSailNumber(e.target.value)} placeholder="例: JPN 12345" style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>所属名 *</label>
                  <input value={organizationName} onChange={e => setOrganizationName(e.target.value)} placeholder="例: 東京大学" style={INPUT_STYLE} />
                </div>
                {isTeamEvent && (
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>団体集計名</label>
                    <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="未入力なら所属名を使用" style={INPUT_STYLE} />
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>クラス</label>
                  <select value={boatClass} onChange={e => setBoatClass(e.target.value)} style={INPUT_STYLE}>
                    <option value="">クラスを選択</option>
                    <option value="470">470</option>
                    <option value="SNIPE">SNIPE</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>ヘルムスマン</label>
                  <input value={helmsmanName} onChange={e => setHelmsmanName(e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>クルー</label>
                  <input value={crewName} onChange={e => setCrewName(e.target.value)} style={INPUT_STYLE} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: MUTED, marginBottom: "4px" }}>備考</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...INPUT_STYLE, minHeight: "60px", resize: "vertical" }} />
                </div>
              </div>

              {error && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" disabled={submitting} style={{
                  padding: "10px 24px", backgroundColor: NAV, color: WHITE,
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontWeight: "600", fontSize: "14px", opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? "登録中..." : "艇を登録"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  padding: "10px 16px", backgroundColor: WHITE, color: MUTED,
                  border: `1px solid ${BORDER}`, borderRadius: "8px", cursor: "pointer", fontSize: "14px",
                }}>
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {boats.length === 0 ? (
          <div style={{ ...CARD, textAlign: "center", padding: "48px", color: MUTED }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⛵</div>
            <p style={{ margin: 0 }}>艇が登録されていません。「艇を追加」から登録してください。</p>
          </div>
        ) : (
          <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: NAV, color: WHITE }}>
                    {["艇番", "セールNo.", "所属", ...(isTeamEvent ? ["団体集計名"] : []), "クラス", "ヘルムスマン", "クルー"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", whiteSpace: "nowrap", fontWeight: "600", fontSize: "13px" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boats.map((boat, i) => (
                    <tr key={boat.id} style={{ backgroundColor: i % 2 === 0 ? WHITE : "#fafbfc" }}>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>{boat.boat_number}</td>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", fontWeight: "600" }}>{boat.sail_number}</td>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}` }}>{boat.organization_name}</td>
                      {isTeamEvent && (
                        <td style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.team_name || "-"}</td>
                      )}
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.boat_class || "-"}</td>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}` }}>{boat.helmsman_name || "-"}</td>
                      <td style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>{boat.crew_name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}`, fontSize: "13px", color: MUTED }}>
              合計 {boats.length} 艇
            </div>
          </div>
        )}

      </main>
    </>
  );
}
